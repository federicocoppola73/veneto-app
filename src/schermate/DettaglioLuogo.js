import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { etichette, testoLingua, traduciGiorni } from '../lingue';

// Scheda di un luogo: descrizione, orari, ingresso, fermata e link
export default function DettaglioLuogo({ luogo, lingua, onIndietro, t }) {
  const e = etichette(lingua);
  const gratuito = luogo.biglietto?.gratuito === true;
  const nota = testoLingua(lingua, luogo.nota);
  const wiki = typeof luogo.wikipedia === 'string' ? luogo.wikipedia : luogo.wikipedia?.[lingua];

  return (
    <ScrollView style={styles.contenitore} contentContainerStyle={styles.corpo}>
      <Pressable onPress={onIndietro} style={styles.indietro}>
        <Text style={styles.indietroTesto}>← {e.luoghi}</Text>
      </Pressable>
      <Text style={styles.nome}>{luogo.nome}</Text>
      <Text style={styles.meta}>{e.categorie[luogo.categoria]} · {luogo.sestiere}</Text>

      <Text style={styles.descrizione}>{testoLingua(lingua, luogo.descrizione)}</Text>

      {luogo.orari?.length > 0 && (
        <View style={styles.blocco}>
          <Text style={styles.etichetta}>{e.orari}</Text>
          {luogo.orari.map((o, i) => (
            <Text key={i} style={styles.riga}>{traduciGiorni(lingua, o.giorni)}: {o.ore}</Text>
          ))}
        </View>
      )}

      {luogo.chiuso?.length > 0 && (
        <Text style={styles.riga}>{e.chiuso}: {traduciGiorni(lingua, luogo.chiuso.join(', '))}</Text>
      )}

      <Text style={styles.riga}>{gratuito ? e.gratuito : e.pagamento}</Text>

      {nota ? <Text style={styles.nota}>{nota}</Text> : null}

      <View style={styles.blocco}>
        <Text style={styles.riga}>{e.fermata}: {luogo.fermata}</Text>
      </View>

      <View style={styles.link}>
        {luogo.sito ? <LinkBottone etichetta={e.sito} url={luogo.sito} /> : null}
        {wiki ? <LinkBottone etichetta={e.wikipedia} url={wiki} /> : null}
      </View>
    </ScrollView>
  );
}

function LinkBottone({ etichetta, url }) {
  return (
    <Pressable style={styles.bottone} onPress={() => Linking.openURL(url).catch(() => {})}>
      <Text style={styles.testoBottone}>{etichetta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenitore: { flex: 1 },
  corpo: { paddingBottom: 32 },
  indietro: { paddingVertical: 8 },
  indietroTesto: { color: '#1d4ed8', fontWeight: '700', fontSize: 15 },
  nome: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  descrizione: { fontSize: 15, color: '#1e293b', marginTop: 12, lineHeight: 22 },
  blocco: { marginTop: 14 },
  etichetta: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4 },
  riga: { fontSize: 14, color: '#334155', marginTop: 4 },
  nota: { fontSize: 13, color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 12 },
  link: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  bottone: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  testoBottone: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
