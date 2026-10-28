import { immagine } from './risorse';
import { datiProxy } from './dati';
// Foto dei piatti (assets/cibi/<id>.webp), elencate in dati/immagini.json.
const INDICE = datiProxy('immagini.json');

export function fotoCibo(c) {
  return (INDICE.cibi || []).includes(c.id) ? immagine(`cibi/${c.id}.webp`) : null;
}
