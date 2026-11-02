// Personaggi famosi della città attiva: dati in personaggi.json (campo "personaggi").
import { datiProxy } from './dati';

const DATI = datiProxy('personaggi.json');

export function personaggi() {
  return DATI.personaggi || [];
}
