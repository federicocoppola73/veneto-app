import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CIBI, CURIOSITA, ICONE_PORTATA, anteprima } from '../curiosita';
import { fotoCuriosita } from '../immaginiCuriosita';
import { fotoCibo } from '../immaginiCibi';
import { testoLocalizzato } from '../i18n';

const PORTATE = ['cicchetto', 'primo', 'secondo', 'contorno', 'dolce'];

const ANTEPRIME = 3;

// Pagina "Curiosità e cibi": due sezioni distinte, ciascuna con anteprime e "Vedi tutte".
export default function PannelloCuriosita({ t, lingua, onApriCuriosita, onApriCibo, onChiudi }) {
  const insets = useSafeAreaInsets();
  const [tuttiCuriosita, setTuttiCuriosita] = useState(false);
  const [tuttiCibi, setTuttiCibi] = useState(false);
  const curiositaVisibili = tuttiCuriosita ? CURIOSITA : CURIOSITA.slice(0, ANTEPRIME);
  const cibiVisibili = tuttiCibi ? CIBI : CIBI.slice(0, ANTEPRIME);

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
        <ScrollView contentContainerStyle={styles.contenuto}>
          <View style={styles.sezione}>
            <View style={styles.rigaSezione}>
              <Text style={[styles.nomeSezione, { color: '#b45309' }]}>💡 {t('cur_curiosita')}</Text>
              {CURIOSITA.length > ANTEPRIME && (
                <Pressable onPress={() => setTuttiCuriosita((a) => !a)}>
                  <Text style={styles.vediTutte}>
                    {tuttiCuriosita ? t('cur_meno') : t('cur_vedi_tutte').replace('{n}', CURIOSITA.length)}
                  </Text>
                </Pressable>
              )}
            </View>
            {curiositaVisibili.map((c) => (
              <RigaElenco
                key={c.id}
                foto={fotoCuriosita(c)}
                titolo={testoLocalizzato(c.titolo, lingua)}
                sottotitolo={c.sestiere}
                onPress={() => onApriCuriosita(c.id)}
              />
            ))}
          </View>

          <View style={styles.sezione}>
            <View style={styles.rigaSezione}>
              <Text style={[styles.nomeSezione, { color: '#15803d' }]}>🍽 {t('cur_cibi')}</Text>
              {CIBI.length > ANTEPRIME && (
                <Pressable onPress={() => setTuttiCibi((a) => !a)}>
                  <Text style={styles.vediTutte}>
                    {tuttiCibi ? t('cur_meno') : t('cur_vedi_tutti').replace('{n}', CIBI.length)}
                  </Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.legenda}>{PORTATE.map((p) => t(`cur_portata_${p}`)).join('  ·  ')}</Text>
            {cibiVisibili.map((c) => (
              <RigaElenco
                key={c.id}
                foto={fotoCibo(c)}
                icona={ICONE_PORTATA[c.portata]}
                titolo={c.nome}
                chip={c.portata ? t(`cur_portata_${c.portata}`) : null}
                sottotitolo={anteprima(c.testo, lingua)}
                onPress={() => onApriCibo(c.id)}
              />
            ))}
          </View>
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
  contenuto: { paddingHorizontal: 20, paddingBottom: 20, gap: 18 },
  sezione: { gap: 10 },
  rigaSezione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nomeSezione: { fontSize: 15, fontWeight: '800' },
  vediTutte: { fontSize: 13, fontWeight: '700', color: '#0f3d5e' },
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
