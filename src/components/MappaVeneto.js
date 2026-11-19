// Pagina "Mappa del Veneto": le province con le città dell'app e, sotto, il calcolo della distanza
// tra due città (menù Partenza e Arrivo), in km o in miglia. La distanza è in linea d'aria.
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { CITTA } from '../catalogo';
import PROVINCE from '../dati/veneto.json';

const VERDE = '#1f5f4a';
const CREMA = '#f7f4ec';
const TESTO = '#1c2b26';
const GRIGIO = '#5b6b64';
const ARANCIO = '#c2410c';
const BLU = '#1e3a8a';

const KM_IN_MIGLIA = 0.621371;

const TESTI = {
  it: {
    titolo: 'Il Veneto', chiudi: 'Chiudi', sottotitolo: 'Le 7 città dell\'app. Tocca una città sulla mappa per sceglierla.',
    distanze: 'Distanze', partenza: 'Partenza', arrivo: 'Arrivo', scegli: 'Scegli una città', unita: 'Unità',
    km: 'km', miglia: 'miglia', linea: 'in linea d\'aria', diverse: 'Scegli due città diverse.', scambia: 'Scambia',
    da: (a, b) => `Da ${a} a ${b}`, nota: 'Distanza in linea retta tra i centri delle città; il percorso su strada è più lungo.',
  },
  en: {
    titolo: 'The Veneto', chiudi: 'Close', sottotitolo: 'The 7 cities of the app. Tap a city on the map to select it.',
    distanze: 'Distances', partenza: 'From', arrivo: 'To', scegli: 'Choose a city', unita: 'Unit',
    km: 'km', miglia: 'miles', linea: 'as the crow flies', diverse: 'Choose two different cities.', scambia: 'Swap',
    da: (a, b) => `From ${a} to ${b}`, nota: 'Straight-line distance between city centres; the road route is longer.',
  },
  fr: {
    titolo: 'La Vénétie', chiudi: 'Fermer', sottotitolo: 'Les 7 villes de l\'application. Touchez une ville sur la carte pour la choisir.',
    distanze: 'Distances', partenza: 'Départ', arrivo: 'Arrivée', scegli: 'Choisissez une ville', unita: 'Unité',
    km: 'km', miglia: 'miles', linea: 'à vol d\'oiseau', diverse: 'Choisissez deux villes différentes.', scambia: 'Inverser',
    da: (a, b) => `De ${a} à ${b}`, nota: 'Distance en ligne droite entre les centres-villes ; le trajet par la route est plus long.',
  },
  de: {
    titolo: 'Das Veneto', chiudi: 'Schließen', sottotitolo: 'Die 7 Städte der App. Tippe auf eine Stadt in der Karte, um sie zu wählen.',
    distanze: 'Entfernungen', partenza: 'Start', arrivo: 'Ziel', scegli: 'Stadt wählen', unita: 'Einheit',
    km: 'km', miglia: 'Meilen', linea: 'Luftlinie', diverse: 'Wähle zwei verschiedene Städte.', scambia: 'Tauschen',
    da: (a, b) => `Von ${a} nach ${b}`, nota: 'Luftlinie zwischen den Stadtzentren; die Strecke auf der Straße ist länger.',
  },
  es: {
    titolo: 'El Véneto', chiudi: 'Cerrar', sottotitolo: 'Las 7 ciudades de la app. Toca una ciudad en el mapa para elegirla.',
    distanze: 'Distancias', partenza: 'Salida', arrivo: 'Llegada', scegli: 'Elige una ciudad', unita: 'Unidad',
    km: 'km', miglia: 'millas', linea: 'en línea recta', diverse: 'Elige dos ciudades distintas.', scambia: 'Intercambiar',
    da: (a, b) => `De ${a} a ${b}`, nota: 'Distancia en línea recta entre los centros de las ciudades; por carretera es más larga.',
  },
};

// distanza in km tra due punti (formula dell'emisenoverso)
function distanzaKm(a, b) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.latitudine - a.latitudine);
  const dLon = rad(b.longitudine - a.longitudine);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitudine)) * Math.cos(rad(b.latitudine)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// riquadro del Veneto (gradi) e proiezione semplice con la correzione della latitudine
const TUTTI = Object.values(PROVINCE).flat(3);
const LON_MIN = Math.min(...TUTTI.filter((_, i) => i % 2 === 0));
const LON_MAX = Math.max(...TUTTI.filter((_, i) => i % 2 === 0));
const LAT_MIN = Math.min(...TUTTI.filter((_, i) => i % 2 === 1));
const LAT_MAX = Math.max(...TUTTI.filter((_, i) => i % 2 === 1));
const COS = Math.cos((((LAT_MIN + LAT_MAX) / 2) * Math.PI) / 180);
const LARGO = (LON_MAX - LON_MIN) * COS;
const ALTO = LAT_MAX - LAT_MIN;
const MARGINE = 0.03;

export default function MappaVeneto({ visibile, onChiudi, lingua }) {
  const t = TESTI[lingua] || TESTI.it;
  const { width } = useWindowDimensions();
  const larghezza = Math.min(width - 24, 520);
  const altezza = larghezza * (ALTO / LARGO);

  const [partenza, setPartenza] = useState(null);
  const [arrivo, setArrivo] = useState(null);
  const [menu, setMenu] = useState(null); // 'partenza' | 'arrivo' | null
  const [miglia, setMiglia] = useState(false);

  const citta = useMemo(() => CITTA.filter((c) => c.coordinate), []);
  const per = (id) => citta.find((c) => c.id === id);

  const proietta = (lat, lon) => ({
    x: ((lon - LON_MIN) * COS / LARGO) * larghezza,
    y: ((LAT_MAX - lat) / ALTO) * altezza,
  });

  const percorsi = useMemo(
    () =>
      Object.entries(PROVINCE).map(([id, anelli]) => ({
        id,
        d: anelli
          .map((a) => 'M' + a.map(([lon, lat]) => {
            const p = proietta(lat, lon);
            return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
          }).join('L') + 'Z')
          .join(''),
      })),
    [larghezza],
  );

  // toccando una città sulla mappa: riempie prima Partenza, poi Arrivo, poi ricomincia
  function tocca(id) {
    // se è l'unica città scelta, toccarla di nuovo svuota la selezione
    if ((partenza === id && !arrivo) || (arrivo === id && !partenza)) {
      setPartenza(null);
      setArrivo(null);
    } else if (partenza && arrivo) {
      setPartenza(id);
      setArrivo(null);
    } else if (!partenza) {
      setPartenza(id);
    } else {
      setArrivo(id);
    }
  }

  const A = partenza ? per(partenza) : null;
  const B = arrivo ? per(arrivo) : null;
  const km = A && B && A.id !== B.id ? distanzaKm(A.coordinate, B.coordinate) : null;
  const valore = km == null ? null : Math.round(miglia ? km * KM_IN_MIGLIA : km);

  const selettore = (chi, valoreId, etichetta) => (
    <View style={{ flex: 1 }}>
      <Text style={stili.etichetta}>{etichetta}</Text>
      <Pressable style={stili.menu} onPress={() => setMenu(chi)} accessibilityRole="button" accessibilityLabel={etichetta}>
        <Text style={[stili.menuTesto, !valoreId && { color: GRIGIO }]} numberOfLines={1}>
          {valoreId ? per(valoreId).nome : t.scegli}
        </Text>
        <Text style={stili.menuFreccia}>▾</Text>
      </Pressable>
    </View>
  );

  const pa = A ? proietta(A.coordinate.latitudine, A.coordinate.longitudine) : null;
  const pb = B ? proietta(B.coordinate.latitudine, B.coordinate.longitudine) : null;

  return (
    <Modal visible={visibile} animationType="slide" onRequestClose={onChiudi}>
      <SafeAreaView style={stili.pagina} edges={['top', 'left', 'right', 'bottom']}>
        <View style={stili.barra}>
          <Text style={stili.titolo}>{t.titolo}</Text>
          <Pressable onPress={onChiudi} style={stili.chiudi} accessibilityRole="button">
            <Text style={stili.chiudiTesto}>{t.chiudi}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
          <Text style={stili.sottotitolo}>{t.sottotitolo}</Text>

          <View style={[stili.carta, { width: larghezza, height: altezza }]}>
            <Svg width={larghezza} height={altezza}>
              {percorsi.map((p) => (
                <Path key={p.id} d={p.d} fill={p.id === partenza || p.id === arrivo ? '#cfe5da' : '#e7efe9'} stroke="#8fb3a2" strokeWidth={1} strokeLinejoin="round" />
              ))}
              {pa && pb && A.id !== B.id ? (
                <Line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={ARANCIO} strokeWidth={2.5} strokeDasharray="6 4" />
              ) : null}
              {citta.map((c) => {
                const p = proietta(c.coordinate.latitudine, c.coordinate.longitudine);
                const scelta = c.id === partenza || c.id === arrivo;
                const sotto = c.id === 'padova' || c.id === 'rovigo';
                return (
                  <G key={c.id} onPress={() => tocca(c.id)}>
                    <Circle cx={p.x} cy={p.y} r={18} fill="transparent" />
                    <Circle cx={p.x} cy={p.y} r={scelta ? 8 : 6} fill={c.id === partenza ? BLU : c.id === arrivo ? ARANCIO : VERDE} stroke="#fff" strokeWidth={2} />
                    <SvgText x={p.x} y={p.y + (sotto ? 22 : -11)} fontSize={13} fontWeight="700" fill="none" stroke="#e7efe9" strokeWidth={3.5} strokeLinejoin="round" textAnchor="middle">
                      {c.nome}
                    </SvgText>
                    <SvgText x={p.x} y={p.y + (sotto ? 22 : -11)} fontSize={13} fontWeight="700" fill={TESTO} textAnchor="middle">
                      {c.nome}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>

          <Text style={stili.sezione}>{t.distanze}</Text>
          <View style={stili.riga}>
            {selettore('partenza', partenza, t.partenza)}
            <Pressable
              style={stili.scambia}
              onPress={() => { setPartenza(arrivo); setArrivo(partenza); }}
              accessibilityRole="button"
              accessibilityLabel={t.scambia}
            >
              <Text style={stili.scambiaTesto}>⇄</Text>
            </Pressable>
            {selettore('arrivo', arrivo, t.arrivo)}
          </View>

          <View style={stili.unita}>
            <Text style={stili.etichetta}>{t.unita}</Text>
            {[false, true].map((m) => (
              <Pressable key={String(m)} onPress={() => setMiglia(m)} style={[stili.pillola, miglia === m && stili.pillolaAttiva]}>
                <Text style={[stili.pillolaTesto, miglia === m && { color: '#fff' }]}>{m ? t.miglia : t.km}</Text>
              </Pressable>
            ))}
          </View>

          <View style={stili.risultato}>
            {valore != null ? (
              <>
                <Text style={stili.risultatoDa}>{t.da(A.nome, B.nome)}</Text>
                <Text style={stili.risultatoNumero}>{valore} <Text style={stili.risultatoUnita}>{miglia ? t.miglia : t.km}</Text></Text>
                <Text style={stili.risultatoLinea}>{t.linea}</Text>
              </>
            ) : (
              <Text style={stili.risultatoLinea}>{A && B ? t.diverse : t.sottotitolo}</Text>
            )}
          </View>
          <Text style={stili.nota}>{t.nota}</Text>
        </ScrollView>

        <Modal visible={menu != null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
          <Pressable style={stili.velo} onPress={() => setMenu(null)}>
            <View style={stili.elenco}>
              {citta.map((c) => (
                <Pressable
                  key={c.id}
                  style={stili.voce}
                  onPress={() => {
                    if (menu === 'partenza') setPartenza(c.id); else setArrivo(c.id);
                    setMenu(null);
                  }}
                >
                  <Text style={[stili.voceTesto, (menu === 'partenza' ? partenza : arrivo) === c.id && { color: VERDE, fontWeight: '700' }]}>{c.nome}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: CREMA },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: VERDE },
  titolo: { color: '#fff', fontFamily: 'Marcellus_400Regular', fontSize: 24 },
  chiudi: { paddingHorizontal: 12, paddingVertical: 8 },
  chiudiTesto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sottotitolo: { color: GRIGIO, fontSize: 13, marginBottom: 10, textAlign: 'center' },
  carta: { alignSelf: 'center', backgroundColor: '#dcebf3', borderRadius: 12, overflow: 'hidden' },
  sezione: { color: VERDE, fontFamily: 'Marcellus_400Regular', fontSize: 22, marginTop: 20, marginBottom: 10 },
  riga: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  etichetta: { color: GRIGIO, fontSize: 12, marginBottom: 4 },
  menu: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cdd8d2', borderRadius: 10, paddingHorizontal: 12, height: 46 },
  menuTesto: { color: TESTO, fontSize: 15, flex: 1 },
  menuFreccia: { color: GRIGIO, fontSize: 14 },
  scambia: { width: 40, height: 46, alignItems: 'center', justifyContent: 'center' },
  scambiaTesto: { color: VERDE, fontSize: 22 },
  unita: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  pillola: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: VERDE },
  pillolaAttiva: { backgroundColor: VERDE },
  pillolaTesto: { color: VERDE, fontWeight: '700' },
  risultato: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e0e7e2' },
  risultatoDa: { color: GRIGIO, fontSize: 14 },
  risultatoNumero: { color: ARANCIO, fontSize: 44, fontWeight: '800', marginTop: 4 },
  risultatoUnita: { fontSize: 20, fontWeight: '700' },
  risultatoLinea: { color: GRIGIO, fontSize: 13, textAlign: 'center' },
  nota: { color: GRIGIO, fontSize: 11, textAlign: 'center', marginTop: 10 },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 28 },
  elenco: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 6 },
  voce: { paddingVertical: 13, paddingHorizontal: 18 },
  voceTesto: { color: TESTO, fontSize: 16 },
});
