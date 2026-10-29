import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export const BLU_LUOGO = '#1d4ed8';

/**
 * Contenuto della scheda 📍 Salvati (dentro la pagina "I miei luoghi").
 * Il pulsante "+" salva la posizione attuale: serve la geolocalizzazione attiva.
 * Con la geolocalizzazione spenta l'elenco resta comunque utilizzabile.
 * props: luoghi [{ id, descrizione }], posizione { stato, puoiChiedere, coordinate }, t,
 *        onAttiva(), onImpostazioni(), onSalva(descrizione), onScegli(luogo), onCancella(id)
 */
export default function ListaLuoghiSalvati({ luoghi, posizione, t, onAttiva, onImpostazioni, onSalva, onScegli, onCancella }) {
  const [scrivendo, setScrivendo] = useState(false);
  const [testo, setTesto] = useState('');
  const attiva = posizione.stato === 'attivo' && posizione.coordinate;
  const negato = posizione.stato === 'negato' && !posizione.puoiChiedere;

  const premiNuovo = () => {
    if (attiva) {
      setTesto('');
      setScrivendo(true);
      return;
    }
    Alert.alert(t('ls_serveGPS'), '', [
      { text: t('ls_annulla'), style: 'cancel' },
      negato
        ? { text: t('ls_impostazioni'), onPress: onImpostazioni }
        : { text: t('ls_attiva'), onPress: onAttiva },
    ]);
  };

  const conferma = () => {
    onSalva(testo.trim() || t('ls_predefinito'));
    setScrivendo(false);
  };

  const chiedi = (luogo) => {
    Alert.alert(t('ls_cancella'), t('ls_cancellaDomanda'), [
      { text: t('ls_annulla'), style: 'cancel' },
      { text: t('ls_cancella'), style: 'destructive', onPress: () => onCancella(luogo.id) },
    ]);
  };

  return (
    <View style={{ gap: 8 }}>
      {!attiva && (
        <View style={styles.avviso}>
          <Text style={styles.testoAvviso}>{t('ls_gpsSpento')}</Text>
          <Pressable
            onPress={negato ? onImpostazioni : onAttiva}
            style={({ pressed }) => [styles.bottoneAvviso, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
          >
            <Text style={styles.testoBottoneAvviso}>{negato ? t('ls_impostazioni') : t('ls_attivaGps')}</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={premiNuovo}
        testID="ls-nuovo"
        style={({ pressed }) => [styles.nuovo, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        <Text style={styles.testoNuovo}>{t('ls_nuovo')}</Text>
      </Pressable>

      {luoghi.length === 0 ? (
        <View style={styles.vuoto}>
          <Text style={styles.icona}>📍</Text>
          <Text style={styles.testoVuoto}>{t('ls_vuoto')}</Text>
        </View>
      ) : (
        luoghi.map((l) => (
          <View key={l.id} style={styles.riga}>
            <Pressable
              onPress={() => onScegli(l)}
              style={({ pressed }) => [styles.corpo, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
            >
              <Text style={styles.pin}>📍</Text>
              <Text style={styles.descrizione} numberOfLines={2}>{l.descrizione}</Text>
              <Text style={styles.freccia}>›</Text>
            </Pressable>
            <Pressable onPress={() => chiedi(l)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.cancella}>{t('ls_cancella')}</Text>
            </Pressable>
          </View>
        ))
      )}

      <Modal visible={scrivendo} transparent animationType="fade" onRequestClose={() => setScrivendo(false)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.velo} keyboardShouldPersistTaps="always">
          <View style={styles.finestra}>
            <TextInput
              value={testo}
              onChangeText={setTesto}
              placeholder={t('ls_descrizione')}
              autoFocus
              maxLength={60}
              style={styles.campo}
              returnKeyType="done"
              onSubmitEditing={conferma}
            />
            <View style={styles.azioniFinestra}>
              <Pressable onPress={() => setScrivendo(false)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.annulla}>{t('ls_annulla')}</Text>
              </Pressable>
              <Pressable onPress={conferma} style={styles.salva} accessibilityRole="button">
                <Text style={styles.testoSalva}>{t('ls_salva')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avviso: { backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, gap: 8 },
  testoAvviso: { color: '#9a3412', fontSize: 14 },
  bottoneAvviso: { alignSelf: 'flex-start', backgroundColor: '#1f3d36', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  testoBottoneAvviso: { color: '#fff', fontWeight: '700', fontSize: 14 },
  nuovo: { backgroundColor: BLU_LUOGO, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  testoNuovo: { color: '#fff', fontWeight: '800', fontSize: 16 },
  vuoto: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  icona: { fontSize: 40 },
  testoVuoto: { color: '#64748b', fontSize: 15, textAlign: 'center', paddingHorizontal: 16 },
  riga: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  corpo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pin: { fontSize: 20 },
  descrizione: { flex: 1, color: '#0f172a', fontSize: 16, fontWeight: '700' },
  freccia: { color: '#94a3b8', fontSize: 24 },
  cancella: { alignSelf: 'flex-end', color: '#b91c1c', fontSize: 14, fontWeight: '700', paddingVertical: 2 },
  velo: { flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  finestra: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 14 },
  campo: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#0f172a' },
  azioniFinestra: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 18 },
  annulla: { color: '#475569', fontSize: 16, fontWeight: '600' },
  salva: { backgroundColor: BLU_LUOGO, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  testoSalva: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
