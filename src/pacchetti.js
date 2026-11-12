// Pacchetti delle città: scaricati dal server e salvati sul telefono, così l'app funziona offline.
// Ogni città ha un indirizzo ("pacchetto") che restituisce un elenco di file: { "file": [{ "path", "url" }] }.
// Ogni città ha due pacchetti: "prova" (versione gratuita: mappa, servizi, mezzi e 10 monumenti) e "completo"
// (dopo l'acquisto). Lo stato è in stato.json nella cartella dell'app:
//   installate: città con un pacchetto sul telefono · tipi: { id: 'prova' | 'completo' }
//   versioni: { id: versione del pacchetto installato } · acquistate: città comprate (restano anche se cancellate)
import * as FileSystem from 'expo-file-system/legacy';
import { cittaPerId } from './catalogo';

const RADICE = FileSystem.documentDirectory + 'citta/';
const FILE_STATO = RADICE + 'stato.json';

const statoVuoto = () => ({ attiva: null, installate: [], versioni: {}, tipi: {}, acquistate: [] });

export async function leggiStato() {
  try {
    const letto = JSON.parse(await FileSystem.readAsStringAsync(FILE_STATO));
    const stato = { ...statoVuoto(), ...letto };
    // stato.json di prima dei pacchetti prova: le città installate erano complete
    if (!letto.tipi) stato.tipi = Object.fromEntries(stato.installate.map((id) => [id, 'completo']));
    if (!letto.acquistate) stato.acquistate = stato.installate.filter((id) => stato.tipi[id] === 'completo');
    return stato;
  } catch {
    return statoVuoto();
  }
}

// Indirizzo del manifest del pacchetto di una città: 'prova' o 'completo'
const indirizzoPacchetto = (citta, tipo) => (tipo === 'prova' ? citta?.pacchetto_prova : citta?.pacchetto);

// Tipo di pacchetto che una città deve avere: completo se acquistata, altrimenti prova
export const tipoPerCitta = (stato, id) => (stato.acquistate.includes(id) ? 'completo' : 'prova');

async function salvaStato(stato) {
  await FileSystem.makeDirectoryAsync(RADICE, { intermediates: true });
  await FileSystem.writeAsStringAsync(FILE_STATO, JSON.stringify(stato));
  return stato;
}

// Scarica il pacchetto della città ("prova" o "completo") e la rende installata (e attiva, se è la prima).
// Le foto già presenti con la stessa dimensione non si riscaricano (es. passando dalla prova al completo).
export async function installa(id, onProgresso, tipo = 'completo') {
  const citta = cittaPerId(id);
  const indirizzo = indirizzoPacchetto(citta, tipo);
  if (!indirizzo) throw new Error('Pacchetto non ancora disponibile');
  const manifest = await (await fetch(indirizzo)).json();
  const cartella = RADICE + id + '/';
  const prima = await leggiStato();
  // dalla versione completa si torna alla prova solo dopo averla cancellata: si riparte da una cartella pulita
  if (prima.tipi[id] && prima.tipi[id] !== tipo && tipo === 'prova') {
    await FileSystem.deleteAsync(cartella, { idempotent: true });
  }
  const daScaricare = [];
  for (const f of manifest.file) {
    if (f.path.startsWith('assets/') && f.byte) {
      const info = await FileSystem.getInfoAsync(cartella + f.path);
      if (info.exists && info.size === f.byte) continue;
    }
    daScaricare.push(f);
  }
  const elenco = { ...manifest, file: daScaricare };
  // Cartelle create una volta sola, poi file scaricati a gruppi di 6 in parallelo (più veloce)
  const cartelle = new Set(elenco.file.map((f) => (cartella + f.path).slice(0, (cartella + f.path).lastIndexOf('/') + 1)));
  for (const c of cartelle) {
    await FileSystem.makeDirectoryAsync(c, { intermediates: true });
  }
  const PARALLELI = 6;
  for (let i = 0; i < elenco.file.length; i += PARALLELI) {
    const gruppo = elenco.file.slice(i, i + PARALLELI);
    await Promise.all(
      gruppo.map(async (file) => {
        const risultato = await FileSystem.downloadAsync(file.url, cartella + file.path);
        if (risultato.status !== 200) throw new Error(`Download fallito: ${file.path}`);
      })
    );
    onProgresso?.(Math.min(i + PARALLELI, elenco.file.length), elenco.file.length);
  }
  const stato = await leggiStato();
  return salvaStato({
    ...stato,
    attiva: stato.attiva || id,
    installate: [...new Set([...stato.installate, id])],
    versioni: { ...stato.versioni, [id]: manifest.versione },
    tipi: { ...stato.tipi, [id]: tipo },
  });
}

// Segna la città come acquistata (l'acquisto vero arriverà dallo store: vedi src/acquisti.js)
export async function segnaAcquistata(id) {
  const stato = await leggiStato();
  return salvaStato({ ...stato, acquistate: [...new Set([...stato.acquistate, id])] });
}

// Elimina i dati di una città dal telefono
export async function rimuovi(id) {
  await FileSystem.deleteAsync(RADICE + id + '/', { idempotent: true });
  const stato = await leggiStato();
  const installate = stato.installate.filter((x) => x !== id);
  const versioni = { ...stato.versioni };
  delete versioni[id];
  const tipi = { ...stato.tipi };
  delete tipi[id];
  // l'acquisto resta: la città si può riscaricare senza pagare
  return salvaStato({
    ...stato,
    attiva: stato.attiva === id ? installate[0] || null : stato.attiva,
    installate,
    versioni,
    tipi,
  });
}

// Cambia la città attiva (deve essere installata)
export async function attiva(id) {
  const stato = await leggiStato();
  if (!stato.installate.includes(id)) throw new Error('Città non installata');
  return salvaStato({ ...stato, attiva: id });
}

// Dati di una città installata (luoghi.json del pacchetto), oppure null
export async function datiCitta(id) {
  try {
    return JSON.parse(await FileSystem.readAsStringAsync(RADICE + id + '/dati/luoghi.json'));
  } catch {
    return null;
  }
}

// Mappa di una città installata: punti di riferimento e percorso dell'immagine sul telefono
export async function datiMappa(id) {
  try {
    const m = JSON.parse(await FileSystem.readAsStringAsync(RADICE + id + '/dati/mappa.json'));
    return { ...m, uri: RADICE + id + '/assets/' + m.immagine };
  } catch {
    return null;
  }
}

// Tessere della mappa dettagliata (zoom): { livello: { 'x_y': { uri } } }, oppure null se il pacchetto non le ha
export async function datiTessere(id) {
  try {
    const t = JSON.parse(await FileSystem.readAsStringAsync(RADICE + id + '/dati/tessere.json'));
    const out = {};
    for (const [livello, elenco] of Object.entries(t.livelli || {})) {
      out[livello] = {};
      for (const xy of elenco) {
        out[livello][xy] = { uri: RADICE + id + '/assets/mappa/' + livello + '/' + xy + '.webp' };
      }
    }
    return out;
  } catch {
    return null;
  }
}

// Confronta la versione installata di ogni città con quella pubblicata sul server.
// Restituisce gli id delle città da aggiornare. Senza connessione, o con un errore, la città viene saltata.
export async function controllaAggiornamenti(stato) {
  const daAggiornare = [];
  await Promise.all(
    stato.installate.map(async (id) => {
      try {
        const indirizzo = indirizzoPacchetto(cittaPerId(id), stato.tipi?.[id] || 'completo');
        if (!indirizzo) return;
        const elenco = await (await fetch(indirizzo)).json();
        if (elenco.versione && elenco.versione !== stato.versioni?.[id]) daAggiornare.push(id);
      } catch {
        // niente connessione o pacchetto non leggibile: nessun avviso
      }
    })
  );
  return daAggiornare;
}
