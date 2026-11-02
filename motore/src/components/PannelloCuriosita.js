import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CIBI, CURIOSITA, ICONE_PORTATA, anteprima } from '../curiosita';
import { fotoCuriosita } from '../immaginiCuriosita';
import { fotoCibo } from '../immaginiCibi';
import { testoLocalizzato } from '../i18n';

const PORTATE = ['cicchetto', 'primo', 'secondo', 'contorno', 'dolce'];

// Pagina "Curiosità e cibi": due schede; ciascuna mostra il proprio elenco completo.
export default function PannelloCuriosita({ t, lingua, onApriCuriosita, onApriCibo, onChiudi }) {
  const insets = useSafeAreaInsets();
  const [scheda, setScheda] = useState('curiosita');
  const schede = [
    { id: 'curiosita', etichetta: `💡 ${t('cur_curiosita')}`, colore: '#b45309' },
    { id: 'cibi', etichetta: `🍽 ${t('cur_cibi')}`, colore: '#15803d' },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi} statusBarTranslucent>
      <Pressable style={styles.sfondo} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
      <View style={[styles.pagina, { paddingBottom: 14 + insets.bottom }]}>
        <View style={styles.maniglia} />
        <View style={styles.testata}>
          <Text style={styles.titolo}>{t('cur_titolo')}</Text>
          <Pressable onPress={onChiudi} accessibilityLabel={t('chiudi')} style={styles.chiudi}>
            <Text style={styles.chiudiTesto}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.schede}>
          {schede.map((s) => {
            const attiva = scheda === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setScheda(s.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: attiva }}
                style={[styles.scheda, attiva && { borderBottomColor: s.colore }]}
              >
                <Text style={[styles.etichettaScheda, { color: attiva ? s.colore : '#64748b' }]}>{s.etichetta}</Text>
              </Pressable>
            );
          })}
        </View>
        <ScrollView contentContainerStyle={styles.contenuto}>
          {scheda === 'curiosita' ? (
            <View style={styles.sezione}>
              {CURIOSITA.map((c) => (
                <RigaElenco
                  key={c.id}
                  foto={fotoCuriosita(c)}
                  titolo={testoLocalizzato(c.titolo, lingua)}
                  sottotitolo={c.sestiere}
                  onPress={() => onApriCuriosita(c.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.sezione}>
              <Text style={styles.legenda}>{PORTATE.map((p) => t(`cur_portata_${p}`)).join('  ·  ')}</Text>
              {CIBI.map((c) => (
                <RigaElenco
                  key={c.id}
                  foto={fotoCibo(c)}
                  icona={ICONE_PORTATA[c.portata]}
                  titolo={c.nome}
                  chip={c.portata ? t(`cur_portata_${c.portata}`) : c.certificazione || null}
                  sottotitolo={anteprima(c.testo, lingua)}
                  onPress={() => onApriCibo(c.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function RigaElenco({ foto, icona, titolo, chip, sottotitolo, onPress }) {
  return (
    <Pressable style={styles.riga} onPress={onPress}>
      {foto ? (
        <Image source={foto} style={styles.miniatura} />
      ) : (
        <View style={styles.miniaturaVuota}>{icona ? <Text style={styles.icona}>{icona}</Text> : null}</View>
      )}
      <View style={styles.testoRiga}>
        <Text style={styles.titoloRiga}>
          {titolo}
          {chip ? <Text style={styles.chip}>{'  ' + chip}</Text> : null}
        </Text>
        <Text style={styles.sottotitoloRiga} numberOfLines={2}>{sottotitolo}</Text>
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
  schede: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  scheda: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  etichettaScheda: { fontSize: 15, fontWeight: '800' },
  contenuto: { paddingHorizontal: 20, paddingBottom: 20 },
  sezione: { gap: 10 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 10 },
  miniatura: { width: 56, height: 56, borderRadius: 10 },
  miniaturaVuota: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  icona: { fontSize: 26 },
  testoRiga: { flex: 1, minWidth: 0 },
  titoloRiga: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  sottotitoloRiga: { fontSize: 12, color: '#475569', marginTop: 2 },
  legenda: { fontSize: 12, color: '#64748b', marginTop: -6 },
  chip: { fontSize: 11, fontWeight: '700', color: '#15803d' },
});
