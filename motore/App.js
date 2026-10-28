import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Linking, Platform, Pressable, Share, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const datiLuoghi = datiProxy('luoghi.json');
const datiPrincipali = datiProxy('principali.json');
const configMappa = datiProxy('mappa.json');
import MappaZoomabile, { stilePulsanteMappa, stileTestoPulsanteMappa } from './src/components/MappaZoomabile';
import PopupLuogo from './src/components/PopupLuogo';
import SelettoreLingua from './src/components/SelettoreLingua';
import RicercaLuoghi from './src/components/RicercaLuoghi';
import FiltroCategorie from './src/components/FiltroCategorie';
import VicinoATe from './src/components/VicinoATe';
import WidgetMeteoMarea from './src/components/WidgetMeteoMarea';
import { centroCitta, haMarea, nomeCitta, riferimentoCitta } from './src/citta';
import Calendario from './src/components/Calendario';
import Preferiti from './src/components/Preferiti';
const DATI_EVENTI = datiProxy('eventi.json');
import Crediti from './src/components/Crediti';
import SelettoreItinerari from './src/components/SelettoreItinerari';
import EditorItinerario from './src/components/EditorItinerario';
import ImportaItinerari from './src/components/ImportaItinerari';
import { leggiLink, linkCuore, linkEsportazione, linkItinerario } from './src/condivisione';
import BarraItinerario from './src/components/BarraItinerario';
import GuidaItinerario from './src/components/GuidaItinerario';
import PannelloServizi from './src/components/PannelloServizi';
import SchedaServizio from './src/components/SchedaServizio';
import PannelloCuriosita from './src/components/PannelloCuriosita';
import SchedaCuriosita from './src/components/SchedaCuriosita';
import SchedaCibo from './src/components/SchedaCibo';
import { CIBI, CURIOSITA, posizioneCuriosita } from './src/curiosita';
import { useAdesso } from './src/adesso';
import { agganciaAllaRete, camminoVersoLuogo, metriVersoLuogo, percorsiDa } from './src/rete';
import { SERVIZI, tipoServizio } from './src/servizi';
import { COLORE_PERCORSO_ACQUA, ITINERARI, lunghezzaItinerario, testoLunghezza } from './src/itinerari';
import { CATEGORIE, coloreCategoria } from './src/categorie';
import { distanzaMetri } from './src/distanza';
import { creaProiezione } from './src/geo';
import { linguaDelDispositivo, testoLocalizzato, traduttore } from './src/i18n';
import { usePosizione } from './src/posizione';
import { usePreferiti, useVisitati } from './src/preferiti';
import { calcolaItinerario, useItinerariUtente } from './src/itinerariUtente';
import { ITINERARI_AGUZZA } from './src/aguzza';
import { DIMENSIONE_TESSERA, TESSERE } from './src/tessere';
import { immagine } from './src/risorse';
import { datiProxy } from './src/dati';

const MAPPA = datiProxy('mappa.json'); // immagine della mappa della città attiva
const ALTEZZA_BARRA_STATO = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;
// All'avvio la mappa è centrata sul centro storico (tra Rialto e San Marco)
// luoghi principali: il loro nome compare sulla mappa prima degli altri (principali.json)
// valore = posizione nella lista (1 = il più importante), usata quando due nomi si sovrappongono
let PRINCIPALI = new Map();
export function inizializzaPrincipali() {
  PRINCIPALI = new Map((datiPrincipali.luoghi || []).map((id, i) => [id, i + 1]));
}
const LONTANO_M = 5000; // oltre questa distanza dal luogo più vicino l'utente "non è a Venezia"
const NUMERO_VICINI = 3;
const COLORE_PARTENZA = '#0f3d5e';
const COLORE_TRATTO_UTENTE = '#2563eb'; // percorso dalla posizione dell'utente alla prossima tappa
const ARRIVATO_M = 40; // entro questa distanza dalla tappa l'utente "è arrivato"
const ARRIVATO_M_ACQUA = 70; // in vaporetto i palazzi si vedono dal centro del canale
// i servizi della città si leggono al momento del tocco (i dati si caricano dopo l'avvio)
const servizioPerId = (id) => SERVIZI.find((s) => s.id === id) || null;
// Sui telefoni l'app resta in verticale; sui tablet (lato corto ≥ 600 punti) si può ruotare
const E_TABLET = Math.min(Dimensions.get('screen').width, Dimensions.get('screen').height) >= 600;

// Spazi "sicuri" del telefono (barra di stato, tacca, tasti di navigazione di Android)
export default function App({ onEsci }) {
  return (
    <SafeAreaProvider>
      <Schermata />
      {onEsci ? <Pressable onPress={onEsci} style={{ position: 'absolute', bottom: 64, left: 12, zIndex: 99, backgroundColor: '#1e3a8af0', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 }}><Text style={{ color: '#fff', fontWeight: '700' }}>← Città</Text></Pressable> : null}
    </SafeAreaProvider>
  );
}

function Schermata() {
  const insets = useSafeAreaInsets();
  const [lingua, setLingua] = useState(linguaDelDispositivo);
  const [selezionate, setSelezionate] = useState(CATEGORIE.map((c) => c.id)); // tipologie visibili
  const [soloCuore, setSoloCuore] = useState(false); // filtro "♥ Del cuore": solo i luoghi del cuore
  const [avvisoCuore, setAvvisoCuore] = useState(false); // messaggio se si tocca il filtro senza luoghi del cuore
  const [soloVisitati, setSoloVisitati] = useState(false); // filtro "✓ Visitati": solo i luoghi dove si è già stati
  const [avvisoVisitati, setAvvisoVisitati] = useState(false); // messaggio se si tocca il filtro senza luoghi visitati
  const [idSelezionato, setIdSelezionato] = useState(null); // scheda aperta
  const [idEvidenziato, setIdEvidenziato] = useState(null); // luogo scelto dalla ricerca
  const [idItinerario, setIdItinerario] = useState(null); // itinerario mostrato sulla mappa
  const [partenza, setPartenza] = useState(null); // 'piazzale-roma' | 'stazione' | 'posizione'
  const [selettoreAperto, setSelettoreAperto] = useState(false);
  const [editor, setEditor] = useState(null); // itinerario dell'utente in creazione/modifica: { id?, titolo, tappe }
  const [importa, setImporta] = useState(null); // pagina "Importa": { ricevuto: risultato di leggiLink | null, da }
  const [apriItinerarioId, setApriItinerarioId] = useState(null); // dettaglio da aprire subito (link di un amico)
  const [guida, setGuida] = useState(false); // guida passo passo dell'itinerario
  const [visitate, setVisitate] = useState([]); // tappe segnate come visitate
  const [saltate, setSaltate] = useState([]);
  const [serviziVisibili, setServiziVisibili] = useState([]); // fontanelle, bagni, farmacie, vaporetto
  const [pannelloServizi, setPannelloServizi] = useState(false);
  const [idServizio, setIdServizio] = useState(null);
  const [pannelloCuriosita, setPannelloCuriosita] = useState(false); // pagina Curiosità e cibi
  const [idCuriosita, setIdCuriosita] = useState(null); // scheda di una curiosità aperta
  const [idCibo, setIdCibo] = useState(null); // scheda di un piatto aperta
  const [lampadina, setLampadina] = useState(null); // 💡 temporanea sulla mappa dopo "Portami lì": { id, titolo, x, y }
  const adesso = useAdesso();
  const mappaRef = useRef(null);
  const t = useMemo(() => traduttore(lingua), [lingua]);
  const immagineMappa = useMemo(() => immagine(MAPPA.immagine || 'mappa-venezia.webp'), []);
  const posizione = usePosizione();
  const { preferiti, cambia: cambiaPreferito, aggiungiMolti: aggiungiPreferiti } = usePreferiti(); // luoghi del cuore
  const { visitati: luoghiVisitati, cambia: cambiaVisitato, aggiungi: aggiungiVisitato } = useVisitati(); // "Ci sono stato"
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const blocco = E_TABLET
      ? ScreenOrientation.unlockAsync()
      : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    blocco.catch(() => {});
  }, []);
  const { width, height } = useWindowDimensions();
  const orizzontale = width > height;

  // Luoghi visibili: quelli con "curiosita": true compaiono solo con la 💡 (vedi "Portami lì")
  const tuttiILuoghi = datiLuoghi.luoghi || [];
  const luoghi = useMemo(() => tuttiILuoghi.filter((l) => !l.curiosita), [tuttiILuoghi]);
  const luoghiPerId = useMemo(() => Object.fromEntries(luoghi.map((l) => [l.id, l])), [luoghi]);
  const luoghiTuttiPerId = useMemo(() => Object.fromEntries(tuttiILuoghi.map((l) => [l.id, l])), [tuttiILuoghi]);
  // itinerari ufficiali più quelli creati dall'utente ("I miei")
  const { itinerariUtente, salvaItinerario, eliminaItinerario, importaItinerari } = useItinerariUtente(luoghiPerId);
  // itinerari "Aguzza la vista": percorso calcolato sul telefono, come quelli creati dall'utente
  // si calcolano solo quando si apre la lista degli itinerari (così l'avvio dell'app resta rapido)
  const [aguzzaCaricati, setAguzzaCaricati] = useState(false);
  useEffect(() => {
    if (selettoreAperto || idItinerario || apriItinerarioId) setAguzzaCaricati(true);
  }, [selettoreAperto, idItinerario, apriItinerarioId]);
  const itinerariAguzza = useMemo(() => {
    if (!aguzzaCaricati) return [];
    const memoria = new Map(); // percorsi a piedi condivisi tra tutti gli itinerari Aguzza
    return ITINERARI_AGUZZA.map((it) => ({ ...calcolaItinerario(it, luoghiTuttiPerId, memoria), utente: false }));
  }, [luoghiTuttiPerId, aguzzaCaricati]);
  const tuttiItinerari = useMemo(() => [...ITINERARI, ...itinerariAguzza, ...itinerariUtente], [itinerariAguzza, itinerariUtente]);
  const itinerario = tuttiItinerari.find((it) => it.id === idItinerario) || null;
  const proietta = useMemo(() => creaProiezione(configMappa), []);

  // Posizione in pixel di ogni luogo sull'immagine della mappa
  const tuttiIPunti = useMemo(
    () =>
      luoghi.map((l) => ({
        id: l.id,
        etichetta: l.nome,
        categoria: l.categoria,
        principale: PRINCIPALI.get(l.id) || 0,
        colore: coloreCategoria(l.categoria),
        ...proietta(l.latitudine, l.longitudine),
      })),
    [luoghi, proietta]
  );

  // Itinerario attivo: tappe numerate, punto di partenza (se fisso) e linea del percorso a piedi
  const partenzaFissa = itinerario && partenza && partenza !== 'posizione' && itinerario.partenze?.[partenza] ? partenza : null;
  const puntiItinerario = useMemo(() => {
    if (!itinerario) return null;
    const perId = Object.fromEntries(tuttiIPunti.map((p) => [p.id, p]));
    const tappe = itinerario.tappe.map((id, i) => ({ ...perId[id], numero: String(i + 1) }));
    if (partenzaFissa && !itinerario.tappe.includes(partenzaFissa)) {
      tappe.unshift({ ...perId[partenzaFissa], numero: '▶', colore: COLORE_PARTENZA });
    }
    return tappe.filter((p) => p.id);
  }, [itinerario, partenzaFissa, tuttiIPunti]);

  const percorso = useMemo(() => {
    if (!itinerario) return null;
    const tratti = [...(partenzaFissa ? [itinerario.partenze[partenzaFissa]] : []), ...itinerario.tratti];
    const colore = itinerario.nautico ? COLORE_PERCORSO_ACQUA : undefined; // azzurro acqua per il vaporetto
    return tratti.map((tr) => ({ punti: tr.percorso.map(([lat, lon]) => proietta(lat, lon)), colore }));
  }, [itinerario, partenzaFissa, proietta]);

  // Sulla mappa: le tappe dell'itinerario oppure le tipologie selezionate, più l'eventuale luogo scelto dalla ricerca
  const puntiBase = useMemo(() => {
    if (puntiItinerario) {
      const extra = idEvidenziato && !puntiItinerario.some((p) => p.id === idEvidenziato)
        ? tuttiIPunti.filter((p) => p.id === idEvidenziato)
        : [];
      return [...puntiItinerario, ...extra];
    }
    if (soloCuore) return tuttiIPunti.filter((p) => preferiti.includes(p.id) || p.id === idEvidenziato);
    if (soloVisitati) return tuttiIPunti.filter((p) => luoghiVisitati.includes(p.id) || p.id === idEvidenziato);
    return tuttiIPunti.filter((p) => selezionate.includes(p.categoria) || p.id === idEvidenziato);
  }, [puntiItinerario, tuttiIPunti, selezionate, idEvidenziato, soloCuore, preferiti, soloVisitati, luoghiVisitati]);

  const conteggi = useMemo(() => {
    const c = {};
    for (const l of luoghi) c[l.categoria] = (c[l.categoria] || 0) + 1;
    return c;
  }, [luoghi]);

  const vistaIniziale = useMemo(() => {
    const c = centroCitta();
    const p = proietta(c.latitudine, c.longitudine);
    return { ...p, zoom: c.zoom };
  }, [proietta]);

  // ---- Posizione dell'utente ----
  const coord = posizione.coordinate;
  const distanze = useMemo(() => {
    if (!coord) return null;
    const d = {};
    for (const l of luoghi) d[l.id] = distanzaMetri(coord.latitudine, coord.longitudine, l.latitudine, l.longitudine);
    return d;
  }, [coord, luoghi]);

  const lontano = distanze ? Math.min(...Object.values(distanze)) > LONTANO_M : false;

  // pixel sulla mappa, solo se l'utente è dentro l'area della cartina
  const puntoUtente = useMemo(() => {
    if (!coord) return null;
    const p = proietta(coord.latitudine, coord.longitudine);
    const dentro = p.x >= 0 && p.y >= 0 && p.x <= configMappa.larghezza && p.y <= configMappa.altezza;
    return dentro ? p : null;
  }, [coord, proietta]);

  const vicini = useMemo(() => {
    if (!distanze || lontano) return [];
    return luoghi
      .filter((l) =>
        itinerario
          ? itinerario.tappe.includes(l.id)
          : soloCuore
            ? preferiti.includes(l.id)
            : soloVisitati
              ? luoghiVisitati.includes(l.id)
              : selezionate.includes(l.categoria)
      )
      .map((l) => ({ luogo: l, metri: distanze[l.id] }))
      .sort((a, b) => a.metri - b.metri)
      .slice(0, orizzontale ? 2 : NUMERO_VICINI); // in orizzontale c'è meno spazio in altezza
  }, [distanze, lontano, luoghi, selezionate, orizzontale, itinerario, soloCuore, preferiti, soloVisitati, luoghiVisitati]);

  const distanzaDaVenezia =
    coord && lontano
      ? distanzaMetri(coord.latitudine, coord.longitudine, riferimentoCitta().latitudine, riferimentoCitta().longitudine)
      : null;

  // ---- Percorsi a piedi veri dalla posizione dell'utente (rete pedonale nell'app, senza connessione) ----
  const serveRete = !!coord && !lontano && (guida || (itinerario && partenza === 'posizione') || selettoreAperto);
  const aggancio = useMemo(
    () => (serveRete ? agganciaAllaRete(coord.latitudine, coord.longitudine) : null),
    [serveRete, coord]
  );
  const nodoUtente = aggancio?.nodo;
  const percorsiUtente = useMemo(() => (nodoUtente != null ? percorsiDa(nodoUtente) : null), [nodoUtente]);
  const metriAPiedi = useCallback(
    (id) => {
      const m = metriVersoLuogo(percorsiUtente, id);
      return m == null ? null : m + aggancio.metri;
    },
    [percorsiUtente, aggancio]
  );

  // ---- Guida passo passo ----
  const indiceProssima = itinerario && guida
    ? itinerario.tappe.findIndex((id) => !visitate.includes(id) && !saltate.includes(id))
    : -1;
  const prossima = useMemo(() => {
    if (indiceProssima < 0) return null;
    const id = itinerario.tappe[indiceProssima];
    const l = luoghiPerId[id];
    let metri = null;
    let stimato = false;
    let arrivato = false;
    let superata = false;
    if (coord && !lontano && itinerario.nautico) {
      // in vaporetto: distanza in linea d'aria; la tappa è "superata" quando si è già più vicini alla successiva
      metri = distanzaMetri(coord.latitudine, coord.longitudine, l.latitudine, l.longitudine);
      stimato = true;
      arrivato = metri < ARRIVATO_M_ACQUA;
      const idSucc = itinerario.tappe.slice(indiceProssima + 1).find((x) => !visitate.includes(x) && !saltate.includes(x));
      const s = idSucc && luoghiPerId[idSucc];
      superata = !!s && distanzaMetri(coord.latitudine, coord.longitudine, s.latitudine, s.longitudine) < metri;
    } else if (coord && !lontano) {
      const linea = distanzaMetri(coord.latitudine, coord.longitudine, l.latitudine, l.longitudine);
      metri = metriAPiedi(id);
      if (metri == null) {
        metri = linea * 1.3;
        stimato = true;
      }
      arrivato = linea < ARRIVATO_M || metri < ARRIVATO_M;
    }
    return { id, indice: indiceProssima, metri, stimato, arrivato, superata };
  }, [indiceProssima, itinerario, luoghiPerId, coord, lontano, metriAPiedi, visitate, saltate]);

  // in vaporetto le tappe superate si spuntano da sole (la barca non aspetta il tocco su "Visitata")
  useEffect(() => {
    if (guida && prossima?.superata) {
      setVisitate((v) => (v.includes(prossima.id) ? v : [...v, prossima.id]));
      aggiungiVisitato(prossima.id); // anche tra i luoghi visitati ("Ci sono stato")
    }
  }, [guida, prossima, aggiungiVisitato]);

  // tratto in azzurro dall'utente alla prossima tappa (guida) o alla prima tappa (partenza "Dove sono ora")
  // (non negli itinerari in vaporetto: il tratto a piedi non avrebbe senso)
  const idDestinazioneUtente = itinerario?.nautico
    ? null
    : guida
      ? prossima && !prossima.arrivato ? prossima.id : null
      : itinerario && partenza === 'posizione' ? itinerario.tappe[0] : null;
  const trattoUtente = useMemo(() => {
    if (!idDestinazioneUtente || !percorsiUtente || !coord) return null;
    const c = camminoVersoLuogo(percorsiUtente, idDestinazioneUtente);
    if (!c) return null;
    return [[coord.latitudine, coord.longitudine], ...c].map(([lat, lon]) => proietta(lat, lon));
  }, [idDestinazioneUtente, percorsiUtente, coord, proietta]);

  const percorsoMappa = useMemo(() => {
    if (!percorso) return null;
    return trattoUtente ? [...percorso, { punti: trattoUtente, colore: COLORE_TRATTO_UTENTE }] : percorso;
  }, [percorso, trattoUtente]);

  // ---- Servizi sulla mappa ----
  const puntiServizi = useMemo(
    () =>
      SERVIZI.filter((s) => serviziVisibili.includes(s.tipo)).map((s) => {
        const tipo = tipoServizio(s.tipo);
        return { id: s.id, etichetta: s.nome || t(tipo.chiave), colore: tipo.colore, icona: tipo.icona, ...proietta(s.lat, s.lon) };
      }),
    [serviziVisibili, proietta, t]
  );
  const conteggiServizi = useMemo(() => {
    const c = {};
    for (const s of SERVIZI) c[s.tipo] = (c[s.tipo] || 0) + 1;
    return c;
  }, []);

  const punti = useMemo(() => {
    let base = puntiBase;
    if (guida && itinerario) {
      base = base.map((p) =>
        visitate.includes(p.id) || saltate.includes(p.id)
          ? { ...p, spento: true, numero: visitate.includes(p.id) ? '✓' : p.numero }
          : p
      );
    }
    // spunta verde sui pallini dei luoghi dove si è già stati ("Ci sono stato")
    if (luoghiVisitati.length) base = base.map((p) => (luoghiVisitati.includes(p.id) ? { ...p, visitato: true } : p));
    return puntiServizi.length ? [...puntiServizi, ...base] : base;
  }, [puntiBase, puntiServizi, guida, itinerario, visitate, saltate, luoghiVisitati]);

  const premiPosizione = async () => {
    if (posizione.stato === 'attivo' && puntoUtente) {
      mappaRef.current?.centraSu(puntoUtente);
      return;
    }
    const c = await posizione.attiva();
    if (c) {
      const p = proietta(c.latitudine, c.longitudine);
      if (p.x >= 0 && p.y >= 0 && p.x <= configMappa.larghezza && p.y <= configMappa.altezza) {
        mappaRef.current?.centraSu(p);
      }
    }
  };

  // ---- Ricerca, schede e filtri ----
  const scegliDaRicerca = (id) => {
    setIdEvidenziato(id);
    const punto = tuttiIPunti.find((p) => p.id === id);
    if (punto) mappaRef.current?.centraSu(punto);
    // dopo lo spostamento della mappa si apre anche la scheda del luogo
    setTimeout(() => setIdSelezionato(id), 650);
  };

  const chiudiScheda = useCallback(() => {
    setIdSelezionato(null);
    setIdEvidenziato(null);
  }, []);

  const cambiaFiltro = (nuove) => {
    setSelezionate(nuove);
    setSoloCuore(false);
    setSoloVisitati(false);
    setIdEvidenziato(null);
  };

  // Filtro "♥ Del cuore": acceso mostra solo i luoghi del cuore e li inquadra; toccato di nuovo torna a "Tutti"
  const mostraCuoreSullaMappa = () => {
    setSoloCuore(true);
    setSoloVisitati(false);
    setIdEvidenziato(null);
    const lista = tuttiIPunti.filter((p) => preferiti.includes(p.id));
    if (lista.length === 1) setTimeout(() => mappaRef.current?.centraSu(lista[0]), 350);
    else if (lista.length > 1) setTimeout(() => mappaRef.current?.inquadra(lista), 350);
  };
  const toccaCuore = () => {
    if (soloCuore) return cambiaFiltro(CATEGORIE.map((c) => c.id));
    if (!preferiti.length) {
      setAvvisoCuore(true);
      return;
    }
    mostraCuoreSullaMappa();
  };
  // Filtro "✓ Visitati": come il cuore, ma per i luoghi segnati con "Ci sono stato"
  const toccaVisitati = () => {
    if (soloVisitati) return cambiaFiltro(CATEGORIE.map((c) => c.id));
    if (!luoghiVisitati.length) {
      setAvvisoVisitati(true);
      return;
    }
    mostraVisitatiSullaMappa();
  };
  function mostraVisitatiSullaMappa() {
    setSoloVisitati(true);
    setSoloCuore(false);
    setIdEvidenziato(null);
    const lista = tuttiIPunti.filter((p) => luoghiVisitati.includes(p.id));
    if (lista.length === 1) setTimeout(() => mappaRef.current?.centraSu(lista[0]), 350);
    else if (lista.length > 1) setTimeout(() => mappaRef.current?.inquadra(lista), 350);
  }
  useEffect(() => {
    if (!avvisoVisitati) return;
    const timer = setTimeout(() => setAvvisoVisitati(false), 6000);
    return () => clearTimeout(timer);
  }, [avvisoVisitati]);
  useEffect(() => {
    if (!avvisoCuore) return;
    const timer = setTimeout(() => setAvvisoCuore(false), 6000);
    return () => clearTimeout(timer);
  }, [avvisoCuore]);

  // ---- Itinerari ----
  const lunghezza = (it) =>
    lunghezzaItinerario(it, partenza, { coordinate: coord, lontano, luoghiPerId, metriAPiedi: percorsiUtente ? metriAPiedi : null });

  const scegliPartenza = (id) => {
    setPartenza(id);
    if (id === 'posizione' && posizione.stato !== 'attivo' && posizione.stato !== 'ricerca') posizione.attiva();
  };

  const scegliItinerario = (id) => {
    const it = tuttiItinerari.find((x) => x.id === id);
    if (!it) return;
    setIdItinerario(id);
    setIdEvidenziato(null);
    setSelettoreAperto(false);
    setApriItinerarioId(null);
    // inquadra tutto il percorso (e la posizione dell'utente, se parte da lì)
    const fissa = partenza !== 'posizione' && it.partenze?.[partenza] ? partenza : null;
    const lista = [...(fissa ? [it.partenze[fissa]] : []), ...it.tratti].flatMap((tr) =>
      tr.percorso.map(([lat, lon]) => proietta(lat, lon))
    );
    if (partenza === 'posizione' && puntoUtente && !lontano) lista.push(puntoUtente);
    setTimeout(() => mappaRef.current?.inquadra(lista), 350);
  };

  // ---- Condivisione degli itinerari (link su fcdeveloperapps.github.io, vedi src/condivisione.js) ----
  const MAX_NOMI_MESSAGGIO = 8;
  const condividiItinerario = (it) => {
    const nomi = it.tappe.map((id) => luoghiPerId[id]?.nome || id);
    const elenco = nomi.slice(0, MAX_NOMI_MESSAGGIO).join(' → ') + (nomi.length > MAX_NOMI_MESSAGGIO ? ' → …' : '');
    const titolo = `${it.utente ? '🧭' : '⭐'} ${testoLocalizzato(it.titolo, lingua)}`;
    const righe = [
      titolo,
      `${it.tappe.length} ${t('tappe')} · ${testoLunghezza({ metri: it.metri }, t, it.nautico)}`,
      elenco,
      '',
      t('cond_apri'),
      linkItinerario(it, (id) => luoghiPerId[id]?.nome || id, lingua),
    ];
    Share.share({ message: righe.join('\n') }).catch(() => {});
  };
  const esportaItinerari = () => {
    if (!itinerariUtente.length) return;
    const righe = [
      `🧭 ${t('cond_esportaTitolo')} (${itinerariUtente.length})`,
      ...itinerariUtente.map((it) => `• ${it.titolo} – ${it.tappe.length} ${t('tappe')}`),
      '',
      t('cond_apri'),
      linkEsportazione(itinerariUtente, lingua),
    ];
    Share.share({ message: righe.join('\n') }).catch(() => {});
  };
  const MAX_NOMI_CUORE = 10;
  const esportaCuore = () => {
    const ids = preferiti.filter((id) => luoghiPerId[id]);
    if (!ids.length) return;
    const nomi = ids.map((id) => luoghiPerId[id].nome);
    const righe = [
      `♥ ${t('preferiti')} (${ids.length})`,
      ...nomi.slice(0, MAX_NOMI_CUORE).map((n) => `• ${n}`),
      ...(nomi.length > MAX_NOMI_CUORE ? ['• …'] : []),
      '',
      t('cond_apri'),
      linkCuore(ids, (id) => luoghiPerId[id]?.nome || id, lingua),
    ];
    Share.share({ message: righe.join('\n') }).catch(() => {});
  };
  // link ricevuto (app aperta da un link, o link toccato mentre l'app è aperta)
  const ultimoLink = useRef(null);
  const apriLink = useCallback(
    (url) => {
      if (!url || url === ultimoLink.current) return;
      const dati = leggiLink(url);
      if (!dati) return;
      ultimoLink.current = url;
      if (dati.tipo === 'consigliato') {
        if (!ITINERARI.some((it) => it.id === dati.id)) return;
        setApriItinerarioId(dati.id);
        setSelettoreAperto(true);
      } else {
        setImporta({ ricevuto: dati, da: 'link' });
      }
    },
    []
  );
  useEffect(() => {
    Linking.getInitialURL().then(apriLink).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => apriLink(url));
    return () => sub?.remove?.();
  }, [apriLink]);

  const esciItinerario = () => {
    setIdItinerario(null);
    setIdEvidenziato(null);
    setGuida(false);
  };

  const iniziaGuida = async () => {
    setVisitate([]);
    setSaltate([]);
    setGuida(true);
    setIdEvidenziato(null);
    let c = coord;
    if (posizione.stato !== 'attivo') c = await posizione.attiva();
    if (c) {
      const p = proietta(c.latitudine, c.longitudine);
      if (p.x >= 0 && p.y >= 0 && p.x <= configMappa.larghezza && p.y <= configMappa.altezza) mappaRef.current?.centraSu(p);
    }
  };
  // "Visitata, avanti" nella guida: la tappa finisce anche tra i luoghi visitati ("Ci sono stato")
  const tappaVisitata = () => {
    if (!prossima) return;
    setVisitate((v) => [...v, prossima.id]);
    aggiungiVisitato(prossima.id);
  };
  const saltaTappa = () => prossima && setSaltate((v) => [...v, prossima.id]);

  const premiPunto = useCallback((id) => {
    if (id.startsWith('lampadina:')) {
      // la 💡 apre direttamente la scheda completa del luogo
      const curiosita = CURIOSITA.find((c) => c.id === id.slice('lampadina:'.length));
      if (curiosita?.luogo_id) setIdSelezionato(curiosita.luogo_id);
    }
    else if (servizioPerId(id)) setIdServizio(id);
    else setIdSelezionato(id);
  }, []);

  // La 💡 resta sulla mappa per 10 secondi, poi scompare
  useEffect(() => {
    if (!lampadina) return undefined;
    const fine = setTimeout(() => setLampadina(null), 10000);
    return () => clearTimeout(fine);
  }, [lampadina]);

  const curiositaAperta = CURIOSITA.find((c) => c.id === idCuriosita) || null;
  const ciboAperto = CIBI.find((c) => c.id === idCibo) || null;

  // "Portami lì": chiude la scheda, centra la mappa e accende la 💡 sulla posizione
  const portami = (c) => {
    const pos = posizioneCuriosita(c, luoghiTuttiPerId);
    if (!pos) return;
    const p = proietta(pos.lat, pos.lon);
    setIdCuriosita(null);
    setPannelloCuriosita(false);
    setLampadina({ id: c.id, titolo: testoLocalizzato(c.titolo, lingua), x: p.x, y: p.y });
    mappaRef.current?.centraSu({ x: p.x, y: p.y });
  };

  const puntiMappa = useMemo(
    () =>
      lampadina
        ? [
            ...punti,
            {
              id: `lampadina:${lampadina.id}`,
              etichetta: lampadina.titolo,
              colore: '#b45309',
              x: lampadina.x,
              y: lampadina.y,
              lampadina: true,
            },
          ]
        : punti,
    [punti, lampadina]
  );

  const pulsanteCuriosita = (
    <Pressable
      style={stilePulsanteMappa}
      onPress={() => setPannelloCuriosita(true)}
      accessibilityLabel={t('cur_titolo')}
    >
      <Text style={styles.iconaServizi}>💡</Text>
    </Pressable>
  );

  const apriTappa = (id) => {
    const punto = tuttiIPunti.find((p) => p.id === id);
    if (punto) mappaRef.current?.centraSu(punto);
    setTimeout(() => setIdSelezionato(id), 650);
  };

  const selezionato = tuttiILuoghi.find((l) => l.id === idSelezionato) || null;
  const attivo = posizione.stato === 'attivo' || posizione.stato === 'ricerca';

  const servizioScelto = idServizio ? servizioPerId(idServizio) : null;
  const pulsanteServizi = (
    <Pressable
      style={[stilePulsanteMappa, (pannelloServizi || serviziVisibili.length > 0) && styles.pulsanteServiziAttivo]}
      onPress={() => setPannelloServizi((a) => !a)}
      accessibilityLabel={t('servizi')}
      accessibilityState={{ expanded: pannelloServizi }}
    >
      <Text style={styles.iconaServizi}>🚻</Text>
    </Pressable>
  );

  const pulsantePosizione = (
    <Pressable
      style={[stilePulsanteMappa, attivo && styles.pulsantePosizioneAttivo]}
      onPress={premiPosizione}
      accessibilityLabel={t('posizione')}
      accessibilityState={{ selected: attivo }}
    >
      <Text style={[stileTestoPulsanteMappa, styles.iconaPosizione, attivo && { color: '#fff' }]}>◎</Text>
    </Pressable>
  );

  return (
    <View style={styles.app}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View
        style={[
          styles.intestazione,
          // in orizzontale su iPhone la barra di stato è nascosta e ai lati c'è la tacca
          {
            paddingTop: (insets.top || (orizzontale && Platform.OS === 'ios' ? 0 : ALTEZZA_BARRA_STATO)) + (orizzontale ? 4 : 10),
            paddingLeft: 16 + insets.left,
            paddingRight: 16 + insets.right,
          },
          orizzontale && styles.intestazioneBassa,
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.titolo, orizzontale && { fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {t('titolo')}
          </Text>
          {!orizzontale && <Text style={styles.sottotitolo}>{t('sottotitolo')}</Text>}
        </View>
        <RicercaLuoghi luoghi={luoghi} selezionate={selezionate} t={t} onScegli={scegliDaRicerca} />
        <Calendario dati={DATI_EVENTI} lingua={lingua} t={t} onVediMappa={scegliDaRicerca} />
        <SelettoreLingua lingua={lingua} onCambia={setLingua} etichetta={t('lingua')} />
        <Crediti luoghi={luoghi} t={t} />
      </View>

      {itinerario ? (
        <BarraItinerario
          itinerario={itinerario}
          luoghiPerId={luoghiPerId}
          lingua={lingua}
          t={t}
          partenza={partenza}
          lunghezza={lunghezza(itinerario)}
          onTappa={apriTappa}
          onCambia={() => setSelettoreAperto(true)}
          onEsci={esciItinerario}
          adesso={adesso}
          guida={guida}
          onGuida={iniziaGuida}
          visitate={guida ? visitate : []}
        />
      ) : (
        <FiltroCategorie
          selezionate={selezionate}
          conteggi={conteggi}
          onCambia={cambiaFiltro}
          t={t}
          onItinerari={() => setSelettoreAperto(true)}
          soloCuore={soloCuore}
          nCuore={preferiti.filter((id) => luoghiPerId[id]).length}
          onCuore={toccaCuore}
          soloVisitati={soloVisitati}
          nVisitati={luoghiVisitati.filter((id) => luoghiPerId[id]).length}
          onVisitati={toccaVisitati}
        />
      )}

      <View style={styles.areaMappa}>
        <MappaZoomabile
          ref={mappaRef}
          evidenziato={lampadina ? `lampadina:${lampadina.id}` : idEvidenziato || (prossima ? prossima.id : null)}
          sorgente={immagineMappa}
          larghezzaImmagine={configMappa.larghezza}
          altezzaImmagine={configMappa.altezza}
          punti={puntiMappa}
          percorso={percorsoMappa}
          onPressPunto={premiPunto}
          vistaIniziale={vistaIniziale}
          utente={puntoUtente}
          pulsantiExtra={
            <>
              <Preferiti
                preferiti={preferiti}
                luoghiPerId={luoghiPerId}
                distanze={distanze && !lontano ? distanze : null}
                adesso={adesso}
                t={t}
                onScegli={scegliDaRicerca}
                onTogli={cambiaPreferito}
                stilePulsante={stilePulsanteMappa}
                onVediMappa={mostraCuoreSullaMappa}
                visitati={luoghiVisitati}
                onTogliVisitato={cambiaVisitato}
                onVediVisitati={mostraVisitatiSullaMappa}
                onEsportaCuore={esportaCuore}
                onImportaCuore={() => setImporta({ ricevuto: null, da: 'cuore' })}
              />
              {pulsanteCuriosita}
              {pulsanteServizi}
              {pulsantePosizione}
            </>
          }
          tessere={nomeCitta() === 'Venezia' ? TESSERE : undefined}
          dimensioneTessera={DIMENSIONE_TESSERA}
        />
        {!itinerario && !soloCuore && !soloVisitati && selezionate.length === 0 && (
          <View style={styles.avvisoVuoto} pointerEvents="none">
            <Text style={styles.testoAvvisoVuoto}>{t('nessunaCategoria')}</Text>
          </View>
        )}
        {!itinerario && (avvisoCuore || (soloCuore && !preferiti.length)) && (
          <View style={styles.avvisoVuoto} pointerEvents="none">
            <Text style={styles.testoAvvisoVuoto}>{t('pref_filtroVuoto')}</Text>
          </View>
        )}
        {!itinerario && (avvisoVisitati || (soloVisitati && !luoghiVisitati.length)) && (
          <View style={styles.avvisoVuoto} pointerEvents="none">
            <Text style={styles.testoAvvisoVuoto}>{t('vis_filtroVuoto')}</Text>
          </View>
        )}
        <Text style={styles.attribuzione} pointerEvents="none">
          © OpenStreetMap contributors
        </Text>
        {guida && itinerario ? (
          <GuidaItinerario
            itinerario={itinerario}
            luoghiPerId={luoghiPerId}
            lingua={lingua}
            t={t}
            posizione={posizione}
            distanzaDaVenezia={distanzaDaVenezia}
            prossima={prossima}
            visitate={visitate.length + saltate.length}
            adesso={adesso}
            onScheda={apriTappa}
            onVisitata={tappaVisitata}
            onSalta={saltaTappa}
            onFine={() => setGuida(false)}
            larghezzaMax={orizzontale ? 400 : undefined}
          />
        ) : (
        <VicinoATe
          stato={posizione.stato}
          puoiChiedere={posizione.puoiChiedere}
          vicini={vicini}
          distanzaDaVenezia={distanzaDaVenezia}
          t={t}
          onScegli={setIdSelezionato}
          onChiudi={posizione.disattiva}
          onRiprova={premiPosizione}
          onImpostazioni={posizione.apriImpostazioni}
          larghezzaMax={orizzontale ? 380 : undefined}
        />
        )}
        {pannelloServizi && (
          <PannelloServizi
            visibili={serviziVisibili}
            conteggi={conteggiServizi}
            onCambia={setServiziVisibili}
            onChiudi={() => setPannelloServizi(false)}
            t={t}
          />
        )}
      </View>

      {haMarea() && <WidgetMeteoMarea t={t} margineBasso={insets.bottom} />}

      <SelettoreItinerari
        visibile={selettoreAperto}
        onChiudi={() => {
          setSelettoreAperto(false);
          setApriItinerarioId(null);
        }}
        apriId={apriItinerarioId}
        onCondividi={condividiItinerario}
        onEsporta={itinerariUtente.length ? esportaItinerari : undefined}
        onImporta={() => setImporta({ ricevuto: null, da: 'itinerari' })}
        itinerari={tuttiItinerari}
        luoghiPerId={luoghiPerId}
        lingua={lingua}
        t={t}
        partenza={partenza}
        onPartenza={scegliPartenza}
        posizione={posizione}
        distanzaDaVenezia={distanzaDaVenezia}
        lunghezza={lunghezza}
        attivoId={idItinerario}
        onScegli={scegliItinerario}
        adesso={adesso}
        visitati={luoghiVisitati}
        onCrea={() => setEditor({ titolo: '', tappe: [] })}
        onModifica={(id) => {
          const it = itinerariUtente.find((x) => x.id === id);
          if (it) setEditor({ id: it.id, titolo: it.titolo, tappe: it.tappe });
        }}
        onElimina={(id) => {
          if (id === idItinerario) esciItinerario();
          eliminaItinerario(id);
        }}
      />

      <EditorItinerario
        visibile={!!editor}
        iniziale={editor}
        luoghi={luoghi}
        luoghiPerId={luoghiPerId}
        preferiti={preferiti}
        t={t}
        onChiudi={() => setEditor(null)}
        onSalva={(dati) => {
          salvaItinerario(dati);
          setEditor(null);
        }}
      />

      <ImportaItinerari
        visibile={!!importa}
        ricevuto={importa?.ricevuto || null}
        luoghiPerId={luoghiPerId}
        t={t}
        onAggiungi={importaItinerari}
        onAggiungiCuore={aggiungiPreferiti}
        onApriConsigliato={(id) => {
          setImporta(null);
          setApriItinerarioId(id);
          setSelettoreAperto(true);
        }}
        onChiudi={() => {
          // dopo itinerari ricevuti si torna all'elenco, dove compaiono quelli aggiunti
          if (importa?.da === 'itinerari' || importa?.ricevuto?.tipo === 'itinerari') setSelettoreAperto(true);
          setImporta(null);
        }}
      />

      {servizioScelto && (
        <SchedaServizio
          servizio={servizioScelto}
          t={t}
          lingua={lingua}
          onChiudi={() => setIdServizio(null)}
          distanza={
            coord && !lontano
              ? distanzaMetri(coord.latitudine, coord.longitudine, servizioScelto.lat, servizioScelto.lon)
              : null
          }
        />
      )}

      {pannelloCuriosita && (
        <PannelloCuriosita
          t={t}
          lingua={lingua}
          // la scheda si apre sopra l'elenco: X e back tornano all'elenco
          onApriCuriosita={(id) => setIdCuriosita(id)}
          onApriCibo={(id) => setIdCibo(id)}
          onChiudi={() => setPannelloCuriosita(false)}
        />
      )}

      {curiositaAperta && (
        <SchedaCuriosita
          curiosita={curiositaAperta}
          t={t}
          lingua={lingua}
          onChiudi={() => setIdCuriosita(null)}
          onPortami={posizioneCuriosita(curiositaAperta, luoghiTuttiPerId) ? portami : null}
          onApriLuogo={(luogoId) => {
            setIdCuriosita(null);
            setPannelloCuriosita(false);
            setIdSelezionato(luogoId);
          }}
        />
      )}

      {ciboAperto && <SchedaCibo cibo={ciboAperto} t={t} lingua={lingua} onChiudi={() => setIdCibo(null)} />}

      {selezionato && (
        <PopupLuogo
          luogo={selezionato}
          lingua={lingua}
          t={t}
          onChiudi={chiudiScheda}
          distanza={distanze && !lontano ? distanze[selezionato.id] : null}
          preferito={preferiti.includes(selezionato.id)}
          onPreferito={cambiaPreferito}
          visitato={luoghiVisitati.includes(selezionato.id)}
          onVisitato={cambiaVisitato}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#aad3df' },
  intestazione: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0f3d5e',
  },
  intestazioneBassa: { paddingBottom: 6 },
  titolo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sottotitolo: { color: '#f3d98b', fontSize: 13, marginTop: 2 },
  areaMappa: { flex: 1 },
  pulsantePosizioneAttivo: { backgroundColor: '#1d4ed8' },
  iconaPosizione: { fontSize: 22, color: '#1d4ed8' },
  pulsanteServiziAttivo: { backgroundColor: '#ccfbf1', borderWidth: 2, borderColor: '#0d9488' },
  iconaServizi: { fontSize: 19 },
  avvisoVuoto: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15,61,94,0.92)',
    borderRadius: 12,
    padding: 12,
  },
  testoAvvisoVuoto: { color: '#fff', textAlign: 'center', fontSize: 14 },
  attribuzione: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    fontSize: 10,
    color: '#334155',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
