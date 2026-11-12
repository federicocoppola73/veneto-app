// "Segnala un problema": invio delle segnalazioni al Foglio Google (Apps Script in strumenti/segnalazioni_apps_script.gs).
// Senza connessione la segnalazione resta sul telefono e parte appena possibile (inviaInAttesa all'avvio e dopo ogni invio).
// Non si raccolgono dati personali: solo luogo, città, tipo di problema, descrizione, lingua e versione dell'app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// URL dell'applicazione web di Apps Script (finisce con /exec). Vuoto = pulsante nascosto.
export const URL_SEGNALAZIONI = '';
const CHIAVE = 'veneto-segnalazioni-1'; // la stessa dello script
const CHIAVE_ATTESA = 'segnalazioni_in_attesa';
const CHIAVE_CONTEGGIO = 'segnalazioni_oggi';
export const MAX_AL_GIORNO = 5;

export const TIPI_SEGNALAZIONE = ['errata', 'orari', 'chiuso', 'foto', 'altro'];
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
export async function inviaSegnalazione({ luogo, citta, tipo, descrizione, lingua }) {
  const conteggio = await leggiJson(CHIAVE_CONTEGGIO, { data: oggi(), n: 0 });
  const n = conteggio.data === oggi() ? conteggio.n : 0;
  if (n >= MAX_AL_GIORNO) return 'limite';
  await AsyncStorage.setItem(CHIAVE_CONTEGGIO, JSON.stringify({ data: oggi(), n: n + 1 })).catch(() => {});
  const s = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    tipo,
    citta,
    luogoId: luogo.id,
    luogoNome: luogo.nome,
    descrizione: (descrizione || '').trim().slice(0, 1000),
    lingua,
    versione: Constants.expoConfig?.version || '',
  };
  try {
    await spedisci(s);
    inviaInAttesa();
    return 'inviata';
  } catch {
    const attesa = await leggiJson(CHIAVE_ATTESA, []);
    await AsyncStorage.setItem(CHIAVE_ATTESA, JSON.stringify([...attesa, s].slice(-20))).catch(() => {});
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
