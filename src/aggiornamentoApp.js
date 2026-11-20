// Avviso "nuova versione dell'app" (il contenitore, non le città: per quelle c'è PopupAggiornamento).
// All'avvio l'app legge app_novita.json dal repository; se la versione pubblicata è più recente di quella
// installata e c'è il link dello store, mostra un popup con le novità. "Più tardi" ricorda la versione rimandata:
// il popup torna solo quando ne esce una ancora più nuova. Senza connessione non succede nulla.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { LINK_APP_STORE, LINK_GOOGLE_PLAY } from '../motore/src/store';

const INDIRIZZO = 'https://raw.githubusercontent.com/federicocoppola73/veneto-app/main/app_novita.json';
const CHIAVE_RIMANDATA = 'versione_app_rimandata';

// Versione dell'app installata (app.json → "version")
export const versioneInstallata = () => Constants.expoConfig?.version || '0.0.0';

// 1 se a > b, -1 se a < b, 0 se uguali (confronto numerico, es. "1.10.0" > "1.9.0")
export function confrontaVersioni(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

// Indirizzo della pagina dell'app sullo store del telefono (null se non è ancora disponibile)
export const linkStore = () => (Platform.OS === 'ios' ? LINK_APP_STORE : LINK_GOOGLE_PLAY);

// Restituisce { versione, novita: { it: [...], en: [...] } } se c'è una versione più nuova da proporre, altrimenti null
export async function controllaVersioneApp() {
  try {
    if (!linkStore()) return null;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
    const r = await fetch(INDIRIZZO, ctrl ? { signal: ctrl.signal } : undefined);
    if (timer) clearTimeout(timer);
    const dati = await r.json();
    if (!dati?.versione || confrontaVersioni(dati.versione, versioneInstallata()) <= 0) return null;
    const rimandata = await AsyncStorage.getItem(CHIAVE_RIMANDATA).catch(() => null);
    if (rimandata && confrontaVersioni(dati.versione, rimandata) <= 0) return null;
    return { versione: dati.versione, novita: dati.novita || {} };
  } catch {
    return null; // niente connessione o file non leggibile: nessun avviso
  }
}

// "Più tardi": non riproporre questa versione
export const rimandaVersione = (versione) => AsyncStorage.setItem(CHIAVE_RIMANDATA, versione).catch(() => {});
