import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { testoLocalizzato } from '../i18n';
import { immagine } from '../risorse';
import { datiProxy } from '../dati';

const IMMAGINI = datiProxy('immagini.json');

// Scheda di un luogo non più visitabile (per esempio un teatro scomparso): zona, posizione e storia.
export default function SchedaStorica({ luogo: l, t, lingua, onChiudi }) {
  const insets = useSafeAreaInsets();
  if (!l) return null;
  const foto = IMMAGINI.luoghi?.[l.id] !== undefined;
  const voci = [
    [t('stor_zona'), testoLocalizzato(l.zona, lingua)],
    [t('stor_posizione'), testoLocalizzato(l.posizione, lingua)],
    [t('stor_storia'), testoLocalizzato(l.storia, lingua)],
  ].filter(([, testo]) => testo);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi} statusBarTranslucent>
      <Pressable style={styles.sfondo} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
      <View style={[styles.scheda, { paddingBottom: 14 + insets.bottom }]}>
        <View style={styles.maniglia} />
        <View style={styles.testata}>
          <Text style={styles.etichetta}>🏛 {t('stor_non_visitabile').toUpperCase()}</Text>
          <Pressable onPress={onChiudi} accessibilityLabel={t('chiudi')} style={styles.chiudi}>
            <Text style={styles.chiudiTesto}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.corpo}>
          {foto ? (
            <View>
              <Image source={immagine(`luoghi/${l.id}.webp`)} style={styles.foto} resizeMode="contain" />
              {l.immagine ? (
                <Text style={styles.credito}>
                  Foto: {l.immagine.autore}
                  {l.immagine.licenza ? ` · ${l.immagine.licenza}` : ''}
                </Text>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.nome}>{l.nome}</Text>
          {voci.map(([etichetta, testo]) => (
            <View key={etichetta} style={styles.blocco}>
              <Text style={styles.sottotitolo}>{etichetta}</Text>
              <Text style={styles.testo}>{testo}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  scheda: { backgroundColor: '#fbf7f0', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%', paddingTop: 8 },
  maniglia: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#cbd5e1', marginBottom: 8 },
  testata: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 4 },
  etichetta: { fontSize: 12, fontWeight: '700', color: '#78350f', letterSpacing: 0.4 },
  chiudi: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chiudiTesto: { fontSize: 16, color: '#0f172a' },
  corpo: { paddingHorizontal: 22, paddingBottom: 16, gap: 10 },
  foto: { width: '100%', height: 200, borderRadius: 14, backgroundColor: '#cbd5e1' },
  credito: { fontSize: 10, color: '#64748b', marginTop: 4 },
  nome: { fontSize: 22, fontWeight: '800', color: '#0f3d5e' },
  blocco: { gap: 4, marginTop: 6 },
  sottotitolo: { fontSize: 14, fontWeight: '800', color: '#0f3d5e' },
  testo: { fontSize: 15, lineHeight: 22, color: '#334155' },
});
