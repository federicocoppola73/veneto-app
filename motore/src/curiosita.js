import { testoLocalizzato } from './i18n';
import { datiProxy } from './dati';
// Curiosità (luoghi e non) e piatti di "Cosa mangiare": dati in curiosita.json e cibi.json.
const DATI_CURIOSITA = datiProxy('curiosita.json');
const DATI_CIBI = datiProxy('cibi.json');

export let CURIOSITA = [];
export let CIBI = [];
export function inizializzaCuriosita() {
  CURIOSITA = DATI_CURIOSITA.curiosita;
  CIBI = DATI_CIBI.cibi;
}
// icona di segnaposto per i piatti senza foto (lista e cartolina)
export const ICONE_PORTATA = { cicchetto: '🍤', primo: '🍝', secondo: '🐟', contorno: '🥗', dolce: '🍪' };

// Coordinate di una curiosità: quelle proprie, oppure quelle del luogo collegato (luogo_id).
export function posizioneCuriosita(c, luoghiPerId) {
  if (c.latitudine != null && c.longitudine != null) return { lat: c.latitudine, lon: c.longitudine };
  const luogo = c.luogo_id ? luoghiPerId[c.luogo_id] : null;
  return luogo ? { lat: luogo.latitudine, lon: luogo.longitudine } : null;
}

// Prima frase di un testo nella lingua scelta, per l'anteprima nell'elenco.
export function anteprima(testo, lingua) {
  const t = testoLocalizzato(testo, lingua);
  const fine = t.indexOf('. ');
  return fine > 0 ? t.slice(0, fine + 1) : t;
}
