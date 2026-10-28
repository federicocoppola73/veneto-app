import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LINGUE } from '../i18n';

// Pulsante con bandiera in alto a destra che apre un menu a tendina delle lingue
export default function SelettoreLingua({ lingua, onCambia, etichetta }) {
  const [aperto, setAperto] = useState(false);
  const [posizione, setPosizione] = useState({ top: 0, left: 0 });
  const pulsanteRef = useRef(null);
  const corrente = LINGUE.find((l) => l.codice === lingua) || LINGUE[0];

  const apri = () => {
    pulsanteRef.current?.measureInWindow((x, y, w, h) => {
      setPosizione({ top: y + h + 6, left: x + w });
      setAperto(true);
    });
  };

  return (
    <>
      <Pressable
        ref={pulsanteRef}
        onPress={apri}
        style={({ pressed }) => [styles.pulsante, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={`${etichetta}: ${corrente.nome}`}
      >
        <Text style={styles.bandiera}>{corrente.bandiera}</Text>
        <Text style={styles.codice}>{corrente.codice.toUpperCase()}</Text>
        <Text style={styles.freccia}>▾</Text>
      </Pressable>

      <Modal visible={aperto} transparent animationType="fade" onRequestClose={() => setAperto(false)} statusBarTranslucent supportedOrientations={["portrait", "landscape"]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAperto(false)} />
        <View style={[styles.menu, { top: posizione.top, left: Math.max(8, (posizione.left || 0) - 190) }]}>
          <Text style={styles.titoloMenu}>{etichetta}</Text>
          {LINGUE.map((l) => {
            const selezionata = l.codice === lingua;
            return (
              <Pressable
                key={l.codice}
                onPress={() => {
                  onCambia(l.codice);
                  setAperto(false);
                }}
                style={({ pressed }) => [
                  styles.voce,
                  selezionata && styles.voceSelezionata,
                  pressed && { backgroundColor: '#e0eef7' },
                ]}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: selezionata }}
              >
                <Text style={styles.bandiera}>{l.bandiera}</Text>
                <Text style={[styles.nomeLingua, selezionata && { fontWeight: '700' }]}>{l.nome}</Text>
                {selezionata && <Text style={styles.spunta}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pulsante: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bandiera: { fontSize: 20 },
  codice: { color: '#fff', fontWeight: '700', fontSize: 13 },
  freccia: { color: '#fff', fontSize: 12 },
  menu: {
    position: 'absolute',
    width: 190,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  titoloMenu: {
    fontSize: 12,
    color: '#64748b',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voce: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  voceSelezionata: { backgroundColor: '#f0f6fb' },
  nomeLingua: { flex: 1, fontSize: 15, color: '#0f172a' },
  spunta: { color: '#0f3d5e', fontWeight: '800', fontSize: 15 },
});
