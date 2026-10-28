// Lingue dell'interfaccia. I testi dei luoghi arrivano già tradotti nel pacchetto (it, en, fr, de, es).
import { GRATUITO } from './catalogo';

export const LINGUE = ['it', 'en', 'fr', 'de', 'es'];

const TESTI = {
  it: {
    titolo: 'Veneto: Monumenti & altro',
    cittaAttiva: 'Città attiva',
    luoghi: 'luoghi',
    gratuito: 'Gratuito',
    gratuitoTesto: GRATUITO,
    lePiazze: 'Le città',
    attiva: 'Attiva',
    installata: 'Installata',
    disponibile: 'Disponibile',
    preparazione: 'In preparazione',
    nonAncora: 'Non ancora',
    apri: 'Apri',
    scarica: 'Scarica',
    elimina: 'Elimina',
    errore: 'Operazione non riuscita',
    riprova: 'Riprova più tardi.',
  },
  en: {
    titolo: 'Veneto: Monuments & more',
    cittaAttiva: 'Active city',
    luoghi: 'places',
    gratuito: 'Free',
    gratuitoTesto: 'Practical services always available: bus and vaporetto lines with timetables, and a preview of the monuments.',
    lePiazze: 'Cities',
    attiva: 'Active',
    installata: 'Installed',
    disponibile: 'Available',
    preparazione: 'Coming soon',
    nonAncora: 'Not yet',
    apri: 'Open',
    scarica: 'Download',
    elimina: 'Remove',
    errore: 'Operation failed',
    riprova: 'Please try again later.',
  },
  fr: {
    titolo: 'Vénétie : Monuments et plus',
    cittaAttiva: 'Ville active',
    luoghi: 'lieux',
    gratuito: 'Gratuit',
    gratuitoTesto: 'Services pratiques toujours disponibles : lignes de bus et de vaporetto avec horaires, et aperçu des monuments.',
    lePiazze: 'Villes',
    attiva: 'Active',
    installata: 'Installée',
    disponibile: 'Disponible',
    preparazione: 'En préparation',
    nonAncora: 'Pas encore',
    apri: 'Ouvrir',
    scarica: 'Télécharger',
    elimina: 'Supprimer',
    errore: 'Opération échouée',
    riprova: 'Réessayez plus tard.',
  },
  de: {
    titolo: 'Venetien: Denkmäler & mehr',
    cittaAttiva: 'Aktive Stadt',
    luoghi: 'Orte',
    gratuito: 'Kostenlos',
    gratuitoTesto: 'Praktische Dienste immer verfügbar: Bus- und Vaporetto-Linien mit Fahrplänen sowie eine Vorschau der Denkmäler.',
    lePiazze: 'Städte',
    attiva: 'Aktiv',
    installata: 'Installiert',
    disponibile: 'Verfügbar',
    preparazione: 'In Vorbereitung',
    nonAncora: 'Noch nicht',
    apri: 'Öffnen',
    scarica: 'Herunterladen',
    elimina: 'Entfernen',
    errore: 'Vorgang fehlgeschlagen',
    riprova: 'Bitte später erneut versuchen.',
  },
  es: {
    titolo: 'Véneto: Monumentos y más',
    cittaAttiva: 'Ciudad activa',
    luoghi: 'lugares',
    gratuito: 'Gratuito',
    gratuitoTesto: 'Servicios prácticos siempre disponibles: líneas de autobús y vaporetto con horarios, y una vista previa de los monumentos.',
    lePiazze: 'Ciudades',
    attiva: 'Activa',
    installata: 'Instalada',
    disponibile: 'Disponible',
    preparazione: 'En preparación',
    nonAncora: 'Todavía no',
    apri: 'Abrir',
    scarica: 'Descargar',
    elimina: 'Eliminar',
    errore: 'Operación no realizada',
    riprova: 'Inténtalo de nuevo más tarde.',
  },
};

export const testi = (lingua) => TESTI[lingua] || TESTI.it;

export const etichettaStato = (t, stato) =>
  stato === 'disponibile' ? t.disponibile : t.preparazione;

// Etichette delle schermate dei luoghi
const ETICHETTE = {
  it: { mappa: 'Mappa', luoghi: 'Luoghi', indietro: 'Indietro', tutte: 'Tutti', orari: 'Orari', chiuso: 'Chiuso', gratuito: 'Ingresso gratuito', pagamento: 'Ingresso a pagamento', sito: 'Sito web', fermata: 'Fermata', sestiere: 'Sestiere', wikipedia: 'Wikipedia', nota: 'Nota',
    categorie: { chiese: 'Chiese', palazzi: 'Palazzi', altri: 'Altro', musei: 'Musei', ponti: 'Ponti', giardini: 'Giardini', piazze: 'Piazze' },
    giorni: { lun: 'lun', mar: 'mar', mer: 'mer', gio: 'gio', ven: 'ven', sab: 'sab', dom: 'dom' } },
  en: { mappa: 'Map', luoghi: 'Places', indietro: 'Back', tutte: 'All', orari: 'Opening hours', chiuso: 'Closed', gratuito: 'Free entry', pagamento: 'Paid entry', sito: 'Website', fermata: 'Stop', sestiere: 'District', wikipedia: 'Wikipedia', nota: 'Note',
    categorie: { chiese: 'Churches', palazzi: 'Palaces', altri: 'Other', musei: 'Museums', ponti: 'Bridges', giardini: 'Gardens', piazze: 'Squares' },
    giorni: { lun: 'Mon', mar: 'Tue', mer: 'Wed', gio: 'Thu', ven: 'Fri', sab: 'Sat', dom: 'Sun' } },
  fr: { mappa: 'Carte', luoghi: 'Lieux', indietro: 'Retour', tutte: 'Tous', orari: 'Horaires', chiuso: 'Fermé', gratuito: 'Entrée libre', pagamento: 'Entrée payante', sito: 'Site web', fermata: 'Arrêt', sestiere: 'Quartier', wikipedia: 'Wikipédia', nota: 'Remarque',
    categorie: { chiese: 'Églises', palazzi: 'Palais', altri: 'Autres', musei: 'Musées', ponti: 'Ponts', giardini: 'Jardins', piazze: 'Places' },
    giorni: { lun: 'lun', mar: 'mar', mer: 'mer', gio: 'jeu', ven: 'ven', sab: 'sam', dom: 'dim' } },
  de: { mappa: 'Karte', luoghi: 'Orte', indietro: 'Zurück', tutte: 'Alle', orari: 'Öffnungszeiten', chiuso: 'Geschlossen', gratuito: 'Eintritt frei', pagamento: 'Eintritt kostenpflichtig', sito: 'Webseite', fermata: 'Haltestelle', sestiere: 'Stadtviertel', wikipedia: 'Wikipedia', nota: 'Hinweis',
    categorie: { chiese: 'Kirchen', palazzi: 'Paläste', altri: 'Sonstiges', musei: 'Museen', ponti: 'Brücken', giardini: 'Gärten', piazze: 'Plätze' },
    giorni: { lun: 'Mo', mar: 'Di', mer: 'Mi', gio: 'Do', ven: 'Fr', sab: 'Sa', dom: 'So' } },
  es: { mappa: 'Mapa', luoghi: 'Lugares', indietro: 'Atrás', tutte: 'Todos', orari: 'Horario', chiuso: 'Cerrado', gratuito: 'Entrada gratuita', pagamento: 'Entrada de pago', sito: 'Sitio web', fermata: 'Parada', sestiere: 'Barrio', wikipedia: 'Wikipedia', nota: 'Nota',
    categorie: { chiese: 'Iglesias', palazzi: 'Palacios', altri: 'Otros', musei: 'Museos', ponti: 'Puentes', giardini: 'Jardines', piazze: 'Plazas' },
    giorni: { lun: 'lun', mar: 'mar', mer: 'mié', gio: 'jue', ven: 'vie', sab: 'sáb', dom: 'dom' } },
};

export const etichette = (lingua) => ETICHETTE[lingua] || ETICHETTE.it;

// Traduce un testo di giorni come "lun-sab" o "dom, lun" con le abbreviazioni della lingua
export const traduciGiorni = (lingua, testo) => {
  const e = etichette(lingua).giorni;
  return String(testo).replace(/\b(lun|mar|mer|gio|ven|sab|dom)\b/g, (g) => e[g]);
};

// Testo nella lingua scelta, con ripiego sull'italiano
export const testoLingua = (lingua, oggetto) => {
  if (!oggetto) return '';
  if (typeof oggetto === 'string') return oggetto;
  return oggetto[lingua] || oggetto.it || '';
};
