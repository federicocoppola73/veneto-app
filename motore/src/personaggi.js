// Personaggi famosi della città attiva: dati in personaggi.json (campo "personaggi"), in ordine cronologico.
import { datiProxy } from './dati';

const DATI = datiProxy('personaggi.json');

// anno per l'ordinamento: "ordine" (per chi non ha date certe), altrimenti nascita, altrimenti morte
const anno = (p) => [p.ordine, p.nascita, p.morte].find((v) => typeof v === 'number') ?? Infinity;

export function personaggi() {
  return [...(DATI.personaggi || [])].sort((a, b) => anno(a) - anno(b));
}
