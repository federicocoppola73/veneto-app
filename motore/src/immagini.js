// Foto dei luoghi della città attiva, lette da dati/immagini.json (generato da strumenti/prepara_pacchetto.py):
// foto principale assets/luoghi/<id>.webp; foto in più <id>_2.webp, _3, _4 nello stesso ordine del campo "galleria".
import { immagine } from './risorse';
import { datiProxy } from './dati';

const INDICE = datiProxy('immagini.json');

// IMMAGINI[id]: foto principale del luogo, se esiste
const IMMAGINI = new Proxy(
  {},
  {
    get: (_, id) => {
      if (typeof id !== 'string') return undefined;
      return INDICE.luoghi?.[id] !== undefined ? immagine(`luoghi/${id}.webp`) : undefined;
    },
  }
);

// GALLERIA[id]: foto in più del luogo, nell'ordine di luoghi.json
export const GALLERIA = new Proxy(
  {},
  {
    get: (_, id) => {
      if (typeof id !== 'string') return undefined;
      const n = INDICE.luoghi?.[id];
      if (n === undefined) return undefined;
      return Array.from({ length: n }, (_, i) => immagine(`luoghi/${id}_${i + 2}.webp`));
    },
  }
);

export default IMMAGINI;
