// Link per condividere itinerari (e, più avanti, i luoghi del cuore).
// Il link punta alla pagina https://fcdeveloperapps.github.io/venezia/i/ con i dati nel parametro "d":
//   https://fcdeveloperapps.github.io/venezia/i/?d=<dati>
// <dati> è un JSON codificato in base64 "url-safe". Tipi ("k"):
//   'i' = un itinerario creato dall'utente: { v, k: 'i', n: nome, p: [id dei luoghi], q: [nomi dei luoghi] }
//         (i nomi servono solo alla pagina web, l'app usa gli id)
//   'c' = un itinerario consigliato (ufficiale), che l'app ha già: { v, k: 'c', id, n: nome }
//   'e' = esportazione di tutti gli itinerari dell'utente: { v, k: 'e', l: [{ n, p }, ...] }
//   'p' = luoghi del cuore: { v, k: 'p', p: [id dei luoghi], q: [nomi dei luoghi] }
// Questo file non usa React Native, così lo possono usare anche gli strumenti (anteprima web).

export const SITO_CONDIVISIONE = 'https://fcdeveloperapps.github.io/venezia/i/';
export const SCHEMA_APP = 'veneziamonumenti'; // veneziamonumenti://i/?d=... (link diretto all'app)
const VERSIONE = 1;

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// testo -> byte UTF-8
function utf8(testo) {
  const out = [];
  for (const ch of testo) {
    let c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

// byte UTF-8 -> testo
function daUtf8(b) {
  let s = '';
  for (let i = 0; i < b.length; ) {
    const c = b[i++];
    let cp;
    if (c < 0x80) cp = c;
    else if (c < 0xe0) cp = ((c & 31) << 6) | (b[i++] & 63);
    else if (c < 0xf0) cp = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else cp = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    s += String.fromCodePoint(cp);
  }
  return s;
}

export function codifica(oggetto) {
  const b = utf8(JSON.stringify(oggetto));
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0);
    s += ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63];
    if (i + 1 < b.length) s += ALFABETO[(n >> 6) & 63];
    if (i + 2 < b.length) s += ALFABETO[n & 63];
  }
  return s;
}

export function decodifica(testo) {
  const pulito = String(testo).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b = [];
  for (let i = 0; i < pulito.length; i += 4) {
    const v = [0, 1, 2, 3].map((k) => ALFABETO.indexOf(pulito[i + k] || 'A'));
    if (v.some((x) => x < 0)) throw new Error('caratteri non validi');
    const n = (v[0] << 18) | (v[1] << 12) | (v[2] << 6) | v[3];
    b.push((n >> 16) & 255);
    if (i + 2 < pulito.length) b.push((n >> 8) & 255);
    if (i + 3 < pulito.length) b.push(n & 255);
  }
  return JSON.parse(daUtf8(b));
}

// la lingua dell'app va nel link (parametro l), così la pagina web si mostra nella stessa lingua
const conDati = (oggetto, lingua = 'it') => `${SITO_CONDIVISIONE}?d=${codifica(oggetto)}&l=${lingua}`;

// link per un itinerario: consigliato (it.utente falso) o creato dall'utente
export function linkItinerario(it, nomeLuogo, lingua) {
  if (!it.utente) return conDati({ v: VERSIONE, k: 'c', id: it.id, n: typeof it.titolo === 'string' ? it.titolo : it.titolo?.it }, lingua);
  return conDati({ v: VERSIONE, k: 'i', n: it.titolo, p: it.tappe, q: it.tappe.map(nomeLuogo) }, lingua);
}

// link con tutti gli itinerari dell'utente
export function linkEsportazione(itinerari, lingua) {
  return conDati({ v: VERSIONE, k: 'e', l: itinerari.map((it) => ({ n: it.titolo, p: it.tappe })) }, lingua);
}

// link con i luoghi del cuore
export function linkCuore(ids, nomeLuogo, lingua) {
  return conDati({ v: VERSIONE, k: 'p', p: ids, q: ids.map(nomeLuogo) }, lingua);
}

/**
 * Cerca in un testo (un link, o un messaggio intero incollato) i dati di un link condiviso.
 * Restituisce { tipo: 'consigliato', id, nome }, { tipo: 'itinerari', itinerari: [{ titolo, tappe }] }
 * o { tipo: 'cuore', luoghi: [id] },
 * oppure null se il testo non contiene un link valido.
 */
export function leggiLink(testo) {
  if (!testo) return null;
  const m = String(testo).match(/[?&#]d=([A-Za-z0-9_\-+/=]+)/);
  if (!m) return null;
  try {
    const d = decodifica(m[1]);
    if (!d || typeof d !== 'object') return null;
    const pulisci = (x) => ({
      titolo: String(x?.n || '').slice(0, 40),
      tappe: Array.isArray(x?.p) ? x.p.filter((id) => typeof id === 'string') : [],
    });
    if (d.k === 'c' && typeof d.id === 'string') return { tipo: 'consigliato', id: d.id, nome: d.n || '' };
    if (d.k === 'i') return { tipo: 'itinerari', itinerari: [pulisci(d)] };
    if (d.k === 'e' && Array.isArray(d.l)) return { tipo: 'itinerari', itinerari: d.l.map(pulisci) };
    if (d.k === 'p' && Array.isArray(d.p)) return { tipo: 'cuore', luoghi: d.p.filter((id) => typeof id === 'string') };
  } catch {}
  return null;
}
