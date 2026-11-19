// Audioguide nell'interfaccia:
// - RigaAudioguida: nella scheda del luogo, una riga sola. Audio sul telefono → lettore (play/pausa, barra, stop);
//   altrimenti → pulsante per scaricarla e link "Altre audioguide" che apre l'elenco.
// - ElencoAudioguide: elenco con caselle, filtro per tipologia, "Seleziona tutte" e totale dei MB,
//   in due modi: "Scarica" (quelle da scaricare) e "Cancella" (quelle sul telefono, tutte o una selezione).
// - GestioneAudioguide: riquadro in Info con quante sono scaricate, "Scarica le altre", elenco e "Cancella tutte".
// - IconaCuffie: cuffie piene (scaricata) o a contorno (da scaricare), usata anche nella ricerca.
// - AudioItinerario: nella guida passo passo di un itinerario con un'audioguida "di percorso" (Canal Grande):
//   il tratto della tappa in arrivo, con il modo "Automatica" che lo fa partire da solo con il GPS.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { createAudioPlayer, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { CATEGORIE, coloreCategoria } from '../categorie';
import { nomeCitta } from '../citta';
import { datiProxy } from '../dati';
import { testoLocalizzato } from '../i18n';
import { periodiStoria } from '../storia';
import {
  audioDelLuogo,
  luoghiDelPercorso,
  tracceDelPercorso,
  cancellaAudioguide,
  scaricaAudioguide,
  testoDurata,
  testoMB,
  tracceDi,
  useAudioguide,
} from '../audioguide';

export const VIOLA = '#7c3aed';
const VIOLA_SCURO = '#5b21b6';
const VIOLA_CHIARO = '#f5f3ff';
const BORDO_VIOLA = '#ddd6fe';
const ROSSO = '#dc2626';
const datiLuoghi = datiProxy('luoghi.json');
const CAT_STORIA = '_storia';

// Voci dell'elenco delle audioguide: prima quelle della Storia (una per periodo, senza monumento), poi i luoghi in ordine alfabetico
function vociAudioguide(indice, lingua, t) {
  const storia = periodiStoria()
    .filter((p) => p.audio && indice?.luoghi?.[p.audio])
    .map((p) => ({ id: p.audio, nome: `${t('tab_storia')} · ${testoLocalizzato(p.titolo, lingua)}`, categoria: CAT_STORIA }));
  const luoghi = (datiLuoghi.luoghi || [])
    .filter((l) => indice?.luoghi?.[l.id])
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  return [...storia, ...luoghi];
}

// Lettore "persistente" (solo schede della Storia): se si apre un personaggio o un luogo da una scheda, l'audioguida
// continua e, tornando alla scheda, il lettore mostra il punto a cui è arrivata. Un solo lettore alla volta.
let persistente = null; // { uri, player, daZero }
// Punto a cui era arrivato l'ascolto di ogni traccia della Storia: chiudendo la scheda l'audio si ferma,
// riaprendola riparte da lì (finché l'app resta aperta). Finita o fermata con "stop" la traccia torna all'inizio.
const posizioni = new Map(); // uri → secondi
function azzeraPosizione(uri) {
  posizioni.set(uri, 0);
  if (persistente?.uri === uri) persistente.daZero = true;
}
function playerPersistente(uri) {
  if (persistente?.uri === uri) return persistente.player;
  fermaAudioPersistente();
  const player = createAudioPlayer({ uri });
  persistente = { uri, player };
  return player;
}
export function fermaAudioPersistente() {
  if (!persistente) return;
  const { player, uri, daZero } = persistente;
  persistente = null;
  try {
    if (!daZero) posizioni.set(uri, player.currentTime || 0);
    player.pause();
    player.remove();
  } catch {
    // già rilasciato
  }
}

// l'audio si sente anche con il telefono in modalità silenziosa (iPhone)
let modoImpostato = false;
function impostaModoAudio() {
  if (modoImpostato) return;
  modoImpostato = true;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
}

export function IconaCuffie({ misura = 16, colore = VIOLA, piena = false }) {
  return (
    <Svg width={misura} height={misura} viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <Rect x={3} y={14} width={4.5} height={6.5} rx={1.5} fill={piena ? colore : 'none'} />
      <Rect x={16.5} y={14} width={4.5} height={6.5} rx={1.5} fill={piena ? colore : 'none'} />
    </Svg>
  );
}

// Pallino con le cuffie per le righe della ricerca: pieno = scaricata, a contorno = da scaricare
export function BadgeCuffie({ scaricata, misura = 16 }) {
  return (
    <View
      style={[
        styles.badge,
        { width: misura, height: misura, borderRadius: misura / 2 },
        scaricata ? { backgroundColor: VIOLA } : { borderWidth: 1.5, borderColor: VIOLA },
      ]}
    >
      <IconaCuffie misura={misura - (scaricata ? 6 : 7)} colore={scaricata ? '#fff' : VIOLA} piena={scaricata} />
    </View>
  );
}

const IconaScarica = ({ colore = '#fff' }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Svg>
);

// ---- Scheda del luogo ----
export function RigaAudioguida({ luogo, lingua, t, persisti }) {
  const { indice, presenti, progresso } = useAudioguide();
  const [elenco, setElenco] = useState(false);
  const info = indice?.luoghi?.[luogo?.id];
  if (!info) return null;
  const tracce = presenti.has(luogo.id) ? audioDelLuogo(luogo.id) : null;
  return (
    <>
      {tracce?.length ? (
        <>
          <LettoreTracce key={luogo.id} tracce={tracce} t={t} persisti={persisti} />
          {/* anche dopo averla scaricata si può aprire l'elenco delle altre */}
          <Pressable onPress={() => setElenco(true)} hitSlop={8} accessibilityRole="link" style={styles.linkSotto}>
            <Text style={styles.link}>{t('aud_altre').replace('{citta}', nomeCitta())} ›</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.riga} testID="audioguida-da-scaricare">
          <IconaCuffie misura={20} colore="#6d28d9" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.titoloRiga}>
              {t('aud_titolo')} · {testoDurata(info.secondi)}
            </Text>
            <Pressable onPress={() => setElenco(true)} hitSlop={6} accessibilityRole="link">
              <Text style={styles.link}>{t('aud_altre').replace('{citta}', nomeCitta())} ›</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => scaricaAudioguide([luogo.id])}
            disabled={!!progresso}
            style={({ pressed }) => [styles.scarica, (pressed || progresso) && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`${t('aud_scarica')} (${testoMB(info.byte, lingua)})`}
            testID="audioguida-scarica"
          >
            {progresso ? <ActivityIndicator color="#fff" size="small" /> : <IconaScarica />}
            <Text style={styles.testoScarica}>{testoMB(info.byte, lingua)}</Text>
          </Pressable>
        </View>
      )}
      {elenco && <ElencoAudioguide lingua={lingua} t={t} onChiudi={() => setElenco(false)} />}
    </>
  );
}

// Più tracce (es. Esterno / Interno): linguette sopra il lettore.
// Niente partenze automatiche: scegliere una linguetta prepara la traccia, l'ascolto lo avvia sempre l'utente con play.
// Unica eccezione, le audioguide di percorso (tracce con "tappe", es. i tratti del Canal Grande): finito un tratto
// che l'utente stava ascoltando, parte il successivo, come un racconto unico.
function LettoreTracce({ tracce, t, persisti }) {
  const [indice, setIndice] = useState(0);
  const [avvia, setAvvia] = useState(false);
  const i = Math.min(indice, tracce.length - 1);
  const traccia = tracce[i];
  const scegli = (n) => {
    setAvvia(false);
    setIndice(n);
  };
  const fine = traccia.tappe && i + 1 < tracce.length
    ? () => {
        setAvvia(true);
        setIndice(i + 1);
      }
    : undefined;
  return (
    <>
      {tracce.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.linguette} contentContainerStyle={{ gap: 5 }}>
          {tracce.map((tr, i) => {
            const attiva = i === indice;
            return (
              <Pressable
                key={tr.id || i}
                onPress={() => scegli(i)}
                hitSlop={{ top: 6, bottom: 6 }}
                style={[styles.linguetta, attiva && styles.linguettaAttiva]}
                accessibilityRole="tab"
                accessibilityState={{ selected: attiva }}
              >
                <Text style={[styles.testoLinguetta, attiva && { color: '#fff' }]} numberOfLines={1}>
                  {tr.titolo || `${i + 1}`} · {testoDurata(tr.secondi)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <Lettore
        key={traccia.uri}
        uri={traccia.uri}
        secondi={traccia.secondi}
        titolo={tracce.length > 1 && traccia.titolo ? traccia.titolo : t('aud_titolo')}
        compatto={tracce.length > 1}
        avvia={avvia}
        onFine={fine}
        persisti={persisti}
        t={t}
      />
    </>
  );
}

// avvia: parte appena montato (tratto successivo di un percorso); onFine: chiamata a fine traccia;
// onSuona(true/false): avvisa quando l'audio parte o si ferma
function Lettore({ uri, secondi, titolo, compatto, avvia, onFine, onSuona, t, stile, persisti }) {
  // "persisti" non cambia per tutta la vita del componente, quindi l'ordine degli hook resta lo stesso
  /* eslint-disable react-hooks/rules-of-hooks */
  const player = persisti ? useMemo(() => playerPersistente(uri), [uri]) : useAudioPlayer({ uri });
  /* eslint-enable react-hooks/rules-of-hooks */
  const s = useAudioPlayerStatus(player);
  const durata = s.duration || secondi || 0;
  // trascinando il dito sulla barra si vede dove si arriverà; al rilascio l'audio salta lì
  const [trascina, setTrascina] = useState(null);
  const larghezza = useRef(0);
  const quotaDa = (x) => (larghezza.current ? Math.max(0, Math.min(1, x / larghezza.current)) : 0);
  const salta = (q) => {
    if (durata) player.seekTo(q * durata).catch(() => {});
  };
  const posizione = trascina != null ? trascina * durata : Math.min(s.currentTime || 0, durata);
  const quota = durata ? posizione / durata : 0;
  // finito: si torna all'inizio, pronto per ascoltarlo di nuovo
  const fineRef = useRef(onFine);
  fineRef.current = onFine;
  useEffect(() => {
    if (s.didJustFinish) {
      if (persisti) azzeraPosizione(uri);
      player.pause();
      player.seekTo(0).catch(() => {});
      fineRef.current?.();
    }
  }, [s.didJustFinish, player]);
  // lettore della Storia riaperto: si riprende dal punto in cui si era arrivati (senza far partire l'audio)
  const ripreso = useRef(false);
  useEffect(() => {
    if (!persisti || ripreso.current || !s.isLoaded) return;
    ripreso.current = true;
    const da = posizioni.get(uri) || 0;
    if (da > 2 && !s.playing && (s.currentTime || 0) < 1) player.seekTo(da).catch(() => {});
  }, [persisti, s.isLoaded]);
  useEffect(() => {
    if (avvia) {
      impostaModoAudio();
      player.play();
    }
    // solo al primo montaggio: il lettore si rimonta a ogni traccia (key = uri)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const suonaRef = useRef(onSuona);
  suonaRef.current = onSuona;
  useEffect(() => {
    suonaRef.current?.(!!s.playing);
  }, [s.playing]);

  const suona = () => {
    impostaModoAudio();
    // un lettore normale che parte ferma quello della Storia rimasto acceso
    if (!persisti && !s.playing) fermaAudioPersistente();
    if (s.playing) player.pause();
    else player.play();
  };
  const ferma = () => {
    if (persisti) azzeraPosizione(uri);
    player.pause();
    player.seekTo(0).catch(() => {});
  };

  return (
    <View style={[styles.riga, { paddingLeft: 8 }, compatto && { marginTop: 6 }, stile]} testID="audioguida-lettore">
      <Pressable
        onPress={suona}
        style={({ pressed }) => [styles.play, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={s.playing ? t('aud_pausa') : t('aud_ascolta')}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          {s.playing ? (
            <>
              <Rect x={6} y={5} width={4} height={14} rx={1} fill="#fff" />
              <Rect x={14} y={5} width={4} height={14} rx={1} fill="#fff" />
            </>
          ) : (
            <Path d="M8 5v14l11-7z" fill="#fff" />
          )}
        </Svg>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.testaLettore}>
          <IconaCuffie misura={14} colore="#6d28d9" />
          <Text style={[styles.titoloRiga, { flexShrink: 1 }]} numberOfLines={1}>{titolo}</Text>
          <Text style={styles.tempo}>
            {testoDurata(posizione)} / {testoDurata(durata)}
          </Text>
        </View>
        {/* barra: si tocca o si trascina per andare avanti o indietro */}
        <View
          style={styles.zonaBarra}
          onLayout={(e) => (larghezza.current = e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => setTrascina(quotaDa(e.nativeEvent.locationX))}
          onResponderMove={(e) => setTrascina(quotaDa(e.nativeEvent.locationX))}
          onResponderRelease={(e) => {
            salta(quotaDa(e.nativeEvent.locationX));
            setTrascina(null);
          }}
          onResponderTerminate={() => setTrascina(null)}
          accessibilityRole="adjustable"
          accessibilityValue={{ min: 0, max: Math.round(durata), now: Math.round(posizione), text: `${testoDurata(posizione)} / ${testoDurata(durata)}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const passo = e.nativeEvent.actionName === 'increment' ? 15 : -15;
            if (durata) player.seekTo(Math.max(0, Math.min(durata, posizione + passo))).catch(() => {});
          }}
          testID="audioguida-barra"
        >
          <View style={[styles.barra, { marginTop: 0 }]} pointerEvents="none">
            <View style={[styles.barraPiena, { width: `${Math.round(quota * 100)}%` }]} />
          </View>
          <View pointerEvents="none" style={[styles.cursore, { left: `${quota * 100}%` }, trascina != null && styles.cursoreAttivo]} />
        </View>
      </View>
      <Pressable onPress={ferma} hitSlop={6} style={styles.stop} accessibilityRole="button" accessibilityLabel={t('aud_stop')}>
        <Svg width={12} height={12} viewBox="0 0 24 24">
          <Rect x={4} y={4} width={16} height={16} rx={2} fill={VIOLA_SCURO} />
        </Svg>
      </Pressable>
    </View>
  );
}

// ---- Audioguida di percorso nella guida passo passo dell'itinerario ----
// props: itinerario, luoghiPerId, prossima { id, metri } | null (itinerario finito), lingua, t
export function AudioItinerario({ itinerario, luoghiPerId, prossima, lingua, t }) {
  const { indice, presenti, progresso } = useAudioguide();
  const ids = luoghiDelPercorso(indice, itinerario);
  if (!ids.length) return null;
  const daScaricare = ids.filter((id) => !presenti.has(id));
  if (daScaricare.length) {
    const infoTutte = ids.map((id) => indice.luoghi[id]);
    const nTracce = infoTutte.reduce((n, v) => n + tracceDi(v).length, 0);
    const secondi = infoTutte.reduce((n, v) => n + (v.secondi || 0), 0);
    const byte = daScaricare.reduce((n, id) => n + (indice.luoghi[id].byte || 0), 0);
    return (
      <View style={[styles.riga, styles.rigaPercorso]} testID="audio-percorso-da-scaricare">
        <IconaCuffie misura={18} colore="#6d28d9" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.titoloRiga} numberOfLines={1}>{t('aud_percorso')}</Text>
          <Text style={styles.grigio} numberOfLines={1}>
            {t('aud_tratti').replace('{n}', String(nTracce))} · {testoDurata(secondi)}
          </Text>
        </View>
        <Pressable
          onPress={() => scaricaAudioguide(daScaricare)}
          disabled={!!progresso}
          style={({ pressed }) => [styles.scarica, { minHeight: 36 }, (pressed || progresso) && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={`${t('aud_scarica')} (${testoMB(byte, lingua)})`}
        >
          {progresso ? <ActivityIndicator color="#fff" size="small" /> : <IconaScarica />}
          <Text style={styles.testoScarica}>{testoMB(byte, lingua)}</Text>
        </Pressable>
      </View>
    );
  }
  // l'introduzione non è una tappa: ha il titolo generico
  const nomi = Object.fromEntries(ids.map((id) => [id, luoghiPerId?.[id]?.nome || t('aud_introduzione')]));
  const tracce = tracceDelPercorso(ids, itinerario, nomi);
  if (!tracce.length) return null;
  return <PercorsoAudio key={ids.join('|')} tracce={tracce} prossima={prossima} raggio={itinerario.raggioAudioM || VICINO_M} t={t} />;
}

const VICINO_M = 250; // il tratto parte quando la sua prima tappa è a meno di 250 m (o è già stata superata); itinerario.raggioAudioM lo cambia

function PercorsoAudio({ tracce, prossima, raggio, t }) {
  // tratto della tappa in arrivo (a itinerario finito: l'ultimo)
  const trattoDi = (idTappa) => tracce.findIndex((tr) => tr.tappe?.includes(idTappa));
  const k = prossima ? trattoDi(prossima.id) : tracce.length - 1;
  const vicino = !!prossima && k >= 0 && (prossima.id !== tracce[k].tappe[0] || (prossima.metri != null && prossima.metri < raggio));

  // percorso con introduzione (tracce prima della prima tappa): finché si è lontani dalla prima tappa si propone l'introduzione
  const primo = tracce.findIndex((tr) => tr.tappe?.length);
  const bersaglio = prossima && primo > 0 && k === primo && !vicino ? 0 : k >= 0 ? k : 0;

  const [corrente, setCorrente] = useState(bersaglio);
  const [avvia, setAvvia] = useState(false);
  const [auto, setAuto] = useState(false);
  const [suona, setSuona] = useState(false);
  const suonati = useRef(new Set());

  const parti = (n) => {
    suonati.current.add(n);
    setAvvia(true);
    setCorrente(n);
  };

  // il riquadro segue il tratto in arrivo; in automatico, arrivati vicino, il tratto parte da solo.
  // Se un altro tratto sta suonando non lo interrompe: il nuovo parte quando quello finisce (vedi fine).
  useEffect(() => {
    if (k < 0 || suona) return;
    if (auto && vicino && !suonati.current.has(k)) parti(k);
    else if (bersaglio !== corrente && !avvia) setCorrente(bersaglio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, vicino, auto]);

  const fine = () => {
    if (auto && k >= 0 && vicino && !suonati.current.has(k)) parti(k);
    else setAvvia(false);
  };

  // in automatico lo schermo resta acceso finché la guida è aperta
  useEffect(() => {
    if (!auto) return undefined;
    Promise.resolve(activateKeepAwakeAsync('audio-itinerario')).catch(() => {});
    return () => {
      Promise.resolve(deactivateKeepAwake('audio-itinerario')).catch(() => {});
    };
  }, [auto]);

  const cambiaAuto = () => {
    if (auto) {
      setAuto(false);
      return;
    }
    Alert.alert(t('aud_autoTitolo'), t('aud_autoTesto'), [
      { text: t('ls_annulla'), style: 'cancel' },
      {
        text: t('aud_attiva'),
        onPress: () => {
          // i tratti già alle spalle non ripartono; quello in arrivo sì
          tracce.forEach((tr, i) => {
            if (i < k) suonati.current.add(i);
          });
          setAuto(true);
        },
      },
    ]);
  };

  const vai = (passo) => {
    const n = Math.max(0, Math.min(tracce.length - 1, corrente + passo));
    if (n === corrente) return;
    setAvvia(false);
    setCorrente(n);
  };

  const traccia = tracce[corrente];
  const inAttesa = auto && suona && vicino && k >= 0 && k !== corrente && !suonati.current.has(k) ? tracce[k] : null;

  return (
    <View style={styles.percorso} testID="audio-percorso">
      <View style={styles.testaPercorso}>
        <IconaCuffie misura={14} colore="#6d28d9" piena />
        <Text style={styles.contoPercorso}>
          {corrente + 1}/{tracce.length}
        </Text>
        <Pressable onPress={() => vai(-1)} hitSlop={8} disabled={corrente === 0} accessibilityRole="button" accessibilityLabel={t('aud_precedente')}>
          <Text style={[styles.frecciaPercorso, corrente === 0 && { opacity: 0.3 }]}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => vai(1)}
          hitSlop={8}
          disabled={corrente === tracce.length - 1}
          accessibilityRole="button"
          accessibilityLabel={t('aud_successivo')}
        >
          <Text style={[styles.frecciaPercorso, corrente === tracce.length - 1 && { opacity: 0.3 }]}>›</Text>
        </Pressable>
        <Pressable
          onPress={cambiaAuto}
          style={[styles.auto, auto && styles.autoAttivo]}
          accessibilityRole="switch"
          accessibilityState={{ checked: auto }}
          hitSlop={6}
        >
          <View style={[styles.levetta, auto && styles.levettaAttiva]} />
          <Text style={[styles.testoAuto, auto && { color: '#fff' }]}>{t('aud_auto')}</Text>
        </Pressable>
      </View>
      <Lettore
        key={traccia.uri}
        uri={traccia.uri}
        secondi={traccia.secondi}
        titolo={traccia.titolo || t('aud_titolo')}
        compatto
        avvia={avvia}
        onFine={fine}
        onSuona={setSuona}
        stile={{ marginTop: 4, paddingVertical: 6 }}
        t={t}
      />
      {inAttesa ? (
        <Text style={styles.attesa} numberOfLines={1}>
          {t('aud_prossimoTratto').replace('{titolo}', inAttesa.titolo || '')}
        </Text>
      ) : null}
    </View>
  );
}

// ---- Elenco con caselle ----
// Due modi, scelti con i pulsanti in alto: "Scarica" (audioguide da scaricare) e "Cancella" (quelle sul telefono).
export function ElencoAudioguide({ lingua, t, onChiudi }) {
  const insets = useSafeAreaInsets();
  const { indice, presenti, progresso } = useAudioguide();
  const [modo, setModo] = useState('scarica');
  const [scelti, setScelti] = useState([]);
  const [categoria, setCategoria] = useState(null);
  const [errori, setErrori] = useState(0);
  // solo i luoghi di questa versione della città (nella prova gratuita sono i 10 di anteprima)
  const luoghi = useMemo(() => vociAudioguide(indice, lingua, t), [indice, lingua]);
  const sulTelefono = luoghi.filter((l) => presenti.has(l.id));
  const cancella = modo === 'cancella';
  // nel modo "Cancella" si vedono solo quelle sul telefono
  const base = cancella ? sulTelefono : luoghi;
  const categorie = [
    ...(base.some((l) => l.categoria === CAT_STORIA) ? [{ id: CAT_STORIA }] : []),
    ...CATEGORIE.filter((c) => base.some((l) => l.categoria === c.id)),
  ];
  const visibili = categoria ? base.filter((l) => l.categoria === categoria) : base;
  const daScaricare = luoghi.filter((l) => !presenti.has(l.id));
  // quelle che si possono spuntare nel modo attuale
  const selezionabili = cancella ? visibili : visibili.filter((l) => !presenti.has(l.id));
  const byteDi = (ids) => ids.reduce((n, id) => n + (indice?.luoghi?.[id]?.byte || 0), 0);
  const byteScelti = byteDi(scelti);
  const tuttiScelti = selezionabili.length > 0 && selezionabili.every((l) => scelti.includes(l.id));

  // se non resta niente sul telefono si torna al modo "Scarica"
  useEffect(() => {
    if (cancella && !sulTelefono.length) setModo('scarica');
  }, [cancella, sulTelefono.length]);

  const cambiaModo = (m) => {
    setModo(m);
    setScelti([]);
    setCategoria(null);
    setErrori(0);
  };
  const cambia = (id) => setScelti((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const selezionaTutte = () =>
    setScelti((v) =>
      tuttiScelti
        ? v.filter((id) => !selezionabili.some((l) => l.id === id))
        : [...new Set([...v, ...selezionabili.map((l) => l.id)])]
    );
  const scarica = async () => {
    const ids = scelti;
    setScelti([]);
    setErrori(await scaricaAudioguide(ids));
  };
  const chiediCancella = () => {
    const ids = scelti;
    const uno = ids.length === 1;
    const mb = testoMB(byteDi(ids), lingua);
    Alert.alert(
      (uno ? t('aud_cancellaUnoTitolo') : t('aud_cancellaNTitolo')).replace('{n}', String(ids.length)),
      (uno ? t('aud_cancellaUnoTesto') : t('aud_cancellaNTesto')).replace('{mb}', mb),
      [
        { text: t('ls_annulla'), style: 'cancel' },
        {
          text: t('aud_modoCancella'),
          style: 'destructive',
          onPress: async () => {
            setScelti([]);
            await cancellaAudioguide(ids);
          },
        },
      ]
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi}>
      <View style={styles.sfondo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
        <View style={[styles.foglio, { paddingBottom: 16 + insets.bottom }]} accessibilityViewIsModal>
          <View style={styles.maniglia} />
          <View style={styles.testa}>
            <View style={{ flex: 1 }}>
              <Text style={styles.titolo}>{t('aud_elencoTitolo').replace('{citta}', nomeCitta())}</Text>
              <Text style={styles.sottotitolo}>
                {t('aud_suTelefono').replace('{n}', String(sulTelefono.length)).replace('{tot}', String(luoghi.length))}
              </Text>
            </View>
            <Pressable onPress={onChiudi} hitSlop={10} style={styles.chiudi} accessibilityLabel={t('chiudi')}>
              <Text style={styles.testoChiudi}>✕</Text>
            </Pressable>
          </View>

          {/* Scarica / Cancella: il secondo si attiva solo se c'è almeno un'audioguida sul telefono */}
          <View style={styles.modi} accessibilityRole="tablist">
            {['scarica', 'cancella'].map((m) => {
              const attivo = modo === m;
              const spento = m === 'cancella' && !sulTelefono.length;
              return (
                <Pressable
                  key={m}
                  onPress={() => !spento && !progresso && cambiaModo(m)}
                  disabled={spento || !!progresso}
                  style={[styles.modo, attivo && (m === 'cancella' ? styles.modoAttivoRosso : styles.modoAttivo), spento && { opacity: 0.45 }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: attivo, disabled: spento }}
                  testID={`audioguide-modo-${m}`}
                >
                  <Text style={[styles.testoModo, attivo && { color: '#fff' }]}>
                    {m === 'scarica' ? t('aud_modoScarica') : t('aud_modoCancella')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtri} contentContainerStyle={{ gap: 8 }}>
            {[null, ...categorie.map((c) => c.id)].map((id) => {
              const attivo = categoria === id;
              return (
                <Pressable
                  key={id || '_tutti'}
                  onPress={() => setCategoria(id)}
                  style={[styles.filtro, attivo && styles.filtroAttivo]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: attivo }}
                >
                  <Text style={[styles.testoFiltro, attivo && { color: '#fff', fontWeight: '700' }]}>{id === CAT_STORIA ? t('tab_storia') : id ? t(`cat_${id}`) : t('tutti')}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.rigaInfo}>
            <Text style={styles.grigio}>
              {cancella
                ? t('aud_sulTelefonoN').replace('{n}', String(visibili.length)).replace('{mb}', testoMB(byteDi(visibili.map((l) => l.id)), lingua))
                : t('aud_daScaricare').replace('{n}', String(selezionabili.length))}
            </Text>
            {selezionabili.length > 0 && (
              <Pressable onPress={selezionaTutte} hitSlop={8}>
                <Text style={[styles.selezionaTutte, cancella && { color: ROSSO }]}>{tuttiScelti ? t('aud_deselezionaTutte') : t('aud_selezionaTutte')}</Text>
              </Pressable>
            )}
          </View>

          <ScrollView style={{ flexShrink: 1 }}>
            {visibili.map((l) => {
              const gia = !cancella && presenti.has(l.id);
              const scelto = scelti.includes(l.id);
              const info = indice.luoghi[l.id];
              return (
                <Pressable
                  key={l.id}
                  onPress={() => !gia && cambia(l.id)}
                  disabled={gia}
                  style={styles.voce}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: gia || scelto, disabled: gia }}
                >
                  {gia ? (
                    <View style={[styles.casella, styles.casellaGia]}>
                      <IconaCuffie misura={13} colore={VIOLA} piena />
                    </View>
                  ) : (
                    <View style={[styles.casella, scelto && (cancella ? styles.casellaRossa : styles.casellaScelta)]}>
                      {scelto && (
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M5 12.5l4.5 4.5L19 7.5" />
                        </Svg>
                      )}
                    </View>
                  )}
                  <View style={[styles.pallino, { backgroundColor: l.categoria === CAT_STORIA ? VIOLA : coloreCategoria(l.categoria) }]} />
                  {/* con più tracce si vede quante sono, es. "Basilica di San Marco (3)" */}
                  <View style={styles.rigaNome}>
                    <Text style={[styles.nomeLuogo, { flex: 0, flexShrink: 1 }]} numberOfLines={1}>{l.nome}</Text>
                    {tracceDi(info).length > 1 && <Text style={styles.numeroTracce}>({tracceDi(info).length})</Text>}
                  </View>
                  <Text style={gia ? styles.gia : styles.grigio}>{gia ? t('aud_gia') : testoMB(info.byte, lingua)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!cancella && errori > 0 && <Text style={styles.errore}>{t('aud_errori').replace('{n}', String(errori))}</Text>}
          {cancella ? (
            <Pressable
              onPress={chiediCancella}
              disabled={!scelti.length}
              style={[styles.pulsanteGrande, styles.pulsanteCancella, !scelti.length && styles.pulsanteSpento]}
              accessibilityRole="button"
              testID="audioguide-cancella-scelte"
            >
              <Text style={[styles.testoPulsanteGrande, !scelti.length && { color: '#64748b' }]}>
                {scelti.length
                  ? (scelti.length === 1 ? t('aud_cancellaUno') : t('aud_cancellaN'))
                      .replace('{n}', String(scelti.length))
                      .replace('{mb}', testoMB(byteScelti, lingua))
                  : t('aud_scegliCancella')}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={scarica}
              disabled={!scelti.length || !!progresso}
              style={[styles.pulsanteGrande, !scelti.length && !progresso && styles.pulsanteSpento]}
              accessibilityRole="button"
              testID="audioguide-scarica-scelte"
            >
              {progresso ? (
                <Text style={styles.testoPulsanteGrande}>
                  {t('aud_scaricando').replace('{n}', String(progresso.fatti)).replace('{tot}', String(progresso.totale))}
                </Text>
              ) : (
                <Text style={[styles.testoPulsanteGrande, !scelti.length && { color: '#64748b' }]}>
                  {scelti.length
                    ? t('aud_scaricaN').replace('{n}', String(scelti.length)).replace('{mb}', testoMB(byteScelti, lingua))
                    : daScaricare.length
                      ? t('aud_sceglile')
                      : t('aud_suTelefono').replace('{n}', String(sulTelefono.length)).replace('{tot}', String(luoghi.length))}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---- Info ----
export function GestioneAudioguide({ lingua, t }) {
  const { indice, presenti, progresso } = useAudioguide();
  const [elenco, setElenco] = useState(false);
  if (!indice?.luoghi) return null;
  const luoghi = vociAudioguide(indice, lingua, t);
  if (!luoghi.length) return null;
  const scaricate = luoghi.filter((l) => presenti.has(l.id));
  const mancanti = luoghi.filter((l) => !presenti.has(l.id));
  const byteSulTelefono = scaricate.reduce((n, l) => n + (indice.luoghi[l.id].byte || 0), 0);
  const byteMancanti = mancanti.reduce((n, l) => n + (indice.luoghi[l.id].byte || 0), 0);
  const quota = scaricate.length / luoghi.length;

  const cancella = () =>
    Alert.alert(t('aud_cancellaTitolo'), t('aud_cancellaTesto').replace('{mb}', testoMB(byteSulTelefono, lingua)), [
      { text: t('ls_annulla'), style: 'cancel' },
      { text: t('aud_cancellaTutte'), style: 'destructive', onPress: () => cancellaAudioguide() },
    ]);

  return (
    <View style={styles.gestione} testID="gestione-audioguide">
      <View style={styles.testaGestione}>
        <View style={styles.iconaGestione}>
          <IconaCuffie misura={20} colore="#fff" piena />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titoloGestione}>{t('aud_elencoTitolo').replace('{citta}', nomeCitta())}</Text>
          <Text style={styles.grigio}>{t('aud_lingua')}</Text>
        </View>
      </View>
      <View style={[styles.barra, { height: 8, borderRadius: 4, marginTop: 14 }]}>
        <View style={[styles.barraPiena, { width: `${Math.round(quota * 100)}%`, borderRadius: 4 }]} />
      </View>
      <View style={styles.rigaInfo}>
        <Text style={styles.contoGestione}>
          {t('aud_scaricate').replace('{n}', String(scaricate.length)).replace('{tot}', String(luoghi.length))}
        </Text>
        <Text style={styles.grigio}>{t('aud_sulTelefono').replace('{mb}', testoMB(byteSulTelefono, lingua))}</Text>
      </View>
      {progresso ? (
        <View style={[styles.pulsanteGrande, { marginTop: 12 }]}>
          <Text style={styles.testoPulsanteGrande}>
            {t('aud_scaricando').replace('{n}', String(progresso.fatti)).replace('{tot}', String(progresso.totale))}
          </Text>
        </View>
      ) : mancanti.length ? (
        <Pressable
          onPress={() => scaricaAudioguide(mancanti.map((l) => l.id))}
          style={[styles.pulsanteGrande, { marginTop: 12 }]}
          accessibilityRole="button"
        >
          <Text style={styles.testoPulsanteGrande}>
            {t('aud_scaricaAltre').replace('{n}', String(mancanti.length)).replace('{mb}', testoMB(byteMancanti, lingua))}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.rigaPulsanti}>
        <Pressable onPress={() => setElenco(true)} style={styles.pulsanteChiaro} accessibilityRole="button">
          <Text style={styles.testoPulsanteChiaro}>{t('aud_scegli')}</Text>
        </Pressable>
        {scaricate.length > 0 && (
          <Pressable onPress={cancella} style={[styles.pulsanteChiaro, styles.pulsanteRosso]} accessibilityRole="button">
            <Text style={[styles.testoPulsanteChiaro, { color: '#b91c1c' }]}>{t('aud_cancellaTutte')}</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.notaGestione}>{t('aud_notaLingua')}</Text>
      {elenco && <ElencoAudioguide lingua={lingua} t={t} onChiudi={() => setElenco(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  riga: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: VIOLA_CHIARO,
    borderWidth: 1,
    borderColor: BORDO_VIOLA,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
  },
  titoloRiga: { fontSize: 13.5, fontWeight: '700', color: VIOLA_SCURO },
  link: { fontSize: 12, fontWeight: '600', color: '#6d28d9', marginTop: 1 },
  linkSotto: { alignSelf: 'flex-start', marginTop: 6, marginLeft: 4, paddingVertical: 2 },
  scarica: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: VIOLA,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testoScarica: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  linguette: { flexGrow: 0, marginTop: 12 },
  linguetta: { minHeight: 30, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1.5, borderColor: BORDO_VIOLA, backgroundColor: '#fff', justifyContent: 'center' },
  linguettaAttiva: { backgroundColor: VIOLA, borderColor: VIOLA },
  testoLinguetta: { fontSize: 12, fontWeight: '700', color: VIOLA_SCURO },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: VIOLA, alignItems: 'center', justifyContent: 'center' },
  testaLettore: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tempo: { marginLeft: 'auto', fontSize: 12, color: '#6b7280' },
  barra: { marginTop: 7, height: 4, borderRadius: 2, backgroundColor: BORDO_VIOLA, overflow: 'hidden' },
  // zona toccabile più alta della barra, perché sia facile da prendere con il dito
  zonaBarra: { height: 22, justifyContent: 'center', marginTop: -2, marginBottom: -6 },
  cursore: { position: 'absolute', top: 5, width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: VIOLA, borderWidth: 2, borderColor: '#fff' },
  cursoreAttivo: { width: 16, height: 16, marginLeft: -8, borderRadius: 8, top: 3 },
  barraPiena: { height: '100%', backgroundColor: VIOLA, borderRadius: 2 },
  stop: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#c4b5fd', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  sfondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  foglio: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10, maxHeight: '90%' },
  maniglia: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 12 },
  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flexShrink: 0 },
  titolo: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  sottotitolo: { fontSize: 13, color: '#64748b', marginTop: 3 },
  chiudi: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  testoChiudi: { fontSize: 15, fontWeight: '700', color: '#475569' },
  // flexShrink 0: con tante audioguide l'elenco sotto schiacciava i filtri (testo tagliato a metà)
  filtri: { flexGrow: 0, flexShrink: 0, marginTop: 12 },
  filtro: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: '#e2e8f0' },
  filtroAttivo: { backgroundColor: VIOLA, borderColor: VIOLA },
  testoFiltro: { fontSize: 13, color: '#334155' },
  rigaInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 4, gap: 8, flexShrink: 0 },
  grigio: { fontSize: 12.5, color: '#64748b' },
  selezionaTutte: { fontSize: 13, fontWeight: '700', color: VIOLA },
  voce: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  casella: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  casellaScelta: { backgroundColor: VIOLA, borderColor: VIOLA },
  casellaGia: { backgroundColor: '#ede9fe', borderColor: '#ede9fe' },
  pallino: { width: 8, height: 8, borderRadius: 4 },
  nomeLuogo: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  rigaNome: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  numeroTracce: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  gia: { fontSize: 12, fontWeight: '700', color: VIOLA },
  errore: { fontSize: 12.5, color: '#b45309', marginTop: 8 },
  pulsanteGrande: { marginTop: 12, minHeight: 50, flexShrink: 0, borderRadius: 14, backgroundColor: VIOLA, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  pulsanteSpento: { backgroundColor: '#e2e8f0' },
  pulsanteCancella: { backgroundColor: ROSSO },
  casellaRossa: { backgroundColor: ROSSO, borderColor: ROSSO },
  modi: { flexDirection: 'row', marginTop: 12, padding: 3, borderRadius: 12, backgroundColor: '#f1f5f9', gap: 3, flexShrink: 0 },
  modo: { flex: 1, minHeight: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  modoAttivo: { backgroundColor: VIOLA },
  modoAttivoRosso: { backgroundColor: ROSSO },
  testoModo: { fontSize: 13.5, fontWeight: '700', color: '#334155' },
  testoPulsanteGrande: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },

  gestione: { marginTop: 14, borderRadius: 16, backgroundColor: VIOLA_CHIARO, borderWidth: 1, borderColor: BORDO_VIOLA, padding: 16 },
  testaGestione: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconaGestione: { width: 40, height: 40, borderRadius: 20, backgroundColor: VIOLA, alignItems: 'center', justifyContent: 'center' },
  titoloGestione: { fontSize: 17, fontWeight: '800', color: '#4c1d95' },
  contoGestione: { fontSize: 13, fontWeight: '700', color: '#4c1d95' },
  rigaPulsanti: { flexDirection: 'row', gap: 8, marginTop: 8 },
  pulsanteChiaro: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#c4b5fd', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  pulsanteRosso: { borderColor: '#fca5a5' },
  testoPulsanteChiaro: { fontSize: 13.5, fontWeight: '700', color: VIOLA_SCURO, textAlign: 'center' },
  notaGestione: { fontSize: 12, color: '#6b7280', marginTop: 10, lineHeight: 17 },

  rigaPercorso: { marginTop: 8, paddingVertical: 6 },
  percorso: { marginTop: 8 },
  testaPercorso: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contoPercorso: { fontSize: 12, fontWeight: '800', color: VIOLA_SCURO },
  frecciaPercorso: { fontSize: 22, lineHeight: 24, fontWeight: '700', color: VIOLA_SCURO, paddingHorizontal: 4 },
  auto: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: BORDO_VIOLA,
    backgroundColor: '#fff',
  },
  autoAttivo: { backgroundColor: VIOLA, borderColor: VIOLA },
  levetta: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: VIOLA },
  levettaAttiva: { backgroundColor: '#fff', borderColor: '#fff' },
  testoAuto: { fontSize: 12.5, fontWeight: '800', color: VIOLA_SCURO },
  attesa: { marginTop: 4, marginLeft: 4, fontSize: 12, color: '#6b7280' },
});
