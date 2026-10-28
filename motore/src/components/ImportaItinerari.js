import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { leggiLink } from '../condivisione';
import { testoLunghezza } from '../itinerari';
import { metriTappe } from '../itinerariUtente';

const BLU = '#0f3d5e';
const MAX_NOMI = 6; // tappe elencate per ogni itinerario nell'anteprima

/**
 * Pagina intera per aggiungere itinerari o luoghi del cuore ricevuti da un amico.
 *  - aperta da un link: mostra subito l'anteprima di ciò che è arrivato
 *  - aperta dal pulsante "Importa": c'è un campo dove incollare il link (o il messaggio intero)
 * props: visibile, ricevuto (risultato di leggiLink: { tipo: 'itinerari', itinerari } | { tipo: 'cuore', luoghi },
 *        oppure null per incollare), luoghiPerId, t,
 *        onAggiungi(itinerari) -> numero di itinerari aggiunti, onAggiungiCuore(id) -> numero di luoghi aggiunti,
 *        onApriConsigliato(id), onChiudi
 */
export default function ImportaItinerari({ visibile, ricevuto, luoghiPerId, t, onAggiungi, onAggiungiCuore, onApriConsigliato, onChiudi }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orizzontale = width > height;
  const [testo, setTesto] = useState('');
  const [esito, setEsito] = useState(null); // numero di itinerari aggiunti, dopo il tocco su "Aggiungi"

  useEffect(() => {
    if (visibile) {
      setTesto('');
      setEsito(null);
    }
  }, [visibile]);

  // dal link incollato, se non arrivano già dal link che ha aperto l'app
  const letto = useMemo(() => (ricevuto ? null : leggiLink(testo)), [ricevuto, testo]);
  const dati = ricevuto || letto;
  const lista = dati?.tipo === 'itinerari' ? dati.itinerari : null;
  const cuoreRicevuto = dati?.tipo === 'cuore' ? dati.luoghi.filter((id) => luoghiPerId[id]) : null;
  const cuoreMancanti = dati?.tipo === 'cuore' ? dati.luoghi.length - cuoreRicevuto.length : 0;

  const anteprime = useMemo(
    () =>
      (lista || []).map((r) => {
        const note = r.tappe.filter((id) => luoghiPerId[id]);
        return { ...r, note, mancanti: r.tappe.length - note.length, metri: note.length > 1 ? metriTappe(note, luoghiPerId) : 0 };
      }),
    [lista, luoghiPerId]
  );
  const validi = anteprime.filter((a) => a.titolo && a.note.length >= 2);

  const aggiungi = () =>
    setEsito(cuoreRicevuto ? onAggiungiCuore(cuoreRicevuto) : onAggiungi(validi.map((a) => ({ titolo: a.titolo, tappe: a.note }))));
  const puoiAggiungere = cuoreRicevuto ? cuoreRicevuto.length > 0 : validi.length > 0;

  return (
    <Modal visible={visibile} animationType="slide" onRequestClose={onChiudi} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <View
        style={[
          styles.pagina,
          orizzontale && { paddingHorizontal: '12%' },
          { paddingTop: insets.top, paddingBottom: 12 + insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
        ]}
      >
        <View style={styles.testata}>
          <Text style={styles.titolo}>
            {cuoreRicevuto ? t('imp_titoloCuore') : lista && lista.length > 1 ? t('imp_titoloPiu') : t('imp_titolo')}
          </Text>
          <Pressable onPress={onChiudi} hitSlop={8} style={styles.chiudi} accessibilityRole="button" accessibilityLabel={t('chiudi')}>
            <Text style={styles.testoChiudi}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
          {!ricevuto && (
            <>
              <Text style={styles.spiega}>{t('imp_incolla')}</Text>
              <TextInput
                value={testo}
                onChangeText={(v) => {
                  setTesto(v);
                  setEsito(null);
                }}
                placeholder="https://fcdeveloperapps.github.io/venezia/i/?d=…"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                multiline
                autoCorrect={false}
                autoCapitalize="none"
                testID="imp-testo"
                accessibilityLabel={t('imp_incolla')}
              />
              {testo.trim().length > 0 && !letto && <Text style={styles.errore}>{t('imp_linkNonValido')}</Text>}
              {letto?.tipo === 'consigliato' && (
                <View style={styles.scheda}>
                  <Text style={styles.nome}>⭐ {letto.nome}</Text>
                  <Text style={styles.dettagli}>{t('imp_consigliato')}</Text>
                  <Pressable onPress={() => onApriConsigliato(letto.id)} style={({ pressed }) => [styles.azione, pressed && { opacity: 0.85 }]}>
                    <Text style={styles.testoAzione}>{t('imp_apri')}</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {anteprime.map((a, i) => (
            <View key={i} style={styles.scheda}>
              <Text style={styles.nome}>🧭 {a.titolo}</Text>
              <Text style={styles.dettagli}>
                {a.note.length} {t('tappe')}
                {a.metri ? ` · ${testoLunghezza({ metri: a.metri }, t)}` : ''}
              </Text>
              <Text style={styles.tappe} numberOfLines={3}>
                {a.note
                  .slice(0, MAX_NOMI)
                  .map((id) => luoghiPerId[id]?.nome)
                  .join(' → ')}
                {a.note.length > MAX_NOMI ? ' → …' : ''}
              </Text>
              {a.mancanti > 0 && <Text style={styles.avviso}>{t('imp_tappeMancanti').replace('{n}', a.mancanti)}</Text>}
            </View>
          ))}

          {cuoreRicevuto && (
            <View style={styles.scheda}>
              <Text style={styles.nome}>
                <Text style={{ color: '#e11d48' }}>{'♥\uFE0E'}</Text> {cuoreRicevuto.length} {t('imp_luoghi')}
              </Text>
              {cuoreRicevuto.map((id) => (
                <Text key={id} style={styles.tappe}>
                  • {luoghiPerId[id].nome}
                </Text>
              ))}
              {cuoreMancanti > 0 && <Text style={styles.avviso}>{t('imp_luoghiMancanti').replace('{n}', cuoreMancanti)}</Text>}
            </View>
          )}

          {esito != null && (
            <Text style={[styles.esito, esito === 0 && { color: '#64748b' }]} testID="imp-esito">
              {cuoreRicevuto
                ? esito === 0
                  ? t('imp_cuoreGiaPresenti')
                  : t('imp_cuoreAggiunti').replace('{n}', esito)
                : esito === 0
                  ? t('imp_giaPresenti')
                  : esito === 1
                    ? t('imp_aggiunto')
                    : t('imp_aggiunti').replace('{n}', esito)}
            </Text>
          )}
        </ScrollView>

        {puoiAggiungere && (
          <View style={styles.piede}>
            {esito == null ? (
              <Pressable onPress={aggiungi} testID="imp-aggiungi" style={({ pressed }) => [styles.azione, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                <Text style={styles.testoAzione}>
                  ＋{' '}
                  {cuoreRicevuto
                    ? t('imp_aggiungiCuore')
                    : validi.length > 1
                      ? t('imp_aggiungiTutti').replace('{n}', validi.length)
                      : t('imp_aggiungi')}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={onChiudi} testID="imp-fatto" style={({ pressed }) => [styles.azione, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                <Text style={styles.testoAzione}>{t('ed_fatto')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: '#fff' },
  testata: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titolo: { flex: 1, fontSize: 20, fontWeight: '800', color: BLU },
  chiudi: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  testoChiudi: { fontSize: 16, color: '#334155', fontWeight: '700' },
  contenuto: { padding: 16 },
  spiega: { fontSize: 15, color: '#334155', lineHeight: 21, marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    fontSize: 14,
    color: '#0f172a',
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  errore: { fontSize: 14, color: '#b91c1c', marginBottom: 10 },
  scheda: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, marginBottom: 12 },
  nome: { fontSize: 17, fontWeight: '800', color: BLU, marginBottom: 4 },
  dettagli: { fontSize: 14, fontWeight: '700', color: '#b45309', marginBottom: 6 },
  tappe: { fontSize: 14, color: '#334155', lineHeight: 20 },
  avviso: { fontSize: 13, color: '#b45309', marginTop: 8, lineHeight: 18 },
  esito: { fontSize: 15, fontWeight: '700', color: '#16a34a', textAlign: 'center', marginTop: 4 },
  piede: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  azione: { backgroundColor: BLU, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  testoAzione: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
