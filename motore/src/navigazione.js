// Orientamento per la guida a piedi: direzione verso il prossimo punto del percorso,
// rispetto a dove guarda il telefono.

const rad = (g) => (g * Math.PI) / 180;

// Rumbo in gradi (0 = nord, in senso orario) da un punto a un altro
export function rumboTra(lat1, lon1, lat2, lon2) {
  const f1 = rad(lat1);
  const f2 = rad(lat2);
  const dl = rad(lon2 - lon1);
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

// Angolo della freccia: rumbo verso il prossimo punto meno la direzione in cui guarda il telefono.
// Senza bussola la freccia resta con il nord in alto.
export function angoloFreccia(rumbo, direzioneTelefono) {
  if (rumbo == null) return null;
  if (direzioneTelefono == null || Number.isNaN(direzioneTelefono)) return rumbo;
  return (rumbo - direzioneTelefono + 360) % 360;
}

// Oltre questa distanza dalla calle più vicina della rete il GPS non è sulle strade mappate
export const SOGLIA_CALLE_LONTANA = 40;
