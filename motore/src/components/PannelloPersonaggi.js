import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { personaggi } from '../personaggi';
import { immagine } from '../risorse';
import { testoLocalizzato } from '../i18n';

// Pagina "Personaggi famosi": una card per personaggio (ritratto, nome, date, professione).
export default function PannelloPersonaggi({ t, lingua, onChiudi, onScegli }) {
  const insets = useSafeAreaInsets();
  const lista = personaggi();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi} statusBarTranslucent>
      <Pressable style={styles.sfondo} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
      <View style={[styles.pagina, { paddingBottom: 14 + insets.bottom }]}>
        <View style={styles.maniglia} />
        <View style={styles.testata}>
          <Text style={styles.titolo}>{t('pers_titolo')}</Text>
          <Pressable onPress={onChiudi} accessibilityLabel={t('chiudi')} style={styles.chiudi}>
            <Text style={styles.chiudiTesto}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.contenuto}>
          {lista.length === 0 ? (
            <Text style={styles.vuoto}>{t('pers_vuoto')}</Text>
          ) : (
            lista.map((p) => <Card key={p.id} personaggio={p} lingua={lingua} onPress={() => onScegli(p.id)} />)
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Card({ personaggio: p, lingua, onPress }) {
  const iniziali = p.nome
    .split(' ')
    .map((parola) => parola[0])
    .slice(0, 2)
    .join('');
  const professione = testoLocalizzato(p.professione, lingua);
  const sintesi = testoLocalizzato(p.sintesi, lingua);
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      {p.ritratto ? (
        <Image source={immagine(`personaggi/${p.id}.webp`)} style={styles.ritratto} />
      ) : (
        <View style={styles.ritrattoVuoto}>
          <Text style={styles.iniziali}>{iniziali}</Text>
        </View>
      )}
      <View style={styles.testoCard}>
        <Text style={styles.nome}>{p.nome}</Text>
        <Text style={styles.date}>
          {p.nascita} – {p.morte}
        </Text>
        <Text style={styles.professione}>{professione}</Text>
        {sintesi ? <Text style={styles.sintesi}>{sintesi}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  pagina: { backgroundColor: '#fbf7f0', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%', paddingTop: 8 },
  maniglia: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#cbd5e1', marginBottom: 8 },
  testata: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  titolo: { fontSize: 20, fontWeight: '800', color: '#0f3d5e' },
  chiudi: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chiudiTesto: { fontSize: 16, color: '#0f172a' },
  contenuto: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  vuoto: { fontSize: 14, color: '#64748b', paddingVertical: 20, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 12 },
  ritratto: { width: 76, height: 76, borderRadius: 14, backgroundColor: '#e2e8f0' },
  ritrattoVuoto: { width: 76, height: 76, borderRadius: 14, backgroundColor: '#e0eef7', alignItems: 'center', justifyContent: 'center' },
  iniziali: { fontSize: 22, fontWeight: '800', color: '#0f3d5e' },
  testoCard: { flex: 1, minWidth: 0, gap: 2 },
  nome: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  date: { fontSize: 13, color: '#475569' },
  professione: { fontSize: 14, color: '#334155' },
  sintesi: { fontSize: 12, lineHeight: 17, color: '#64748b', marginTop: 4 },
});
