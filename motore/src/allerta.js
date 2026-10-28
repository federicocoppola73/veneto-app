// Avvisi di acqua alta: notifiche locali programmate sul telefono a partire dalla previsione
// del Centro Maree. Nessun server: ogni volta che l'app scarica la previsione (all'avvio, ogni
// 10 minuti e quando torna in primo piano) gli avvisi vengono ricalcolati.
// Limite: se l'app non viene aperta per giorni, gli avvisi si basano sull'ultima previsione scaricata.
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SOGLIA_PROVA } from './marea';

// Anche il salvataggio delle preferenze è caricato con prudenza: senza il suo modulo nativo
// le scelte valgono solo finché l'app resta aperta.
const memoria = {};
let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  AsyncStorage = null;
}
const archivio = {
  getItem: async (k) => (AsyncStorage ? AsyncStorage.getItem(k) : memoria[k] ?? null),
  setItem: async (k, v) => (AsyncStorage ? AsyncStorage.setItem(k, v) : (memoria[k] = v)),
};

const CHIAVE_PREF = 'allertaMarea';
const CHIAVE_INVIATI = 'allertaMareaInviati';
const CANALE = 'acqua-alta';
const MAX_AVVISI = 4;

export const PREF_PREDEFINITE = { attiva: false, soglia: 110, anticipo: '3h' }; // anticipo: '3h' | 'sera'

// expo-notifications viene caricato solo quando serve e dentro un try: se l'app gira in un ambiente
// che non contiene il suo codice nativo (per esempio Expo Go o una build fatta prima di installarlo)
// l'app funziona lo stesso, senza notifiche.
let Notifications;
let caricato = false;
function notifiche() {
  if (caricato) return Notifications;
  caricato = true;
  // In Expo Go (Android) expo-notifications non si carica: lì gli avvisi semplicemente non ci sono.
  // Nella versione installata dallo store invece funzionano.
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    Notifications = require('expo-notifications');
    if (!Notifications?.setNotificationHandler) throw new Error('modulo notifiche assente');
    // notifiche visibili anche ad app aperta
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('Notifiche non disponibili in questa build:', e?.message);
    Notifications = null;
  }
  return Notifications;
}

/** true se questa build dell'app può mostrare notifiche */
export const notificheDisponibili = () => !!notifiche();

export async function leggiPreferenze() {
  try {
    const s = await archivio.getItem(CHIAVE_PREF);
    return s ? { ...PREF_PREDEFINITE, ...JSON.parse(s) } : PREF_PREDEFINITE;
  } catch {
    return PREF_PREDEFINITE;
  }
}

export async function salvaPreferenze(pref) {
  try {
    await archivio.setItem(CHIAVE_PREF, JSON.stringify(pref));
  } catch {}
}

async function preparaCanale(t) {
  const Notifications = notifiche();
  if (Platform.OS !== 'android' || !Notifications) return;
  await Notifications.setNotificationChannelAsync(CANALE, {
    name: t('notif_canale'),
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 200, 300],
  });
}

/** Chiede il permesso per le notifiche. Restituisce { concesso, puoiChiedere }. */
export async function chiediPermesso(t) {
  const Notifications = notifiche();
  if (!Notifications) return { concesso: false, puoiChiedere: false };
  await preparaCanale(t); // su Android 13+ il canale deve esistere prima della richiesta
  let stato = await Notifications.getPermissionsAsync();
  if (!stato.granted && stato.canAskAgain) stato = await Notifications.requestPermissionsAsync();
  return { concesso: !!stato.granted, puoiChiedere: !!stato.canAskAgain };
}

export async function permessoConcesso() {
  const Notifications = notifiche();
  if (!Notifications) return false;
  const stato = await Notifications.getPermissionsAsync();
  return !!stato.granted;
}

const due = (n) => String(n).padStart(2, '0');
const giorno = (d) => `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
// Un picco al mattino e uno alla sera dello stesso giorno sono avvisi diversi;
// se la previsione sposta il picco di qualche minuto resta lo stesso avviso
const chiavePicco = (p) => `${giorno(p.data)}-${p.data.getHours() < 12 ? 'am' : 'pm'}`;

// Momento dell'avviso: 3 ore prima del picco, oppure alle 20 del giorno prima
function momentoAvviso(picco, anticipo) {
  if (anticipo === 'sera') {
    const d = new Date(picco.data);
    d.setDate(d.getDate() - 1);
    d.setHours(20, 0, 0, 0);
    return d;
  }
  return new Date(picco.data.getTime() - 3 * 3600 * 1000);
}

// "alle 09:40" se l'avviso arriva lo stesso giorno del picco, altrimenti "domani alle 09:40"
function quandoPicco(picco, consegna, t) {
  const h = `${due(picco.data.getHours())}:${due(picco.data.getMinutes())}`;
  const chiave = giorno(picco.data) === giorno(consegna) ? 'notif_oggi' : 'notif_domani';
  return t(chiave).replace('{h}', h);
}

/**
 * Ricalcola le notifiche programmate in base alla previsione e alle preferenze.
 * Le notifiche già programmate vengono sempre cancellate e rifatte, così seguono la previsione più recente.
 */
export async function programmaAvvisi(marea, pref, t) {
  const Notifications = notifiche();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!pref?.attiva || !marea?.tutti || !(await permessoConcesso())) return;
    await preparaCanale(t);

    let inviati = {};
    try {
      inviati = JSON.parse((await archivio.getItem(CHIAVE_INVIATI)) || '{}');
    } catch {}
    const adesso = Date.now();
    // dimentica gli avvisi di più di 3 giorni fa
    for (const k of Object.keys(inviati)) if (inviati[k] < adesso - 3 * 86400000) delete inviati[k];

    const picchi = marea.tutti
      .filter((p) => p.tipo === 'max' && p.valore >= (SOGLIA_PROVA ?? pref.soglia) && p.data.getTime() > adesso)
      .slice(0, MAX_AVVISI);

    for (const p of picchi) {
      const chiave = chiavePicco(p);
      let momento = momentoAvviso(p, pref.anticipo);
      if (momento.getTime() <= adesso + 60 * 1000) {
        // l'orario dell'avviso è già passato: avvisa subito, una volta sola, se il picco è ancora lontano
        if (inviati[chiave] || p.data.getTime() - adesso < 30 * 60 * 1000) continue;
        momento = new Date(adesso + 5 * 1000);
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notif_titolo').replace('{cm}', p.valore),
          body: t('notif_testo').replace('{quando}', quandoPicco(p, momento, t)),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: momento, channelId: CANALE },
      });
      inviati[chiave] = momento.getTime();
    }
    await archivio.setItem(CHIAVE_INVIATI, JSON.stringify(inviati));
  } catch (e) {
    console.warn('Avvisi acqua alta:', e?.message);
  }
}
