// Catalogo delle città del Veneto (catalogo.json). Lo stato e i pacchetti arrivano da qui;
// i prezzi NON sono scritti nel codice: li legge lo store (Google Play / App Store) tramite lo SKU.
import CATALOGO from '../catalogo.json';

export const CITTA = CATALOGO.citta;
export const GRATUITO = CATALOGO.gratuito;

export const etichettaStato = (stato) =>
  stato === 'disponibile' ? 'Disponibile' : 'In preparazione';

export const cittaPerId = (id) => CITTA.find((c) => c.id === id) || null;
