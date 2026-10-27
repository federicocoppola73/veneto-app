import { useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { CITTA, etichettaStato, GRATUITO } from './src/catalogo';

// Schermata di scelta: il gratuito è sempre attivo; le città si scelgono qui.
// Il prezzo comparirà quando i prodotti saranno creati negli store.
export default function App() {
  const [scelta, setScelta] = useState(null);

  return (
    <SafeAreaView style={styles.contenitore}>
      <Text style={styles.titolo}>Veneto: Monumenti & altro</Text>
      <Text style={styles.sottotitolo}>Scegli una città</Text>
      <View style={styles.gratuito}>
        <Text style={styles.gratuitoTitolo}>Gratuito</Text>
        <Text style={styles.gratuitoTesto}>{GRATUITO}</Text>
      </View>
      <FlatList
        data={CITTA}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => {
          const attiva = scelta === item.id;
          return (
            <Pressable
              onPress={() => setScelta(item.id)}
              style={({ pressed }) => [styles.card, attiva && styles.cardAttiva, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.nomeCitta}>{item.nome}</Text>
                <Text style={styles.provincia}>Provincia di {item.provincia}</Text>
              </View>
              <Text style={[styles.stato, item.stato === 'disponibile' && styles.statoOk]}>
                {etichettaStato(item.stato)}
              </Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
  titolo: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  sottotitolo: { fontSize: 15, color: '#475569', marginTop: 4, marginBottom: 12 },
  gratuito: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 14, marginBottom: 12 },
  gratuitoTitolo: { fontSize: 15, fontWeight: '700', color: '#065f46' },
  gratuitoTesto: { fontSize: 13, color: '#065f46', marginTop: 4 },
  lista: { gap: 10, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardAttiva: { borderColor: '#1d4ed8' },
  nomeCitta: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  provincia: { fontSize: 13, color: '#64748b', marginTop: 2 },
  stato: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  statoOk: { color: '#1d4ed8' },
});
