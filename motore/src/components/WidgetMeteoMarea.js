import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { descriviTempo, leggiMeteo, settoreVento } from '../meteo';
import { classeMarea, COLORE_MAREA, leggiMarea, piccoPiuAlto, prossimaAcquaAlta } from '../marea';
import {
  chiediPermesso,
  leggiPreferenze,
  notificheDisponibili,
  permessoConcesso,
  PREF_PREDEFINITE,
  programmaAvvisi,
  salvaPreferenze,
} from '../allerta';

const AGGIORNA_OGNI_MS = 10 * 60 * 1000; // 10 minuti (il livello della marea cambia in fretta)

const formatta = (n, decimali, separatore) =>
  n == null || Number.isNaN(n) ? '–' : Number(n).toFixed(decimali).replace('.', separatore);

// "2026-10-15 12:45:00" -> "12:45", "domani 02:45" oppure "17/10 06:30"
function quando(testo, t) {
  if (!testo) return '';
  const [data, ora] = String(testo).replace('T', ' ').split(' ');
  const hhmm = (ora || '').slice(0, 5);
  const oggi = new Date();
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const domani = new Date(oggi.getTime() + 24 * 3600 * 1000);
  if (data === fmt(oggi)) return hhmm;
  if (data === fmt(domani)) return `${t('domani')} ${hhmm}`;
  const [, mm, gg] = data.split('-');
  return `${Number(gg)}/${Number(mm)} ${hhmm}`;
}

/**
 * Barra in fondo allo schermo con meteo e marea di Venezia.
 * Toccandola si apre il dettaglio (prossimi picchi di marea, vento, pioggia, avvisi di acqua alta).
 * Se è prevista acqua alta nelle prossime 48 ore, sopra la barra compare una striscia di avviso.
 */
// margineBasso: altezza dei tasti di navigazione del telefono, per non finirci sotto
export default function WidgetMeteoMarea({ t, compatto, margineBasso = 0 }) {
  const [meteo, setMeteo] = useState(null);
  const [marea, setMarea] = useState(null);
  const [stato, setStato] = useState('caricamento'); // caricamento | ok | errore
  const [aperto, setAperto] = useState(false);
  const [pref, setPref] = useState(PREF_PREDEFINITE); // avvisi di acqua alta
  const [negato, setNegato] = useState(false);
  const [nonDisponibili, setNonDisponibili] = useState(false); // build senza modulo notifiche (es. Expo Go) // notifiche bloccate nelle impostazioni del telefono
  const [nascosto, setNascosto] = useState(null); // striscia di avviso chiusa per questo picco
  const ultimo = useRef(0);
  const fmt = (n, d = 0) => formatta(n, d, t('decimale'));

  const aggiorna = useCallback(async () => {
    setStato((s) => (s === 'ok' ? 'ok' : 'caricamento'));
    const [m, ma] = await Promise.allSettled([leggiMeteo(), leggiMarea()]);
    if (m.status === 'fulfilled') setMeteo(m.value);
    if (ma.status === 'fulfilled') setMarea(ma.value);
    const qualcosa = m.status === 'fulfilled' || ma.status === 'fulfilled';
    setStato(qualcosa ? 'ok' : 'errore');
    if (qualcosa) ultimo.current = Date.now();
  }, []);

  useEffect(() => {
    aggiorna();
    const timer = setInterval(aggiorna, AGGIORNA_OGNI_MS);
    // quando l'app torna in primo piano, aggiorna se i dati hanno più di 5 minuti
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && Date.now() - ultimo.current > 5 * 60 * 1000) aggiorna();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [aggiorna]);

  // preferenze degli avvisi salvate sul telefono
  useEffect(() => {
    leggiPreferenze().then(async (p) => {
      setPref(p);
      if (p.attiva && !(await permessoConcesso())) setNegato(true);
    });
  }, []);

  // ricalcola le notifiche a ogni nuova previsione o cambio di preferenze/lingua
  useEffect(() => {
    if (marea) programmaAvvisi(marea, pref, t);
  }, [marea, pref, t]);

  const cambiaPref = async (modifiche) => {
    const nuove = { ...pref, ...modifiche };
    if (modifiche.attiva) {
      if (!notificheDisponibili()) return setNonDisponibili(true);
      const { concesso } = await chiediPermesso(t);
      setNegato(!concesso);
      if (!concesso) return;
    }
    if (modifiche.attiva === false) setNegato(false);
    setPref(nuove);
    salvaPreferenze(nuove);
  };

  if (!meteo && !marea) {
    return (
      <Pressable style={[styles.barra, styles.centrato, { paddingBottom: 12 + margineBasso }]} onPress={aggiorna}>
        {stato === 'errore' ? (
          <Text style={styles.errore}>{t('m_nonDisponibile')}</Text>
        ) : (
          <ActivityIndicator color="#0f3d5e" />
        )}
      </Pressable>
    );
  }

  const tempo = meteo ? descriviTempo(meteo.codice, meteo.giorno) : null;
  const picco = piccoPiuAlto(marea);
  const classe = classeMarea(picco);
  // senza dati (fonte non raggiungibile) non si dice "nella norma": si mostra "non disponibili"
  const senzaDati = !marea || (marea.attuale == null && marea.picchi.length === 0);
  const colore = senzaDati ? '#64748b' : COLORE_MAREA[classe];
  const prossimo = marea?.picchi?.[0];
  const direzione = meteo?.direzioneVento != null ? t('punti').split(',')[settoreVento(meteo.direzioneVento)] : '';
  const acquaAlta = prossimaAcquaAlta(marea);
  const mostraStriscia = acquaAlta && nascosto !== acquaAlta.testoData;

  return (
    <>
    {mostraStriscia && (
      <Pressable
        style={[styles.striscia, { backgroundColor: COLORE_MAREA[classeMarea(acquaAlta.valore)] }]}
        onPress={() => setAperto(true)}
        accessibilityRole="button"
      >
        <Text style={styles.strisciaIcona}>⚠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.strisciaTesto} numberOfLines={1}>
            {t('banner_acqua_alta').replace('{cm}', acquaAlta.valore).replace('{quando}', quando(acquaAlta.testoData, t))}
          </Text>
          {!compatto && (
            <Text style={styles.strisciaSotto} numberOfLines={1}>
              {t('banner_dettagli')}
            </Text>
          )}
        </View>
        <Pressable onPress={() => setNascosto(acquaAlta.testoData)} hitSlop={10} accessibilityLabel={t('chiudi')}>
          <Text style={styles.strisciaChiudi}>✕</Text>
        </Pressable>
      </Pressable>
    )}
    <Pressable
      style={({ pressed }) => [styles.barra, { paddingBottom: 12 + margineBasso }, pressed && { opacity: 0.95 }]}
      onPress={() => setAperto((a) => !a)}
      onLongPress={aggiorna}
      accessibilityRole="button"
      accessibilityState={{ expanded: aperto }}
      accessibilityLabel={`${t('meteo')} ${meteo ? fmt(meteo.temperatura) + '°' : ''}, ${t('marea')} ${marea?.attuale ?? '–'} cm`}
    >
      {!compatto && <View style={styles.maniglia} />}
      {/* Riga sempre visibile */}
      <View style={styles.riga}>
        {meteo && (
          <View style={styles.blocco}>
            <Text style={styles.icona}>{tempo.icona}</Text>
            <View>
              <Text style={styles.valore}>{fmt(meteo.temperatura)}°</Text>
              <Text style={styles.sotto} numberOfLines={1}>
                {t(tempo.chiave)}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.separatore} />
        <View style={[styles.blocco, { flex: 1 }]}>
          <Text style={styles.icona}>🌊</Text>
          {marea?.attuale != null ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.valore} numberOfLines={1}>
                {marea.attuale} cm<Text style={styles.etichetta}>{`  ${t('marea')}`}</Text>
              </Text>
              <Text style={styles.sotto} numberOfLines={1}>
                {prossimo
                  ? `${prossimo.tipo === 'max' ? '↑' : '↓'} ${prossimo.valore} cm · ${quando(prossimo.testoData, t)}`
                  : t('marea_ora')}
              </Text>
            </View>
          ) : prossimo ? (
            // senza il livello attuale si mostra il prossimo massimo o minimo previsto
            <View style={{ flex: 1 }}>
              <Text style={styles.valore} numberOfLines={1}>
                {`${prossimo.tipo === 'max' ? '↑' : '↓'} ${prossimo.valore} cm`}
                <Text style={styles.etichetta}>{`  ${prossimo.tipo === 'max' ? t('marea_max') : t('marea_min')}`}</Text>
              </Text>
              <Text style={styles.sotto} numberOfLines={1}>{quando(prossimo.testoData, t)}</Text>
            </View>
          ) : (
            <Text style={styles.sotto}>{t('marea_nonDisponibile')}</Text>
          )}
        </View>
        {marea?.attuale != null && (
          <View style={[styles.badge, { backgroundColor: colore }]}>
            <Text style={styles.testoBadge}>{t(`mar_${classe}`)}</Text>
          </View>
        )}
        <Text style={styles.freccia}>{aperto ? '▾' : '▴'}</Text>
      </View>

      {/* Dettaglio */}
      {aperto && (
        <View style={styles.dettaglio}>
          {marea && (
            <>
              <Text style={[styles.avviso, { color: colore }]}>{senzaDati ? t('mar_msg_nodati') : t(`mar_msg_${classe}`)}</Text>
              <Text style={styles.nota}>
                {t('marea')} {t('marea_ora')}: {marea.attuale} cm ({quando(marea.oraMisura, t)})
              </Text>
              {marea.picchi.length > 0 && (
                <>
                  <Text style={styles.titoletto}>{t('marea_prossimi')}</Text>
                  <View style={styles.picchi}>
                    {marea.picchi.map((p) => (
                      <View key={p.testoData} style={styles.picco}>
                        <Text style={styles.piccoTipo}>
                          {p.tipo === 'max' ? `↑ ${t('marea_max')}` : `↓ ${t('marea_min')}`}
                        </Text>
                        <Text style={[styles.piccoValore, { color: COLORE_MAREA[classeMarea(p.valore)] }]}>
                          {p.valore} cm
                        </Text>
                        <Text style={styles.piccoOra}>{quando(p.testoData, t)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              <Text style={styles.nota}>{t('marea_scala')}</Text>

              {/* Avvisi di acqua alta */}
              {/* onStartShouldSetResponder: i tocchi qui non chiudono il dettaglio */}
              <View style={styles.allerta} onStartShouldSetResponder={() => true}>
                <View style={styles.rigaAllerta}>
                  <Text style={styles.titoloAllerta}>{t('allerta_titolo')}</Text>
                  <Switch
                    value={pref.attiva}
                    onValueChange={(v) => cambiaPref({ attiva: v })}
                    trackColor={{ true: '#0f3d5e', false: '#cbd5e1' }}
                    thumbColor="#fff"
                    accessibilityLabel={t('allerta_titolo')}
                  />
                </View>
                {nonDisponibili && <Text style={styles.negato}>{t('allerta_non_disponibile')}</Text>}
                {negato && (
                  <Text style={styles.negato} onPress={() => Linking.openSettings()}>
                    {t('allerta_negato')} <Text style={styles.link}>{t('allerta_apri')}</Text>
                  </Text>
                )}
                {pref.attiva && (
                  <>
                    <Scelta
                      etichetta={t('allerta_da')}
                      valore={pref.soglia}
                      opzioni={[[110, t('allerta_110')], [140, t('allerta_140')]]}
                      onCambia={(v) => cambiaPref({ soglia: v })}
                    />
                    <Scelta
                      etichetta={t('allerta_quando')}
                      valore={pref.anticipo}
                      opzioni={[['3h', t('allerta_3h')], ['sera', t('allerta_sera')]]}
                      onCambia={(v) => cambiaPref({ anticipo: v })}
                    />
                    <Text style={styles.nota}>{t('allerta_info')}</Text>
                  </>
                )}
              </View>
            </>
          )}
          {meteo && (
            <View style={styles.chips}>
              <Chip icona="🌡️" testo={`↑${fmt(meteo.massima)}°  ↓${fmt(meteo.minima)}°`} />
              <Chip icona="💨" testo={`${fmt(meteo.vento)} km/h ${direzione}`} />
              <Chip icona="☔" testo={`${t('m_probPioggia')} ${fmt(meteo.pioggia)}%`} />
            </View>
          )}
          <Text style={styles.fonte}>
            {t('m_fonte')} · {t('m_aggiornato')} {meteo?.ora ? meteo.ora.slice(11, 16) : ''}
            {stato === 'caricamento' ? ' …' : ''}
          </Text>
        </View>
      )}
    </Pressable>
    </>
  );
}

// Due o più opzioni a segmenti (es. soglia 110 / 140 cm)
function Scelta({ etichetta, valore, opzioni, onCambia }) {
  return (
    <View style={styles.rigaScelta}>
      <Text style={styles.etichettaScelta}>{etichetta}</Text>
      <View style={styles.segmenti}>
        {opzioni.map(([v, testo]) => (
          <Pressable
            key={v}
            onPress={() => onCambia(v)}
            style={[styles.segmento, valore === v && styles.segmentoAttivo]}
            accessibilityRole="radio"
            accessibilityState={{ selected: valore === v }}
          >
            <Text style={[styles.testoSegmento, valore === v && styles.testoSegmentoAttivo]} numberOfLines={1}>
              {testo}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Chip({ icona, testo }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipIcona}>{icona}</Text>
      <Text style={styles.chipTesto}>{testo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  centrato: { minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  maniglia: { alignSelf: 'center', width: 34, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginBottom: 6 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blocco: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icona: { fontSize: 24 },
  valore: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  etichetta: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  sotto: { fontSize: 11, color: '#64748b' },
  separatore: { width: 1, alignSelf: 'stretch', backgroundColor: '#e2e8f0', marginVertical: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  testoBadge: { color: '#fff', fontSize: 11, fontWeight: '800' },
  freccia: { fontSize: 13, color: '#94a3b8' },
  dettaglio: { marginTop: 10, gap: 8 },
  avviso: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  titoletto: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  picchi: { flexDirection: 'row', gap: 6 },
  picco: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
  piccoTipo: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  piccoValore: { fontSize: 16, fontWeight: '800' },
  piccoOra: { fontSize: 11, color: '#334155' },
  nota: { fontSize: 11, color: '#94a3b8', lineHeight: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef6fa',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipIcona: { fontSize: 13 },
  chipTesto: { fontSize: 13, color: '#0f3d5e', fontWeight: '600' },
  fonte: { fontSize: 10, color: '#94a3b8' },
  errore: { color: '#64748b', fontSize: 14 },
  striscia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 8,
    marginBottom: 6,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  strisciaIcona: { fontSize: 18 },
  strisciaTesto: { color: '#fff', fontSize: 14, fontWeight: '800' },
  strisciaSotto: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  strisciaChiudi: { color: '#fff', fontSize: 16, paddingHorizontal: 2 },
  allerta: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, gap: 8 },
  rigaAllerta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titoloAllerta: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  negato: { fontSize: 12, color: '#b91c1c', lineHeight: 17 },
  link: { color: '#0f3d5e', fontWeight: '700', textDecorationLine: 'underline' },
  rigaScelta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  etichettaScelta: { width: 52, fontSize: 12, color: '#64748b' },
  segmenti: { flex: 1, flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 10, padding: 3 },
  segmento: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  segmentoAttivo: { backgroundColor: '#fff', elevation: 2 },
  testoSegmento: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  testoSegmentoAttivo: { color: '#0f3d5e' },
});
