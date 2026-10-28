import { datiProxy } from './dati';
// Servizi utili al visitatore (servizi.json, generato da strumenti/servizi.py con i dati OpenStreetMap)
const dati = datiProxy('servizi.json');

export const TIPI_SERVIZIO = [
  { id: 'acqua', icona: '💧', colore: '#0284c7', chiave: 'srv_acqua' },
  { id: 'bagni', icona: 'WC', colore: '#0d9488', chiave: 'srv_bagni' },
  { id: 'farmacie', icona: '✚', colore: '#16a34a', chiave: 'srv_farmacie' },
  { id: 'polizia', icona: '👮', colore: '#1e3a8a', chiave: 'srv_polizia' },
  { id: 'ospedali', icona: 'H', colore: '#dc2626', chiave: 'srv_ospedali' },
  { id: 'vaporetto', icona: '⛴', colore: '#1e40af', chiave: 'srv_vaporetto' },
  { id: 'parcheggi', icona: 'P', colore: '#2563eb', chiave: 'srv_parcheggi' },
  { id: 'autobus', icona: '🚌', colore: '#0B6BB7', chiave: 'srv_autobus' },
];

export let SERVIZI = [];
export function inizializzaServizi() {
  SERVIZI = dati.servizi || [];
}
export const tipoServizio = (id) => TIPI_SERVIZIO.find((t) => t.id === id);
