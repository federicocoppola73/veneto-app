import { immagine } from './risorse';
// Foto dei piatti (assets/cibi), collegate per id come in cibi.json (campo "foto": file, autore, licenza, fonte).
const IMMAGINI_CIBI = {
  'sarde-in-saor': immagine('cibi/sarde-in-saor.webp'),
  'bigoli-in-salsa': immagine('cibi/bigoli-in-salsa.webp'),
  'seppie-in-nero': immagine('cibi/seppie-in-nero.webp'),
  'nervetti': immagine('cibi/nervetti.webp'),
  'baccala-mantecato': immagine('cibi/baccala-mantecato.webp'),
  'zaeti': immagine('cibi/zaeti.webp'),
  'essi-buranelli': immagine('cibi/essi-buranelli.webp'),
  'risotto-uvetta': immagine('cibi/risotto-uvetta.webp'),
  'risi-e-bisi': immagine('cibi/risi-e-bisi.webp'),
  'galani-veneziani': immagine('cibi/galani-veneziani.webp'),
  'dolce-san-martino': immagine('cibi/dolce-san-martino.webp'),
  'fritole-veneziane': immagine('cibi/fritole-veneziane.webp'),
};

export function fotoCibo(c) {
  return IMMAGINI_CIBI[c.id] || null;
}
