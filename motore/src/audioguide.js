// Audioguide: MP3 per luogo, separati dal pacchetto della città, uno per lingua.
// Sul server (GitHub): audioguide/<città>/<lingua>/indice.json e <id>.mp3 (generati da strumenti/audioguide.py).
// Sul telefono: <documenti>/audioguide/<città>/<lingua>/ con l'indice e gli MP3 scaricati.
// Lo stato (indice e audioguide presenti) è condiviso tra scheda, ricerca e Info con useAudioguide().
import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { nomeCitta } from './citta';

const BASE = 'https://raw.githubusercontent.com/federicocoppola73/veneto-app/main/audioguide/';
const RADICE = (FileSystem.documentDirectory || '') + 'audioguide/';
const PARALLELI = 4;

// "Venezia" → "venezia" (come le cartelle dei pacchetti)
const idCitta = () =>
  nomeCitta()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z]/g, '');

let stato = { chiave: null, indice: null, presenti: new Set(), progresso: null };
const ascoltatori = new Set();
function aggiorna(nuovo) {
  stato = { ...stato, ...nuovo };
  ascoltatori.forEach((f) => f(stato));
}

const cartellaDi = (chiave) => RADICE + chiave + '/';

// Tracce di un luogo nell'indice: [{ id, titolo, file, byte, secondi }]
// (l'indice delle prime audioguide aveva una sola traccia, con "file" direttamente nel luogo)
export const tracceDi = (v) => (v ? v.tracce || (v.file ? [{ id: null, titolo: null, file: v.file, byte: v.byte, secondi: v.secondi }] : []) : []);

// Audioguida "di percorso" di un itinerario: un luogo le cui tracce hanno le "tappe" dell'itinerario
// (es. i tratti del Canal Grande). Restituisce l'id del luogo, oppure null.
export function audioguidaDelPercorso(indice, itinerario) {
  if (!indice?.luoghi || !itinerario?.tappe) return null;
  const tappe = new Set(itinerario.tappe);
  for (const [id, v] of Object.entries(indice.luoghi)) {
    const tracce = tracceDi(v);
    if (tracce.length && tracce.every((tr) => tr.tappe?.length && tr.tappe.every((x) => tappe.has(x)))) return id;
  }
  return null;
}

// Audioguida di percorso "composta": l'itinerario ha "audioPercorso", l'elenco ordinato dei luoghi (id) le cui audioguide
// formano il percorso (es. un'introduzione e poi una o due tracce per ogni tappa), senza duplicare gli MP3.
// Senza "audioPercorso" vale il caso classico (un solo luogo con le tracce a tappe, come il Canal Grande).
// Restituisce gli id dei luoghi dell'indice, nell'ordine in cui si ascoltano (array vuoto se non c'è audioguida).
export function luoghiDelPercorso(indice, itinerario) {
  if (indice?.luoghi && Array.isArray(itinerario?.audioPercorso)) {
    const ids = itinerario.audioPercorso.filter((id) => indice.luoghi[id]);
    if (ids.length) return ids;
  }
  const id = audioguidaDelPercorso(indice, itinerario);
  return id ? [id] : [];
}

// Tracce da ascoltare del percorso, tutte già sul telefono: [{ id, titolo, uri, secondi, tappe }].
// Nel percorso composto la prima traccia di ogni tappa (l'esterno) parte da sola vicino al luogo ("tappe" = [id luogo]);
// le altre (l'interno) e l'introduzione restano manuali (tappe = null).
export function tracceDelPercorso(ids, itinerario, nomi = {}) {
  const composto = Array.isArray(itinerario?.audioPercorso);
  return ids.flatMap((id) =>
    (audioDelLuogo(id) || []).map((tr, j) => {
      if (!composto) return tr;
      const nome = nomi[id] || null;
      return {
        ...tr,
        titolo: tr.titolo && nome ? `${nome} · ${tr.titolo}` : nome || tr.titolo,
        tappe: j === 0 && itinerario.tappe?.includes(id) ? [id] : null,
      };
    })
  );
}

// Audioguide già sul telefono: file presente con la dimensione dell'indice (un MP3 rigenerato va riscaricato)
async function leggiPresenti(chiave, indice) {
  const presenti = new Set();
  if (!indice?.luoghi) return presenti;
  await Promise.all(
    Object.entries(indice.luoghi).map(async ([id, v]) => {
      try {
        const tracce = tracceDi(v);
        const ok = await Promise.all(
          tracce.map(async (tr) => {
            const info = await FileSystem.getInfoAsync(cartellaDi(chiave) + tr.file);
            return info.exists && (!tr.byte || info.size === tr.byte);
          })
        );
        if (tracce.length && ok.every(Boolean)) presenti.add(id);
      } catch {}
    })
  );
  return presenti;
}

// Carica l'indice della città aperta nella lingua scelta: prima quello salvato (funziona offline), poi quello del server
export async function caricaAudioguide(lingua) {
  if (!FileSystem.documentDirectory) return;
  const chiave = `${idCitta()}/${lingua}`;
  if (stato.chiave !== chiave) aggiorna({ chiave, indice: null, presenti: new Set(), progresso: null });
  const cartella = cartellaDi(chiave);
  try {
    const salvato = JSON.parse(await FileSystem.readAsStringAsync(cartella + 'indice.json'));
    if (stato.chiave === chiave) aggiorna({ indice: salvato, presenti: await leggiPresenti(chiave, salvato) });
  } catch {}
  try {
    const r = await fetch(BASE + chiave + '/indice.json');
    if (!r.ok) return; // nessuna audioguida per questa città e lingua
    const indice = await r.json();
    if (stato.chiave !== chiave) return;
    await FileSystem.makeDirectoryAsync(cartella, { intermediates: true });
    await FileSystem.writeAsStringAsync(cartella + 'indice.json', JSON.stringify(indice));
    aggiorna({ indice, presenti: await leggiPresenti(chiave, indice) });
  } catch {
    // senza rete resta l'indice salvato
  }
}

// Tracce del luogo sul telefono, pronte da ascoltare: [{ id, titolo, uri, secondi, tappe }], oppure null se non è scaricato
export function audioDelLuogo(id) {
  const v = stato.indice?.luoghi?.[id];
  if (!v || !stato.presenti.has(id)) return null;
  return tracceDi(v).map((tr) => ({
    id: tr.id,
    titolo: tr.titolo,
    uri: cartellaDi(stato.chiave) + tr.file,
    secondi: tr.secondi,
    tappe: tr.tappe || null,
  }));
}

// Scarica le audioguide dei luoghi indicati; restituisce quante non è riuscito a scaricare
export async function scaricaAudioguide(ids) {
  const { chiave, indice } = stato;
  if (!indice || stato.progresso) return 0;
  const daFare = ids.filter((id) => indice.luoghi[id] && !stato.presenti.has(id));
  if (!daFare.length) return 0;
  const cartella = cartellaDi(chiave);
  await FileSystem.makeDirectoryAsync(cartella, { intermediates: true });
  let fatti = 0;
  let errori = 0;
  aggiorna({ progresso: { fatti, totale: daFare.length } });
  for (let i = 0; i < daFare.length; i += PARALLELI) {
    await Promise.all(
      daFare.slice(i, i + PARALLELI).map(async (id) => {
        const tracce = tracceDi(indice.luoghi[id]);
        try {
          // tutte le tracce del luogo: se una non arriva, il luogo resta da scaricare
          for (const tr of tracce) {
            const r = await FileSystem.downloadAsync(BASE + chiave + '/' + tr.file, cartella + tr.file);
            if (r.status !== 200) throw new Error('download');
          }
          stato.presenti.add(id);
        } catch {
          errori += 1;
          for (const tr of tracce) await FileSystem.deleteAsync(cartella + tr.file, { idempotent: true }).catch(() => {});
        }
        fatti += 1;
      })
    );
    if (stato.chiave !== chiave) return errori; // si è cambiata città o lingua
    aggiorna({ presenti: new Set(stato.presenti), progresso: { fatti, totale: daFare.length } });
  }
  aggiorna({ progresso: null });
  return errori;
}

// Cancella dal telefono le audioguide dei luoghi indicati (senza ids: tutte quelle della città e lingua attuali).
// L'indice resta, così si possono riscaricare.
export async function cancellaAudioguide(ids = null) {
  const { chiave, indice } = stato;
  if (!indice) return;
  const scelti = ids ? ids.filter((id) => indice.luoghi[id]) : Object.keys(indice.luoghi);
  await Promise.all(
    scelti
      .flatMap((id) => tracceDi(indice.luoghi[id]))
      .map((tr) => FileSystem.deleteAsync(cartellaDi(chiave) + tr.file, { idempotent: true }).catch(() => {}))
  );
  if (stato.chiave !== chiave) return;
  const presenti = new Set(stato.presenti);
  scelti.forEach((id) => presenti.delete(id));
  aggiorna({ presenti });
}

// Stato condiviso: { indice, presenti (Set di id), progresso: { fatti, totale } | null }
export function useAudioguide() {
  const [s, setS] = useState(stato);
  useEffect(() => {
    ascoltatori.add(setS);
    setS(stato);
    return () => ascoltatori.delete(setS);
  }, []);
  return s;
}

// Byte e durata di un'audioguida, se esiste
export const infoAudioguida = (indice, id) => indice?.luoghi?.[id] || null;

// "1,2 MB" / "0,4 MB"
export const testoMB = (byte, lingua = 'it') => {
  const n = (Math.max(byte || 0, 100000) / 1e6).toFixed(1);
  return `${lingua === 'en' ? n : n.replace('.', ',')} MB`;
};

// 192 → "3:12"
export const testoDurata = (secondi) => `${Math.floor((secondi || 0) / 60)}:${String(Math.round(secondi || 0) % 60).padStart(2, '0')}`;
