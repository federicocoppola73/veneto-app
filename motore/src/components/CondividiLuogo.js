import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import Cartolina, { altezzaCartolina, LARGHEZZA_CARTOLINA } from './Cartolina';
import { catturaCartolina, salvaInGalleria } from '../salvaCartolina';

// Anteprima della cartolina di un luogo, con il messaggio facoltativo dell'utente,
// e pulsante che apre il menu di condivisione nativo del telefono (WhatsApp, Telegram, ecc.).
export default function CondividiLuogo({ luogo, lingua, t, onChiudi }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cartaRef = useRef(null);
  const [testo, setTesto] = useState('');
  const [occupato, setOccupato] = useState(false);
  const [fotoPropria, setFotoPropria] = useState(null); // uri della foto scelta dalla galleria, se c'è
  const [formato, setFormato] = useState('storie'); // 'storie' 9:16 oppure 'feed' 4:5
  const altezza = altezzaCartolina(formato);
  // l'anteprima entra nella larghezza dello schermo e in metà altezza circa
  const scala = Math.min((width - 40) / LARGHEZZA_CARTOLINA, (height * 0.5) / altezza, 1);

  // galleria del telefono, ritaglio nel formato della cartolina; nessun invio a server
  const scegliFoto = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [360, 290],
        quality: 0.8,
      });
      if (!r.canceled && r.assets?.[0]?.uri) setFotoPropria(r.assets[0].uri);
    } catch (e) {
      Alert.alert(t('cart_errore'));
    }
  };

  // fotocamera: chiede il permesso la prima volta; la foto resta sul telefono
  const scattaFoto = async () => {
    try {
      const permesso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permesso.granted) {
        Alert.alert(t('cart_permesso_fotocamera'));
        return;
      }
      const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [360, 290], quality: 0.8 });
      if (!r.canceled && r.assets?.[0]?.uri) setFotoPropria(r.assets[0].uri);
    } catch (e) {
      Alert.alert(t('cart_errore'));
    }
  };

  const condividi = async () => {
    if (occupato) return;
    setOccupato(true);
    try {
      const uri = await captureRef(cartaRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: LARGHEZZA_CARTOLINA * 3,
        height: altezza * 3,
      });
      if (!(await Sharing.isAvailableAsync())) throw new Error('condivisione non disponibile');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('cond_condividi'), UTI: 'public.png' });
    } catch (e) {
      Alert.alert(t('cart_errore'));
    } finally {
      setOccupato(false);
    }
  };

  // salva la cartolina nelle foto del telefono (senza aprire il menu di condivisione)
  const salva = async () => {
    if (occupato) return;
    setOccupato(true);
    try {
      const uri = await catturaCartolina(cartaRef, altezza);
      await salvaInGalleria(uri, t);
    } catch (e) {
      Alert.alert(t('cart_errore'));
    } finally {
      setOccupato(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi} statusBarTranslucent>
      <Pressable style={styles.sfondo} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
      <View style={[styles.scheda, { paddingBottom: 18 + insets.bottom }]}>
        <View style={styles.maniglia} />
        <Text style={styles.titolo}>{t('cart_anteprima')}</Text>

        <View style={[styles.anteprima, { width: LARGHEZZA_CARTOLINA * scala, height: altezza * scala }]}>
          <View style={{ transform: [{ scale: scala }], transformOrigin: [0, 0, 0] }}>
            <Cartolina ref={cartaRef} luogo={luogo} lingua={lingua} testo={testo} t={t} fotoPropria={fotoPropria} formato={formato} />
          </View>
        </View>

        <View style={styles.selettore}>
          {['storie', 'feed'].map((f) => {
            const attivo = formato === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFormato(f)}
                style={[styles.pillola, attivo && styles.pillolaAttiva]}
                accessibilityRole="radio"
                accessibilityState={{ selected: attivo }}
              >
                <Text style={[styles.testoPillola, attivo && styles.testoPillolaAttiva]}>
                  {t(f === 'feed' ? 'cart_feed' : 'cart_storie')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={styles.campo}
          value={testo}
          onChangeText={setTesto}
          placeholder={t('cart_testo')}
          maxLength={100}
          returnKeyType="done"
        />

        <View style={styles.riga}>
          {fotoPropria ? (
            <Pressable
              style={({ pressed }) => [styles.bottone, styles.bottoneSecondario, pressed && { opacity: 0.85 }]}
              onPress={() => setFotoPropria(null)}
            >
              <Text style={[styles.testoBottone, styles.testoSecondario]}>{t('cart_foto_predefinita')}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [styles.bottone, styles.bottoneSecondario, pressed && { opacity: 0.85 }]}
                onPress={scegliFoto}
              >
                <Text style={[styles.testoBottone, styles.testoSecondario]}>{t('cart_scegli_foto')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.bottone, styles.bottoneSecondario, pressed && { opacity: 0.85 }]}
                onPress={scattaFoto}
              >
                <Text style={[styles.testoBottone, styles.testoSecondario]}>{t('cart_scatta_foto')}</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.riga}>
          <Pressable
            style={({ pressed }) => [styles.bottone, styles.bottoneSecondario, pressed && { opacity: 0.85 }]}
            onPress={salva}
            disabled={occupato}
          >
            <Text style={[styles.testoBottone, styles.testoSecondario]}>💾 {t('cart_salva')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.bottone, (pressed || occupato) && { opacity: 0.85 }, { flex: 1, marginTop: 10 }]}
            onPress={condividi}
            disabled={occupato}
          >
            {occupato ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.testoBottone}>📤 {t('cart_invia')}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  scheda: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  maniglia: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#cbd5e1', marginBottom: 10 },
  titolo: { fontSize: 16, fontWeight: '700', color: '#0f3d5e', textAlign: 'center', marginBottom: 12 },
  anteprima: { alignSelf: 'center', overflow: 'hidden', borderRadius: 12 },
  campo: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  bottone: {
    backgroundColor: '#0f3d5e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  testoBottone: { color: '#fff', fontSize: 15, fontWeight: '700' },
  riga: { flexDirection: 'row', gap: 10 },
  bottoneSecondario: { flex: 1, marginTop: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#0f3d5e' },
  testoSecondario: { color: '#0f3d5e' },
  selettore: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 12 },
  pillola: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: '#0f3d5e' },
  pillolaAttiva: { backgroundColor: '#0f3d5e' },
  testoPillola: { fontSize: 13, fontWeight: '700', color: '#0f3d5e' },
  testoPillolaAttiva: { color: '#fff' },
});
