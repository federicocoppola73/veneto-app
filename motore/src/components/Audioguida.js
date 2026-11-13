// Audioguide nell'interfaccia:
// - RigaAudioguida: nella scheda del luogo, una riga sola. Audio sul telefono → lettore (play/pausa, barra, stop);
//   altrimenti → pulsante per scaricarla e link "Altre audioguide" che apre l'elenco.
// - ElencoAudioguide: elenco con caselle, filtro per tipologia, "Seleziona tutte" e totale dei MB,
//   in due modi: "Scarica" (quelle da scaricare) e "Cancella" (quelle sul telefono, tutte o una selezione).
// - GestioneAudioguide: riquadro in Info con quante sono scaricate, "Scarica le altre", elenco e "Cancella tutte".
// - IconaCuffie: cuffie piene (scaricata) o a contorno (da scaricare), usata anche nella ricerca.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { CATEGORIE, coloreCategoria } from '../categorie';
import { nomeCitta } from '../citta';
import { datiProxy } from '../dati';
import {
  audioDelLuogo,
  cancellaAudioguide,
  scaricaAudioguide,
  testoDurata,
  testoMB,
  useAudioguide,
} from '../audioguide';

export const VIOLA = '#7c3aed';
const VIOLA_SCURO = '#5b21b6';
const VIOLA_CHIARO = '#f5f3ff';
const BORDO_VIOLA = '#ddd6fe';
const ROSSO = '#dc2626';
const datiLuoghi = datiProxy('luoghi.json');

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
export function RigaAudioguida({ luogo, lingua, t }) {
  const { indice, presenti, progresso } = useAudioguide();
  const [elenco, setElenco] = useState(false);
  const info = indice?.luoghi?.[luogo?.id];
  if (!info) return null;
  const tracce = presenti.has(luogo.id) ? audioDelLuogo(luogo.id) : null;
  return (
    <>
      {tracce?.length ? (
        <>
          <LettoreTracce key={luogo.id} tracce={tracce} t={t} />
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

// Più tracce (es. Esterno / Interno): linguette sopra il lettore; a fine traccia parte la successiva
function LettoreTracce({ tracce, t }) {
  const [indice, setIndice] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const traccia = tracce[Math.min(indice, tracce.length - 1)];
  const scegli = (i) => {
    setAutoPlay(true);
    setIndice(i);
  };
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
        autoPlay={autoPlay}
        onFine={() => indice + 1 < tracce.length && scegli(indice + 1)}
        compatto={tracce.length > 1}
        t={t}
      />
    </>
  );
}

function Lettore({ uri, secondi, titolo, autoPlay, onFine, compatto, t }) {
  const player = useAudioPlayer({ uri });
  const s = useAudioPlayerStatus(player);
  const durata = s.duration || secondi || 0;
  const posizione = Math.min(s.currentTime || 0, durata);
  const quota = durata ? posizione / durata : 0;
  const partito = useRef(false);

  // scelta una linguetta, o finita la traccia precedente: parte da sola appena è pronta
  useEffect(() => {
    if (autoPlay && s.isLoaded && !partito.current) {
      partito.current = true;
      impostaModoAudio();
      player.play();
    }
  }, [autoPlay, s.isLoaded, player]);

  // finito: si torna all'inizio, pronto per ascoltarlo di nuovo (o parte la traccia dopo)
  useEffect(() => {
    if (s.didJustFinish) {
      player.pause();
      player.seekTo(0).catch(() => {});
      onFine?.();
    }
  }, [s.didJustFinish, player]); // eslint-disable-line react-hooks/exhaustive-deps

  const suona = () => {
    impostaModoAudio();
    if (s.playing) player.pause();
    else player.play();
  };
  const ferma = () => {
    player.pause();
    player.seekTo(0).catch(() => {});
  };

  return (
    <View style={[styles.riga, { paddingLeft: 8 }, compatto && { marginTop: 6 }]} testID="audioguida-lettore">
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
        <View style={styles.barra}>
          <View style={[styles.barraPiena, { width: `${Math.round(quota * 100)}%` }]} />
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
  const luoghi = useMemo(
    () =>
      (datiLuoghi.luoghi || [])
        .filter((l) => indice?.luoghi?.[l.id])
        .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    [indice]
  );
  const sulTelefono = luoghi.filter((l) => presenti.has(l.id));
  const cancella = modo === 'cancella';
  // nel modo "Cancella" si vedono solo quelle sul telefono
  const base = cancella ? sulTelefono : luoghi;
  const categorie = CATEGORIE.filter((c) => base.some((l) => l.categoria === c.id));
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
                  <Text style={[styles.testoFiltro, attivo && { color: '#fff', fontWeight: '700' }]}>{id ? t(`cat_${id}`) : t('tutti')}</Text>
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
                  <View style={[styles.pallino, { backgroundColor: coloreCategoria(l.categoria) }]} />
                  <Text style={styles.nomeLuogo} numberOfLines={1}>{l.nome}</Text>
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
  const luoghi = (datiLuoghi.luoghi || []).filter((l) => indice.luoghi[l.id]);
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
  barraPiena: { height: '100%', backgroundColor: VIOLA, borderRadius: 2 },
  stop: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#c4b5fd', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  sfondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  foglio: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10, maxHeight: '90%' },
  maniglia: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 12 },
  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titolo: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  sottotitolo: { fontSize: 13, color: '#64748b', marginTop: 3 },
  chiudi: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  testoChiudi: { fontSize: 15, fontWeight: '700', color: '#475569' },
  filtri: { flexGrow: 0, marginTop: 12 },
  filtro: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: '#e2e8f0' },
  filtroAttivo: { backgroundColor: VIOLA, borderColor: VIOLA },
  testoFiltro: { fontSize: 13, color: '#334155' },
  rigaInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 },
  grigio: { fontSize: 12.5, color: '#64748b' },
  selezionaTutte: { fontSize: 13, fontWeight: '700', color: VIOLA },
  voce: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  casella: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  casellaScelta: { backgroundColor: VIOLA, borderColor: VIOLA },
  casellaGia: { backgroundColor: '#ede9fe', borderColor: '#ede9fe' },
  pallino: { width: 8, height: 8, borderRadius: 4 },
  nomeLuogo: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  gia: { fontSize: 12, fontWeight: '700', color: VIOLA },
  errore: { fontSize: 12.5, color: '#b45309', marginTop: 8 },
  pulsanteGrande: { marginTop: 12, minHeight: 50, borderRadius: 14, backgroundColor: VIOLA, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  pulsanteSpento: { backgroundColor: '#e2e8f0' },
  pulsanteCancella: { backgroundColor: ROSSO },
  casellaRossa: { backgroundColor: ROSSO, borderColor: ROSSO },
  modi: { flexDirection: 'row', marginTop: 12, padding: 3, borderRadius: 12, backgroundColor: '#f1f5f9', gap: 3 },
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
});
