import { datiProxy } from './dati';
// "Aguzza la vista": domande e risposte per luogo, dal file aguzza.json (generato da strumenti/aguzza_importa.py)
const dati = datiProxy('aguzza.json');

// Foto "Aguzza la vista" (solo le risposte che ne hanno una). Il file è nella cartella assets/aguzza.

let PER_LUOGO = {};

// Le domande da fare in un luogo (lista vuota se non ce ne sono)
export function domandePerLuogo(id) {
  return PER_LUOGO[id] || [];
}

// Itinerari "Aguzza la vista": tappe da aguzza.json; il percorso si calcola nell'app, come per quelli creati dall'utente.
export let ITINERARI_AGUZZA = [];
export function inizializzaAguzza() {
  PER_LUOGO = {};
  for (const d of dati.domande) {
    (PER_LUOGO[d.luogo_id] = PER_LUOGO[d.luogo_id] || []).push(d);
  }
  ITINERARI_AGUZZA = dati.itinerari.map((it) => ({ id: it.id, titolo: it.titolo, tappe: it.tappe }));
}
