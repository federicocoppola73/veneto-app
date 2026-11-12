// "Segnala un problema": invio delle segnalazioni al Foglio Google (Apps Script in strumenti/segnalazioni_apps_script.gs).
// Senza connessione la segnalazione resta sul telefono e parte appena possibile (inviaInAttesa all'avvio e dopo ogni invio).
// Due tipi di segnalazione:
// - luogo: dalla scheda di un luogo (luogo, città, tipo, descrizione) – nessun dato personale;
// - app: problemi dell'app (tipo, descrizione, email e foto facoltative, versione di Android e modello del telefono).
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// URL dell'applicazione web di Apps Script (finisce con /exec). Vuoto = pulsante nascosto.
export const URL_SEGNALAZIONI = 'https://script.google.com/macros/s/AKfycbzS9b2qbopgEsdOwGm0-gmw2lS2k0jrD11z237DvK8o4kW7VJGifFj00qnZPacVR2o3/exec';
const CHIAVE = 'veneto-segnalazioni-1'; // la stessa dello script
const CHIAVE_ATTESA = 'segnalazioni_in_attesa';
const CHIAVE_CONTEGGIO = 'segnalazioni_oggi';
export const MAX_AL_GIORNO = 5;

export const TIPI_SEGNALAZIONE = ['errata', 'orari', 'chiuso', 'foto', 'altro'];
export const TIPI_APP = ['crash', 'nonfunziona', 'testi', 'suggerimento', 'altro'];
export const MAX_FOTO_BYTE = 1_500_000; // foto allegata: oltre si chiede di sceglierne una più leggera
const MAX_FOTO_IN_ATTESA = 400_000; // in attesa sul telefono la foto si tiene solo se è leggera

// sistema e modello del telefono (utili per capire i crash)
function dispositivo() {
  const c = Platform.constants || {};
  const sistema = Platform.OS === 'android' ? `Android ${c.Release || ''} (API ${Platform.Version})` : `${Platform.OS} ${Platform.Version || ''}`;
  const modello = [c.Manufacturer, c.Model].filter(Boolean).join(' ');
  return { sistema: sistema.trim(), modello };
}
export const segnalazioniAttive = () => !!URL_SEGNALAZIONI;

const oggi = () => new Date().toISOString().slice(0, 10);

async function leggiJson(chiave, predefinito) {
  try {
    const v = await AsyncStorage.getItem(chiave);
    return v ? JSON.parse(v) : predefinito;
  } catch {
    return predefinito;
  }
}

async function spedisci(s) {
  const r = await fetch(URL_SEGNALAZIONI, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...s, chiave: CHIAVE }),
  });
  const d = await r.json();
  if (!d.ok) throw new Error('rifiutata');
}

// Invia una segnalazione. Risultato: 'inviata' | 'in_attesa' (senza rete, partirà dopo) | 'limite' (troppe oggi)
// ambito: 'luogo' (luogo obbligatorio) | 'app' (email e foto { base64, mime } facoltative)
export async function inviaSegnalazione({ ambito = 'luogo', luogo, citta, tipo, descrizione, lingua, email = '', foto = null }) {
  const conteggio = await leggiJson(CHIAVE_CONTEGGIO, { data: oggi(), n: 0 });
  const n = conteggio.data === oggi() ? conteggio.n : 0;
  if (n >= MAX_AL_GIORNO) return 'limite';
  await AsyncStorage.setItem(CHIAVE_CONTEGGIO, JSON.stringify({ data: oggi(), n: n + 1 })).catch(() => {});
  const s = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ambito,
    tipo,
    citta: citta || '',
    luogoId: luogo?.id || '',
    luogoNome: luogo?.nome || '',
    descrizione: (descrizione || '').trim().slice(0, 1000),
    lingua,
    versione: Constants.expoConfig?.version || '',
    ...(ambito === 'app' ? { email: (email || '').trim().slice(0, 120), ...dispositivo(), foto: foto || null } : {}),
  };
  try {
    await spedisci(s);
    inviaInAttesa();
    return 'inviata';
  } catch {
    const attesa = await leggiJson(CHIAVE_ATTESA, []);
    // una foto pesante non si tiene sul telefono: parte la segnalazione senza, con una nota
    const daSalvare =
      s.foto && (s.foto.base64.length * 3) / 4 > MAX_FOTO_IN_ATTESA
        ? { ...s, foto: null, descrizione: `${s.descrizione}\n[foto non inviata: troppo pesante per l'invio differito]`.trim() }
        : s;
    await AsyncStorage.setItem(CHIAVE_ATTESA, JSON.stringify([...attesa, daSalvare].slice(-10))).catch(() => {});
    return 'in_attesa';
  }
}

// Riprova le segnalazioni rimaste sul telefono; quelle che non partono restano per la prossima volta
let inCorso = false;
export async function inviaInAttesa() {
  if (!URL_SEGNALAZIONI || inCorso) return;
  inCorso = true;
  try {
    const attesa = await leggiJson(CHIAVE_ATTESA, []);
    if (!attesa.length) return;
    const restano = [];
    for (const s of attesa) {
      try {
        await spedisci(s);
      } catch {
        restano.push(s);
      }
    }
    await AsyncStorage.setItem(CHIAVE_ATTESA, JSON.stringify(restano));
  } catch {
    // niente: si riprova al prossimo avvio
  } finally {
    inCorso = false;
  }
}
