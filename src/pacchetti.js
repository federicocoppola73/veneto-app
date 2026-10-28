// Pacchetti delle città: scaricati dal server e salvati sul telefono, così l'app funziona offline.
// Ogni città ha un indirizzo ("pacchetto") che restituisce un elenco di file: { "file": [{ "path", "url" }] }.
// Lo stato (città attiva e città installate) è in stato.json nella cartella dell'app.
import * as FileSystem from 'expo-file-system/legacy';
import { cittaPerId } from './catalogo';

const RADICE = FileSystem.documentDirectory + 'citta/';
const FILE_STATO = RADICE + 'stato.json';

const statoVuoto = () => ({ attiva: null, installate: [] });

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
    attiva: stato.attiva || id,
    installate: [...new Set([...stato.installate, id])],
  });
}

// Elimina i dati di una città dal telefono
export async function rimuovi(id) {
  await FileSystem.deleteAsync(RADICE + id + '/', { idempotent: true });
  const stato = await leggiStato();
  const installate = stato.installate.filter((x) => x !== id);
  return salvaStato({
    attiva: stato.attiva === id ? installate[0] || null : stato.attiva,
    installate,
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
    return { ...m, uri: RADICE + id + '/mappa/' + m.immagine };
  } catch {
    return null;
  }
}
