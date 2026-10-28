import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { coloreCategoria } from '../categorie';
import { testoLocalizzato } from '../i18n';
import { COLORE_PERCORSO_ACQUA, iconaItinerario, testoLunghezza } from '../itinerari';
import { creaProiezione } from '../geo';
const configMappa = datiProxy('mappa.json');
import { altezzaCartolina, LARGHEZZA_CARTOLINA } from './Cartolina';
import { immagine } from '../risorse';
import { datiProxy } from '../dati';

// Cartolina 9:16 di un itinerario: mappa col percorso in alto, nomi delle tappe, banner blu in fondo.
// Stessa misura della cartolina dei luoghi (360×640 logici, catturata a 3×).
// altezza della mappa: 290 nelle Storie (9:16), 200 nel feed (4:5)
const altezzaMappaDi = (formato) => (formato === 'feed' ? 200 : 290);
const IMMAGINE_MAPPA = immagine('mappa-venezia.webp');
const LOGO = immagine('icon.png');
const NOME_APP = 'Venezia: Monumenti & altro';
const COLORE_PERCORSO_CAMMINO = '#2563eb';
const MASSIMO_NOMI = 10; // oltre questo numero di tappe si scrivono solo inizio, fine e il conteggio

const proietta = (lat, lon) => creaProiezione(configMappa)(lat, lon); // calcolata quando serve // latitudine/longitudine -> pixel dell'immagine della mappa

// Calcola dove disegnare percorso e tappe: l'immagine viene ingrandita e centrata sul percorso
function geometria(itinerario, luoghiPerId, altezzaMappa) {
  const tappe = itinerario.tappe
    .map((id, i) => {
      const l = luoghiPerId[id];
      if (!l || l.latitudine == null) return null;
      return { ...proietta(l.latitudine, l.longitudine), numero: i + 1, categoria: l.categoria };
    })
    .filter(Boolean);

  // linee: i tratti tra una tappa e l'altra (o, se mancano, una linea che unisce le tappe)
  let linee = (itinerario.tratti || [])
    .map((tr) => (tr.percorso || []).map(([la, lo]) => proietta(la, lo)))
    .filter((l) => l.length > 1);
  if (!linee.length && tappe.length > 1) linee = [tappe.map((p) => ({ x: p.x, y: p.y }))];

  const punti = [...linee.flat(), ...tappe];
  let cx = configMappa.larghezza / 2;
  let cy = configMappa.altezza / 2;
  let s = Math.min(LARGHEZZA_CARTOLINA / configMappa.larghezza, altezzaMappa / configMappa.altezza);
  if (punti.length) {
    const xs = punti.map((p) => p.x);
    const ys = punti.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const margine = 1.24; // un po' di aria attorno al percorso
    const bw = Math.max(maxX - minX, 1) * margine;
    const bh = Math.max(maxY - minY, 1) * margine;
    cx = (minX + maxX) / 2;
    cy = (minY + maxY) / 2;
    s = Math.min(LARGHEZZA_CARTOLINA / bw, altezzaMappa / bh, 1.6);
  }
  const a = (p) => ({ x: (p.x - cx) * s + LARGHEZZA_CARTOLINA / 2, y: (p.y - cy) * s + altezzaMappa / 2 });
  return {
    linee: linee.map((l) => l.map(a)),
    tappe: tappe.map((p) => ({ ...a(p), numero: p.numero, categoria: p.categoria })),
    immagine: {
      left: LARGHEZZA_CARTOLINA / 2 - cx * s,
      top: altezzaMappa / 2 - cy * s,
      width: configMappa.larghezza * s,
      height: configMappa.altezza * s,
    },
  };
}

const CartolinaItinerario = forwardRef(function CartolinaItinerario({ itinerario, luoghiPerId, lingua, testo, t, lunghezza, formato = 'storie' }, ref) {
  const altezza = altezzaCartolina(formato);
  const altezzaMappa = altezzaMappaDi(formato);
  const geo = geometria(itinerario, luoghiPerId, altezzaMappa);
  const nautico = !!itinerario.nautico;
  const colorePercorso = nautico ? COLORE_PERCORSO_ACQUA : COLORE_PERCORSO_CAMMINO;
  const nomi = itinerario.tappe.map((id) => luoghiPerId[id]?.nome || id);
  const n = nomi.length;
  // fino a 10 tappe si scrivono tutti i nomi; oltre, solo la prima, l'ultima e il conteggio
  const testoTappe = n <= MASSIMO_NOMI
    ? nomi.join(' · ')
    : `${nomi[0]} → ${nomi[n - 1]} · ${n} ${t('tappe')}`;
  const statistiche = testoLunghezza(lunghezza, t, nautico);
  const messaggio = (testo || '').trim();

  return (
    <View ref={ref} collapsable={false} style={[styles.carta, { height: altezza }]}>
      <View style={[styles.mappa, { height: altezzaMappa }]}>
        <Image source={IMMAGINE_MAPPA} style={[styles.immagine, geo.immagine]} />
        <Svg width={LARGHEZZA_CARTOLINA} height={altezzaMappa} style={StyleSheet.absoluteFill}>
          {geo.linee.map((linea, i) => (
            <Polyline
              key={`l${i}`}
              points={linea.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              fill="none"
              stroke={colorePercorso}
              strokeWidth={4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {geo.tappe.map((p) => (
            <React.Fragment key={`t${p.numero}`}>
              <Circle cx={p.x} cy={p.y} r={8} fill={coloreCategoria(p.categoria)} stroke="#fff" strokeWidth={1.5} />
              <SvgText
                x={p.x}
                y={p.y}
                dy={3}
                fill="#fff"
                fontSize={p.numero > 9 ? 7.5 : 9}
                fontWeight="bold"
                textAnchor="middle"
              >
                {p.numero}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
        <Text style={styles.credito}>Mappa © OpenStreetMap</Text>
      </View>

      <View style={styles.corpo}>
        {/* formato 4:5 (450 px): testi più piccoli e meno righe, come nella cartolina dei luoghi */}
        <Text style={[styles.titolo, formato === 'feed' && styles.titoloCompatto]} numberOfLines={2}>
          {iconaItinerario(itinerario)} {testoLocalizzato(itinerario.titolo, lingua)}
        </Text>
        {statistiche ? <Text style={styles.statistiche}>{statistiche}</Text> : null}
        <Text style={[styles.nomi, formato === 'feed' && styles.nomiCompatti]} numberOfLines={formato === 'feed' ? 2 : 4}>
          {testoTappe}
        </Text>
        {messaggio ? (
          <Text style={[styles.messaggio, formato === 'feed' && styles.messaggioCompatto]} numberOfLines={formato === 'feed' ? 1 : 2}>
            “{messaggio}”
          </Text>
        ) : null}
      </View>

      <View style={styles.piede}>
        <Image source={LOGO} style={styles.logo} />
        <View style={styles.piedeTesto}>
          <Text style={styles.invito} numberOfLines={2}>{t('cart_invito')}</Text>
          <Text style={styles.app}>{NOME_APP}</Text>
          <Text style={styles.link} numberOfLines={1}>{t('cart_scarica')}</Text>
        </View>
      </View>
    </View>
  );
});

export default CartolinaItinerario;

const styles = StyleSheet.create({
  carta: {
    width: LARGHEZZA_CARTOLINA,
    height: altezzaCartolina('storie'),
    backgroundColor: '#fbf7f0',
    overflow: 'hidden',
  },
  mappa: { backgroundColor: '#cfe8f7', overflow: 'hidden' },
  immagine: { position: 'absolute' },
  credito: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    fontSize: 8,
    color: '#334155',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 3,
    borderRadius: 2,
  },
  corpo: { flex: 1, paddingHorizontal: 22, paddingTop: 14, overflow: 'hidden' },
  titolo: { fontSize: 22, fontWeight: '800', color: '#0f3d5e' },
  titoloCompatto: { fontSize: 18 },
  nomiCompatti: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  messaggioCompatto: { fontSize: 13, marginTop: 6 },
  statistiche: { fontSize: 14, fontWeight: '700', color: '#b45309', marginTop: 4 },
  nomi: { fontSize: 13, lineHeight: 18, color: '#334155', marginTop: 8 },
  messaggio: { fontSize: 15, fontStyle: 'italic', color: '#9a3412', marginTop: 10 },
  piede: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f3d5e',
    paddingHorizontal: 20,
  },
  logo: { width: 44, height: 44, borderRadius: 10 },
  piedeTesto: { flex: 1 },
  invito: { color: '#fff', fontSize: 13, fontWeight: '700' },
  app: { color: '#bae6fd', fontSize: 12, marginTop: 2 },
  link: { color: '#e0f2fe', fontSize: 9, marginTop: 2 },
});
