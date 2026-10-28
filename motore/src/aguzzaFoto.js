import { immagine } from './risorse';
import { datiProxy } from './dati';
// Foto delle risposte "Aguzza la vista": file in assets/aguzza, elencati in dati/immagini.json.
const INDICE = datiProxy('immagini.json');

// FOTO_AGUZZA[percorso]: es. 'aguzza/nome.webp'
export const FOTO_AGUZZA = new Proxy(
  {},
  {
    get: (_, file) => (typeof file === 'string' && (INDICE.aguzza || []).includes(file) ? immagine(file) : undefined),
  }
);
