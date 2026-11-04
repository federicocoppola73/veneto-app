import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

// Foto a tutto schermo con zoom a due dita e spostamento con un dito (si vedono i dettagli degli affreschi).
// Il tocco sulla foto non chiude: si chiude solo con la X o con il tasto indietro.
// props: visibile, sorgente (immagine), onChiudi
const ZOOM_MAX = 6;
const distanza = (a, b) => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
const limita = (v, min, max) => Math.min(max, Math.max(min, v));

export default function VisualizzatoreFoto({ visibile, sorgente, onChiudi }) {
  const { width, height } = useWindowDimensions();
  const scala = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const stato = useRef({ s: 1, x: 0, y: 0 }); // copia numerica della vista
  const gesto = useRef(null);

  const applica = (s, x, y) => {
    s = limita(s, 1, ZOOM_MAX);
    // non si esce dall'immagine: lo spostamento massimo cresce con lo zoom
    x = limita(x, -((s - 1) * width) / 2, ((s - 1) * width) / 2);
    y = limita(y, -((s - 1) * height) / 2, ((s - 1) * height) / 2);
    stato.current = { s, x, y };
    scala.setValue(s);
    tx.setValue(x);
    ty.setValue(y);
  };

  const iniziaGesto = (tocchi) => {
    const { s, x, y } = stato.current;
    gesto.current =
      tocchi.length >= 2
        ? { tipo: 'pinch', s0: s, d0: distanza(tocchi[0], tocchi[1]) || 1, x0: x, y0: y }
        : { tipo: 'pan', x0: x, y0: y, sx: tocchi[0].pageX, sy: tocchi[0].pageY };
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        // si prende il tocco solo per zoom (due dita) o per spostare una foto ingrandita:
        // così un piccolo movimento del dito durante un tocco sulla X non viene rubato
        onMoveShouldSetPanResponder: (e) => e.nativeEvent.touches.length > 1 || stato.current.s > 1,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => iniziaGesto(e.nativeEvent.touches),
        onPanResponderMove: (e) => {
          const tocchi = e.nativeEvent.touches;
          const g = gesto.current;
          // cambio di numero di dita: riparte il gesto
          if (!g || (tocchi.length >= 2 && g.tipo !== 'pinch') || (tocchi.length === 1 && g.tipo !== 'pan')) {
            iniziaGesto(tocchi);
            return;
          }
          if (g.tipo === 'pinch') {
            const s = limita((g.s0 * distanza(tocchi[0], tocchi[1])) / g.d0, 1, ZOOM_MAX);
            const k = s / g.s0;
            applica(s, g.x0 * k, g.y0 * k);
          } else if (stato.current.s > 1) {
            applica(stato.current.s, g.x0 + tocchi[0].pageX - g.sx, g.y0 + tocchi[0].pageY - g.sy);
          }
        },
        onPanResponderRelease: () => {
          gesto.current = null;
          if (stato.current.s < 1.05) applica(1, 0, 0); // quasi nessuno zoom: torna com'era
        },
        onPanResponderTerminate: () => {
          gesto.current = null;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height]
  );

  // chiudendo la foto lo zoom si azzera, così alla prossima apertura è intera
  useEffect(() => {
    if (!visibile) applica(1, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibile]);

  return (
    <Modal visible={visibile} transparent animationType="fade" onRequestClose={onChiudi} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.sfondo}>
        <View style={styles.area} {...responder.panHandlers}>
          <Animated.Image
            source={sorgente}
            resizeMode="contain"
            style={{ width, height, transform: [{ translateX: tx }, { translateY: ty }, { scale: scala }] }}
          />
        </View>
        {/* la X sta fuori dall'area dei gesti: deve sempre ricevere il tocco */}
        <Pressable onPress={onChiudi} style={styles.chiudi} accessibilityRole="button" accessibilityLabel="Chiudi" hitSlop={12}>
          <Text style={styles.testoChiudi}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', overflow: 'hidden' },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chiudi: {
    position: 'absolute',
    top: 40,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoChiudi: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
