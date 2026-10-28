import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { etichette, testoLingua } from '../lingue';

const ORDINE_CATEGORIE = ['chiese', 'palazzi', 'musei', 'piazze', 'ponti', 'giardini', 'altri'];

// Elenco dei luoghi della città attiva, filtrabile per categoria
export default function ListaLuoghi({ luoghi, lingua, onApri, onIndietro, t }) {
  const e = etichette(lingua);
  const [categoria, setCategoria] = useState(null);

  const categoriePresenti = useMemo(() => {
    const presenti = new Set(luoghi.map((l) => l.categoria));
    return ORDINE_CATEGORIE.filter((c) => presenti.has(c));
  }, [luoghi]);

  const visibili = useMemo(
    () => luoghi
      .filter((l) => !categoria || l.categoria === categoria)
      .sort((a, b) => a.nome.localeCompare(b.nome, lingua)),
    [luoghi, categoria, lingua]
  );

  return (
    <View style={styles.contenitore}>
      <Pressable onPress={onIndietro} style={styles.indietro}>
        <Text style={styles.indietroTesto}>← {t.indietro}</Text>
      </Pressable>
      <Text style={styles.titolo}>{e.luoghi}</Text>

      <View style={styles.filtri}>
        <Chip etichetta={e.tutte} attivo={!categoria} onPress={() => setCategoria(null)} />
        {categoriePresenti.map((c) => (
          <Chip key={c} etichetta={e.categorie[c]} attivo={categoria === c} onPress={() => setCategoria(c)} />
        ))}
      </View>

      <FlatList
        data={visibili}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onApri(item.id)}>
            <Text style={styles.nome}>{item.nome}</Text>
            <Text style={styles.meta}>{e.categorie[item.categoria]} · {item.sestiere}</Text>
            <Text style={styles.descrizione} numberOfLines={2}>{testoLingua(lingua, item.descrizione)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function Chip({ etichetta, attivo, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, attivo && styles.chipAttivo]}>
      <Text style={[styles.chipTesto, attivo && styles.chipTestoAttivo]}>{etichetta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenitore: { flex: 1 },
  indietro: { paddingVertical: 8 },
  indietroTesto: { color: '#1d4ed8', fontWeight: '700', fontSize: 15 },
  titolo: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  filtri: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#e2e8f0' },
  chipAttivo: { backgroundColor: '#1d4ed8' },
  chipTesto: { fontSize: 12, fontWeight: '700', color: '#334155' },
  chipTestoAttivo: { color: '#fff' },
  lista: { gap: 8, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  nome: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  descrizione: { fontSize: 13, color: '#334155', marginTop: 4 },
});
