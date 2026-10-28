// Marea a Venezia dagli open data del Comune di Venezia
// (Centro Previsioni e Segnalazioni Maree, dati.venezia.it):
//  - livello.json: livello misurato ogni 5 minuti dalle stazioni della laguna
//  - previsione.json: prossimi massimi e minimi previsti (in cm)
// Tutte le altezze sono riferite allo zero mareografico di Punta della Salute.

const URL_LIVELLO = 'https://dati.venezia.it/sites/default/files/dataset/opendata/livello.json';
const URL_PREVISIONE = 'https://dati.venezia.it/sites/default/files/dataset/opendata/previsione.json';
const STAZIONE_RIFERIMENTO = '1025'; // Punta della Salute - Canal Grande

// Persistenza del registro dei tentativi (AsyncStorage, come negli altri moduli; in memoria se non disponibile)
let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}
const CHIAVE_REGISTRO = 'marea_registro';
const MAX_REGISTRO = 40;
const memoriaRegistro = { v: null };

async function leggiRegistroSalvato() {
  try {
    const s = AsyncStorage ? await AsyncStorage.getItem(CHIAVE_REGISTRO) : memoriaRegistro.v;
    return s ? JSON.parse(s) : [];
  } catch (e) {
    return [];
  }
}

async function salvaRegistro(voci) {
  try {
    const s = JSON.stringify(voci);
    if (AsyncStorage) await AsyncStorage.setItem(CHIAVE_REGISTRO, s);
    else memoriaRegistro.v = s;
  } catch (e) {
    // il registro è solo diagnostico: se non si salva, l'app va comunque avanti
  }
}

// Intestazioni simili a quelle di un browser: il server del Comune ha risposto con HTML alle richieste senza intestazioni
const INTESTAZIONI = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
};

// Scarica un file e lo legge come testo, poi lo converte in JSON (errore chiaro se non è valido)
async function scarica(url) {
  const r = await fetch(url, { headers: INTESTAZIONI, cache: 'no-store' });
  const tipo = (r.headers.get('content-type') || '').split(';')[0].trim();
  // via il BOM (carattere invisibile in testa al file) e gli spazi: il browser li ignora, l'app no
  const testo = (await r.text()).replace(/^\uFEFF/, '').trim();
  const info = { stato: r.status, tipo: tipo || '-', inizio: testo.slice(0, 25) };
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { info });
  try {
    return { dati: JSON.parse(testo), info };
  } catch (e) {
    // mostra l'inizio della risposta, per capire che cosa arriva davvero al telefono
    throw Object.assign(new Error(`JSON non valido: "${testo.slice(0, 60)}"`), { info });
  }
}

// "2026-10-15 12:45:00" -> Date costruita a mano (ora locale del telefono, cioè di Venezia per il turista).
// Non usiamo new Date(stringa): su alcuni telefoni Android quel formato dà una data non valida.
function comeData(s) {
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
}

const descrizioneErrore = (e) => (e && e.message) || String(e);

// Una riga per il registro: esito di un file
const sintesi = (e) => (e.errore ? `errore: ${e.errore} [${e.info?.tipo || '-'}]` : `ok: ${e.v.length} record [${e.info?.tipo || '-'}]`);

export async function leggiMarea() {
  // ogni file è facoltativo: se uno non risponde, l'altro basta (così la barra non resta vuota)
  const prova = (url) =>
    scarica(url)
      .then(({ dati, info }) => ({ v: dati, errore: null, info }))
      .catch((e) => ({ v: [], errore: descrizioneErrore(e), info: e.info || { stato: 'rete', tipo: '-', inizio: '' } }));
  const [livelliEsito, previsioniEsito] = await Promise.all([prova(URL_LIVELLO), prova(URL_PREVISIONE)]);
  const livelli = Array.isArray(livelliEsito.v) ? livelliEsito.v : [];
  const previsioni = Array.isArray(previsioniEsito.v) ? previsioniEsito.v : [];
  const salute = livelli.find((l) => l.ID_stazione === STAZIONE_RIFERIMENTO) || livelli[0];
  // livello.json non contiene più il valore misurato (solo le stazioni): senza valore la misura attuale non si mostra
  const misura = salute?.valore != null ? parseFloat(String(salute.valore).replace(',', '.')) : NaN;
  const attuale = Number.isFinite(misura) ? Math.round(misura * 100) : null;
  const adesso = Date.now();
  const letti = previsioni.map((p) => ({
    data: comeData(p.DATA_ESTREMALE),
    testoData: p.DATA_ESTREMALE,
    tipo: p.TIPO_ESTREMALE === 'max' ? 'max' : 'min',
    valore: Math.round(parseFloat(p.VALORE)),
  }));
  const picchi = letti
    .filter((p) => !Number.isNaN(p.valore) && !Number.isNaN(p.data.getTime()) && p.data.getTime() > adesso - 30 * 60 * 1000)
    .sort((a, b) => a.data - b.data);
  // diagnosi per capire dal dettaglio dove si blocca (utile finché non è tutto verificato sui telefoni)
  const diagnosi = [
    livelliEsito.errore ? `livello: ${livelliEsito.errore}` : null,
    previsioniEsito.errore ? `previsione: ${previsioniEsito.errore}` : null,
    `picchi letti ${letti.length}, validi ${picchi.length}`,
  ]
    .filter(Boolean)
    .join(' · ');
  // registro dei tentativi: resta sul telefono, così si vede nei giorni successivi quando la fonte risponde
  const voce = {
    ora: new Date().toISOString().slice(0, 16).replace('T', ' '),
    livello: sintesi(livelliEsito),
    previsione: sintesi(previsioniEsito),
  };
  const registro = [voce, ...(await leggiRegistroSalvato())].slice(0, MAX_REGISTRO);
  await salvaRegistro(registro);
  return {
    registro: registro.slice(0, 8),
    attuale,
    oraMisura: salute?.data, // "2026-10-15 11:25:00"
    stazione: salute?.stazione,
    picchi: picchi.slice(0, 4), // i prossimi 4, mostrati nel dettaglio
    tutti: picchi, // tutta la previsione disponibile (2-3 giorni), usata per gli avvisi
    diagnosi,
  };
}

// Classi di marea usate dal Centro Maree del Comune di Venezia
export function classeMarea(cm) {
  if (cm == null) return 'normale';
  if (cm >= 140) return 'eccezionale';
  if (cm >= 110) return 'alta';
  if (cm >= 80) return 'sostenuta';
  return 'normale';
}

export const COLORE_MAREA = {
  normale: '#0f766e',
  sostenuta: '#b45309',
  alta: '#c2410c',
  eccezionale: '#b91c1c',
};

// Il valore più alto tra la misura attuale e i massimi previsti nelle prossime 24 ore
export function piccoPiuAlto(marea) {
  if (!marea) return null;
  const entro = Date.now() + 24 * 3600 * 1000;
  const valori = [marea.attuale, ...marea.picchi.filter((p) => p.tipo === 'max' && p.data <= entro).map((p) => p.valore)];
  const validi = valori.filter((v) => v != null);
  return validi.length ? Math.max(...validi) : null;
}

// ⚠️ SOLO PER LE PROVE: soglia abbassata per vedere striscia e notifiche anche con marea normale.
// Prima di pubblicare rimetti null (valgono allora 110 cm per la striscia e la soglia scelta dall'utente).
export const SOGLIA_PROVA = null;

// Primo massimo previsto entro `ore` ore che raggiunge almeno `soglia` cm (null se non c'è)
export function prossimaAcquaAlta(marea, soglia = SOGLIA_PROVA ?? 110, ore = 48) {
  if (!marea?.tutti) return null;
  const adesso = Date.now();
  const entro = adesso + ore * 3600 * 1000;
  return marea.tutti.find((p) => p.tipo === 'max' && p.valore >= soglia && p.data > adesso && p.data <= entro) || null;
}
