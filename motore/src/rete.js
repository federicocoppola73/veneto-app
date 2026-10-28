// Percorsi a piedi calcolati sul telefono, senza connessione, sulla rete pedonale del centro storico
// (rete.json, generata da strumenti/itinerari.py con i dati OpenStreetMap).
const dati = datiProxy('rete.json');
import { distanzaMetri } from './distanza';
import { datiProxy } from './dati';

const MAX_AGGANCIO = 150; // oltre questa distanza dalla calle più vicina la rete non si usa

let rete = null;
function carica() {
  if (rete) return rete;
  const n = dati.nodi.length / 2;
  const lat = new Float64Array(n);
  const lon = new Float64Array(n);
  let a = 0;
  let b = 0;
  for (let i = 0; i < n; i++) {
    a += dati.nodi[2 * i];
    b += dati.nodi[2 * i + 1];
    lat[i] = a / 1e5;
    lon[i] = b / 1e5;
  }
  // liste di adiacenza compatte
  const grado = new Int32Array(n + 1);
  const archi = dati.archi;
  for (let k = 0; k < archi.length; k += 2) {
    grado[archi[k] + 1]++;
    grado[archi[k + 1] + 1]++;
  }
  for (let i = 0; i < n; i++) grado[i + 1] += grado[i];
  const verso = new Int32Array(archi.length);
  const peso = new Float32Array(archi.length);
  const pos = grado.slice(0, n);
  for (let k = 0; k < archi.length; k += 2) {
    const x = archi[k];
    const y = archi[k + 1];
    const d = distanzaMetri(lat[x], lon[x], lat[y], lon[y]);
    verso[pos[x]] = y;
    peso[pos[x]++] = d;
    verso[pos[y]] = x;
    peso[pos[y]++] = d;
  }
  rete = { n, lat, lon, inizio: grado, verso, peso, luoghi: dati.luoghi };
  return rete;
}

// Nodo della rete più vicino a un punto: { nodo, metri } oppure null se troppo lontano
export function agganciaAllaRete(latitudine, longitudine) {
  const r = carica();
  const kx = Math.cos((latitudine * Math.PI) / 180);
  let migliore = -1;
  let min = Infinity;
  for (let i = 0; i < r.n; i++) {
    const dy = r.lat[i] - latitudine;
    const dx = (r.lon[i] - longitudine) * kx;
    const d = dx * dx + dy * dy;
    if (d < min) {
      min = d;
      migliore = i;
    }
  }
  const metri = distanzaMetri(latitudine, longitudine, r.lat[migliore], r.lon[migliore]);
  return metri <= MAX_AGGANCIO ? { nodo: migliore, metri } : null;
}

// Distanze a piedi da un nodo verso tutti gli altri (algoritmo di Dijkstra con coda a priorità)
export function percorsiDa(origine) {
  const r = carica();
  const dist = new Float64Array(r.n).fill(Infinity);
  const prec = new Int32Array(r.n).fill(-1);
  const coda = [[0, origine]];
  dist[origine] = 0;
  const su = (i) => {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (coda[p][0] <= coda[i][0]) break;
      [coda[p], coda[i]] = [coda[i], coda[p]];
      i = p;
    }
  };
  const giu = (i) => {
    for (;;) {
      const s = 2 * i + 1;
      const d = s + 1;
      let m = i;
      if (s < coda.length && coda[s][0] < coda[m][0]) m = s;
      if (d < coda.length && coda[d][0] < coda[m][0]) m = d;
      if (m === i) break;
      [coda[m], coda[i]] = [coda[i], coda[m]];
      i = m;
    }
  };
  while (coda.length) {
    const [d, x] = coda[0];
    const ultimo = coda.pop();
    if (coda.length) {
      coda[0] = ultimo;
      giu(0);
    }
    if (d > dist[x]) continue;
    for (let k = r.inizio[x]; k < r.inizio[x + 1]; k++) {
      const y = r.verso[k];
      const nd = d + r.peso[k];
      if (nd < dist[y]) {
        dist[y] = nd;
        prec[y] = x;
        coda.push([nd, y]);
        su(coda.length - 1);
      }
    }
  }
  return { dist, prec };
}

export const nodoDelLuogo = (id) => carica().luoghi[id];

// Distanza a piedi (metri) dall'origine al luogo, o null se non raggiungibile a piedi
export function metriVersoLuogo(percorsi, id) {
  const nodo = nodoDelLuogo(id);
  if (!percorsi || nodo == null) return null;
  const d = percorsi.dist[nodo];
  return Number.isFinite(d) ? d : null;
}

// Coordinate [[lat, lon], ...] del percorso dall'origine al luogo
export function camminoVersoLuogo(percorsi, id) {
  const r = carica();
  let x = nodoDelLuogo(id);
  if (!percorsi || x == null || !Number.isFinite(percorsi.dist[x])) return null;
  const out = [];
  while (x !== -1) {
    out.push([r.lat[x], r.lon[x]]);
    x = percorsi.prec[x];
  }
  return out.reverse();
}
