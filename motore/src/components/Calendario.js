import React, { useMemo, useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { testoLocalizzato } from '../i18n';

const URL_CONTRIBUTO = 'https://cda.ve.it';
const ROSSO = '#dc2626';
const BLU = '#0f3d5e';

const due = (n) => String(n).padStart(2, '0');
const chiave = (a, m, g) => `${a}-${due(m + 1)}-${due(g)}`; // m da 0 a 11
const oggiChiave = () => {
  const d = new Date();
  return chiave(d.getFullYear(), d.getMonth(), d.getDate());
};
// "2026-10-01" -> "1/10/2026"
const formatta = (iso) => {
  const [a, m, g] = iso.split('-').map(Number);
  return `${g}/${m}/${a}`;
};

/**
 * Pulsante 📅 nell'intestazione e calendario a schermo intero.
 * Giorni in rosso: si paga il contributo di accesso. Pallino: c'è almeno un evento.
 * Toccando un giorno si vedono i suoi eventi, con "Vedi sulla mappa" se il luogo è tra quelli dell'app.
 * props: dati (eventi.json), lingua, t, onVediMappa(idLuogo)
 */
export default function Calendario({ dati, lingua, t, onVediMappa }) {
  const insets = useSafeAreaInsets();
  const [aperto, setAperto] = useState(false);
  const oggi = oggiChiave();
  const [mese, setMese] = useState(() => {
    const d = new Date();
    return { a: d.getFullYear(), m: d.getMonth() };
  });
  const [scelto, setScelto] = useState(oggi);

  const contributo = useMemo(() => new Set(dati?.contributo || []), [dati]);
  const eventi = dati?.eventi || [];
  const eventiDel = (k) => eventi.filter((e) => e.inizio <= k && k <= e.fine);

  const nomiMesi = t('mesi').split(',');
  const nomiGiorni = t('giorni').split(','); // Lun..Dom
  const giorniLunghi = t('giorniLunghi').split(',');

  // celle del mese: vuote fino al primo giorno (settimana da lunedì)
  const celle = useMemo(() => {
    const primo = (new Date(mese.a, mese.m, 1).getDay() + 6) % 7;
    const n = new Date(mese.a, mese.m + 1, 0).getDate();
    const out = Array(primo).fill(null);
    for (let g = 1; g <= n; g++) out.push(g);
    while (out.length % 7) out.push(null);
    return out;
  }, [mese]);

  const cambiaMese = (d) =>
    setMese(({ a, m }) => {
      const x = new Date(a, m + d, 1);
      return { a: x.getFullYear(), m: x.getMonth() };
    });

  const apri = () => {
    const d = new Date();
    setMese({ a: d.getFullYear(), m: d.getMonth() });
    setScelto(oggiChiave());
    setAperto(true);
  };

  const [sa, sm, sg] = scelto.split('-').map(Number);
  const dataScelta = new Date(sa, sm - 1, sg);
  const titoloGiorno = `${giorniLunghi[(dataScelta.getDay() + 6) % 7]} ${sg} ${nomiMesi[sm - 1].toLowerCase()} ${sa}`;
  const eventiScelti = eventiDel(scelto);

  return (
    <>
      <Pressable
        onPress={apri}
        style={({ pressed }) => [styles.pulsante, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={t('calendario')}
        hitSlop={6}
      >
        <Text style={styles.iconaPulsante}>📅</Text>
      </Pressable>

      <Modal visible={aperto} animationType="slide" onRequestClose={() => setAperto(false)} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
        <View style={[styles.pagina, { paddingTop: (insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44)) + 8 }]}>
          <View style={styles.intestazione}>
            <Text style={styles.titolo}>📅 {t('calendario')}</Text>
            <Pressable onPress={() => setAperto(false)} hitSlop={10} accessibilityLabel={t('chiudi')}>
              <Text style={styles.chiudi}>{t('chiudi')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
            {/* mese */}
            <View style={styles.navMese}>
              <Pressable onPress={() => cambiaMese(-1)} hitSlop={12} style={styles.freccia} accessibilityLabel="‹">
                <Text style={styles.testoFreccia}>‹</Text>
              </Pressable>
              <Text style={styles.nomeMese}>
                {nomiMesi[mese.m]} {mese.a}
              </Text>
              <Pressable onPress={() => cambiaMese(1)} hitSlop={12} style={styles.freccia} accessibilityLabel="›">
                <Text style={styles.testoFreccia}>›</Text>
              </Pressable>
            </View>

            <View style={styles.griglia}>
              {nomiGiorni.map((g) => (
                <Text key={g} style={styles.nomeGiorno}>
                  {g}
                </Text>
              ))}
              {celle.map((g, i) => {
                if (!g) return <View key={`v${i}`} style={styles.cella} />;
                const k = chiave(mese.a, mese.m, g);
                const rosso = contributo.has(k);
                const conEventi = eventi.some((e) => e.inizio <= k && k <= e.fine);
                const selezionato = k === scelto;
                return (
                  <Pressable key={k} style={styles.cella} onPress={() => setScelto(k)} accessibilityRole="button" accessibilityState={{ selected: selezionato }}>
                    <View
                      style={[
                        styles.giorno,
                        rosso && styles.giornoRosso,
                        k === oggi && styles.giornoOggi,
                        selezionato && styles.giornoScelto,
                      ]}
                    >
                      <Text style={[styles.numero, rosso && styles.numeroRosso]}>{g}</Text>
                    </View>
                    <View style={[styles.pallino, conEventi && styles.pallinoPieno]} />
                  </Pressable>
                );
              })}
            </View>

            {/* legenda */}
            <View style={styles.legenda}>
              <View style={styles.voceLegenda}>
                <View style={[styles.quadretto, { backgroundColor: ROSSO }]} />
                <Text style={styles.testoLegenda}>{t('cal_contributo')}</Text>
              </View>
              <View style={styles.voceLegenda}>
                <View style={[styles.pallino, styles.pallinoPieno, { marginTop: 0 }]} />
                <Text style={styles.testoLegenda}>{t('cal_eventi')}</Text>
              </View>
            </View>
            <Text style={styles.linkContributo} onPress={() => Linking.openURL(URL_CONTRIBUTO).catch(() => {})}>
              {t('cal_info')} ›
            </Text>

            {/* giorno scelto */}
            <View style={styles.giornoScelta}>
              <Text style={styles.titoloGiorno}>{titoloGiorno}</Text>
              {contributo.has(scelto) && (
                <View style={styles.avvisoContributo}>
                  <Text style={styles.testoAvviso}>💶 {t('cal_paga')}</Text>
                </View>
              )}
              {eventiScelti.length === 0 ? (
                <Text style={styles.nessuno}>{t('cal_nessuno')}</Text>
              ) : (
                eventiScelti.map((e, i) => (
                  <View key={i} style={styles.evento}>
                    {e.tipo ? (
                      <View style={styles.tipo}>
                        <Text style={styles.testoTipo}>{testoLocalizzato(e.tipo, lingua)}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.nomeEvento}>{e.nome}</Text>
                    {e.luogo ? <Text style={styles.riga}>📍 {e.luogo}</Text> : null}
                    <Text style={styles.riga}>
                      🗓{' '}
                      {e.inizio === e.fine
                        ? formatta(e.inizio)
                        : t('cal_dal_al').replace('{a}', formatta(e.inizio)).replace('{b}', formatta(e.fine))}
                    </Text>
                    {e.orari ? <Text style={styles.riga}>🕘 {e.orari}</Text> : null}
                    {e.descrizione ? <Text style={styles.descrizione}>{testoLocalizzato(e.descrizione, lingua)}</Text> : null}
                    <View style={styles.bottoni}>
                      {e.luogoId ? (
                        <Pressable
                          style={({ pressed }) => [styles.bottone, pressed && { opacity: 0.85 }]}
                          onPress={() => {
                            setAperto(false);
                            onVediMappa(e.luogoId);
                          }}
                        >
                          <Text style={styles.testoBottone}>🗺 {t('cal_mappa')}</Text>
                        </Pressable>
                      ) : null}
                      {e.link ? (
                        <Pressable
                          style={({ pressed }) => [styles.bottone, styles.bottoneSecondario, pressed && { opacity: 0.85 }]}
                          onPress={() => Linking.openURL(e.link).catch(() => {})}
                        >
                          <Text style={[styles.testoBottone, { color: BLU }]}>🌐 {t('cal_sito')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
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
  iconaPulsante: { fontSize: 17 },
  pagina: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  intestazione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  titolo: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  chiudi: { fontSize: 15, color: BLU, fontWeight: '600' },
  navMese: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  freccia: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  testoFreccia: { fontSize: 24, color: BLU, marginTop: -3 },
  nomeMese: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
  nomeGiorno: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, color: '#64748b', fontWeight: '600', paddingVertical: 6 },
  cella: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  giorno: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  giornoRosso: { backgroundColor: ROSSO },
  giornoOggi: { borderWidth: 2, borderColor: '#94a3b8' },
  giornoScelto: { borderWidth: 2.5, borderColor: BLU },
  numero: { fontSize: 15, color: '#0f172a', fontVariant: ['tabular-nums'] },
  numeroRosso: { color: '#fff', fontWeight: '700' },
  pallino: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
  pallinoPieno: { backgroundColor: BLU },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10 },
  voceLegenda: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quadretto: { width: 14, height: 14, borderRadius: 7 },
  testoLegenda: { fontSize: 12, color: '#334155' },
  linkContributo: { marginTop: 8, fontSize: 13, color: ROSSO, fontWeight: '700' },
  giornoScelta: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12, gap: 10 },
  titoloGiorno: { fontSize: 16, fontWeight: '800', color: '#0f172a', textTransform: 'capitalize' },
  avvisoContributo: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#fecaca' },
  testoAvviso: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  nessuno: { color: '#64748b', fontSize: 14 },
  evento: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  tipo: { alignSelf: 'flex-start', backgroundColor: BLU, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, marginBottom: 2 },
  testoTipo: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  nomeEvento: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  riga: { fontSize: 13, color: '#334155' },
  descrizione: { fontSize: 14, color: '#334155', lineHeight: 20, marginTop: 2 },
  bottoni: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  bottone: { backgroundColor: BLU, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  bottoneSecondario: { backgroundColor: '#e0eaf2' },
  testoBottone: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
