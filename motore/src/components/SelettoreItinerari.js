import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coloreCategoria } from '../categorie';
import { formattaDistanza } from '../distanza';
import { testoLocalizzato } from '../i18n';
import { iconaItinerario, PARTENZE, testoLunghezza } from '../itinerari';
import { coloreApertura, statoApertura, testoAperturaBreve } from '../orari';
import IconaCondividi from './IconaCondividi';
import CondividiItinerario from './CondividiItinerario';

/**
 * Itinerari, a pagina intera, in due viste:
 *  1) elenco: per ogni itinerario nome, lunghezza, durata e numero di tappe (solo l'itinerario, senza il tratto iniziale)
 *  2) dettaglio: da dove parti (Piazzale Roma, Stazione o posizione attuale), tutte le tappe e il pulsante "Avvia"
 * props: visibile, onChiudi, itinerari, luoghiPerId, lingua, t,
 *        partenza, onPartenza(id), posizione { stato, puoiChiedere, attiva, apriImpostazioni },
 *        distanzaDaVenezia (metri, se l'utente è lontano), lunghezza(it) -> { metri, ... } | null,
 *        attivoId, onScegli(id), adesso (Date, per gli orari di apertura), visitati (id dei luoghi "Ci sono stato"),
 *        onCrea, onImporta, onEsporta (pulsanti in basso nell'elenco; se mancano il pulsante è spento),
 *        onModifica(id), onElimina(id) (solo per gli itinerari creati dall'utente, con it.utente = true),
 *        onCondividi(it) (pulsante 📤 nel dettaglio, per tutti gli itinerari), apriId (apre subito quel dettaglio)
 */
export default function SelettoreItinerari({
  visibile,
  onChiudi,
  itinerari,
  luoghiPerId,
  lingua,
  t,
  partenza,
  onPartenza,
  posizione,
  distanzaDaVenezia,
  lunghezza,
  attivoId,
  onScegli,
  adesso,
  visitati = [],
  onCrea,
  onImporta,
  onEsporta,
  onModifica,
  onElimina,
  onCondividi,
  apriId,
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orizzontale = width > height;
  const [apertoId, setApertoId] = useState(null); // itinerario mostrato nella pagina di dettaglio
  const [confermaElimina, setConfermaElimina] = useState(false); // "Elimina" va toccato due volte
  useEffect(() => setConfermaElimina(false), [apertoId]);
  const [cartolinaAperta, setCartolinaAperta] = useState(false); // anteprima della cartolina dell'itinerario
  useEffect(() => setCartolinaAperta(false), [apertoId]);
  useEffect(() => {
    if (visibile) setApertoId(apriId || null); // si riapre dall'elenco, o dal dettaglio chiesto (link di un amico)
  }, [visibile, apriId]);
  const aperto = itinerari.find((it) => it.id === apertoId) || null;

  const attesaPosizione = partenza === 'posizione' && posizione.stato !== 'attivo';
  const puoiAvviare = partenza && !attesaPosizione;
  // il tasto "indietro" di Android dal dettaglio torna all'elenco
  const indietro = () => (aperto ? setApertoId(null) : onChiudi());

  let avvisoPosizione = null;
  if (partenza === 'posizione') {
    if (posizione.stato === 'ricerca' || posizione.stato === 'spento') {
      avvisoPosizione = (
        <View style={styles.riga}>
          <ActivityIndicator color="#1d4ed8" />
          <Text style={styles.avviso}>{t('cercoPosizione')}</Text>
        </View>
      );
    } else if (posizione.stato === 'negato' || posizione.stato === 'errore') {
      const negato = posizione.stato === 'negato';
      const impostazioni = negato && !posizione.puoiChiedere;
      avvisoPosizione = (
        <View>
          <Text style={styles.avviso}>{negato ? t('permessoNegato') : t('posizioneErrore')}</Text>
          <Pressable
            onPress={impostazioni ? posizione.apriImpostazioni : posizione.attiva}
            style={({ pressed }) => [styles.azione, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.testoAzione}>{impostazioni ? t('apriImpostazioni') : t('riprova')}</Text>
          </Pressable>
        </View>
      );
    } else if (distanzaDaVenezia != null) {
      avvisoPosizione = (
        <Text style={styles.avviso}>{t('itin_lontano').replace('{d}', formattaDistanza(distanzaDaVenezia, t))}</Text>
      );
    }
  }

  // ---- pagina 1: elenco degli itinerari ----
  const ufficiali = itinerari.filter((it) => !it.utente);
  const miei = itinerari.filter((it) => it.utente);
  const scheda = (it) => {
        const attivo = it.id === attivoId;
        const fatte = it.tappe.filter((id) => visitati.includes(id)).length;
        return (
          <Pressable
            key={it.id}
            onPress={() => setApertoId(it.id)}
            testID={`itinerario-${it.id}`}
            style={({ pressed }) => [styles.itinerario, attivo && styles.itinerarioAttivo, pressed && { backgroundColor: '#eef5fa' }]}
            accessibilityRole="button"
            accessibilityState={{ selected: attivo }}
          >
            <Text style={styles.iconaGrande}>{iconaItinerario(it)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nomeItinerario} numberOfLines={2}>
                {testoLocalizzato(it.titolo, lingua)}
              </Text>
              <Text style={styles.lunghezza}>{testoLunghezza({ metri: it.metri }, t, it.nautico)}</Text>
              <Text style={styles.contaTappe}>
                {it.tappe.length} {t('tappe')}
                {fatte ? <Text style={styles.contaVisitate}>{`  ·  ✓\uFE0E ${fatte}/${it.tappe.length}`}</Text> : null}
                {attivo ? <Text style={styles.inCorso}>{`  ·  ${t('itin_inCorso')}`}</Text> : null}
              </Text>
            </View>
            <Text style={styles.freccia}>›</Text>
          </Pressable>
        );
  };
  const elenco = (
    <ScrollView contentContainerStyle={styles.contenuto}>
      {ufficiali.length > 0 && <Text style={styles.gruppo}>{t('itin_consigliati')}</Text>}
      {ufficiali.map(scheda)}
      <Text style={styles.gruppo}>{t('itin_miei')}</Text>
      {miei.length ? miei.map(scheda) : <Text style={styles.vuoto}>{t('itin_mieiVuoto')}</Text>}
      <Text style={styles.nota}>{t('itin_notaElenco')}</Text>
    </ScrollView>
  );

  // ---- pagina 2: dettaglio dell'itinerario scelto ----
  const lDettaglio = aperto ? (puoiAvviare ? lunghezza(aperto) : null) || { metri: aperto.metri } : null;
  const dettaglio = aperto && (
    <>
      <ScrollView contentContainerStyle={styles.contenuto}>
        <Text style={styles.lunghezzaDettaglio}>
          {testoLunghezza(lDettaglio, t, aperto.nautico)} · {aperto.tappe.length} {t('tappe')}
        </Text>
        {aperto.nautico && (
          <View style={styles.etichettaNautica}>
            <Text style={styles.testoEtichettaNautica}>{t('itin_nautico')}</Text>
          </View>
        )}

        {aperto.utente && (onModifica || onElimina) && (
          <View style={styles.rigaGestione}>
            {onModifica && (
              <Pressable
                onPress={() => onModifica(aperto.id)}
                testID="itin-modifica"
                style={({ pressed }) => [styles.pulsanteMio, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
              >
                <Text style={styles.testoPulsanteMio}>✏️ {t('itin_modifica')}</Text>
              </Pressable>
            )}
            {onElimina && (
              <Pressable
                onPress={() => {
                  if (!confermaElimina) return setConfermaElimina(true);
                  setApertoId(null);
                  onElimina(aperto.id);
                }}
                testID="itin-elimina"
                style={({ pressed }) => [styles.pulsanteMio, confermaElimina && styles.pulsanteEliminaConferma, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
              >
                <Text style={[styles.testoPulsanteMio, { color: confermaElimina ? '#fff' : '#b91c1c' }]}>
                  🗑 {confermaElimina ? t('itin_eliminaConferma') : t('itin_elimina')}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <Text style={styles.passo}>{t('daDoveParti')}</Text>
        <View style={styles.partenze}>
          {PARTENZE.map((p) => {
            const scelta = partenza === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => onPartenza(p.id)}
                style={({ pressed }) => [styles.partenza, scelta && styles.partenzaScelta, pressed && { opacity: 0.85 }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: scelta }}
              >
                <Text style={[styles.iconaPartenza, scelta && { color: '#fff' }]}>{p.icona}</Text>
                <Text style={[styles.testoPartenza, scelta && { color: '#fff' }]} numberOfLines={2}>
                  {t(p.chiave)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {avvisoPosizione && <View style={styles.boxAvviso}>{avvisoPosizione}</View>}

        <Text style={[styles.passo, { marginTop: 18 }]}>{t('itin_leTappe')}</Text>
        <View style={styles.tappe}>
          {aperto.tappe.map((id, i) => {
            const luogo = luoghiPerId[id];
            const ap = luogo ? statoApertura(luogo, adesso) : null;
            const testoAp = testoAperturaBreve(ap, t);
            const visto = visitati.includes(id);
            return (
              <View key={id} style={styles.tappa}>
                <View style={[styles.numeroTappa, { backgroundColor: coloreCategoria(luogo?.categoria) }]}>
                  <Text style={styles.testoNumeroTappa}>{i + 1}</Text>
                </View>
                <Text style={styles.nomeTappa} numberOfLines={1}>
                  {luogo?.nome || id}
                </Text>
                {visto ? <Text style={styles.tappaVista}>{'✓\uFE0E'}</Text> : null}
                {testoAp ? (
                  <Text style={[styles.aperturaTappa, { color: coloreApertura(ap) }]} numberOfLines={1}>
                    {testoAp}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
        <Text style={styles.nota}>{t('itin_nota')}</Text>
      </ScrollView>
      <View style={styles.piede}>
        {!partenza && <Text style={styles.suggerimento}>{t('primaPartenza')}</Text>}
        <Pressable
          disabled={!puoiAvviare}
          onPress={() => onScegli(aperto.id)}
          testID="avvia-itinerario"
          style={({ pressed }) => [styles.avvia, !puoiAvviare && styles.spento, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !puoiAvviare }}
        >
          <Text style={styles.testoAvvia}>
            {iconaItinerario(aperto)} {t('itin_avvia')}
          </Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <Modal
      visible={visibile}
      animationType="slide"
      onRequestClose={indietro}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <View
        style={[
          styles.scheda,
          orizzontale && styles.schedaOrizzontale,
          { paddingTop: insets.top, paddingBottom: 12 + insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
        ]}
      >
        <View style={styles.testata}>
          {aperto && (
            <Pressable
              onPress={() => setApertoId(null)}
              style={({ pressed }) => [styles.chiudi, { marginRight: 10 }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t('itin_indietro')}
              hitSlop={8}
            >
              <Text style={styles.testoIndietro}>‹</Text>
            </Pressable>
          )}
          <Text style={styles.titolo} numberOfLines={2}>
            {aperto ? `${iconaItinerario(aperto)} ${testoLocalizzato(aperto.titolo, lingua)}` : t('itinerari')}
          </Text>
          {aperto && (
            <Pressable
              onPress={() => setCartolinaAperta(true)}
              testID="itin-cartolina"
              hitSlop={8}
              style={({ pressed }) => [styles.chiudi, styles.condividi, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t('cond_condividi')}
            >
              <IconaCondividi />
            </Pressable>
          )}
          {aperto && onCondividi && (
            <Pressable
              onPress={() => onCondividi(aperto)}
              testID="itin-condividi"
              style={({ pressed }) => [styles.chiudi, styles.condividi, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t('cond_condividi')}
              hitSlop={8}
            >
              <Text style={styles.testoCondividi}>📤</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onChiudi}
            style={({ pressed }) => [styles.chiudi, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t('chiudi')}
            hitSlop={8}
          >
            <Text style={styles.testoChiudi}>✕</Text>
          </Pressable>
        </View>
        {cartolinaAperta && aperto && (
          <CondividiItinerario
            itinerario={aperto}
            luoghiPerId={luoghiPerId}
            lingua={lingua}
            t={t}
            lunghezza={lDettaglio}
            onChiudi={() => setCartolinaAperta(false)}
          />
        )}
        {aperto ? dettaglio : elenco}
        {!aperto && (
          // barra di gestione: crea un nuovo itinerario, importa (da un amico) ed esporta (per condividere)
          <View style={styles.barraGestione}>
            {[
              { id: 'crea', icona: '＋', testo: t('itin_crea'), azione: onCrea, principale: true },
              { id: 'importa', icona: '📥', testo: t('itin_importa'), azione: onImporta },
              { id: 'esporta', icona: '📤', testo: t('itin_esporta'), azione: onEsporta },
            ].map((b) => (
              <Pressable
                key={b.id}
                onPress={b.azione}
                disabled={!b.azione}
                testID={`gestione-${b.id}`}
                style={({ pressed }) => [styles.pulsanteGestione, !b.azione && styles.spento, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
                accessibilityLabel={b.testo}
              >
                <View style={[styles.cerchioGestione, b.principale && styles.cerchioCrea]}>
                  <Text style={[styles.iconaGestione, b.principale && styles.iconaCrea]}>{b.icona}</Text>
                </View>
                <Text style={styles.testoGestione}>{b.testo}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const BLU = '#0f3d5e';

const styles = StyleSheet.create({
  // pagina intera (c'è spazio per molti itinerari e, più avanti, per i pulsanti crea / importa / esporta)
  scheda: { flex: 1, backgroundColor: '#fff' },
  schedaOrizzontale: { paddingHorizontal: '12%' },
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
  chiudi: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  testoChiudi: { fontSize: 16, color: '#334155', fontWeight: '700' },
  contenuto: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  passo: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 8, marginBottom: 8 },
  numeroPasso: { color: '#b45309' },
  partenze: { flexDirection: 'row', gap: 8 },
  partenza: {
    flex: 1,
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 3,
  },
  partenzaScelta: { backgroundColor: BLU, borderColor: BLU },
  iconaPartenza: { fontSize: 18, color: '#1d4ed8' },
  testoPartenza: { fontSize: 13, fontWeight: '700', color: '#334155', textAlign: 'center' },
  boxAvviso: { marginTop: 10, backgroundColor: '#eff6ff', borderRadius: 12, padding: 10 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avviso: { fontSize: 14, color: '#334155', lineHeight: 19, flexShrink: 1 },
  azione: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#1d4ed8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  testoAzione: { color: '#fff', fontWeight: '700', fontSize: 14 },
  suggerimento: { fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 18 },
  spento: { opacity: 0.45 },
  itinerario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  itinerarioAttivo: { borderColor: '#f3c34b', backgroundColor: '#fffbeb' },
  iconaGrande: { fontSize: 26 },
  nomeItinerario: { fontSize: 17, fontWeight: '800', color: BLU, marginBottom: 3 },
  freccia: { fontSize: 28, color: '#94a3b8', fontWeight: '300', marginLeft: 4 },
  contaVisitate: { color: '#16a34a', fontWeight: '700' },
  inCorso: { color: '#b45309', fontWeight: '700' },
  lunghezzaDettaglio: { fontSize: 15, fontWeight: '700', color: '#b45309', marginTop: 4, marginBottom: 8 },
  testoIndietro: { fontSize: 24, lineHeight: 26, color: '#334155', fontWeight: '700', marginTop: -2 },
  tappaVista: { fontSize: 13, color: '#16a34a', fontWeight: '800' },
  condividi: { marginRight: 8, backgroundColor: '#e0f2fe' },
  testoCondividi: { fontSize: 17 },
  gruppo: { fontSize: 13, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6, marginBottom: 8 },
  vuoto: { fontSize: 14, color: '#64748b', lineHeight: 19, marginBottom: 6 },
  rigaGestione: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  pulsanteMio: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  pulsanteEliminaConferma: { backgroundColor: '#b91c1c', borderColor: '#b91c1c' },
  testoPulsanteMio: { fontSize: 14, fontWeight: '700', color: '#0f3d5e' },
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerchioCrea: { backgroundColor: BLU, borderColor: BLU },
  iconaGestione: { fontSize: 24, lineHeight: 28 },
  iconaCrea: { color: '#fff', fontSize: 28, fontWeight: '700' },
  testoGestione: { fontSize: 13, fontWeight: '700', color: '#334155' },
  piede: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  avvia: { backgroundColor: BLU, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  testoAvvia: { color: '#fff', fontSize: 16, fontWeight: '800' },
  etichettaNautica: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: -2,
    marginBottom: 8,
  },
  testoEtichettaNautica: { fontSize: 12, fontWeight: '700', color: '#0369a1' },
  lunghezza: { fontSize: 14, fontWeight: '700', color: '#b45309' },
  tappe: { gap: 4 },
  tappa: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numeroTappa: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  testoNumeroTappa: { color: '#fff', fontSize: 11, fontWeight: '800' },
  nomeTappa: { flex: 1, fontSize: 14, color: '#1f2937' },
  aperturaTappa: { fontSize: 12, fontWeight: '700', maxWidth: '45%' },
  contaTappe: { fontSize: 12, color: '#64748b', marginTop: 3 },
  nota: { fontSize: 12, color: '#64748b', lineHeight: 17, marginTop: 10 },
});
