// Pacchetti delle città: scaricati dal server e salvati sul telefono, così l'app funziona offline.
// Ogni città ha un indirizzo ("pacchetto") che restituisce un elenco di file: { "file": [{ "path", "url" }] }.
// Lo stato (città attiva e città installate) è in stato.json nella cartella dell'app.
import * as FileSystem from 'expo-file-system/legacy';
import { cittaPerId } from './catalogo';

const RADICE = FileSystem.documentDirectory + 'citta/';
const FILE_STATO = RADICE + 'stato.json';

const statoVuoto = () => ({ attiva: null, installate: [], versioni: {} });

export async function leggiStato() {
  try {
    return { ...statoVuoto(), ...JSON.parse(await FileSystem.readAsStringAsync(FILE_STATO)) };
  } catch {
    return statoVuoto();
  }
}

async function salvaStato(stato) {
  await FileSystem.makeDirectoryAsync(RADICE, { intermediates: true });
  await FileSystem.writeAsStringAsync(FILE_STATO, JSON.stringify(stato));
  return stato;
}

// Scarica tutti i file del pacchetto e rende la città installata (e attiva, se è la prima)
export async function installa(id, onProgresso) {
  const citta = cittaPerId(id);
  if (!citta?.pacchetto) throw new Error('Pacchetto non ancora disponibile');
  const elenco = await (await fetch(citta.pacchetto)).json();
  const cartella = RADICE + id + '/';
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
    versioni: { ...stato.versioni, [id]: elenco.versione },
  });
}

// Elimina i dati di una città dal telefono
export async function rimuovi(id) {
  await FileSystem.deleteAsync(RADICE + id + '/', { idempotent: true });
  const stato = await leggiStato();
  const installate = stato.installate.filter((x) => x !== id);
  const versioni = { ...stato.versioni };
  delete versioni[id];
  return salvaStato({
    ...stato,
    attiva: stato.attiva === id ? installate[0] || null : stato.attiva,
    installate,
    versioni,
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
        const citta = cittaPerId(id);
        if (!citta?.pacchetto) return;
        const elenco = await (await fetch(citta.pacchetto)).json();
        if (elenco.versione && elenco.versione !== stato.versioni?.[id]) daAggiornare.push(id);
      } catch {
        // niente connessione o pacchetto non leggibile: nessun avviso
      }
    })
  );
  return daAggiornare;
}
