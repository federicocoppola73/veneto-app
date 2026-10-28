import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { testoLocalizzato } from '../i18n';

// "Lo sapevi che?" di un luogo: foglio con le curiosità collegate. Chiudendolo si torna alla scheda del luogo.
export default function LoSapeviChe({ voci, lingua, t, onChiudi }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onChiudi} statusBarTranslucent>
      <View style={styles.contenitore}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
        <View style={[styles.foglio, { maxHeight: height * 0.7, paddingBottom: 18 + insets.bottom }]}>
          <View style={styles.maniglia} />
          <View style={styles.intestazione}>
            <Text style={styles.titolo}>💡 {t('losapevi')}</Text>
            <Pressable onPress={onChiudi} hitSlop={10} accessibilityLabel={t('chiudi')}>
              <Text style={styles.chiudi}>✕</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {voci.map((v, i) => (
              <View key={i} style={[styles.voce, i > 0 && styles.separata]}>
                <Text style={styles.voceTitolo}>{testoLocalizzato(v.titolo, lingua)}</Text>
                <Text style={styles.voceTesto}>{testoLocalizzato(v.testo, lingua)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenitore: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  foglio: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  maniglia: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', marginBottom: 10 },
  intestazione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  titolo: { fontSize: 19, fontWeight: '800', color: '#92400e' },
  chiudi: { fontSize: 20, color: '#64748b', paddingHorizontal: 4 },
  voce: { paddingVertical: 14 },
  separata: { borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  voceTitolo: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  voceTesto: { fontSize: 15, lineHeight: 22, color: '#334155' },
});
