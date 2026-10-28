// Orari del vaporetto ACTV: dati in orari_vaporetti.json (generato da strumenti/orari_vaporetti.py dal GTFS ACTV).
// Tutto è calcolato sul telefono, all'ora di Venezia, senza connessione.
const DATI = datiProxy('orari_vaporetti.json');
const DATI_AUTOBUS = datiProxy('orari_autobus.json');
import { oraVenezia } from './orari';
import { nomeFermata } from './vaporetti';
import { datiProxy } from './dati';

// orari dei vaporetti o, per le linee di autobus e tram (id AUT-... e TRAM-...), quelli di orari_autobus.json
const datiPer = (lineaId) => (/^(AUT|TRAM)-/.test(lineaId || '') ? DATI_AUTOBUS : DATI);
// periodo di validità degli orari della linea: { 0: inizio, 1: fine }
export const validitaOrariPer = (lineaId) => datiPer(lineaId).validita;

const due = (n) => String(n).padStart(2, '0');
// "605" (minuti dalla mezzanotte, anche oltre le 24) -> "10:05"; dopo mezzanotte "00:15"
export const formattaMinuti = (m) => `${due(Math.floor(m / 60) % 24)}:${due(m % 60)}`;

// giorno di Venezia spostato di "scarto" giorni: { chiave 'AAAAMMGG', giorno della settimana 0 = lunedì }
function giornoVenezia(adesso, scarto) {
  const v = oraVenezia(adesso);
  const d = new Date(Date.UTC(v.anno, v.mese - 1, v.data + scarto));
  return {
    chiave: `${d.getUTCFullYear()}${due(d.getUTCMonth() + 1)}${due(d.getUTCDate())}`,
    giorno: (d.getUTCDay() + 6) % 7,
  };
}

// servizi del GTFS validi in un giorno (calendario settimanale + eccezioni), oppure null se fuori validità
function serviziDelGiorno(dati, { chiave, giorno }) {
  if (chiave < dati.validita[0] || chiave > dati.validita[1]) return null;
  const attivi = new Set();
  dati.servizi.forEach((s, i) => {
    if (s.da && s.da <= chiave && chiave <= s.a && s.giorni[giorno] === '1') attivi.add(i);
  });
  const eccezione = dati.date[chiave];
  if (eccezione) {
    eccezione.piu.forEach((i) => attivi.add(i));
    eccezione.meno.forEach((i) => attivi.delete(i));
  }
  return attivi;
}

// partenze di un giorno di servizio: [{ minuti, capolinea (id fermata o null se è il capolinea principale) }]
function partenzeDelGiorno(fermataId, lineaId, direzione, servizi) {
  const dati = datiPer(lineaId);
  const righe = dati.orari[fermataId]?.[lineaId]?.[String(direzione)];
  if (!righe || !servizi) return [];
  const out = [];
  for (const [ids, testo] of righe) {
    if (!ids.some((i) => servizi.has(i))) continue;
    for (const pezzo of testo.split(',')) {
      const [m, c] = pezzo.split('>');
      out.push({ minuti: parseInt(m, 36), capolinea: c != null ? dati.capolinea[Number(c)] : null });
    }
  }
  return out.sort((a, b) => a.minuti - b.minuti);
}

export const haOrari = (fermataId, lineaId) => !!datiPer(lineaId).orari[fermataId]?.[lineaId];

/**
 * Prossime partenze da questa fermata, per linea e direzione: corse di oggi non ancora partite,
 * quelle "dopo mezzanotte" del giorno prima e, se non bastano, le prime di domani.
 * Restituisce null se gli orari non coprono oggi (dati ACTV scaduti), altrimenti
 * [{ ora: '10:05', tra: minuti mancanti, domani: bool, verso: nome del capolinea se diverso da quello della linea }]
 */
export function prossimePartenze(fermataId, lineaId, direzione, adesso = new Date(), quante = 4) {
  const ora = oraVenezia(adesso).minuti;
  const dati = datiPer(lineaId);
  const oggi = serviziDelGiorno(dati, giornoVenezia(adesso, 0));
  if (!oggi) return null;
  const ieri = serviziDelGiorno(dati, giornoVenezia(adesso, -1));
  const domani = serviziDelGiorno(dati, giornoVenezia(adesso, 1));
  const lista = [
    ...partenzeDelGiorno(fermataId, lineaId, direzione, ieri).map((p) => ({ ...p, minuti: p.minuti - 1440 })),
    ...partenzeDelGiorno(fermataId, lineaId, direzione, oggi),
    ...partenzeDelGiorno(fermataId, lineaId, direzione, domani).map((p) => ({ ...p, minuti: p.minuti + 1440 })),
  ]
    .filter((p) => p.minuti >= ora)
    .sort((a, b) => a.minuti - b.minuti);
  const viste = new Set();
  const out = [];
  for (const p of lista) {
    if (viste.has(p.minuti)) continue;
    viste.add(p.minuti);
    out.push({
      ora: formattaMinuti(((p.minuti % 1440) + 1440) % 1440),
      tra: p.minuti - ora,
      domani: p.minuti >= 1440 + 180, // le corse fino alle 3 di notte restano "stanotte"
      verso: p.capolinea ? nomeFermata(p.capolinea) : null,
    });
    if (out.length >= quante) break;
  }
  return out;
}

/**
 * Orario completo di un giorno (0 = oggi, 1 = domani) raggruppato per ora:
 * [{ ora: 6, partenze: [{ minuto: '05', assoluto: minuti dalla mezzanotte, verso }] }], oppure null se il giorno è fuori validità.
 */
export function orarioDelGiorno(fermataId, lineaId, direzione, adesso = new Date(), scarto = 0) {
  const servizi = serviziDelGiorno(datiPer(lineaId), giornoVenezia(adesso, scarto));
  if (!servizi) return null;
  const perOra = new Map();
  for (const p of partenzeDelGiorno(fermataId, lineaId, direzione, servizi)) {
    const h = Math.floor(p.minuti / 60);
    if (!perOra.has(h)) perOra.set(h, []);
    const lista = perOra.get(h);
    const minuto = due(p.minuti % 60);
    if (!lista.some((x) => x.minuto === minuto)) {
      lista.push({ minuto, assoluto: p.minuti, verso: p.capolinea ? nomeFermata(p.capolinea) : null });
    }
  }
  return [...perOra.entries()].map(([h, partenze]) => ({ ora: h % 24, partenze }));
}

export let VALIDITA_ORARI = null;
export function inizializzaOrari() {
  VALIDITA_ORARI = DATI.validita;
} // vaporetti (gli autobus hanno un periodo proprio: validitaOrariPer)
export const minutiVenezia = (adesso = new Date()) => oraVenezia(adesso).minuti;
