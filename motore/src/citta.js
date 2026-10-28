// Dati generali della città attiva (dati/citta.json del pacchetto): nome e funzioni disponibili.
import { datiProxy } from './dati';

const CITTA = datiProxy('citta.json');

// nome della città, usato nei testi al posto di "Venezia" (default: Venezia, come prima del motore unico)
export const nomeCitta = () => CITTA.nome || 'Venezia';

// marea: barra con il livello della laguna (solo Venezia)
export const haMarea = () => CITTA.marea !== false;

// centro della mappa all'apertura, punto di riferimento per le distanze e partenze degli itinerari
// (predefiniti: Venezia, come prima del motore unico)
const CENTRO_PREDEFINITO = { latitudine: 45.4372, longitudine: 12.333, zoom: 3 };
const RIFERIMENTO_PREDEFINITO = { latitudine: 45.43405, longitudine: 12.3384 };
const PARTENZE_PREDEFINITE = { 'piazzale-roma': 'piazzale-roma', stazione: 'stazione' };

export const centroCitta = () => CITTA.centro || CENTRO_PREDEFINITO;
export const riferimentoCitta = () => CITTA.riferimento || RIFERIMENTO_PREDEFINITO;
// partenze fisse degli itinerari: chiave (come in PARTENZE) -> id del luogo di partenza
export const partenzeCitta = () => CITTA.partenze || PARTENZE_PREDEFINITE;
