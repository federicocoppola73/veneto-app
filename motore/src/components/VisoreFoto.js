import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, PanResponder, Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ZOOM_MAX = 4;
const ZOOM_DOPPIO_TOCCO = 2.5;
const distanza = (a, b) => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
const limita = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Foto a schermo intero: si scorre con il dito tra le foto, si ingrandisce con due dita
 * o con un doppio tocco, si chiude con ✕ o trascinando verso il basso.
 * props: foto [{ source, autore, licenza }], indice iniziale, visibile, onChiudi, t
 */
export default function VisoreFoto({ foto, indice: indiceIniziale = 0, visibile, onChiudi, t }) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [indice, setIndice] = useState(indiceIniziale);
  const scala = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const stato = useRef({ s: 1, x: 0, y: 0, ultimoTocco: 0, gesto: null }).current;
  const rif = useRef({ indice: indiceIniziale, n: foto.length, W, H }).current;
  rif.n = foto.length;
  rif.W = W;
  rif.H = H;
  rif.onChiudi = onChiudi;

  const imposta = (s, x, y, anima, fine) => {
    stato.s = s;
    stato.x = x;
    stato.y = y;
    if (!anima) {
      scala.setValue(s);
      tx.setValue(x);
      ty.setValue(y);
      fine && fine();
      return;
    }
    Animated.parallel([
      Animated.timing(scala, { toValue: s, duration: 180, useNativeDriver: true }),
      Animated.timing(tx, { toValue: x, duration: 180, useNativeDriver: true }),
      Animated.timing(ty, { toValue: y, duration: 180, useNativeDriver: true }),
    ]).start(() => fine && fine());
  };

  const vaiA = (i) => {
    rif.indice = i;
    setIndice(i);
    imposta(1, 0, 0, false);
  };

  useEffect(() => {
    if (visibile) vaiA(limita(indiceIniziale, 0, Math.max(0, foto.length - 1)));
  }, [visibile, indiceIniziale]);

  // spostamento massimo consentito con lo zoom, perché la foto non esca dallo schermo
  const bordi = (s) => ({ mx: ((s - 1) * rif.W) / 2, my: ((s - 1) * rif.H) / 2 });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          stato.gesto = null;
          stato.mosso = false;
        },
        onPanResponderMove: (e, g) => {
          const tocchi = e.nativeEvent.touches;
          if (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6) stato.mosso = true;
          if (tocchi.length >= 2) {
            if (stato.gesto?.tipo !== 'pinch') stato.gesto = { tipo: 'pinch', d0: distanza(tocchi[0], tocchi[1]) || 1, s0: stato.s, x0: stato.x, y0: stato.y };
            const s = limita((stato.gesto.s0 * distanza(tocchi[0], tocchi[1])) / stato.gesto.d0, 1, ZOOM_MAX);
            const { mx, my } = bordi(s);
            imposta(s, limita(stato.gesto.x0, -mx, mx), limita(stato.gesto.y0, -my, my));
            stato.mosso = true;
            return;
          }
          if (stato.gesto?.tipo !== 'pan') stato.gesto = { tipo: 'pan', x0: stato.x, y0: stato.y, dx0: g.dx, dy0: g.dy };
          const dx = g.dx - stato.gesto.dx0;
          const dy = g.dy - stato.gesto.dy0;
          if (stato.s > 1.01) {
            const { mx, my } = bordi(stato.s);
            imposta(stato.s, limita(stato.gesto.x0 + dx, -mx, mx), limita(stato.gesto.y0 + dy, -my, my));
          } else {
            // senza zoom: il dito trascina la foto (orizzontale = foto successiva, in basso = chiudi)
            imposta(1, dx, Math.max(0, dy) * 0.6);
          }
        },
        onPanResponderRelease: (e, g) => {
          const adesso = Date.now();
          if (!stato.mosso) {
            // doppio tocco: ingrandisce o torna alla foto intera
            if (adesso - stato.ultimoTocco < 300) {
              stato.ultimoTocco = 0;
              if (stato.s > 1.01) imposta(1, 0, 0, true);
              else imposta(ZOOM_DOPPIO_TOCCO, 0, 0, true);
            } else stato.ultimoTocco = adesso;
            return;
          }
          if (stato.s > 1.01) return;
          const dx = stato.x;
          if (stato.y > 110 && Math.abs(stato.y) > Math.abs(dx)) {
            imposta(1, 0, 0, false);
            rif.onChiudi();
            return;
          }
          const soglia = rif.W * 0.18;
          if (dx < -soglia && rif.indice < rif.n - 1) {
            imposta(1, -rif.W, 0, true, () => vaiA(rif.indice + 1));
          } else if (dx > soglia && rif.indice > 0) {
            imposta(1, rif.W, 0, true, () => vaiA(rif.indice - 1));
          } else imposta(1, 0, 0, true);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    []
  );

  const corrente = foto[indice];
  if (!corrente) return null;
  return (
    <Modal visible={visibile} transparent={false} animationType="fade" onRequestClose={onChiudi} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.sfondo} {...responder.panHandlers}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: tx }, { translateY: ty }, { scale: scala }] }]}>
          <Image source={corrente.source} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
      </View>
      <View style={[styles.barraAlta, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <Text style={styles.contatore}>
          {indice + 1} / {foto.length}
        </Text>
        <Pressable onPress={onChiudi} hitSlop={12} style={styles.chiudi} accessibilityLabel={t('chiudi')}>
          <Text style={styles.testoChiudi}>✕</Text>
        </Pressable>
      </View>
      {corrente.autore ? (
        <View style={[styles.barraBassa, { paddingBottom: insets.bottom + 12 }]} pointerEvents="none">
          <Text style={styles.crediti} numberOfLines={2}>
            {t('foto')}: {corrente.autore}
            {corrente.licenza ? ` · ${corrente.licenza}` : ''} · Wikimedia Commons
          </Text>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  barraAlta: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  contatore: { color: '#fff', fontSize: 15, fontWeight: '700' },
  chiudi: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoChiudi: { color: '#fff', fontSize: 17, fontWeight: '700' },
  barraBassa: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.45)', paddingTop: 10 },
  crediti: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
});
