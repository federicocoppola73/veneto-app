// Dati generali della città attiva (dati/citta.json del pacchetto): nome e funzioni disponibili.
import { datiProxy } from './dati';

const CITTA = datiProxy('citta.json');

// nome della città, usato nei testi al posto di "Venezia" (default: Venezia, come prima del motore unico)
export const nomeCitta = () => CITTA.nome || 'Venezia';

// marea: barra con il livello della laguna (solo Venezia)
export const haMarea = () => CITTA.marea !== false;
