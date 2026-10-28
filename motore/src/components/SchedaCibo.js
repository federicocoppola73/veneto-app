import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { testoLocalizzato } from '../i18n';
import { fotoCibo } from '../immaginiCibi';
import CondividiCibo from './CondividiCibo';
import IconaCondividi from './IconaCondividi';
import PulsanteCopia from './PulsanteCopia';
import { testoCibo } from '../copia';

// Scheda di un piatto: descrizione e ricetta (ingredienti e passaggi).
// props: cibo, t, onChiudi
export default function SchedaCibo({ cibo: c, t, lingua, onChiudi }) {
  const insets = useSafeAreaInsets();
  const [condividi, setCondividi] = useState(false);
  if (!c) return null;
  const r = c.ricetta;
  const porzioni = r?.resa ? testoLocalizzato(r.resa, lingua) : typeof r?.porzioni === 'number' ? t('cur_persone').replace('{n}', r.porzioni) : r?.porzioni;
  const ingredienti = testoLocalizzato(r?.ingredienti, lingua) || [];
  const passaggi = testoLocalizzato(r?.passaggi, lingua) || [];
  const preparazione = testoLocalizzato(r?.preparazione, lingua);
  const foto = fotoCibo(c);

  return (
    <>
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi} statusBarTranslucent>
      <Pressable style={styles.sfondo} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
      <View style={[styles.scheda, { paddingBottom: 14 + insets.bottom }]}>
        <View style={styles.maniglia} />
        <View style={styles.testata}>
          <Text style={styles.etichetta}>🍽 {t('cur_cibi').toUpperCase()}</Text>
          <Pressable onPress={onChiudi} accessibilityLabel={t('chiudi')} style={styles.chiudi}>
            <Text style={styles.chiudiTesto}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.corpo}>
          {foto ? (
            <View>
              <Image source={foto} style={styles.foto} />
              {c.foto ? <Text style={styles.credito}>Foto: {c.foto.autore} · {c.foto.licenza}</Text> : null}
            </View>
          ) : null}
          <View style={styles.rigaNome}>
            <Text style={[styles.titolo, styles.titoloFlex]}>{c.nome}</Text>
            <View style={styles.azioni}>
              <PulsanteCopia testo={testoCibo(c, lingua, t)} t={t} style={styles.condividi} />
              <Pressable
                onPress={() => setCondividi(true)}
                hitSlop={10}
                style={({ pressed }) => [styles.condividi, pressed && { transform: [{ scale: 0.9 }] }]}
                accessibilityRole="button"
                accessibilityLabel={t('cond_condividi')}
              >
                <IconaCondividi />
              </Pressable>
            </View>
          </View>
          {c.portata ? <Text style={styles.portata}>{t(`cur_portata_${c.portata}`)}</Text> : null}
          <Text style={styles.testo}>{testoLocalizzato(c.testo, lingua)}</Text>

          {r && (
            <View style={styles.box}>
              <Text style={styles.boxTitolo}>{t('cur_ricetta')}</Text>
              {(porzioni || preparazione) && (
                <Text style={styles.meta}>
                  {[porzioni, preparazione ? `${t('cur_tempi')}: ${preparazione}` : null].filter(Boolean).join(' · ')}
                </Text>
              )}
              <Text style={styles.sottotitolo}>{t('cur_ingredienti')}</Text>
              {ingredienti.map((i) => (
                <Text key={i} style={styles.voce}>• {i}</Text>
              ))}
              <Text style={styles.sottotitolo}>{t('cur_procedimento')}</Text>
              {passaggi.map((p, n) => (
                <Text key={n} style={styles.voce}>{n + 1}. {p}</Text>
              ))}
              {r.fonte ? <Text style={styles.fonte}>{t('cur_fonte')}: {r.fonte.replace(/^https?:\/\//, '').split('/')[0]}</Text> : null}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
    {condividi && <CondividiCibo cibo={c} lingua={lingua} t={t} onChiudi={() => setCondividi(false)} />}
    </>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  scheda: { backgroundColor: '#fbf7f0', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%', paddingTop: 8 },
  maniglia: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#cbd5e1', marginBottom: 8 },
  testata: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 4 },
  etichetta: { fontSize: 12, fontWeight: '700', color: '#15803d', letterSpacing: 0.4 },
  chiudi: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chiudiTesto: { fontSize: 16, color: '#0f172a' },
  corpo: { paddingHorizontal: 22, paddingBottom: 16, gap: 10 },
  titolo: { fontSize: 24, fontWeight: '800', color: '#0f3d5e' },
  portata: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '700', color: '#166534', backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  testo: { fontSize: 15, lineHeight: 22, color: '#334155' },
  box: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 6, marginTop: 4 },
  boxTitolo: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  meta: { fontSize: 12, color: '#475569' },
  sottotitolo: { fontSize: 13, fontWeight: '700', color: '#0f3d5e', marginTop: 8 },
  voce: { fontSize: 14, lineHeight: 20, color: '#334155' },
  fonte: { fontSize: 11, color: '#64748b', marginTop: 10 },
  rigaNome: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titoloFlex: { flex: 1 },
  azioni: { flexDirection: 'row', gap: 8, marginTop: -2 },
  condividi: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  foto: { width: '100%', height: 190, borderRadius: 14, backgroundColor: '#cbd5e1' },
  credito: { fontSize: 10, color: '#64748b', marginTop: 4 },
});
