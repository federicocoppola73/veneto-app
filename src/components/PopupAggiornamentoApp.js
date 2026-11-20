// Popup "Nuova versione disponibile": versione e novità dell'app, con "Più tardi" e "Aggiorna l'app" (apre lo store).
// info: { versione, novita: { it: [righe], en: [...] } } da controllaVersioneApp() in src/aggiornamentoApp.js
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { IconaAggiorna } from './IconeHome';
import { linkStore } from '../aggiornamentoApp';

const VERDE = '#17483a';
const TESTO = '#1c2b26';
const GRIGIO = '#5b6b64';

export default function PopupAggiornamentoApp({ info, lingua, t, onChiudi }) {
  if (!info) return null;
  // righe nella lingua scelta, altrimenti in inglese o in italiano
  const righe = info.novita?.[lingua] || info.novita?.en || info.novita?.it || [];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onChiudi}>
      <View style={styles.contenitore}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel={t.agg_piuTardi} />
        <View style={styles.popup} accessibilityViewIsModal>
          <View style={styles.testa}>
            <View style={styles.icona}>
              <IconaAggiorna misura={24} colore={VERDE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titolo}>{t.app_titolo}</Text>
              <Text style={styles.sottotitolo}>{t.app_versione.replace('{v}', info.versione)}</Text>
            </View>
          </View>

          {righe.length > 0 ? (
            <ScrollView style={styles.corpo} showsVerticalScrollIndicator={false}>
              <Text style={styles.sezione}>{t.app_cosaCambia}</Text>
              {righe.map((r, i) => (
                <View key={i} style={styles.voce}>
                  <Text style={styles.punto}>•</Text>
                  <Text style={styles.testoVoce}>{r}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.pulsanti}>
            <Pressable onPress={onChiudi} style={[styles.pulsante, styles.piuTardi]} accessibilityRole="button">
              <Text style={styles.testoPiuTardi}>{t.agg_piuTardi}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const link = linkStore();
                if (link) Linking.openURL(link).catch(() => {});
                onChiudi();
              }}
              style={[styles.pulsante, styles.ora]}
              accessibilityRole="button"
            >
              <Text style={styles.testoOra}>{t.app_aggiorna}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: 'rgba(15,30,25,0.5)', justifyContent: 'center', alignItems: 'center', padding: 22 },
  popup: { width: '100%', maxWidth: 380, maxHeight: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 40 },
  testa: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icona: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dcebdc', alignItems: 'center', justifyContent: 'center' },
  titolo: { color: TESTO, fontSize: 19, fontWeight: '800' },
  sottotitolo: { color: GRIGIO, fontSize: 13, marginTop: 2 },
  corpo: { flexGrow: 0, flexShrink: 1, marginTop: 4 },
  sezione: { color: GRIGIO, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 4 },
  voce: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 4 },
  punto: { color: VERDE, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  testoVoce: { flex: 1, color: TESTO, fontSize: 14.5, lineHeight: 21 },
  pulsanti: { flexDirection: 'row', gap: 10, marginTop: 18 },
  pulsante: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  piuTardi: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d6cfbf' },
  testoPiuTardi: { color: TESTO, fontSize: 15, fontWeight: '700' },
  ora: { flex: 1.3, backgroundColor: VERDE },
  testoOra: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
