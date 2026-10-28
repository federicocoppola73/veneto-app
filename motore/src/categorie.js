// Tipologie di luogo: ordine dei filtri e colore dei pallini sulla mappa.
// Per aggiungere una tipologia: aggiungila qui, in luoghi.json ("categorie")
// e aggiungi la traduzione "cat_<id>" in src/i18n.js.
export const CATEGORIE = [
  { id: 'chiese', colore: '#7c3aed', icona: '✝' },
  { id: 'musei', colore: '#e11d48', icona: '🏛' },
  { id: 'palazzi', colore: '#b45309', icona: '◆' },
  { id: 'ponti', colore: '#334155', icona: '⌒' },
  { id: 'piazze', colore: '#0891b2', icona: '■' },
  { id: 'giardini', colore: '#65a30d', icona: '✿' },
  { id: 'altri', colore: '#2563eb', icona: '●' },
];

export const coloreCategoria = (id) => CATEGORIE.find((c) => c.id === id)?.colore || '#475569';
