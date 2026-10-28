// Converte latitudine/longitudine in pixel sull'immagine della mappa.
// Usa i punti di riferimento in mappa.json e calcola una trasformazione
// affine col metodo dei minimi quadrati:  x = a*lon + b*lat + c,  y = d*lon + e*lat + f

function risolvi3x3(M, v) {
  // Regola di Cramer per un sistema 3x3
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M);
  if (Math.abs(D) < 1e-12) throw new Error('Punti di riferimento non validi (allineati o insufficienti)');
  return [0, 1, 2].map((col) => {
    const Mc = M.map((riga, i) => riga.map((val, j) => (j === col ? v[i] : val)));
    return det(Mc) / D;
  });
}

export function creaProiezione(configMappa) {
  const punti = configMappa.punti_riferimento;
  if (!punti || punti.length < 3) throw new Error('Servono almeno 3 punti di riferimento');

  // Equazioni normali: (AᵀA) c = Aᵀ b
  const AtA = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const AtX = [0, 0, 0];
  const AtY = [0, 0, 0];
  for (const p of punti) {
    const riga = [p.longitudine, p.latitudine, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) AtA[i][j] += riga[i] * riga[j];
      AtX[i] += riga[i] * p.x;
      AtY[i] += riga[i] * p.y;
    }
  }
  const cx = risolvi3x3(AtA, AtX);
  const cy = risolvi3x3(AtA, AtY);

  return (latitudine, longitudine) => ({
    x: cx[0] * longitudine + cx[1] * latitudine + cx[2],
    y: cy[0] * longitudine + cy[1] * latitudine + cy[2],
  });
}
