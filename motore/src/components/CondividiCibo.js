import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import CartolinaCibo from './CartolinaCibo';
import { ALTEZZA_CARTOLINA, LARGHEZZA_CARTOLINA } from './Cartolina';
import { catturaCartolina, salvaInGalleria } from '../salvaCartolina';

// Anteprima della cartolina di un piatto, con "Salva nelle foto" e "Condividi" (menu del telefono).
export default function CondividiCibo({ cibo, lingua, t, onChiudi }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cartaRef = useRef(null);
  const [occupato, setOccupato] = useState(false);
  const [testo, setTesto] = useState('');
  const scala = Math.min((width - 40) / LARGHEZZA_CARTOLINA, (height * 0.5) / ALTEZZA_CARTOLINA, 1);

  const condividi = async () => {
    if (occupato) return;
    setOccupato(true);
    try {
      const uri = await catturaCartolina(cartaRef, ALTEZZA_CARTOLINA);
      if (!(await Sharing.isAvailableAsync())) throw new Error('condivisione non disponibile');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('cond_condividi'), UTI: 'public.png' });
    } catch (e) {
      Alert.alert(t('cart_errore'));
    } finally {
      setOccupato(false);
    }
  };

  const salva = async () => {
    if (occupato) return;
    setOccupato(true);
    try {
      const uri = await catturaCartolina(cartaRef, ALTEZZA_CARTOLINA);
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

        <View style={[styles.anteprima, { width: LARGHEZZA_CARTOLINA * scala, height: ALTEZZA_CARTOLINA * scala }]}>
          <View style={{ transform: [{ scale: scala }], transformOrigin: [0, 0, 0] }}>
            <CartolinaCibo ref={cartaRef} cibo={cibo} lingua={lingua} t={t} testo={testo} />
          </View>
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
          <Pressable
            style={({ pressed }) => [styles.bottone, styles.bottoneSecondario, pressed && { opacity: 0.85 }]}
            onPress={salva}
            disabled={occupato}
          >
            <Text style={[styles.testoBottone, styles.testoSecondario]}>💾 {t('cart_salva')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.bottone, (pressed || occupato) && { opacity: 0.85 }, { flex: 1 }]}
            onPress={condividi}
            disabled={occupato}
          >
            {occupato ? <ActivityIndicator color="#fff" /> : <Text style={styles.testoBottone}>📤 {t('cart_invia')}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  scheda: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10 },
  maniglia: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#cbd5e1', marginBottom: 10 },
  titolo: { fontSize: 16, fontWeight: '700', color: '#0f3d5e', textAlign: 'center', marginBottom: 12 },
  anteprima: { alignSelf: 'center', overflow: 'hidden', borderRadius: 12 },
  campo: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14, fontSize: 15, color: '#0f172a' },
  riga: { flexDirection: 'row', gap: 10, marginTop: 12 },
  bottone: { backgroundColor: '#0f3d5e', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  bottoneSecondario: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#0f3d5e' },
  testoBottone: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  testoSecondario: { color: '#0f3d5e' },
});
