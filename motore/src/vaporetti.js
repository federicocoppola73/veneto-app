// Linee del vaporetto ACTV: dati in vaporetti.json (generato da strumenti/vaporetti.py dal GTFS ACTV).
const DATI = datiProxy('vaporetti.json');
const DATI_AUTOBUS = datiProxy('autobus.json');
import { distanzaMetri } from './distanza';
import { datiProxy } from './dati';

export const URL_ORARI_NAVIGAZIONE = 'https://avm.avmspa.it/it/content/orari-servizio-di-navigazione-0';
export let VALIDITA_VAPORETTI = null;

// autobus e tram che partono o arrivano a Piazzale Roma (autobus.json, da strumenti/autobus.py):
// si vedono nella scheda di P.le Roma sotto i vaporetti, con lo stesso schema e gli stessi orari
let TUTTE_LE_LINEE = [];
let LINEE = {};
let FERMATE = {};
// Chiamata all'apertura della città: legge i dati del pacchetto
export function inizializzaVaporetti() {
  VALIDITA_VAPORETTI = DATI.validita;
  TUTTE_LE_LINEE = [...DATI.linee, ...DATI_AUTOBUS.linee];
  LINEE = Object.fromEntries(TUTTE_LE_LINEE.map((l) => [l.id, l]));
  FERMATE = { ...DATI.fermate };
  for (const [id, f] of Object.entries(DATI_AUTOBUS.fermate)) {
    FERMATE[id] = FERMATE[id] || { ...f, linee: [] }; // solo il nome: le linee di bus sono in fermataLinee
  }
}

export const lineaVaporetto = (id) => LINEE[id] || null;
export const fermataVaporetto = (id) => FERMATE[id] || null;
export const nomeFermata = (id) => FERMATE[id]?.nome || id;

// linee dei vaporetti che fermano qui (1, 2, 3, ... notturne in fondo)
export function lineeDellaFermata(id) {
  const f = FERMATE[id];
  if (!f) return [];
  return DATI.linee.filter((l) => f.linee.includes(l.id));
}

// autobus e tram: solo alla fermata di Piazzale Roma, in una riga a parte
export function lineeAutobusDellaFermata(id) {
  const ids = DATI_AUTOBUS.fermataLinee[id] || [];
  return DATI_AUTOBUS.linee.filter((l) => ids.includes(l.id));
}

// Fermate dell'autobus con almeno una linea, entro un raggio dal luogo, dalla più vicina:
// per i luoghi che non hanno una fermata scritta a mano (es. Verona)
// Ogni linea compare una sola volta: alla fermata più vicina che la serve (le altre fermate della stessa linea si saltano)
export function fermateAutobusVicine(lat, lon, massimo = 300, quante = 3) {
  if (lat == null || lon == null) return [];
  const viste = new Set();
  const risultato = [];
  const candidate = Object.entries(DATI_AUTOBUS.fermate)
    .map(([id, f]) => ({ id, testo: f.nome, metri: distanzaMetri(lat, lon, f.lat, f.lon) }))
    .filter((f) => f.metri <= massimo)
    .sort((a, b) => a.metri - b.metri);
  for (const f of candidate) {
    const nuove = lineeAutobusDellaFermata(f.id).filter((l) => !viste.has(l.id));
    if (nuove.length === 0) continue;
    nuove.forEach((l) => viste.add(l.id));
    risultato.push({ ...f, lineeBus: nuove });
    if (risultato.length === quante) break;
  }
  return risultato;
}

/**
 * Le fermate scritte nel campo "fermata" di un luogo, abbinate alle fermate ACTV.
 * "Rialto / San Zaccaria" -> [{ testo: 'Rialto', id: 'rialto' }, { testo: 'San Zaccaria', id: 's-marco-san-zaccaria' }]
 * Le voci speciali (es. l'itinerario sul Canal Grande) portano anche la linea da mostrare.
 */
export function fermateDelLuogo(voce) {
  if (!voce) return [];
  const speciale = DATI.vociLinea[voce];
  if (speciale) return [{ testo: voce, id: speciale.fermata, linea: speciale.linea }];
  return voce.split('/').map((p) => {
    const testo = p.trim();
    return { testo, id: DATI.alias[testo] || null };
  });
}

// fermata ACTV più vicina a un punto (per le fermate del vaporetto di OpenStreetMap nei servizi)
export function fermataVicina(lat, lon, massimo = 150) {
  let migliore = null;
  let minima = massimo;
  for (const [id, f] of Object.entries(DATI.fermate)) {
    const d = distanzaMetri(lat, lon, f.lat, f.lon);
    if (d < minima) {
      minima = d;
      migliore = id;
    }
  }
  return migliore;
}

/**
 * Direzioni di una linea in cui si può salire a questa fermata, con l'etichetta da mostrare:
 * capolinea (per le circolari si dice "circolare") e prossima fermata, così si capisce da che parte va
 * anche quando i due capolinea sono vicini (es. linea 2: S. Marco Giardinetti / S. Marco-San Zaccaria).
 */
export function direzioniDallaFermata(linea, fermataIds) {
  const ids = [].concat(fermataIds); // una fermata, o le paline con lo stesso nome (es. Piazza Bra Arena)
  return linea.direzioni
    .map((d) => {
      const fermataId = ids.find((id) => d.fermate.includes(id));
      if (!fermataId) return null;
      const pos = d.fermate.indexOf(fermataId);
      if (!d.circolare && pos === d.fermate.length - 1) return null;
      const prossima = d.fermate[pos + 1];
      return {
        ...d,
        fermataId, // la palina di questa direzione: da qui si leggono partenze e orari
        posizione: pos,
        capolinea: nomeFermata(d.fermate[d.fermate.length - 1]),
        prossima: nomeFermata(prossima),
      };
    })
    .filter(Boolean);
}

// paline dell'autobus con lo stesso nome della fermata (es. due Piazza Bra Arena): si mostrano come un'unica fermata
export function fermateStessoNome(id) {
  const f = FERMATE[id];
  if (!f || !id.startsWith('autobus-')) return [id];
  return Object.keys(DATI_AUTOBUS.fermate).filter((k) => DATI_AUTOBUS.fermate[k].nome === f.nome);
}

// pagina degli orari ACTV della linea (una per direzione); per le linee senza pagina propria, l'elenco generale
export function urlOrariLinea(linea, direzione) {
  if (linea.pdf) return linea.pdf; // autobus e tram: pagina ATV con i percorsi e gli orari (autobus.json)
  if (!/^[0-9A-Z.]+$/.test(linea.id)) return URL_ORARI_NAVIGAZIONE;
  return `https://orari.actv.it/line.html?service=NAV&linename=${encodeURIComponent(linea.id)}&subsector=&direction=${direzione}`;
}

// colore della linea nello schema: i colori molto chiari (giallo, verde acqua) vengono scuriti per vedersi sul bianco
export function coloreSchema(hex) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const luce = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luce > 0.6) {
    const k = 0.6 / luce;
    r = Math.round(r * k);
    g = Math.round(g * k);
    b = Math.round(b * k);
  }
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
