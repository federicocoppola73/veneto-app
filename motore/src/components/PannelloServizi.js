import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TIPI_SERVIZIO } from '../servizi';

/**
 * Riquadro con gli interruttori dei servizi sulla mappa (fontanelle, bagni, farmacie, vaporetto).
 * props: visibili (array di id), conteggi ({ id: numero }), onCambia(nuovoArray), onChiudi, t
 */
export default function PannelloServizi({ visibili, conteggi, onCambia, onChiudi, t }) {
  const tocca = (id) =>
    onCambia(visibili.includes(id) ? visibili.filter((x) => x !== id) : [...visibili, id]);
  return (
    <View style={styles.pannello}>
      <View style={styles.testata}>
        <Text style={styles.titolo}>{t('servizi')}</Text>
        <Pressable onPress={onChiudi} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('chiudi')}>
          <Text style={styles.chiudi}>✕</Text>
        </Pressable>
      </View>
      {TIPI_SERVIZIO.filter((tipo) => (conteggi[tipo.id] || 0) > 0).map((tipo) => {
        const attivo = visibili.includes(tipo.id);
        return (
          <Pressable
            key={tipo.id}
            onPress={() => tocca(tipo.id)}
            style={({ pressed }) => [styles.riga, pressed && { backgroundColor: '#f1f5f9' }]}
            accessibilityRole="switch"
            accessibilityState={{ checked: attivo }}
          >
            <View style={[styles.icona, { borderColor: tipo.colore }]}>
              <Text style={[styles.testoIcona, { color: tipo.colore }]}>{tipo.icona}</Text>
            </View>
            <Text style={styles.nome}>{t(tipo.chiave)}</Text>
            <Text style={styles.numero}>{conteggi[tipo.id] || 0}</Text>
            <View style={[styles.interruttore, attivo && { backgroundColor: tipo.colore }]}>
              <View style={[styles.manopola, attivo && { alignSelf: 'flex-end' }]} />
            </View>
          </Pressable>
        );
      })}
      <Text style={styles.fonte}>© OpenStreetMap</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pannello: {
    position: 'absolute',
    right: 64,
    bottom: 24,
    width: 236,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    elevation: 7,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  testata: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  titolo: { fontSize: 13, fontWeight: '800', color: '#0f3d5e', textTransform: 'uppercase', letterSpacing: 0.4 },
  chiudi: { fontSize: 14, color: '#64748b', paddingHorizontal: 4 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderRadius: 8 },
  icona: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  testoIcona: { fontSize: 11, fontWeight: '800' },
  nome: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  numero: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  interruttore: { width: 34, height: 20, borderRadius: 10, backgroundColor: '#cbd5e1', padding: 2, justifyContent: 'center' },
  manopola: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  fonte: { fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 2 },
});
