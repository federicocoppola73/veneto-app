// Popup "Aggiornamento di <città>": cosa cambia rispetto alla versione installata e quanti MB scaricare.
// novita: riepilogo da novitaDa() in src/pacchetti.js (può mancare: allora si mostra un testo generico)
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { IconaAggiorna } from './IconeHome';

const VERDE = '#17483a';
const TESTO = '#1c2b26';
const GRIGIO = '#5b6b64';
const MAX_NOMI = 4;

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: VERDE, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const ICONE = {
  nuovo: () => (
    <Svg {...base}>
      <Path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <Path d="M12 7v6M9 10h6" />
    </Svg>
  ),
  modifica: () => (
    <Svg {...base}>
      <Path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
    </Svg>
  ),
  tolto: () => (
    <Svg {...base}>
      <Path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <Path d="M9 10h6" />
    </Svg>
  ),
  foto: () => (
    <Svg {...base}>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Path d="M3 16l5-5 4 4 3-3 6 6" />
      <Circle cx={15.5} cy={9} r={1.5} />
    </Svg>
  ),
  eventi: () => (
    <Svg {...base}>
      <Rect x={3.5} y={5} width={17} height={15.5} rx={2} />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </Svg>
  ),
  itinerari: () => (
    <Svg {...base}>
      <Path d="M7 4c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM5 16.5h4v1.5a2 2 0 0 1-4 0zM17 8c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM15 20.5h4" />
    </Svg>
  ),
  curiosita: () => (
    <Svg {...base}>
      <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" />
    </Svg>
  ),
  cibi: () => (
    <Svg {...base}>
      <Path d="M6 3v7a2 2 0 0 0 2 2v9M10 3v7a2 2 0 0 1-2 2M8 3v6M17 21V3c-2.5 1-3.5 4-3.5 7.5 0 1.5 1 2.5 3.5 2.5" />
    </Svg>
  ),
  mezzi: () => (
    <Svg {...base}>
      <Rect x={5} y={3} width={14} height={15} rx={3} />
      <Path d="M5 11h14M8 21l1.5-3M16 21l-1.5-3" />
    </Svg>
  ),
  servizi: () => (
    <Svg {...base}>
      <Path d="M12 3s5 5.5 5 10a5 5 0 0 1-10 0c0-4.5 5-10 5-10z" />
    </Svg>
  ),
  mappa: () => (
    <Svg {...base}>
      <Path d="M9 4L3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5L9 4zM9 4v13.5M15 6.5V20" />
    </Svg>
  ),
};

// voci dell'elenco "Cosa cambia": [{ icona, testo, dettaglio? }]
function vociNovita(n, t) {
  if (!n || !n.completo) return [{ icona: 'modifica', testo: t.agg_generico }];
  const voci = [];
  if (n.luoghi_nuovi.length) {
    const nomi = n.luoghi_nuovi.slice(0, MAX_NOMI).join(', ');
    const altri = n.luoghi_nuovi.length - MAX_NOMI;
    voci.push({ icona: 'nuovo', testo: t.agg_luoghiNuovi(n.luoghi_nuovi.length), dettaglio: altri > 0 ? `${nomi} ${t.agg_eAltri(altri)}` : nomi });
  }
  if (n.luoghi_aggiornati) {
    voci.push({
      icona: 'modifica',
      testo: t.agg_luoghiAggiornati(n.luoghi_aggiornati),
      dettaglio: n.aspetti.map((a) => t.agg_aspetti[a] || a).join(', '),
    });
  }
  if (n.luoghi_tolti) voci.push({ icona: 'tolto', testo: t.agg_luoghiTolti(n.luoghi_tolti) });
  if (n.foto_nuove) voci.push({ icona: 'foto', testo: t.agg_foto(n.foto_nuove) });
  if (n.eventi_nuovi) voci.push({ icona: 'eventi', testo: t.agg_eventi(n.eventi_nuovi) });
  if (n.itinerari_nuovi) voci.push({ icona: 'itinerari', testo: t.agg_itinerariNuovi(n.itinerari_nuovi) });
  if (n.itinerari_aggiornati) voci.push({ icona: 'itinerari', testo: t.agg_itinerariAggiornati(n.itinerari_aggiornati) });
  if (n.curiosita_nuove) voci.push({ icona: 'curiosita', testo: t.agg_curiosita(n.curiosita_nuove) });
  if (n.cibi_nuovi) voci.push({ icona: 'cibi', testo: t.agg_cibi(n.cibi_nuovi) });
  if (n.mezzi) voci.push({ icona: 'mezzi', testo: t.agg_mezzi });
  if (n.servizi) voci.push({ icona: 'servizi', testo: t.agg_servizi });
  if (n.mappa) voci.push({ icona: 'mappa', testo: t.agg_mappa });
  return voci.length ? voci : [{ icona: 'modifica', testo: t.agg_generico }];
}

export default function PopupAggiornamento({ citta, novita, lingua, t, onAggiorna, onChiudi }) {
  if (!citta) return null;
  const voci = vociNovita(novita, t);
  // nota scritta a mano: nella lingua scelta, altrimenti in italiano (solo le più recenti)
  const note = (novita?.note || [])
    .map((n) => n[lingua] || n.it)
    .filter(Boolean)
    .slice(-2)
    .reverse();
  const mb = novita?.completo && novita.byte ? Math.max(1, Math.round(novita.byte / 1_000_000)) : null;

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
              <Text style={styles.titolo}>{t.agg_titolo.replace('{nome}', citta.nome)}</Text>
              {mb ? <Text style={styles.sottotitolo}>{t.agg_mb.replace('{mb}', String(mb))}</Text> : null}
            </View>
          </View>

          <ScrollView style={styles.corpo} showsVerticalScrollIndicator={false}>
            {note.map((testo, i) => (
              <Text key={i} style={styles.nota}>{testo}</Text>
            ))}
            <Text style={styles.sezione}>{t.agg_cosaCambia}</Text>
            {voci.map((v, i) => {
              const Icona = ICONE[v.icona] || ICONE.modifica;
              return (
                <View key={i} style={styles.voce}>
                  <View style={styles.iconaVoce}>
                    <Icona />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testoVoce}>{v.testo}</Text>
                    {v.dettaglio ? <Text style={styles.dettaglio}>{v.dettaglio}</Text> : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.pulsanti}>
            <Pressable onPress={onChiudi} style={[styles.pulsante, styles.piuTardi]} accessibilityRole="button">
              <Text style={styles.testoPiuTardi}>{t.agg_piuTardi}</Text>
            </Pressable>
            <Pressable onPress={onAggiorna} style={[styles.pulsante, styles.ora]} accessibilityRole="button">
              <Text style={styles.testoOra}>{t.agg_ora}</Text>
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
  nota: { marginTop: 12, backgroundColor: '#f3f8f4', borderRadius: 12, padding: 12, color: VERDE, fontSize: 14, lineHeight: 20 },
  sezione: { color: GRIGIO, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 4 },
  voce: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 5 },
  iconaVoce: { marginTop: 1 },
  testoVoce: { color: TESTO, fontSize: 14.5, fontWeight: '700' },
  dettaglio: { color: GRIGIO, fontSize: 13, marginTop: 1, lineHeight: 18 },
  pulsanti: { flexDirection: 'row', gap: 10, marginTop: 18 },
  pulsante: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  piuTardi: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d6cfbf' },
  testoPiuTardi: { color: TESTO, fontSize: 15, fontWeight: '700' },
  ora: { flex: 1.3, backgroundColor: VERDE },
  testoOra: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
