import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fotoCuriosita } from '../immaginiCuriosita';
import { testoLocalizzato } from '../i18n';

// Scheda di una curiosità. Se ha una posizione, "Portami lì" fa comparire la 💡 sulla mappa per 10 secondi.
// props: curiosita, t, onChiudi, onPortami(curiosita) | null, onApriLuogo(luogo_id) | null
export default function SchedaCuriosita({ curiosita: c, t, lingua, onChiudi, onPortami, onApriLuogo }) {
  const insets = useSafeAreaInsets();
  if (!c) return null;
  const foto = fotoCuriosita(c);
  const linee = c.vaporetto?.linee?.length ? c.vaporetto.linee.join(', ') : '';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi} statusBarTranslucent>
      <Pressable style={styles.sfondo} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
      <View style={[styles.scheda, { paddingBottom: insets.bottom }]}>
        <View style={styles.fotoBox}>
          {foto ? (
            <Image source={foto} style={styles.foto} />
          ) : (
            <View style={[styles.foto, styles.fotoVuota]}>
              <Text style={styles.fotoVuotaTesto}>{t('cur_foto_in_arrivo')}</Text>
            </View>
          )}
          <Pressable onPress={onChiudi} accessibilityLabel={t('chiudi')} style={styles.chiudi}>
            <Text style={styles.chiudiTesto}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.corpo}>
          <Text style={styles.etichetta}>💡 {t('cur_curiosita').toUpperCase()}{c.sestiere ? ` - ${c.sestiere.toUpperCase()}` : ''}</Text>
          <Text style={styles.titolo}>{testoLocalizzato(c.titolo, lingua)}</Text>
          <Text style={styles.testo}>{testoLocalizzato(c.testo, lingua)}</Text>

          {c.larghezza_cm != null && (
            <View style={styles.chip}>
              <Text style={styles.chipTesto}>
                <Text style={styles.chipEtichetta}>{t('cur_larghezza')} </Text>
                {c.larghezza_cm} cm
              </Text>
            </View>
          )}

          {c.vaporetto && (
            <View style={styles.box}>
              <Text style={styles.boxTitolo}>⛴ {t('cur_vaporetto')}</Text>
              <Text style={styles.boxTesto}>
                {c.vaporetto.fermata}
                {linee ? `\n${t('cur_linee')}: ${linee}` : ''}
              </Text>
            </View>
          )}

          {c.luogo_id && onApriLuogo && (
            <Pressable style={styles.bottoneSecondario} onPress={() => onApriLuogo(c.luogo_id)}>
              <Text style={styles.testoSecondario}>{t('cur_scheda_luogo')}</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.piede}>
          {onPortami ? (
            <>
              <Pressable style={styles.bottonePrincipale} onPress={() => onPortami(c)}>
                <Text style={styles.testoPrincipale}>🧭 {t('cur_portami')}</Text>
              </Pressable>
              <Text style={styles.notaPiede}>{t('cur_lampadina_nota')}</Text>
            </>
          ) : (
            <Text style={styles.notaPiede}>{t('cur_senza_posizione')}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  scheda: { backgroundColor: '#fbf7f0', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%', overflow: 'hidden' },
  fotoBox: { height: 200, backgroundColor: '#cbd5e1' },
  foto: { width: '100%', height: '100%' },
  fotoVuota: { alignItems: 'center', justifyContent: 'center' },
  fotoVuotaTesto: { color: '#334155', fontSize: 13 },
  chiudi: { position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chiudiTesto: { fontSize: 16, color: '#0f172a' },
  corpo: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12, gap: 10 },
  etichetta: { fontSize: 12, fontWeight: '700', color: '#b45309', letterSpacing: 0.4 },
  titolo: { fontSize: 22, fontWeight: '800', color: '#0f3d5e' },
  testo: { fontSize: 14, lineHeight: 21, color: '#334155' },
  chip: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  chipTesto: { fontSize: 13, color: '#334155' },
  chipEtichetta: { fontWeight: '700' },
  box: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  boxTitolo: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  boxTesto: { fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 19 },
  bottoneSecondario: { paddingVertical: 12, alignItems: 'center' },
  testoSecondario: { fontSize: 14, fontWeight: '700', color: '#0f3d5e' },
  piede: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 14, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  bottonePrincipale: { backgroundColor: '#0f3d5e', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  testoPrincipale: { color: '#fff', fontSize: 15, fontWeight: '700' },
  notaPiede: { fontSize: 12, color: '#64748b', textAlign: 'center' },
});
