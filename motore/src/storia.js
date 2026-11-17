import { datiProxy } from './dati';
// Schede storiche della città attiva (dati/storia.json): periodi in ordine cronologico, dalle origini a oggi.
// Forma: { periodi: [ { id, titolo: { it, en, fr, de, es }, anni: { it, … } | "1100-1400", testo: { it, … } } ] }
// Nel testo i paragrafi sono separati da una riga vuota. Se il file manca, la città non ha ancora schede.
const DATI = datiProxy('storia.json');
export const periodiStoria = () => (Array.isArray(DATI.periodi) ? DATI.periodi : []);
