// Itinerari a piedi e in vaporetto: dati in itinerari.json (generato da strumenti/itinerari.py a partire da itinerari.txt)
const dati = datiProxy('itinerari.json');
import { distanzaMetri, formattaDistanza } from './distanza';
import { datiProxy } from './dati';

export let ITINERARI = [];
export function inizializzaItinerari() {
  ITINERARI = dati.itinerari || [];
}

// Punti di partenza tra cui l'utente sceglie prima dell'itinerario.
// 'piazzale-roma' e 'stazione' sono id di luoghi.json: il primo tratto è calcolato lungo calli e ponti
// (lungo il canale per gli itinerari in vaporetto).
export const PARTENZE = [
  { id: 'piazzale-roma', chiave: 'part_piazzaleRoma', icona: '🚌' },
  { id: 'stazione', chiave: 'part_stazione', icona: '🚆' },
  { id: 'posizione', chiave: 'part_posizione', icona: '◎' },
];

const PASSO = 75; // metri al minuto a piedi, ponti e folla compresi
const PASSO_VAPORETTO = 80; // metri al minuto in vaporetto (linea 1, fermate comprese)
const FATTORE_CALLI = 1.3; // dalla posizione dell'utente: linea d'aria +30%

export const COLORE_PERCORSO_ACQUA = '#0284c7'; // linea sulla mappa degli itinerari in vaporetto

// Icona dell'itinerario: vaporetto per quelli nautici, bussola per quelli a piedi
export const iconaItinerario = (it) => (it?.nautico ? '⛴️' : '🧭');

// Metri al minuto per l'itinerario (a piedi o in vaporetto)
export const passoItinerario = (it) => (it?.nautico ? PASSO_VAPORETTO : PASSO);

/**
 * Lunghezza del percorso completo (partenza -> prima tappa -> ... -> ultima tappa).
 * Restituisce { metri, stimato, soloItinerario } oppure null se la partenza non è ancora nota.
 *  - stimato: il primo tratto (dalla posizione dell'utente) è una stima in linea d'aria
 *    (succede solo se l'utente non è vicino a una calle del centro storico, per esempio in barca)
 *  - soloItinerario: l'utente è lontano da Venezia (o l'itinerario è in vaporetto), si conta solo l'itinerario
 */
export function lunghezzaItinerario(it, partenza, { coordinate, lontano, luoghiPerId, metriAPiedi }) {
  if (!it || !partenza) return null;
  if (partenza === 'posizione') {
    if (!coordinate) return null;
    // in vaporetto si sale alla fermata più comoda: conta solo il giro sul canale
    if (lontano || it.nautico) return { metri: it.metri, soloItinerario: true };
    // percorso vero lungo le calli, calcolato sul telefono (se l'utente è sulla rete pedonale)
    const vero = metriAPiedi ? metriAPiedi(it.tappe[0]) : null;
    if (vero != null) return { metri: it.metri + vero };
    const prima = luoghiPerId[it.tappe[0]];
    const linea = distanzaMetri(coordinate.latitudine, coordinate.longitudine, prima.latitudine, prima.longitudine);
    return { metri: it.metri + linea * FATTORE_CALLI, stimato: true };
  }
  return { metri: it.metri + (it.partenze?.[partenza]?.metri || 0) };
}

// "2,3 km · 31 min" (con "circa" davanti se stimato); per gli itinerari in vaporetto i minuti sono in barca
export function testoLunghezza(l, t, nautico = false) {
  if (!l) return '';
  const minuti = Math.max(1, Math.round(l.metri / (nautico ? PASSO_VAPORETTO : PASSO)));
  const ore = minuti >= 60 ? `${Math.floor(minuti / 60)} h ${String(minuti % 60).padStart(2, '0')}` : `${minuti} min`;
  return `${l.stimato ? `${t('circa')} ` : ''}${formattaDistanza(l.metri, t)} · ${ore}${nautico ? ` ${t('itin_inVaporetto')}` : ''}`;
}
