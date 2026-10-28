import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  coloreSchema,
  direzioniDallaFermata,
  lineaVaporetto,
  lineeAutobusDellaFermata,
  lineeDellaFermata,
  nomeFermata,
  urlOrariLinea,
} from '../vaporetti';
import { minutiVenezia, orarioDelGiorno, prossimePartenze, validitaOrariPer } from '../orariVaporetti';
import { useAdesso } from '../adesso';

const RIGA = 46; // altezza di una fermata nello schema
const LETTERE = 'abcdefgh'; // segni per le corse che non arrivano al capolinea principale
// "2027-10-04" / "20271004" -> "4/10/2027"
const dataBreve = (d) => {
  const c = d.replace(/-/g, '');
  return `${Number(c.slice(6, 8))}/${Number(c.slice(4, 6))}/${c.slice(0, 4)}`;
};
const BARRA = 6; // spessore della linea

// Targhetta della linea (1, 2, 4.1, N...) con i colori ACTV
export function TarghettaLinea({ linea, piccola, selezionata, onPress }) {
  const contenuto = (
    <View
      style={[
        styles.targhetta,
        piccola && styles.targhettaPiccola,
        { backgroundColor: linea.colore, borderColor: selezionata ? '#0f172a' : linea.colore },
        selezionata && styles.targhettaSelezionata,
      ]}
    >
      <Text style={[styles.testoTarghetta, piccola && styles.testoTarghettaPiccola, { color: linea.testo }]}>
        {linea.notturna && !piccola ? '🌙 ' : ''}
        {linea.etichetta || linea.id}
      </Text>
    </View>
  );
  if (!onPress) return contenuto;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      testID={`linea-${linea.id}`}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selezionata }}
    >
      {contenuto}
    </Pressable>
  );
}

/**
 * Linee del vaporetto di una fermata e schema delle fermate della linea scelta, come sulle paline ACTV.
 * props: fermataId, lineaIniziale (facoltativa), t, onIndietro (torna alla scheda del luogo), altezza
 */
export default function FermataVaporetto({ fermataId, lineaIniziale, t, onIndietro, altezza }) {
  const linee = useMemo(() => lineeDellaFermata(fermataId), [fermataId]);
  const lineeBus = useMemo(() => lineeAutobusDellaFermata(fermataId), [fermataId]);
  const [idLinea, setIdLinea] = useState(
    lineaIniziale && lineaVaporetto(lineaIniziale) ? lineaIniziale : (linee[0] || lineeBus[0])?.id
  );
  const linea = lineaVaporetto(idLinea);
  const direzioni = useMemo(() => (linea ? direzioniDallaFermata(linea, fermataId) : []), [linea, fermataId]);
  const [indiceDirezione, setIndiceDirezione] = useState(0);
  const direzione = direzioni[Math.min(indiceDirezione, direzioni.length - 1)];
  const scorrimento = useRef(null);
  const adesso = useAdesso(30000);
  const [vista, setVista] = useState('fermate'); // 'fermate' (schema) | 'orari' (orario completo)
  const [giornoOrario, setGiornoOrario] = useState(0); // 0 = oggi, 1 = domani
  const [infoAperta, setInfoAperta] = useState(false); // riquadro (i): avvisi ACTV e note sui dati

  const partenze = useMemo(
    () => (direzione ? prossimePartenze(fermataId, idLinea, direzione.direzione, adesso) : []),
    [fermataId, idLinea, direzione, adesso]
  );
  const orario = useMemo(
    () => (direzione && vista === 'orari' ? orarioDelGiorno(fermataId, idLinea, direzione.direzione, adesso, giornoOrario) : null),
    // l'orario completo cambia solo con il giorno: basta ricalcolarlo all'apertura e quando cambia la scelta
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fermataId, idLinea, direzione, vista, giornoOrario]
  );
  const oraAdesso = minutiVenezia(adesso);
  // nell'orario di oggi si parte dall'ora attuale (le corse già passate sono in grigio)
  const scorrimentoOrario = useRef(null);
  const rigaAdesso = orario && giornoOrario === 0
    ? Math.max(0, orario.findIndex((h) => h.partenze.some((p) => p.assoluto >= oraAdesso)))
    : 0;
  const posizioniRighe = useRef({});
  useEffect(() => {
    if (vista !== 'orari') return undefined;
    const id = setTimeout(() => {
      const y = giornoOrario === 0 ? posizioniRighe.current[rigaAdesso] || 0 : 0;
      scorrimentoOrario.current?.scrollTo({ y, animated: false });
    }, 50);
    return () => clearTimeout(id);
  }, [vista, giornoOrario, rigaAdesso, orario]);
  // corse che finiscono prima del capolinea: una lettera per ogni destinazione diversa
  const destinazioni = useMemo(() => {
    const nomi = [];
    (orario || []).forEach((h) => h.partenze.forEach((p) => p.verso && !nomi.includes(p.verso) && nomi.push(p.verso)));
    return nomi;
  }, [orario]);

  // fermate da disegnare: per le circolari si parte da questa fermata e si fa il giro
  const schema = useMemo(() => {
    if (!direzione) return { fermate: [], qui: -1 };
    const f = direzione.fermate;
    if (direzione.circolare) {
      const giro = f.slice(0, -1);
      const ruotate = [...giro.slice(direzione.posizione), ...giro.slice(0, direzione.posizione)];
      return { fermate: [...ruotate, ruotate[0]], qui: 0 };
    }
    return { fermate: f, qui: direzione.posizione };
  }, [direzione]);

  // porta in vista questa fermata quando cambiano linea o direzione
  useEffect(() => {
    const y = Math.max(0, (schema.qui - 1) * RIGA);
    const id = setTimeout(() => scorrimento.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(id);
  }, [schema, vista]);

  const scegliLinea = (id) => {
    setIdLinea(id);
    setIndiceDirezione(0);
  };
  const testoTra = (p) => {
    if (p.domani) return t('vap_domani');
    if (p.tra <= 0) return t('vap_adesso');
    if (p.tra < 180) return t('vap_tra').replace('{m}', p.tra);
    return '';
  };
  const colore = linea ? coloreSchema(linea.colore) : '#0B6BB7';
  const capolinea = (d) => (d.circolare ? `↻ ${t('vap_circolare')}` : `→ ${d.capolinea}`);
  const prossima = (d) => t('vap_prossima').replace('{nome}', d.prossima);

  // Tutta la scheda scorre insieme (linee, partenze, fermate e orari): le liste interne non hanno più un'altezza propria
  return (
    <ScrollView nestedScrollEnabled style={[styles.contenitore, altezza ? { height: altezza } : null]} contentContainerStyle={{ paddingBottom: 16 }}>
      <View style={styles.testata}>
        {onIndietro ? (
          <Pressable onPress={onIndietro} style={styles.indietro} hitSlop={8} accessibilityLabel={t('vap_indietro')}>
            <Text style={styles.testoIndietro}>‹</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.sopratitolo}>⛴ {t('fermata')}</Text>
          <Text style={styles.titolo} numberOfLines={1}>
            {nomeFermata(fermataId)}
          </Text>
        </View>
      </View>

      {linee.length + lineeBus.length === 0 ? (
        <Text style={styles.vuoto}>{t('vap_nessuna')}</Text>
      ) : (
        <>
          {linee.length > 0 && (
            <View style={[styles.targhette, linee.length === 1 && { display: 'none' }]}>
              {linee.map((l) => (
                <TarghettaLinea key={l.id} linea={l} selezionata={l.id === idLinea} onPress={() => scegliLinea(l.id)} />
              ))}
            </View>
          )}
          {lineeBus.length > 0 && (
            <>
              <Text style={styles.etichettaBus}>🚌 Autobus e tram</Text>
              <View style={styles.targhette}>
                {lineeBus.map((l) => (
                  <TarghettaLinea key={l.id} linea={l} selezionata={l.id === idLinea} onPress={() => scegliLinea(l.id)} />
                ))}
              </View>
            </>
          )}

          {direzioni.length > 1 && (
            <View style={styles.direzioni}>
              {direzioni.map((d, i) => {
                const attiva = d === direzione;
                return (
                  <Pressable
                    key={d.direzione}
                    onPress={() => setIndiceDirezione(i)}
                    testID={`direzione-${i}`}
                    style={[styles.direzione, attiva && { borderColor: colore, backgroundColor: '#fff' }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: attiva }}
                  >
                    <Text style={[styles.testoDirezione, attiva && { color: '#0f172a', fontWeight: '800' }]} numberOfLines={2}>
                      {capolinea(d)}
                    </Text>
                    <Text style={styles.prossima} numberOfLines={2}>
                      {prossima(d)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {direzioni.length === 1 && (
            <Text style={styles.direzioneUnica}>
              {capolinea(direzione)}
              <Text style={styles.prossimaUnica}>{`  ·  ${prossima(direzione)}`}</Text>
            </Text>
          )}

          <View style={styles.riquadroPartenze} testID="prossime-partenze">
            <Text style={styles.titoloPartenze}>🕘 {t('vap_partenze')}</Text>
            {partenze === null ? (
              <Text style={styles.vuotoPartenze}>{t('vap_scaduti')}</Text>
            ) : partenze.length === 0 ? (
              <Text style={styles.vuotoPartenze}>{t('vap_nessunaCorsa')}</Text>
            ) : (
              <View style={styles.righePartenze}>
                {partenze.map((p, i) => (
                  <View key={`${p.ora}-${i}`} style={[styles.partenza, i === 0 && { borderColor: colore, backgroundColor: '#fff' }]}>
                    <Text style={[styles.oraPartenza, i === 0 && styles.oraPrima]}>{p.ora}</Text>
                    {testoTra(p) ? <Text style={[styles.traPartenza, i === 0 && { color: colore }]}>{testoTra(p)}</Text> : null}
                    {p.verso ? (
                      <Text style={styles.versoPartenza} numberOfLines={1}>
                        → {p.verso}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.schede}>
            {[
              ['fermate', t('vap_fermate')],
              ['orari', t('vap_orario')],
            ].map(([id, testo]) => (
              <Pressable
                key={id}
                onPress={() => setVista(id)}
                testID={`vista-${id}`}
                style={[styles.scheda, vista === id && styles.schedaAttiva]}
                accessibilityRole="tab"
                accessibilityState={{ selected: vista === id }}
              >
                <Text style={[styles.testoScheda, vista === id && styles.testoSchedaAttiva]}>{testo}</Text>
              </Pressable>
            ))}
          </View>

          {vista === 'orari' ? (
            <View style={styles.riquadroSchema}>
              <View style={styles.intestazioneSchema}>
                <TarghettaLinea linea={linea} piccola />
                <View style={styles.giorni}>
                  {[0, 1].map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => setGiornoOrario(g)}
                      testID={`giorno-${g}`}
                      style={[styles.giorno, giornoOrario === g && { backgroundColor: colore, borderColor: colore }]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: giornoOrario === g }}
                    >
                      <Text style={[styles.testoGiorno, giornoOrario === g && { color: '#fff' }]}>
                        {g === 0 ? t('vap_oggi') : t('vap_domaniTab')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <ScrollView key="orari" ref={scorrimentoOrario} scrollEnabled={false} contentContainerStyle={{ paddingVertical: 4 }}>
                {orario === null ? (
                  <Text style={styles.vuotoOrario}>{t('vap_scaduti')}</Text>
                ) : orario.length === 0 ? (
                  <Text style={styles.vuotoOrario}>{t('vap_nessunaCorsa')}</Text>
                ) : (
                  orario.map((h, i) => (
                    <View
                      key={`${h.ora}-${i}`}
                      onLayout={(e) => {
                        posizioniRighe.current[i] = e.nativeEvent.layout.y;
                      }}
                      style={[styles.rigaOra, i % 2 === 1 && styles.rigaOraAlterna]}
                    >
                      <Text style={[styles.cellaOra, { color: colore }]}>{String(h.ora).padStart(2, '0')}</Text>
                      <Text style={styles.cellaMinuti}>
                        {h.partenze.map((p, k) => (
                          <Text key={k} style={giornoOrario === 0 && p.assoluto < oraAdesso ? styles.minutoPassato : null}>
                            {k > 0 ? '   ' : ''}
                            {p.minuto}
                            {p.verso ? <Text style={styles.lettera}>{LETTERE[destinazioni.indexOf(p.verso)] || '*'}</Text> : null}
                          </Text>
                        ))}
                      </Text>
                    </View>
                  ))
                )}
                {destinazioni.map((nome, i) => (
                  <Text key={nome} style={styles.legenda}>
                    <Text style={styles.lettera}>{LETTERE[i] || '*'}</Text> = {t('vap_fino').replace('{nome}', nome)}
                  </Text>
                ))}
              </ScrollView>
            </View>
          ) : (
          <View style={styles.riquadroSchema}>
            <View style={styles.intestazioneSchema}>
              <Text style={styles.testoIntestazione}>{t('vap_linea')}</Text>
              <TarghettaLinea linea={linea} piccola />
              {linea.notturna ? <Text style={styles.notturna}>🌙 {t('vap_notturna')}</Text> : null}
                    <View style={{ marginLeft: 'auto' }}>
              {linea ? (
                <Pressable
                  onPress={() => setInfoAperta((a) => !a)}
                  style={[styles.info, infoAperta && styles.infoAttiva]}
                  hitSlop={8}
                  testID="info-actv"
                  accessibilityRole="button"
                  accessibilityLabel={t('vap_info')}
                  accessibilityState={{ expanded: infoAperta }}
                >
                  <Text style={[styles.testoInfo, infoAperta && { color: '#fff' }]}>i</Text>
                </Pressable>
              ) : null}
              </View>
            </View>
            <ScrollView key="schema" ref={scorrimento} scrollEnabled={false} contentContainerStyle={{ paddingVertical: 6 }}>
              {schema.fermate.map((id, i) => {
                const qui = i === schema.qui;
                const passata = i < schema.qui;
                const ultima = i === schema.fermate.length - 1;
                const richiesta = direzione.richiesta.includes(id);
                return (
                  <View key={`${id}-${i}`} style={[styles.riga, passata && styles.rigaPassata]}>
                    <View style={styles.colonnaBarra}>
                      {i > 0 && <View style={[styles.barra, styles.barraSopra, { backgroundColor: colore }]} />}
                      {!ultima && <View style={[styles.barra, styles.barraSotto, { backgroundColor: colore }]} />}
                      <View
                        style={[
                          styles.pallino,
                          { backgroundColor: colore },
                          qui && [styles.pallinoQui, { borderColor: colore }],
                        ]}
                      />
                    </View>
                    <View style={[styles.cellaNome, !ultima && styles.cellaNomeSeparata]}>
                      <Text style={[styles.nomeFermata, qui && styles.nomeFermataQui]} numberOfLines={1}>
                        {nomeFermata(id)}
                      </Text>
                      {richiesta ? <Text style={styles.richiesta}>{t('vap_richiesta')}</Text> : null}
                      {qui ? (
                        <View style={[styles.qui, { backgroundColor: colore }]}>
                          <Text style={styles.testoQui}>{t('vap_questa')}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
          )}
        </>
      )}

      {infoAperta && linea ? (
        <>
          <Pressable style={styles.velo} onPress={() => setInfoAperta(false)} accessibilityLabel={t('chiudi')} />
          <View style={styles.riquadroInfo} testID="riquadro-info">
            <Text style={styles.titoloInfo}>ⓘ {t('vap_info')}</Text>
            <Text style={styles.nota}>{t('vap_nota').replace('{data}', dataBreve(validitaOrariPer(idLinea)[1]))}</Text>
            <Pressable
              style={({ pressed }) => [styles.bottone, pressed && { opacity: 0.85 }]}
              onPress={() => Linking.openURL(urlOrariLinea(linea, direzione?.direzione ?? 0)).catch(() => {})}
              accessibilityRole="link"
            >
              <Text style={styles.testoBottone}>🕘 {t('vap_orari').replace('{n}', linea.etichetta || linea.id)}</Text>
            </Pressable>
            <Pressable onPress={() => setInfoAperta(false)} hitSlop={8} style={styles.chiudiInfo} testID="chiudi-info">
              <Text style={styles.testoChiudiInfo}>{t('chiudi')}</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  etichettaBus: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 12, marginBottom: 6 },
  contenitore: { paddingBottom: 6, position: 'relative' },
  testata: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  indietro: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoIndietro: { fontSize: 26, lineHeight: 28, color: '#334155', fontWeight: '700', marginTop: -2 },
  sopratitolo: { fontSize: 12, fontWeight: '800', color: '#0B6BB7', textTransform: 'uppercase', letterSpacing: 0.4 },
  titolo: { fontSize: 21, fontWeight: '800', color: '#0f172a' },
  info: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#0B6BB7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoAttiva: { backgroundColor: '#0B6BB7' },
  testoInfo: { fontSize: 17, fontWeight: '900', color: '#0B6BB7', fontStyle: 'italic', fontFamily: 'serif' },
  velo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.25)', borderRadius: 12 },
  riquadroInfo: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  titoloInfo: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  chiudiInfo: { alignSelf: 'center', marginTop: 10 },
  testoChiudiInfo: { fontSize: 14, fontWeight: '700', color: '#0f3d5e' },
  vuoto: { fontSize: 14, color: '#64748b', marginTop: 8 },
  targhette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  targhetta: {
    minWidth: 42,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
  },
  targhettaSelezionata: { transform: [{ scale: 1.08 }] },
  targhettaPiccola: { minWidth: 28, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 0 },
  testoTarghetta: { fontSize: 15, fontWeight: '900' },
  testoTarghettaPiccola: { fontSize: 12, fontWeight: '800' },
  direzioni: { flexDirection: 'row', gap: 8, marginTop: 8 },
  direzione: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  testoDirezione: { fontSize: 14, color: '#475569', fontWeight: '600', lineHeight: 18 },
  prossima: { fontSize: 11, color: '#64748b', marginTop: 1 },
  direzioneUnica: { marginTop: 10, fontSize: 14, color: '#0f172a', fontWeight: '700' },
  prossimaUnica: { fontWeight: '500', color: '#64748b' },
  riquadroSchema: {
    flex: 1,
    minHeight: 120,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  intestazioneSchema: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  testoIntestazione: { fontSize: 14, fontWeight: '600', color: '#334155' },
  notturna: { fontSize: 12, color: '#475569', marginLeft: 4 },
  schema: { flex: 1 },
  riga: { height: RIGA, flexDirection: 'row', alignItems: 'stretch' },
  rigaPassata: { opacity: 0.4 },
  colonnaBarra: { width: 44, alignItems: 'center', justifyContent: 'center' },
  barra: { position: 'absolute', width: BARRA, left: 22 - BARRA / 2 },
  barraSopra: { top: 0, height: RIGA / 2 },
  barraSotto: { top: RIGA / 2, height: RIGA / 2 },
  pallino: { width: 16, height: 16, borderRadius: 8 },
  pallinoQui: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', borderWidth: 6 },
  cellaNome: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 10 },
  cellaNomeSeparata: { borderBottomWidth: 1, borderBottomColor: '#eef0f3' },
  nomeFermata: { fontSize: 15, color: '#1f2937', fontWeight: '500', flexShrink: 1 },
  nomeFermataQui: { fontWeight: '800', color: '#0f172a' },
  richiesta: { fontSize: 11, color: '#64748b', fontStyle: 'italic' },
  qui: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  testoQui: { color: '#fff', fontSize: 11, fontWeight: '800' },
  riquadroPartenze: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  titoloPartenze: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 5 },
  vuotoPartenze: { fontSize: 13, color: '#64748b' },
  righePartenze: { flexDirection: 'row', gap: 8 },
  partenza: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingVertical: 3,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  oraPartenza: { fontSize: 16, fontWeight: '700', color: '#334155', fontVariant: ['tabular-nums'] },
  oraPrima: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  traPartenza: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 1 },
  versoPartenza: { fontSize: 10, color: '#64748b', marginTop: 1 },
  schede: { flexDirection: 'row', marginTop: 8, backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3 },
  scheda: { flex: 1, borderRadius: 8, paddingVertical: 5, alignItems: 'center' },
  schedaAttiva: { backgroundColor: '#fff', elevation: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  testoScheda: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  testoSchedaAttiva: { color: '#0f172a', fontWeight: '800' },
  giorni: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  giorno: { borderRadius: 999, borderWidth: 1.5, borderColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 4 },
  testoGiorno: { fontSize: 13, fontWeight: '700', color: '#475569' },
  rigaOra: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7, paddingHorizontal: 12 },
  rigaOraAlterna: { backgroundColor: '#f3f4f6' },
  cellaOra: { width: 34, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  cellaMinuti: { flex: 1, fontSize: 15, color: '#1f2937', lineHeight: 22, fontVariant: ['tabular-nums'] },
  lettera: { fontSize: 11, color: '#b45309', fontWeight: '800' },
  minutoPassato: { color: '#b6bcc6' },
  legenda: { fontSize: 12, color: '#475569', paddingHorizontal: 12, paddingTop: 8 },
  vuotoOrario: { fontSize: 14, color: '#64748b', padding: 12 },
  bottone: {
    marginTop: 10,
    backgroundColor: '#0f3d5e',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  testoBottone: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  nota: { fontSize: 13, color: '#475569', lineHeight: 18 },
});
