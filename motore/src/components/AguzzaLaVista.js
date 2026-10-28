import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { testoLocalizzato } from '../i18n';
import { FOTO_AGUZZA } from '../aguzzaFoto';

// Domande "Aguzza la vista" di un luogo: si tocca "Mostra la soluzione" per vedere la risposta.
export default function AguzzaLaVista({ domande, lingua, t, onChiudi }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [aperte, setAperte] = useState({}); // indice della domanda -> risposta mostrata
  const alterna = (i) => setAperte((a) => ({ ...a, [i]: !a[i] }));
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onChiudi} statusBarTranslucent>
      <View style={styles.contenitore}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
        <View style={[styles.foglio, { maxHeight: height * 0.75, paddingBottom: 18 + insets.bottom }]}>
          <View style={styles.maniglia} />
          <View style={styles.intestazione}>
            <Text style={styles.titolo}>👁️ {t('aguzza')}</Text>
            <Pressable onPress={onChiudi} hitSlop={10} accessibilityLabel={t('chiudi')}>
              <Text style={styles.chiudi}>✕</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {domande.map((d, i) => (
              <View key={i} style={[styles.voce, i > 0 && styles.separata]}>
                <Text style={styles.domanda}>{testoLocalizzato(d.domanda, lingua)}</Text>
                {aperte[i] ? <Text style={styles.risposta}>{testoLocalizzato(d.risposta, lingua)}</Text> : null}
                {aperte[i] && d.foto && FOTO_AGUZZA[d.foto.file] ? (
                  <View style={styles.fotoBox}>
                    <Image source={FOTO_AGUZZA[d.foto.file]} style={styles.foto} resizeMode="contain" />
                    {d.foto.credits ? <Text style={styles.credits}>{d.foto.credits}</Text> : null}
                  </View>
                ) : null}
                <Pressable
                  onPress={() => alterna(i)}
                  style={({ pressed }) => [styles.bottone, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.testoBottone}>{aperte[i] ? t('aguzza_nascondi') : t('aguzza_mostra')}</Text>
                </Pressable>
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
  foglio: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 8 },
  maniglia: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', marginBottom: 10 },
  intestazione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  titolo: { fontSize: 19, fontWeight: '800', color: '#0f3d5e' },
  chiudi: { fontSize: 20, color: '#64748b', paddingHorizontal: 4 },
  voce: { paddingVertical: 14 },
  separata: { borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  domanda: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: '#0f172a' },
  risposta: { fontSize: 15, lineHeight: 22, color: '#166534', backgroundColor: '#dcfce7', borderRadius: 10, padding: 10, marginTop: 10 },
  bottone: { alignSelf: 'flex-start', marginTop: 10, borderWidth: 1.5, borderColor: '#0f3d5e', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6 },
  testoBottone: { fontSize: 14, fontWeight: '700', color: '#0f3d5e' },
  fotoBox: { marginTop: 10, alignItems: 'center' },
  foto: { width: 150, height: 150, borderRadius: 8, backgroundColor: '#f1f5f9' },
  credits: { fontSize: 11, lineHeight: 15, color: '#64748b', marginTop: 4, textAlign: 'center' },
});
