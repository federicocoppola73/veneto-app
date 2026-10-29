import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coloreCategoria } from '../categorie';
import { testoDistanza } from '../distanza';
import { coloreApertura, statoApertura, testoAperturaBreve } from '../orari';
import ListaLuoghiSalvati, { BLU_LUOGO } from './ListaLuoghiSalvati';

export const ROSSO_CUORE = '#e11d48';
export const GRIGIO_CUORE = '#9ca3af';
export const VERDE_VISITATO = '#16a34a'; // spunta "Ci sono stato"

/**
 * Pulsante ♥ con la spunta ✓ (sulla mappa, sopra 🚻) e pagina intera con le liste personali, in due schede:
 *  - ♥ Del cuore: luoghi del cuore, con 📥 Importa e 📤 Esporta in basso
 *  - ✓ Visitati: luoghi segnati con "Ci sono stato"
 * Toccando un luogo si chiude la pagina e si apre la sua scheda sulla mappa; il cuore rosso (o la spunta verde) lo toglie.
 * props: preferiti (id), visitati (id), luoghiPerId, distanze (metri, se la posizione è attiva), adesso, t,
 *        onScegli(id), onTogli(id), onTogliVisitato(id), stilePulsante (per metterlo tra i pulsanti della mappa),
 *        onVediMappa() / onVediVisitati() (pulsante "Vedi sulla mappa": accende il filtro corrispondente),
 *        onEsportaCuore(), onImportaCuore()
 *        luoghiSalvati, posizione, onAttivaPosizione(), onImpostazioniPosizione(), onSalvaLuogo(descr), onScegliLuogo(luogo), onCancellaLuogo(id)
 *   (terza scheda 📍 Salvati: luoghi salvati con la posizione attuale)
 */
export default function Preferiti({
  preferiti,
  visitati = [],
  luoghiPerId,
  distanze,
  adesso,
  t,
  onScegli,
  onTogli,
  onTogliVisitato,
  stilePulsante,
  onVediMappa,
  onVediVisitati,
  onEsportaCuore,
  onImportaCuore,
  luoghiSalvati = [],
  posizione = { stato: 'spento', puoiChiedere: true, coordinate: null },
  onAttivaPosizione,
  onImpostazioniPosizione,
  onSalvaLuogo,
  onScegliLuogo,
  onCancellaLuogo,
}) {
  const insets = useSafeAreaInsets();
  const [aperto, setAperto] = useState(false);
  const [scheda, setScheda] = useState('cuore'); // 'cuore' | 'visitati' | 'luoghi'
  const listaCuore = preferiti.map((id) => luoghiPerId[id]).filter(Boolean);
  const listaVisitati = visitati.map((id) => luoghiPerId[id]).filter(Boolean);
  const cuore = scheda === 'cuore';
  const lista = cuore ? listaCuore : listaVisitati;
  const luoghi = scheda === 'luoghi';
  const n = luoghi ? luoghiSalvati.length : lista.length;
  const colore = cuore ? ROSSO_CUORE : VERDE_VISITATO;
  const simbolo = cuore ? '♥\uFE0E' : '✓\uFE0E';
  const vediMappa = luoghi ? null : cuore ? onVediMappa : onVediVisitati;
  const togli = cuore ? onTogli : onTogliVisitato;

  const linguetta = (id, testo, numero, coloreAttivo, segno) => {
    const attiva = scheda === id;
    return (
      <Pressable
        onPress={() => setScheda(id)}
        testID={`liste-${id}`}
        style={[styles.linguetta, attiva && { backgroundColor: coloreAttivo, borderColor: coloreAttivo }]}
        accessibilityRole="tab"
        accessibilityState={{ selected: attiva }}
      >
        <Text style={[styles.testoLinguetta, { color: attiva ? '#fff' : coloreAttivo }]}>{segno}</Text>
        <Text style={[styles.testoLinguetta, attiva && { color: '#fff' }]} numberOfLines={1}>
          {testo}
        </Text>
        <Text style={[styles.numeroLinguetta, attiva && { color: '#fff' }]}>{numero}</Text>
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        onPress={() => setAperto(true)}
        testID="pulsante-liste"
        style={({ pressed }) => [stilePulsante || styles.pulsante, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={t('liste_titolo')}
        hitSlop={6}
      >
        <Text style={[styles.cuorePulsante, { color: listaCuore.length ? ROSSO_CUORE : stilePulsante ? GRIGIO_CUORE : '#fff' }]}>
          {listaCuore.length ? '♥\uFE0E' : '♡\uFE0E'}
        </Text>
        <View style={[styles.spuntaPulsante, { backgroundColor: listaVisitati.length ? VERDE_VISITATO : GRIGIO_CUORE }]}>
          <Text style={styles.testoSpuntaPulsante}>{'✓\uFE0E'}</Text>
        </View>
      </Pressable>

      <Modal visible={aperto} animationType="slide" onRequestClose={() => setAperto(false)} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
        <View style={[styles.pagina, { paddingTop: (insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44)) + 8, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
          <View style={styles.intestazione}>
            <Text style={styles.titolo}>{t('liste_titolo')}</Text>
            <Pressable onPress={() => setAperto(false)} hitSlop={10} accessibilityLabel={t('chiudi')}>
              <Text style={styles.chiudi}>{t('chiudi')}</Text>
            </Pressable>
          </View>
          <View style={styles.linguette}>
            {linguetta('cuore', t('filtroCuore'), listaCuore.length, ROSSO_CUORE, '♥\uFE0E')}
            {linguetta('visitati', t('filtroVisitati'), listaVisitati.length, VERDE_VISITATO, '✓\uFE0E')}
            {linguetta('luoghi', t('filtroLuoghiSalvati'), luoghiSalvati.length, BLU_LUOGO, '📍')}
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 8 }}>
            {luoghi ? (
              <ListaLuoghiSalvati
                luoghi={luoghiSalvati}
                posizione={posizione}
                t={t}
                onAttiva={onAttivaPosizione}
                onImpostazioni={onImpostazioniPosizione}
                onSalva={onSalvaLuogo}
                onScegli={(l) => {
                  setAperto(false);
                  onScegliLuogo(l);
                }}
                onCancella={onCancellaLuogo}
              />
            ) : n === 0 ? (
              <View style={styles.vuoto}>
                <Text style={[styles.cuoreVuoto, !cuore && { fontWeight: '800' }]}>{cuore ? '♡\uFE0E' : '✓\uFE0E'}</Text>
                <Text style={styles.testoVuoto}>{cuore ? t('pref_vuoto') : t('vis_filtroVuoto')}</Text>
              </View>
            ) : (
              <>
                {vediMappa && (
                  <Pressable
                    onPress={() => {
                      setAperto(false);
                      vediMappa();
                    }}
                    style={({ pressed }) => [styles.vediMappa, pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.testoVediMappa}>🗺  {t('pref_vediTutti')}</Text>
                  </Pressable>
                )}
                <Text style={styles.spiegazione}>{cuore ? t('pref_aiuto') : t('vis_aiuto')}</Text>
                {lista.map((l) => {
                  const ap = statoApertura(l, adesso);
                  const testoAp = testoAperturaBreve(ap, t);
                  return (
                    <View key={l.id} style={styles.voce}>
                      <Pressable
                        style={({ pressed }) => [styles.areaVoce, pressed && { opacity: 0.7 }]}
                        onPress={() => {
                          setAperto(false);
                          onScegli(l.id);
                        }}
                        accessibilityRole="button"
                        accessibilityHint={t('pref_vediMappa')}
                      >
                        <View style={[styles.pallino, { backgroundColor: coloreCategoria(l.categoria) }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.nome} numberOfLines={2}>{l.nome}</Text>
                          <Text style={styles.dettagli} numberOfLines={2}>
                            {t(`cat_${l.categoria}`)} · {l.sestiere}
                            {distanze && distanze[l.id] != null ? ` · ${testoDistanza(distanze[l.id], t)}` : ''}
                          </Text>
                          {testoAp ? <Text style={[styles.dettagli, { color: coloreApertura(ap) }]}>{testoAp}</Text> : null}
                        </View>
                      </Pressable>
                      {togli && (
                        <Pressable
                          onPress={() => togli(l.id)}
                          hitSlop={8}
                          style={styles.togli}
                          accessibilityRole="button"
                          accessibilityLabel={`${cuore ? t('pref_togli') : t('vis_togli')}: ${l.nome}`}
                        >
                          <Text style={[styles.cuoreVoce, { color: colore }, !cuore && { fontWeight: '800', fontSize: 22 }]}>{simbolo}</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          {cuore && (onImportaCuore || onEsportaCuore) && (
            // come negli itinerari: 📥 Importa (luoghi consigliati da un amico) e 📤 Esporta (per condividerli)
            <View style={[styles.barraGestione, { paddingBottom: 12 + insets.bottom }]}>
              {[
                { id: 'importa', icona: '📥', testo: t('itin_importa'), azione: onImportaCuore },
                { id: 'esporta', icona: '📤', testo: t('itin_esporta'), azione: listaCuore.length ? onEsportaCuore : null },
              ].map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    if (b.id === 'importa') setAperto(false);
                    b.azione();
                  }}
                  disabled={!b.azione}
                  testID={`cuore-${b.id}`}
                  style={({ pressed }) => [styles.pulsanteGestione, !b.azione && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityLabel={b.testo}
                >
                  <View style={styles.cerchioGestione}>
                    <Text style={styles.iconaGestione}>{b.icona}</Text>
                  </View>
                  <Text style={styles.testoGestione}>{b.testo}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {!cuore && <View style={{ height: insets.bottom }} />}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pulsante: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuorePulsante: { fontSize: 24, lineHeight: 28, fontWeight: '700' },
  // piccola spunta verde sovrapposta al cuore (stesso simbolo del filtro "✓ Visitati")
  spuntaPulsante: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoSpuntaPulsante: { fontSize: 8, lineHeight: 10, fontWeight: '900', color: '#fff' },
  pagina: { flex: 1, backgroundColor: '#fff' },
  intestazione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  titolo: { fontSize: 20, fontWeight: '800', color: '#0f172a', flexShrink: 1 },
  linguette: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  linguetta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  testoLinguetta: { fontSize: 15, fontWeight: '700', color: '#334155', flexShrink: 1 },
  numeroLinguetta: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  barraGestione: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  pulsanteGestione: { alignItems: 'center', gap: 4, minWidth: 80 },
  cerchioGestione: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconaGestione: { fontSize: 24, lineHeight: 28 },
  testoGestione: { fontSize: 13, fontWeight: '700', color: '#334155' },
  chiudi: { fontSize: 15, color: '#0f3d5e', fontWeight: '600' },
  vediMappa: {
    backgroundColor: '#0f3d5e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  testoVediMappa: { color: '#fff', fontSize: 15, fontWeight: '700' },
  spiegazione: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  voce: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingLeft: 12,
    backgroundColor: '#fff',
  },
  areaVoce: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  pallino: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff', elevation: 1 },
  nome: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  dettagli: { fontSize: 13, color: '#64748b', marginTop: 1 },
  togli: { width: 48, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  cuoreVoce: { fontSize: 24 },
  vuoto: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 10 },
  cuoreVuoto: { fontSize: 54, color: GRIGIO_CUORE },
  testoVuoto: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 21 },
});
