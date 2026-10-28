import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';

const ZOOM_MIN = 1;
const ZOOM_MAX = 16;
const DIMENSIONE_MARKER = 22;
const DIMENSIONE_NUMERO = 28; // pallini numerati delle tappe di un itinerario
const DIMENSIONE_SERVIZIO = 20; // fontanelle, bagni, farmacie, vaporetto
const SPESSORE_PERCORSO = 5; // linea dell'itinerario, in punti sullo schermo
const DIMENSIONE_UTENTE = 34; // alone azzurro attorno alla posizione dell'utente
const SOGLIA_NOMI_PRINCIPALI = 2.4; // ingrandimento da cui si vedono i nomi dei luoghi principali (la mappa si apre a 3)
const SOGLIA_NOMI = 4; // ingrandimento da cui possono comparire anche i nomi degli altri luoghi
// Nomi che si sovrappongono: si disegnano prima i principali, poi gli altri, saltando quelli che
// finirebbero sopra un nome già scritto. Il calcolo si rifà solo a gradini di zoom (ogni +10%).
const PASSO_ZOOM_NOMI = 1.1;
const LARGHEZZA_NOME = 120; // larghezza massima della scritta (come styles.etichetta)
const LARGHEZZA_CARATTERE = 6.3; // stima per il carattere 11 grassetto
const ALTEZZA_RIGA = 14;
const SPAZIO_TRA_NOMI = 2;
const ZOOM_RICERCA = 4.5; // ingrandimento usato quando si sceglie un luogo dalla ricerca
const RAGGIO_TOCCO = 26; // distanza massima (px) tra dito e pallino per aprire il luogo
const MOVIMENTO_TAP = 10; // sotto questo spostamento (px) un tocco è un "tap", non un trascinamento
const PAUSA_DOPO_GESTO = 450; // ms dopo uno zoom o un trascinamento in cui un tocco non apre schede
const ATTESA_DOPPIO = 280; // ms per capire se arriva un secondo tocco (doppio tocco = ingrandisci)
const RAGGIO_DOPPIO = 40; // px: il secondo tocco deve cadere vicino al primo

// Rettangolo occupato sullo schermo dal nome di un punto, con la mappa ingrandita di "s"
const riquadroNome = (p, s, rapporto) => {
  const D = p.numero != null ? DIMENSIONE_NUMERO : DIMENSIONE_MARKER;
  const lungo = (p.etichetta || '').length * LARGHEZZA_CARATTERE;
  const w = Math.min(LARGHEZZA_NOME, lungo + 4);
  const h = (lungo > LARGHEZZA_NOME ? 2 : 1) * ALTEZZA_RIGA + 2;
  const x = p.x * rapporto * s;
  const y = p.y * rapporto * s + D / 2 + 2;
  return { x1: x - w / 2, x2: x + w / 2, y1: y, y2: y + h };
};
const siToccano = (a, b) =>
  a.x1 < b.x2 + SPAZIO_TRA_NOMI && b.x1 < a.x2 + SPAZIO_TRA_NOMI && a.y1 < b.y2 + SPAZIO_TRA_NOMI && b.y1 < a.y2 + SPAZIO_TRA_NOMI;

/**
 * Quali nomi scrivere con la mappa ingrandita di "s": il luogo scelto sempre, poi i principali,
 * poi (da SOGLIA_NOMI) gli altri, saltando quelli che coprirebbero un nome già scritto.
 */
function nomiDaMostrare(punti, s, rapporto, evidenziato) {
  const visibili = new Set();
  if (evidenziato) visibili.add(evidenziato);
  if (!rapporto || s < SOGLIA_NOMI_PRINCIPALI) return visibili;
  // prima il luogo scelto, poi i principali nell'ordine di principali.json, poi tutti gli altri
  const peso = (p) => (p.id === evidenziato ? 0 : p.principale ? p.principale : 1000);
  const candidati = punti
    .filter((p) => p.icona == null && p.etichetta && (p.id === evidenziato || p.principale || s >= SOGLIA_NOMI))
    .map((p, i) => ({ p, i }))
    .sort((a, b) => peso(a.p) - peso(b.p) || a.i - b.i);
  const occupati = [];
  for (const { p } of candidati) {
    const r = riquadroNome(p, s, rapporto);
    if (p.id !== evidenziato && occupati.some((o) => siToccano(o, r))) continue;
    occupati.push(r);
    visibili.add(p.id);
  }
  return visibili;
}

const distanza = (a, b) => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
const centro = (a, b) => ({ x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 });
const limita = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Mappa con zoom (due dita), spostamento (un dito) e pallini cliccabili.
 * props:
 *  - sorgente: require('...png') dell'immagine
 *  - larghezzaImmagine, altezzaImmagine: dimensioni in pixel dell'immagine originale
 *  - punti: [{ id, x, y, etichetta, colore, numero?, icona?, spento?, visitato?, principale? }] in pixel dell'immagine originale
 *    (visitato: luogo segnato con "Ci sono stato", piccola spunta verde sul pallino;
 *     principale: numero d'importanza, 1 = il più importante; il nome compare già a SOGLIA_NOMI_PRINCIPALI)
 *    (numero: testo nel pallino, per le tappe di un itinerario; icona: segnaposto piccolo di un servizio;
 *     spento: tappa già visitata, disegnata più chiara)
 *  - percorso: [{ punti: [{ x, y }, ...], colore }] linee da disegnare sotto i pallini, oppure null
 *  - onPressPunto(id)
 *  - evidenziato: id del luogo scelto dalla ricerca (pallino più grande con nome)
 *  - vistaIniziale: { x, y, zoom } punto (in pixel dell'immagine) su cui centrare la mappa all'avvio
 *  - utente: { x, y } posizione dell'utente in pixel dell'immagine (pallino blu), oppure null
 *  - pulsantiExtra: pulsanti aggiuntivi da mostrare sopra a + / − / ⟲
 *  - tessere: { livello: { 'x_y': require(...) } } immagini più dettagliate, caricate solo quando
 *    si ingrandisce e solo per la parte visibile (vedi src/tessere.js)
 *  - dimensioneTessera: lato di una tessera in pixel al proprio livello (il livello L è 2^L volte l'immagine base)
 * metodi esposti con ref:
 *  - centraSu(id | {x, y}) -> centra e ingrandisce la mappa sul luogo
 *  - inquadra([{x, y}, ...]) -> sposta e ingrandisce la mappa per far vedere tutti i punti
 */
function MappaZoomabile(
  {
    sorgente,
    larghezzaImmagine,
    altezzaImmagine,
    punti,
    percorso,
    onPressPunto,
    evidenziato,
    vistaIniziale,
    utente,
    pulsantiExtra,
    tessere,
    dimensioneTessera = 512,
  },
  ref
) {
  const [area, setArea] = useState(null); // dimensioni del contenitore
  const contenitoreRef = useRef(null);
  const origine = useRef({ x: 0, y: 0 }); // posizione del contenitore sullo schermo

  // Valori animati della trasformazione
  const scala = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const stato = useRef({ s: 1, x: 0, y: 0 }); // copia "numerica" dei valori correnti
  // ingrandimento "a gradini" usato per decidere quali nomi scrivere (vedi nomiDaMostrare)
  const [scalaNomi, setScalaNomi] = useState(1);
  useEffect(() => {
    const id = scala.addListener(({ value }) => {
      const gradino = Math.pow(PASSO_ZOOM_NOMI, Math.floor(Math.log(value) / Math.log(PASSO_ZOOM_NOMI) + 1e-6));
      setScalaNomi((prima) => (Math.abs(prima - gradino) < 1e-6 ? prima : gradino));
    });
    return () => scala.removeListener(id);
  }, [scala]);
  const gesto = useRef(null);

  // Copia "da disegnare" della vista, aggiornata solo a gesto finito: serve a scegliere le tessere
  const [vista, setVista] = useState(null);
  const timerVista = useRef(null);
  const aggiornaVista = (ritardo = 120) => {
    clearTimeout(timerVista.current);
    timerVista.current = setTimeout(() => setVista({ ...stato.current }), ritardo);
  };
  useEffect(() => () => clearTimeout(timerVista.current), []);

  // Dimensione della mappa adattata al contenitore (come "contain")
  const base = useMemo(() => {
    if (!area) return null;
    const rapporto = Math.min(area.w / larghezzaImmagine, area.h / altezzaImmagine);
    return { w: larghezzaImmagine * rapporto, h: altezzaImmagine * rapporto, rapporto };
  }, [area, larghezzaImmagine, altezzaImmagine]);

  const applica = (s, x, y, animato = false, durata = 220) => {
    if (!base) return;
    s = limita(s, ZOOM_MIN, ZOOM_MAX);
    // Limita lo spostamento: quando la mappa è ingrandita si può portare al centro
    // dello schermo anche un luogo vicino al bordo (oltre il bordo si vede solo "laguna")
    const margine = Math.min(1, s - 1) * 0.5;
    const maxX = Math.max(0, (base.w * s - area.w) / 2) + area.w * margine;
    const maxY = Math.max(0, (base.h * s - area.h) / 2) + area.h * margine;
    x = limita(x, -maxX, maxX);
    y = limita(y, -maxY, maxY);
    stato.current = { s, x, y };
    if (animato) {
      Animated.parallel([
        Animated.timing(scala, { toValue: s, duration: durata, useNativeDriver: true }),
        Animated.timing(tx, { toValue: x, duration: durata, useNativeDriver: true }),
        Animated.timing(ty, { toValue: y, duration: durata, useNativeDriver: true }),
      ]).start(() => aggiornaVista(0));
    } else {
      scala.setValue(s);
      tx.setValue(x);
      ty.setValue(y);
      aggiornaVista();
    }
  };

  // Porta un punto dell'immagine (in pixel originali) al centro dello schermo
  const centraPunto = (px, py, s, animato = true, durata = 450) => {
    if (!base) return;
    applica(s, -s * (px * base.rapporto - base.w / 2), -s * (py * base.rapporto - base.h / 2), animato, durata);
  };

  const vaiAVistaIniziale = (animato) => {
    if (vistaIniziale) centraPunto(vistaIniziale.x, vistaIniziale.y, vistaIniziale.zoom, animato, 300);
    else applica(1, 0, 0, animato);
  };

  // All'avvio la mappa si apre già ingrandita sul centro storico.
  // Quando lo spazio cambia (telefono ruotato) resta centrata sullo stesso punto.
  const inizializzata = useRef(false);
  const basePrecedente = useRef(null);
  useEffect(() => {
    if (!base) return;
    const prima = basePrecedente.current;
    basePrecedente.current = base;
    if (!inizializzata.current) {
      inizializzata.current = true;
      vaiAVistaIniziale(false);
    } else if (prima && (prima.w !== base.w || prima.h !== base.h)) {
      const { s, x, y } = stato.current;
      const px = (-x / s + prima.w / 2) / prima.rapporto;
      const py = (-y / s + prima.h / 2) / prima.rapporto;
      centraPunto(px, py, s, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const iniziaGesto = (tocchi) => {
    const { s, x, y } = stato.current;
    if (tocchi.length >= 2) {
      const c = centro(tocchi[0], tocchi[1]);
      gesto.current = {
        tipo: 'pinch',
        s0: s,
        d0: distanza(tocchi[0], tocchi[1]) || 1,
        // punto della mappa (rispetto al suo centro, non scalato) sotto le dita
        px: (c.x - origine.current.x - area.w / 2 - x) / s,
        py: (c.y - origine.current.y - area.h / 2 - y) / s,
      };
    } else {
      gesto.current = { tipo: 'pan', x0: x, y0: y, sx: tocchi[0].pageX, sy: tocchi[0].pageY };
    }
    gesto.current.n = tocchi.length;
  };

  // Trova il luogo più vicino al punto toccato (coordinate dello schermo).
  const luogoToccato = (pageX, pageY) => {
    if (!base || !area) return null;
    const { s, x, y } = stato.current;
    let migliore = null;
    let distMin = RAGGIO_TOCCO;
    for (const p of punti) {
      const sx = origine.current.x + area.w / 2 + x + s * (p.x * base.rapporto - base.w / 2);
      const sy = origine.current.y + area.h / 2 + y + s * (p.y * base.rapporto - base.h / 2);
      const d = Math.hypot(sx - pageX, sy - pageY);
      if (d < distMin) {
        distMin = d;
        migliore = p.id;
      }
    }
    return migliore;
  };

  const tocco = useRef(null); // dati del tocco in corso, per riconoscere i "tap"
  const fineGesto = useRef(0); // quando è finito l'ultimo zoom o trascinamento
  const tapInAttesa = useRef(null); // { x, y, timer }: primo tocco, in attesa di un eventuale secondo

  useEffect(() => () => clearTimeout(tapInAttesa.current?.timer), []);

  // doppio tocco: ingrandisce attorno al punto toccato (come nelle mappe del telefono)
  const zoomSulPunto = (pageX, pageY) => {
    if (!area) return;
    const { s, x, y } = stato.current;
    const nuova = limita(s * 2, ZOOM_MIN, ZOOM_MAX);
    const cx = pageX - origine.current.x - area.w / 2;
    const cy = pageY - origine.current.y - area.h / 2;
    applica(nuova, cx - (nuova / s) * (cx - x), cy - (nuova / s) * (cy - y), true);
  };

  // un tocco breve e fermo: se ne arriva subito un altro è un doppio tocco (zoom), altrimenti apre il luogo
  const gestisciTap = (pageX, pageY) => {
    const prima = tapInAttesa.current;
    if (prima && Math.hypot(prima.x - pageX, prima.y - pageY) < RAGGIO_DOPPIO) {
      clearTimeout(prima.timer);
      tapInAttesa.current = null;
      fineGesto.current = Date.now();
      zoomSulPunto(pageX, pageY);
      return;
    }
    if (prima) clearTimeout(prima.timer);
    const id = luogoToccato(pageX, pageY);
    tapInAttesa.current = {
      x: pageX,
      y: pageY,
      timer: setTimeout(() => {
        tapInAttesa.current = null;
        if (id) onPressPunto(id);
      }, ATTESA_DOPPIO),
    };
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const t = e.nativeEvent.touches[0] || e.nativeEvent;
          if (e.nativeEvent.target != null && e.nativeEvent.locationX != null) {
            origine.current = {
              x: e.nativeEvent.pageX - e.nativeEvent.locationX,
              y: e.nativeEvent.pageY - e.nativeEvent.locationY,
            };
          }
          tocco.current = {
            x0: t.pageX,
            y0: t.pageY,
            inizio: Date.now(),
            piuDita: e.nativeEvent.touches.length > 1,
            mosso: false,
            // subito dopo uno zoom le dita si staccano spesso in momenti diversi: quel tocco non è un tap
            bloccato: Date.now() - fineGesto.current < PAUSA_DOPO_GESTO,
          };
          iniziaGesto(e.nativeEvent.touches.length ? e.nativeEvent.touches : [e.nativeEvent]);
        },
        // un secondo dito appoggiato o un dito staccato mentre un altro resta: è uno zoom, non un tap
        onPanResponderStart: (e) => {
          if (tocco.current && e.nativeEvent.touches.length > 1) tocco.current.piuDita = true;
        },
        onPanResponderEnd: (e) => {
          if (tocco.current && e.nativeEvent.touches.length > 0) tocco.current.piuDita = true;
        },
        onPanResponderMove: (e, gs) => {
          const tocchi = e.nativeEvent.touches;
          if (tocco.current && gs.numberActiveTouches > 1) tocco.current.piuDita = true;
          const tc = tocco.current;
          if (tc) {
            if (tocchi.length > 1) tc.piuDita = true;
            else if (Math.hypot(tocchi[0].pageX - tc.x0, tocchi[0].pageY - tc.y0) > MOVIMENTO_TAP) tc.mosso = true;
          }
          if (!gesto.current || tocchi.length !== gesto.current.n) {
            iniziaGesto(tocchi); // cambiato il numero di dita: riparte il gesto
            return;
          }
          const g = gesto.current;
          if (g.tipo === 'pan' && tc && !tc.mosso && !tc.piuDita) return; // piccolo tremolio: non spostare
          if (g.tipo === 'pinch') {
            const s = limita((g.s0 * distanza(tocchi[0], tocchi[1])) / g.d0, ZOOM_MIN, ZOOM_MAX);
            const c = centro(tocchi[0], tocchi[1]);
            const x = c.x - origine.current.x - area.w / 2 - s * g.px;
            const y = c.y - origine.current.y - area.h / 2 - s * g.py;
            applica(s, x, y);
          } else {
            applica(stato.current.s, g.x0 + tocchi[0].pageX - g.sx, g.y0 + tocchi[0].pageY - g.sy);
          }
        },
        onPanResponderRelease: (e) => {
          const tc = tocco.current;
          gesto.current = null;
          tocco.current = null;
          if (tc && !tc.piuDita && !tc.mosso && !tc.bloccato && Date.now() - tc.inizio < 600) {
            gestisciTap(e.nativeEvent.pageX, e.nativeEvent.pageY);
            return;
          }
          if (tc && (tc.piuDita || tc.mosso)) fineGesto.current = Date.now();
          const { s, x, y } = stato.current;
          applica(s, x, y, true, 1);
        },
        onPanResponderTerminate: () => {
          gesto.current = null;
          tocco.current = null;
          fineGesto.current = Date.now();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [area, base, punti, onPressPunto]
  );

  const zoomPulsante = (fattore) => {
    const { s, x, y } = stato.current;
    const nuova = limita(s * fattore, ZOOM_MIN, ZOOM_MAX);
    const k = nuova / s; // zoom attorno al centro dello schermo
    applica(nuova, x * k, y * k, true);
  };

  useImperativeHandle(ref, () => ({
    // accetta l'id di un luogo oppure direttamente un punto { x, y }
    centraSu: (idOPunto) => {
      const p = typeof idOPunto === 'string' ? punti.find((q) => q.id === idOPunto) : idOPunto;
      if (!p) return;
      centraPunto(p.x, p.y, Math.max(stato.current.s, ZOOM_RICERCA));
    },
    inquadra: (lista) => {
      if (!base || !area || !lista?.length) return;
      const xs = lista.map((p) => p.x);
      const ys = lista.map((p) => p.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      // margine attorno ai punti, più largo in basso dove ci sono i riquadri
      const w = Math.max(1, (x1 - x0) * base.rapporto) * 1.08 + 48;
      const h = Math.max(1, (y1 - y0) * base.rapporto) * 1.08 + 96;
      const s = limita(Math.min(area.w / w, area.h / h), ZOOM_MIN, 7);
      centraPunto((x0 + x1) / 2, (y0 + y1) / 2 + 20 / (s * base.rapporto), s, true, 600);
    },
  }));

  // Segmenti della linea dell'itinerario: ogni tratto è una barretta ruotata.
  // Lo spessore viene "rimpicciolito" come i pallini, così resta uguale a ogni ingrandimento.
  const segmenti = useMemo(() => {
    if (!percorso || !base) return [];
    const out = [];
    percorso.forEach(({ punti: linea, colore }, i) => {
      for (let j = 1; j < linea.length; j++) {
        const a = linea[j - 1];
        const b = linea[j];
        const ax = a.x * base.rapporto;
        const ay = a.y * base.rapporto;
        const bx = b.x * base.rapporto;
        const by = b.y * base.rapporto;
        const lunghezza = Math.hypot(bx - ax, by - ay);
        if (lunghezza < 0.01) continue;
        out.push({
          chiave: `${i}_${j}`,
          cx: (ax + bx) / 2,
          cy: (ay + by) / 2,
          // un pochino più lunghi per non lasciare fessure agli angoli
          lunghezza: lunghezza + 0.6,
          angolo: `${Math.atan2(by - ay, bx - ax)}rad`,
          colore: colore || '#0f3d5e',
        });
      }
    });
    return out;
  }, [percorso, base]);

  const nomiVisibili = useMemo(
    () => nomiDaMostrare(punti || [], scalaNomi, base?.rapporto, evidenziato),
    [punti, scalaNomi, base, evidenziato]
  );
  const scalaInversa = Animated.divide(1, scala); // i pallini restano della stessa grandezza

  // Tessere dettagliate visibili: il livello dipende da quanto è ingrandita la mappa
  // (pixel reali dello schermo per ogni pixel dell'immagine base)
  const tessereVisibili = useMemo(() => {
    if (!tessere || !vista || !base || !area) return [];
    const densita = vista.s * base.rapporto * PixelRatio.get();
    const livello = densita <= 1.15 ? 0 : densita <= 2.6 || !tessere[2] ? 1 : 2;
    if (livello === 0 || !tessere[livello]) return [];
    const lato = dimensioneTessera / 2 ** livello; // lato della tessera in pixel dell'immagine base
    // rettangolo visibile, in pixel dell'immagine base
    const cx = (-vista.x / vista.s + base.w / 2) / base.rapporto;
    const cy = (-vista.y / vista.s + base.h / 2) / base.rapporto;
    const mezzoW = area.w / 2 / (vista.s * base.rapporto);
    const mezzoH = area.h / 2 / (vista.s * base.rapporto);
    const i0 = Math.max(0, Math.floor((cx - mezzoW) / lato));
    const i1 = Math.floor((cx + mezzoW) / lato);
    const j0 = Math.max(0, Math.floor((cy - mezzoH) / lato));
    const j1 = Math.floor((cy + mezzoH) / lato);
    const out = [];
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const sorgenteTessera = tessere[livello][`${i}_${j}`];
        if (sorgenteTessera) out.push({ chiave: `${livello}_${i}_${j}`, sorgente: sorgenteTessera, i, j, lato });
      }
    }
    return out;
  }, [tessere, vista, base, area, dimensioneTessera]);

  // il luogo evidenziato viene disegnato per ultimo, sopra gli altri
  const ordinati = useMemo(
    // prima i servizi (sotto), poi i luoghi, per ultimo il luogo evidenziato
    () => {
      const peso = (p) => (p.id === evidenziato ? 2 : p.icona != null ? 0 : 1);
      return [...punti].sort((a, b) => peso(a) - peso(b));
    },
    [punti, evidenziato]
  );

  // I pulsanti stanno FUORI dall'area che gestisce trascinamento e zoom: sul telefono il dito si muove
  // sempre un poco durante un tocco e la mappa "ruberebbe" il gesto, annullando la pressione del pulsante.
  return (
    <View style={styles.esterno}>
    <View
      ref={contenitoreRef}
      style={styles.contenitore}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setArea({ w: width, h: height });
        requestAnimationFrame(() =>
          contenitoreRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
            origine.current = { x: pageX, y: pageY };
          })
        );
      }}
      {...responder.panHandlers}
    >
      {base && (
        <Animated.View
          pointerEvents="none"
          style={{
            width: base.w,
            height: base.h,
            transform: [{ translateX: tx }, { translateY: ty }, { scale: scala }],
          }}
        >
          <Image
            source={sorgente}
            style={{ width: base.w, height: base.h }}
            resizeMode="contain"
            resizeMethod="scale"
          />
          {tessereVisibili.map((t) => (
            <Image
              key={t.chiave}
              source={t.sorgente}
              resizeMethod="scale"
              fadeDuration={0}
              style={{
                position: 'absolute',
                left: t.i * t.lato * base.rapporto,
                top: t.j * t.lato * base.rapporto,
                // un decimo di pixel in più evita sottili fessure tra le tessere
                width: t.lato * base.rapporto + 0.1,
                height: t.lato * base.rapporto + 0.1,
              }}
            />
          ))}
          {[
            { colore: 'rgba(255,255,255,0.95)', spessore: SPESSORE_PERCORSO + 3, bordo: true }, // bordo bianco
            { spessore: SPESSORE_PERCORSO },
          ].map((strato, k) =>
            segmenti.map((sg) => (
              <Animated.View
                key={`${k}_${sg.chiave}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: sg.cx - sg.lunghezza / 2,
                  top: sg.cy - strato.spessore / 2,
                  width: sg.lunghezza,
                  height: strato.spessore,
                  borderRadius: strato.spessore / 2,
                  backgroundColor: strato.bordo ? strato.colore : sg.colore,
                  transform: [{ rotate: sg.angolo }, { scaleY: scalaInversa }],
                }}
              />
            ))
          )}
          {utente && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.utente,
                {
                  left: utente.x * base.rapporto - DIMENSIONE_UTENTE / 2,
                  top: utente.y * base.rapporto - DIMENSIONE_UTENTE / 2,
                  transform: [{ scale: scalaInversa }],
                },
              ]}
            >
              <View style={styles.utenteInterno} />
            </Animated.View>
          )}
          {ordinati.map((p) => {
            const scelto = p.id === evidenziato;
            const numerato = p.numero != null;
            const servizio = p.icona != null;
            const D = numerato ? DIMENSIONE_NUMERO : servizio ? DIMENSIONE_SERVIZIO : DIMENSIONE_MARKER;
            if (p.lampadina) {
              // 💡 temporanea di una curiosità (vedi "Portami lì")
              return (
                <Animated.View
                  key={p.id}
                  pointerEvents="none"
                  style={[
                    styles.marker,
                    {
                      width: 36,
                      height: 36,
                      left: p.x * base.rapporto - 18,
                      top: p.y * base.rapporto - 18,
                      transform: [{ scale: scalaInversa }],
                    },
                  ]}
                >
                  <View style={styles.lampadina} accessibilityLabel={p.etichetta}>
                    <Text style={styles.iconaLampadina}>💡</Text>
                  </View>
                </Animated.View>
              );
            }
            if (servizio) {
              return (
                <Animated.View
                  key={p.id}
                  pointerEvents="none"
                  style={[
                    styles.marker,
                    {
                      width: D,
                      height: D,
                      left: p.x * base.rapporto - D / 2,
                      top: p.y * base.rapporto - D / 2,
                      transform: [{ scale: scalaInversa }],
                    },
                  ]}
                >
                  <View
                    style={[styles.servizio, { borderColor: p.colore }, scelto && styles.puntinoScelto]}
                    accessibilityLabel={p.etichetta}
                  >
                    <Text style={[styles.iconaServizio, { color: p.colore }]}>{p.icona}</Text>
                  </View>
                </Animated.View>
              );
            }
            return (
              <Animated.View
                key={p.id}
                pointerEvents="none"
                style={[
                  styles.marker,
                  {
                    width: D,
                    height: D,
                    left: p.x * base.rapporto - D / 2,
                    top: p.y * base.rapporto - D / 2,
                    transform: [{ scale: scalaInversa }],
                  },
                  nomiVisibili.has(p.id) && styles.markerConNome,
                ]}
              >
                <View
                  style={[
                    styles.puntino,
                    { backgroundColor: p.colore },
                    numerato && styles.puntinoNumero,
                    p.spento && styles.puntinoSpento,
                    scelto && styles.puntinoScelto,
                  ]}
                  accessibilityLabel={p.etichetta}
                >
                  {numerato ? (
                    <Text style={styles.numero}>{p.numero}</Text>
                  ) : (
                    <View style={styles.puntinoInterno} />
                  )}
                </View>
                {p.visitato && !numerato && (
                  <View style={styles.spuntaVisitato}>
                    <Text style={styles.testoSpuntaVisitato}>{'✓\uFE0E'}</Text>
                  </View>
                )}
                {nomiVisibili.has(p.id) && (
                  <View
                    style={[
                      styles.boxEtichetta,
                      { top: D + 2, left: -(120 - D) / 2 },
                      scelto && styles.boxEtichettaScelta,
                    ]}
                  >
                    <Text style={[styles.etichetta, scelto && styles.etichettaScelta]} numberOfLines={2}>
                      {p.etichetta}
                    </Text>
                  </View>
                )}
              </Animated.View>
            );
          })}
        </Animated.View>
      )}
    </View>

      <View style={styles.pulsantiZoom} pointerEvents="box-none">
        {pulsantiExtra}
        <Pressable style={styles.pulsante} onPress={() => zoomPulsante(1.6)} accessibilityLabel="Zoom +">
          <Text style={styles.testoPulsante}>+</Text>
        </Pressable>
        <Pressable style={styles.pulsante} onPress={() => zoomPulsante(1 / 1.6)} accessibilityLabel="Zoom -">
          <Text style={styles.testoPulsante}>−</Text>
        </Pressable>
        <Pressable style={styles.pulsante} onPress={() => vaiAVistaIniziale(true)} accessibilityLabel="Reset">
          <Text style={[styles.testoPulsante, { fontSize: 18 }]}>⟲</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  esterno: { flex: 1 },
  contenitore: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#aad3df',
  },
  marker: {
    position: 'absolute',
    width: DIMENSIONE_MARKER,
    height: DIMENSIONE_MARKER,
    alignItems: 'center',
    overflow: 'visible',
  },
  puntino: {
    width: DIMENSIONE_MARKER,
    height: DIMENSIONE_MARKER,
    borderRadius: DIMENSIONE_MARKER / 2,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  utente: {
    position: 'absolute',
    width: DIMENSIONE_UTENTE,
    height: DIMENSIONE_UTENTE,
    borderRadius: DIMENSIONE_UTENTE / 2,
    backgroundColor: 'rgba(37,99,235,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  utenteInterno: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  puntinoScelto: { borderColor: '#fbbf24', borderWidth: 4, transform: [{ scale: 1.45 }], elevation: 8 },
  puntinoInterno: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  puntinoNumero: { width: DIMENSIONE_NUMERO, height: DIMENSIONE_NUMERO, borderRadius: DIMENSIONE_NUMERO / 2 },
  puntinoSpento: { opacity: 0.55 },
  servizio: {
    width: DIMENSIONE_SERVIZIO,
    height: DIMENSIONE_SERVIZIO,
    borderRadius: DIMENSIONE_SERVIZIO / 2,
    borderWidth: 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  iconaServizio: { fontSize: 10, lineHeight: 13, fontWeight: '800', textAlign: 'center' },
  lampadina: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#b45309',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  iconaLampadina: { fontSize: 18, textAlign: 'center' },
  numero: { color: '#fff', fontSize: 12, fontWeight: '800', lineHeight: 15, textAlign: 'center' },
  boxEtichetta: {
    position: 'absolute',
    top: DIMENSIONE_MARKER + 2,
    left: -(120 - DIMENSIONE_MARKER) / 2,
    width: 120,
    alignItems: 'center',
  },
  boxEtichettaScelta: { marginTop: 6 },
  spuntaVisitato: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#16a34a',
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoSpuntaVisitato: { color: '#fff', fontSize: 8, lineHeight: 10, fontWeight: '900' },
  markerConNome: { zIndex: 2 }, // il nome resta sopra i pallini vicini senza nome
  etichetta: {
    width: 120,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2937',
    textShadowColor: '#fff',
    textShadowRadius: 3,
  },
  etichettaScelta: { fontSize: 12, color: '#0f3d5e' },
  pulsantiZoom: { position: 'absolute', right: 12, bottom: 24, gap: 8 },
  pulsante: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  testoPulsante: { fontSize: 24, color: '#0f3d5e', fontWeight: '600', lineHeight: 28 },
});

export const stilePulsanteMappa = styles.pulsante;
export const stileTestoPulsanteMappa = styles.testoPulsante;

export default forwardRef(MappaZoomabile);
