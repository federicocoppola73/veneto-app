// Catalogo delle città del Veneto (catalogo.json). Lo stato e i pacchetti arrivano da qui;
// i prezzi NON sono scritti nel codice: li legge lo store (Google Play / App Store) tramite lo SKU.
import { Platform } from 'react-native';
import CATALOGO from '../catalogo.json';

// Su iOS le zone "Prossimamente" (senza pacchetto) non si mostrano: Apple può contestare i contenuti non ancora pronti
export const CITTA = Platform.OS === 'ios' ? CATALOGO.citta.filter((c) => c.pacchetto) : CATALOGO.citta;
export const GRATUITO = CATALOGO.gratuito;

export const etichettaStato = (stato) =>
  stato === 'disponibile' ? 'Disponibile' : 'In preparazione';

export const cittaPerId = (id) => CITTA.find((c) => c.id === id) || null;
