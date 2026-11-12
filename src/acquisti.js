// Acquisto delle città a pagamento.
// Gli acquisti veri (Google Play / App Store, con lo SKU di catalogo.json) non sono ancora collegati.
// Nelle build di prova (eas.json, profilo "preview": EXPO_PUBLIC_SIMULA_ACQUISTI=1) l'acquisto è simulato,
// così si può provare tutto il percorso: Acquista → scarica il pacchetto completo → Apri / Aggiorna / Cancella.
import { segnaAcquistata } from './pacchetti';

export const ACQUISTI_SIMULATI = process.env.EXPO_PUBLIC_SIMULA_ACQUISTI === '1' || __DEV__;

// Prezzo da mostrare sul pulsante: arriverà dallo store; finché non c'è, il pulsante dice solo "Acquista"
export function prezzoCitta(_citta) {
  return null;
}

// Restituisce il nuovo stato se l'acquisto è andato a buon fine; altrimenti lancia un errore
export async function acquista(id) {
  if (!ACQUISTI_SIMULATI) {
    const e = new Error('acquisti_non_attivi');
    e.codice = 'acquisti_non_attivi';
    throw e;
  }
  return segnaAcquistata(id);
}
