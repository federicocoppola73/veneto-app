// Zone (sestieri e isole) usate nella scheda e nel filtro della ricerca.
// Per i luoghi fuori dai sei sestieri si usa il nome che il turista riconosce:
// la Giudecca è amministrativamente Dorsoduro e San Giorgio è San Marco, ma qui sono zone a sé.
// Un luogo a cavallo di due zone (i ponti sul Canal Grande) ha "sestiere": "Dorsoduro / San Marco"
// e compare nel filtro di entrambe.
export const ZONE = [
  'Cannaregio',
  'Castello',
  'San Marco',
  'Dorsoduro',
  'San Polo',
  'Santa Croce',
  'Giudecca',
  'San Giorgio',
  'San Michele',
  'Murano',
  'Burano',
  'Mazzorbo',
  'Torcello',
];

/** Elenco delle zone di un luogo ("Dorsoduro / San Marco" -> ["Dorsoduro", "San Marco"]). */
export const zoneDi = (luogo) =>
  (luogo.sestiere || '')
    .split('/')
    .map((z) => z.trim())
    .filter(Boolean);

/** Zone presenti fra i luoghi, nell'ordine di ZONE (eventuali zone nuove in fondo). */
export const zonePresenti = (luoghi) => {
  const presenti = new Set(luoghi.flatMap(zoneDi));
  const note = ZONE.filter((z) => presenti.has(z));
  const altre = [...presenti].filter((z) => !ZONE.includes(z)).sort((a, b) => a.localeCompare(b, 'it'));
  return [...note, ...altre];
};
