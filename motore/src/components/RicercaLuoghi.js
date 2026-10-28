import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CATEGORIE, coloreCategoria } from '../categorie';
import { zoneDi, zonePresenti } from '../zone';

const ALTEZZA_BARRA_STATO = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;

// Testo "semplificato" per la ricerca: minuscolo, senza accenti e senza apostrofi (Ca' d'Oro -> ca doro)
export const semplifica = (testo = '') =>
  testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[·'’.\-]/g, '')
    .toLowerCase()
    .trim();

/**
 * Pulsante con la lente: apre un pannello con il campo di ricerca e l'elenco dei luoghi trovati.
 * La ricerca può riguardare tutti i luoghi oppure solo le tipologie attive nel filtro,
 * e si può restringere a una zona (sestiere o isola).
 * props: luoghi, selezionate (tipologie attive), t, onScegli(id)
 */
export default function RicercaLuoghi({ luoghi, selezionate, t, onScegli }) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState('');
  const [ambito, setAmbito] = useState('filtrati'); // 'filtrati' | 'tutti'
  const [zona, setZona] = useState(null); // null = tutte le zone

  const zone = useMemo(() => zonePresenti(luoghi), [luoghi]);

  const filtroAttivo = selezionate.length < CATEGORIE.length;

  const risultati = useMemo(() => {
    const q = semplifica(testo);
    const perTipo = ambito === 'filtrati' ? luoghi.filter((l) => selezionate.includes(l.categoria)) : luoghi;
    const base = zona ? perTipo.filter((l) => zoneDi(l).includes(zona)) : perTipo;
    const ordinati = [...base].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    if (!q) return ordinati;
    return ordinati.filter(
      (l) =>
        semplifica(l.nome).includes(q) ||
        semplifica(l.sestiere).includes(q) ||
        semplifica(t(`cat_${l.categoria}`)).includes(q)
    );
  }, [testo, luoghi, selezionate, ambito, zona, t]);

  const chiudi = () => {
    Keyboard.dismiss();
    setAperto(false);
    setTesto('');
  };

  const scegli = (id) => {
    chiudi();
    onScegli(id);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setAmbito('filtrati');
          setZona(null);
          setAperto(true);
        }}
        style={({ pressed }) => [styles.pulsante, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={t('cerca')}
        hitSlop={6}
      >
        <Text style={styles.lente}>🔍</Text>
      </Pressable>

      <Modal visible={aperto} transparent animationType="fade" onRequestClose={chiudi} statusBarTranslucent supportedOrientations={["portrait", "landscape"]}>
        <View style={[styles.pannello, { paddingTop: ALTEZZA_BARRA_STATO + 10 }]}>
          <View style={styles.rigaRicerca}>
            <View style={styles.campo}>
              <Text style={styles.lenteCampo}>🔍</Text>
              <TextInput
                value={testo}
                onChangeText={setTesto}
                placeholder={t('cercaSegnaposto')}
                placeholderTextColor="#94a3b8"
                style={styles.input}
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={() => risultati.length === 1 && scegli(risultati[0].id)}
                accessibilityLabel={t('cerca')}
              />
              {testo.length > 0 && (
                <Pressable onPress={() => setTesto('')} hitSlop={10} accessibilityLabel={t('cancella')}>
                  <Text style={styles.cancella}>✕</Text>
                </Pressable>
              )}
            </View>
            <Pressable onPress={chiudi} hitSlop={8}>
              <Text style={styles.annulla}>{t('chiudi')}</Text>
            </Pressable>
          </View>

          {/* Dove cercare: in tutti i luoghi o solo nelle tipologie selezionate */}
          <View style={styles.rigaAmbito}>
            <Text style={styles.etichettaAmbito}>{t('cercaIn')}</Text>
            <View style={styles.segmenti}>
              {[
                ['filtrati', t('cercaFiltrati')],
                ['tutti', t('cercaTutti')],
              ].map(([valore, etichetta]) => (
                <Pressable
                  key={valore}
                  onPress={() => setAmbito(valore)}
                  style={[styles.segmento, ambito === valore && styles.segmentoAttivo]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ambito === valore }}
                >
                  <Text style={[styles.testoSegmento, ambito === valore && styles.testoSegmentoAttivo]}>
                    {etichetta}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {ambito === 'filtrati' && filtroAttivo && (
            <View style={styles.filtriAttivi}>
              {selezionate.map((c) => (
                <View key={c} style={styles.filtro}>
                  <View style={[styles.pallinoPiccolo, { backgroundColor: coloreCategoria(c) }]} />
                  <Text style={styles.testoFiltro}>{t(`cat_${c}`)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Zona: tutte oppure un solo sestiere / isola */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.rigaZone}
            contentContainerStyle={styles.contenutoZone}
          >
            {[null, ...zone].map((z) => {
              const attiva = zona === z;
              return (
                <Pressable
                  key={z || '_tutte'}
                  onPress={() => setZona(z)}
                  style={[styles.zona, attiva && styles.zonaAttiva]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: attiva }}
                >
                  <Text style={[styles.testoZona, attiva && styles.testoZonaAttiva]}>
                    {z ? `📍 ${z}` : t('tutteLeZone')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <FlatList
            data={risultati}
            keyExtractor={(l) => l.id}
            keyboardShouldPersistTaps="handled"
            style={styles.lista}
            ListEmptyComponent={
              <Text style={styles.vuoto}>
                {ambito === 'filtrati' && selezionate.length === 0 ? t('nessunaCategoria') : t('nessunRisultato')}
              </Text>
            }
            ItemSeparatorComponent={() => <View style={styles.separatore} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => scegli(item.id)}
                style={({ pressed }) => [styles.risultato, pressed && { backgroundColor: '#f0f6fb' }]}
                accessibilityRole="button"
              >
                <View style={[styles.pallino, { backgroundColor: coloreCategoria(item.categoria) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nome}>{item.nome}</Text>
                  <Text style={styles.dettaglio}>
                    {t(`cat_${item.categoria}`)} · {item.sestiere}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
        <Pressable style={styles.sfondo} onPress={chiudi} accessibilityLabel={t('chiudi')} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pulsante: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lente: { fontSize: 17 },
  pannello: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingBottom: 8,
    maxHeight: '80%',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sfondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  rigaRicerca: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  lenteCampo: { fontSize: 15, opacity: 0.6 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10, color: '#0f172a' },
  cancella: { fontSize: 15, color: '#64748b', paddingHorizontal: 4 },
  annulla: { fontSize: 15, color: '#0f3d5e', fontWeight: '600' },
  rigaAmbito: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  etichettaAmbito: { fontSize: 13, color: '#64748b' },
  segmenti: { flex: 1, flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3 },
  segmento: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  segmentoAttivo: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  testoSegmento: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  testoSegmentoAttivo: { color: '#0f3d5e' },
  filtriAttivi: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  filtro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pallinoPiccolo: { width: 8, height: 8, borderRadius: 4 },
  testoFiltro: { fontSize: 12, color: '#334155' },
  // flexShrink 0 e altezza minima: altrimenti su Android la riga viene schiacciata dalla lista sotto
  rigaZone: { flexGrow: 0, flexShrink: 0, minHeight: 40, marginBottom: 6, marginHorizontal: -14 },
  contenutoZone: { gap: 6, paddingHorizontal: 14, paddingVertical: 3, alignItems: 'center' },
  zona: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  zonaAttiva: { backgroundColor: '#0f3d5e', borderColor: '#0f3d5e' },
  testoZona: { fontSize: 13, color: '#334155' },
  testoZonaAttiva: { color: '#fff', fontWeight: '600' },
  lista: { flexGrow: 0, flexShrink: 1 },
  separatore: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 34 },
  risultato: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 4 },
  pallino: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff', elevation: 2 },
  nome: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  dettaglio: { fontSize: 13, color: '#64748b', marginTop: 1 },
  vuoto: { textAlign: 'center', color: '#64748b', paddingVertical: 20 },
});
