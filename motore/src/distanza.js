// Distanze tra coordinate GPS e tempi di percorrenza a piedi.

const RAGGIO_TERRA = 6371000; // metri

// Distanza in linea d'aria (formula dell'emisenoverso), in metri
export function distanzaMetri(lat1, lon1, lat2, lon2) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAGGIO_TERRA * Math.asin(Math.sqrt(a));
}

// A Venezia calli e ponti allungano il percorso: circa +30% rispetto alla linea d'aria,
// a un passo di 75 metri al minuto (ponti e folla compresi)
export function minutiAPiedi(metri) {
  return Math.max(1, Math.round((metri * 1.3) / 75));
}

export function formattaDistanza(metri, t) {
  if (metri < 1000) return `${Math.round(metri / 10) * 10} m`;
  const km = metri < 10000 ? (metri / 1000).toFixed(1) : String(Math.round(metri / 1000));
  return `${km.replace('.', t('decimale'))} km`;
}

// "350 m · 6 min a piedi" (oltre i 5 km solo la distanza)
export function testoDistanza(metri, t) {
  const d = formattaDistanza(metri, t);
  return metri > 5000 ? d : `${d} · ${minutiAPiedi(metri)} ${t('minAPiedi')}`;
}
