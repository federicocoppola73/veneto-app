// Avanzamento della guida passo passo di ogni itinerario (tappe visitate e saltate), salvato sul telefono.
// Serve a riprendere un itinerario interrotto dall'ultima tappa invece di ricominciare da capo.
// Le chiavi includono il nome della città: itinerari di città diverse possono avere lo stesso id.
import { nomeCitta } from './citta';

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  AsyncStorage = null;
}
const CHIAVE = 'avanzamentoItinerari';
const memoria = {}; // senza il modulo nativo vale finché l'app resta aperta

const chiaveItinerario = (id) => `${nomeCitta()}|${id}`;

async function leggiTutto() {
  try {
    const s = AsyncStorage ? await AsyncStorage.getItem(CHIAVE) : null;
    return s ? JSON.parse(s) : { ...memoria };
  } catch {
    return { ...memoria };
  }
}

// { visitate: [id], saltate: [id] } oppure null
export async function leggiAvanzamento(idItinerario) {
  const tutto = await leggiTutto();
  return tutto[chiaveItinerario(idItinerario)] || null;
}

export async function salvaAvanzamento(idItinerario, { visitate, saltate }) {
  const tutto = await leggiTutto();
  tutto[chiaveItinerario(idItinerario)] = { visitate, saltate };
  memoria[chiaveItinerario(idItinerario)] = { visitate, saltate };
  try {
    if (AsyncStorage) await AsyncStorage.setItem(CHIAVE, JSON.stringify(tutto));
  } catch {}
}
