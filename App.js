import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { CITTA, cittaPerId, etichettaStato, GRATUITO } from './src/catalogo';
import { attiva, datiCitta, installa, leggiStato, rimuovi } from './src/pacchetti';

// Gratuito sempre attivo; le città si scaricano, si attivano e si eliminano da qui.
// I prezzi compariranno quando i prodotti saranno creati negli store.
export default function App() {
  const [stato, setStato] = useState({ attiva: null, installate: [] });
  const [occupata, setOccupata] = useState(null); // id della città in download/eliminazione
  const [luoghiAttiva, setLuoghiAttiva] = useState(null);

  useEffect(() => {
    leggiStato().then(setStato);
  }, []);

  useEffect(() => {
    if (!stato.attiva) {
      setLuoghiAttiva(null);
      return;
    }
    datiCitta(stato.attiva).then(setLuoghiAttiva);
  }, [stato.attiva]);

  async function esegui(id, azione) {
    setOccupata(id);
    try {
      setStato(await azione(id));
    } catch (e) {
      Alert.alert('Operazione non riuscita', e.message || 'Riprova più tardi.');
    } finally {
      setOccupata(null);
    }
  }

  const cittaAttiva = stato.attiva ? cittaPerId(stato.attiva) : null;
  const elencoAttiva = luoghiAttiva
    ? luoghiAttiva.luoghi.slice(0, 10).map((l) => l.nome)
    : (cittaAttiva?.anteprima || []);

  return (
    <SafeAreaView style={styles.contenitore}>
      <Text style={styles.titolo}>Veneto: Monumenti & altro</Text>
      {cittaAttiva ? (
        <View style={styles.attiva}>
          <Text style={styles.attivaEtichetta}>Città attiva</Text>
          <Text style={styles.attivaNome}>{cittaAttiva.nome}</Text>
          <Text style={styles.attivaTesto} numberOfLines={3}>{elencoAttiva.join(' · ')}</Text>
        </View>
      ) : (
        <View style={styles.gratuito}>
          <Text style={styles.gratuitoTitolo}>Gratuito</Text>
          <Text style={styles.gratuitoTesto}>{GRATUITO}</Text>
        </View>
      )}
      <Text style={styles.sottotitolo}>Le città</Text>
      <FlatList
        data={CITTA}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => {
          const installata = stato.installate.includes(item.id);
          const attivaOra = stato.attiva === item.id;
          const impegnata = occupata === item.id;
          return (
            <View style={[styles.card, attivaOra && styles.cardAttiva]}>
              <View style={styles.cardTesto}>
                <Text style={styles.nomeCitta}>{item.nome}</Text>
                <Text style={styles.provincia}>
                  {installata ? (attivaOra ? 'Attiva' : 'Installata') : etichettaStato(item.stato)}
                </Text>
              </View>
              {impegnata ? (
                <ActivityIndicator />
              ) : installata ? (
                <View style={styles.azioni}>
                  {!attivaOra && <Pressable style={styles.bottone} onPress={() => esegui(item.id, attiva)}><Text style={styles.testoBottone}>Attiva</Text></Pressable>}
                  <Pressable style={[styles.bottone, styles.bottoneSecondario]} onPress={() => esegui(item.id, rimuovi)}><Text style={styles.testoSecondario}>Elimina</Text></Pressable>
                </View>
              ) : item.pacchetto ? (
                <Pressable style={styles.bottone} onPress={() => esegui(item.id, installa)}><Text style={styles.testoBottone}>Scarica</Text></Pressable>
              ) : (
                <Text style={styles.nonDisponibile}>Non ancora</Text>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
  titolo: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  gratuito: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 14, marginTop: 12 },
  gratuitoTitolo: { fontSize: 15, fontWeight: '700', color: '#065f46' },
  gratuitoTesto: { fontSize: 13, color: '#065f46', marginTop: 4 },
  attiva: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginTop: 12 },
  attivaEtichetta: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  attivaNome: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  attivaTesto: { fontSize: 13, color: '#334155', marginTop: 6 },
  sottotitolo: { fontSize: 15, fontWeight: '700', color: '#475569', marginTop: 16, marginBottom: 8 },
  lista: { gap: 10, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardAttiva: { borderColor: '#1d4ed8' },
  cardTesto: { flex: 1 },
  nomeCitta: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  provincia: { fontSize: 13, color: '#64748b', marginTop: 2 },
  azioni: { flexDirection: 'row', gap: 8 },
  bottone: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  testoBottone: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bottoneSecondario: { backgroundColor: '#f1f5f9' },
  testoSecondario: { color: '#334155', fontWeight: '700', fontSize: 13 },
  nonDisponibile: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
});
