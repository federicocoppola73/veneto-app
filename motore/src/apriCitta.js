// Apre una città nel motore: legge i dati JSON e imposta le immagini dal pacchetto scaricato.
import * as FileSystem from 'expo-file-system/legacy';
import { impostaDati } from './dati';
import { impostaCartellaAssets } from './risorse';
import { inizializzaCitta } from './avvio';

// File che possono mancare nei pacchetti scaricati prima (si usa il valore predefinito)
const FACOLTATIVI = ['immagini.json', 'citta.json'];

// File JSON che il motore legge (nomi usati con datiProxy)
export const NOMI_DATI = [
  'aguzza.json', 'app.json', 'citta.json', 'immagini.json', 'autobus.json', 'cibi.json', 'curiosita.json', 'eventi.json', 'itinerari.json',
  'luoghi.json', 'mappa.json', 'orari_autobus.json', 'orari_vaporetti.json', 'principali.json', 'rete.json',
  'servizi.json', 'vaporetti.json',
];

// cartella: percorso della città sul telefono, con le sottocartelle "dati" e "assets"
export async function caricaCitta(cartella) {
  for (const nome of NOMI_DATI) {
    try {
      const testo = await FileSystem.readAsStringAsync(cartella + 'dati/' + nome);
      impostaDati(nome, JSON.parse(testo));
    } catch (e) {
      // immagini.json manca nei pacchetti scaricati prima: la città si apre senza foto in più
      if (!FACOLTATIVI.includes(nome)) throw e;
      impostaDati(nome, {});
    }
  }
  impostaCartellaAssets(cartella + 'assets/');
  inizializzaCitta();
}
