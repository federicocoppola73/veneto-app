import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { testoLocalizzato } from '../i18n';
import { immagine } from '../risorse';
import { datiProxy } from '../dati';

const IMMAGINI = datiProxy('immagini.json');

// Sotto questo numero di luoghi non ha senso proporre un itinerario
const MIN_TAPPE_ITINERARIO = 4;

// Scheda di un personaggio: biografia, curiosità, luoghi collegati e (se più di uno) l'itinerario.
// props: persona, luoghiPerId, t, lingua, onChiudi, onApriLuogo(id), onCreaItinerario(persona)
export default function SchedaPersonaggio({ persona: p, luoghiPerId, t, lingua, onChiudi, onApriLuogo, onCreaItinerario }) {
  const insets = useSafeAreaInsets();
  if (!p) return null;
  const luoghi = (p.luoghi || []).filter((id) => luoghiPerId[id]);
  const curiosita = p.curiosita ? p.curiosita[lingua] || p.curiosita.it || [] : [];
  const biografia = testoLocalizzato(p.biografia, lingua);
  const professione = testoLocalizzato(p.professione, lingua);
  const nascita = [testoLocalizzato(p.luogoNascita, lingua), testoLocalizzato(p.dataNascita, lingua)].filter(Boolean).join(' ');
  const morte = [testoLocalizzato(p.luogoMorte, lingua), testoLocalizzato(p.dataMorte, lingua)].filter(Boolean).join(' ');
  const iniziali = p.nome
    .split(' ')
    .map((parola) => parola[0])
    .slice(0, 2)
    .join('');

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi} statusBarTranslucent>
      <Pressable style={styles.sfondo} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
      <View style={[styles.scheda, { paddingBottom: 14 + insets.bottom }]}>
        <View style={styles.maniglia} />
        <View style={styles.testata}>
          <Text style={styles.etichetta}>👤 {t('pers_titolo').toUpperCase()}</Text>
          <Pressable onPress={onChiudi} accessibilityLabel={t('chiudi')} style={styles.chiudi}>
            <Text style={styles.chiudiTesto}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.corpo}>
          <View style={styles.intestazione}>
            {p.ritratto ? (
              <View>
                <Image source={immagine(`personaggi/${p.id}.webp`)} style={styles.ritratto} />
                {p.ritratto.autore ? (
                  <Text style={styles.credito}>
                    {p.ritratto.autore}
                    {p.ritratto.licenza ? ` · ${p.ritratto.licenza}` : ''}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.ritrattoVuoto}>
                <Text style={styles.iniziali}>{iniziali}</Text>
              </View>
            )}
            <View style={styles.testoIntestazione}>
              <Text style={styles.nome}>{p.nome}</Text>
              <Text style={styles.professione}>{professione}</Text>
              {nascita || morte ? (
                <Text style={styles.date}>
                  {nascita}
                  {nascita && morte ? ' – ' : ''}
                  {morte}
                </Text>
              ) : null}
            </View>
          </View>

          {biografia ? (
            <>
              <Text style={styles.sottotitolo}>{t('pers_biografia')}</Text>
              <Text style={styles.testo}>{biografia}</Text>
            </>
          ) : null}

          {curiosita.length ? (
            <>
              <Text style={styles.sottotitolo}>{t('pers_curiosita')}</Text>
              {curiosita.map((c, i) => (
                <Text key={i} style={styles.voce}>
                  • {c}
                </Text>
              ))}
            </>
          ) : null}

          {luoghi.length ? (
            <>
              <Text style={styles.sottotitolo}>{t('pers_luoghi')}</Text>
              {luoghi.map((id) => (
                <LuogoRiga key={id} luogo={luoghiPerId[id]} onPress={() => onApriLuogo(id)} />
              ))}
            </>
          ) : null}

          {luoghi.length >= MIN_TAPPE_ITINERARIO ? (
            <Pressable style={styles.pulsante} onPress={() => onCreaItinerario(p)} accessibilityRole="button">
              <Text style={styles.pulsanteTesto}>{t('pers_crea_itinerario')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Riga con la miniatura del luogo: tocandola si apre la sua scheda
function LuogoRiga({ luogo, onPress }) {
  const foto = IMMAGINI.luoghi?.[luogo.id] !== undefined;
  return (
    <Pressable style={styles.riga} onPress={onPress} accessibilityRole="link">
      {foto ? (
        <Image source={immagine(`luoghi/${luogo.id}.webp`)} style={styles.miniatura} />
      ) : (
        <View style={styles.miniaturaVuota} />
      )}
      <View style={styles.testoRiga}>
        <Text style={styles.nomeLuogo}>{luogo.nome}</Text>
        {luogo.sestiere ? <Text style={styles.sestiere}>{luogo.sestiere}</Text> : null}
      </View>
      <Text style={styles.freccia}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  scheda: { backgroundColor: '#fbf7f0', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%', paddingTop: 8 },
  maniglia: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#cbd5e1', marginBottom: 8 },
  testata: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 4 },
  etichetta: { fontSize: 12, fontWeight: '700', color: '#0f3d5e', letterSpacing: 0.4 },
  chiudi: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chiudiTesto: { fontSize: 16, color: '#0f172a' },
  corpo: { paddingHorizontal: 22, paddingBottom: 16, gap: 10 },
  intestazione: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ritratto: { width: 96, height: 96, borderRadius: 16, backgroundColor: '#e2e8f0' },
  credito: { fontSize: 10, color: '#64748b', marginTop: 4, width: 96 },
  ritrattoVuoto: { width: 96, height: 96, borderRadius: 16, backgroundColor: '#e0eef7', alignItems: 'center', justifyContent: 'center' },
  iniziali: { fontSize: 28, fontWeight: '800', color: '#0f3d5e' },
  testoIntestazione: { flex: 1, minWidth: 0, gap: 3 },
  nome: { fontSize: 22, fontWeight: '800', color: '#0f3d5e' },
  professione: { fontSize: 14, color: '#334155' },
  date: { fontSize: 13, color: '#475569' },
  sottotitolo: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  testo: { fontSize: 15, lineHeight: 22, color: '#334155' },
  voce: { fontSize: 14, lineHeight: 20, color: '#334155' },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 10 },
  miniatura: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#e2e8f0' },
  miniaturaVuota: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#e0eef7' },
  testoRiga: { flex: 1, minWidth: 0 },
  nomeLuogo: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  sestiere: { fontSize: 12, color: '#475569', marginTop: 2 },
  freccia: { fontSize: 22, color: '#94a3b8' },
  pulsante: { alignSelf: 'stretch', alignItems: 'center', backgroundColor: '#0f3d5e', borderRadius: 14, paddingVertical: 14, marginTop: 8 },
  pulsanteTesto: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
