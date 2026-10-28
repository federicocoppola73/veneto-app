import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIE, coloreCategoria } from '../categorie';
import { testoLunghezza } from '../itinerari';
import { metriTappe, ordinaTappe } from '../itinerariUtente';
import { ROSSO_CUORE } from './Preferiti';
import { zoneDi, zonePresenti } from '../zone';

const BLU = '#0f3d5e';

// testo senza accenti e in minuscolo, per la ricerca
const semplifica = (s) =>
  (s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Pagina intera per creare o modificare un itinerario dell'utente, in due viste:
 *  - modifica: nome, tappe in ordine (▲ ▼ ✕), "Ordina per il percorso più breve", "Aggiungi tappe", Salva
 *  - scegli: tutti i luoghi con ricerca, filtro per tipologia e per zona (sestiere o isola); un tocco aggiunge o toglie la tappa
 * props: visibile, iniziale ({ id?, titolo, tappe } oppure null), luoghi, luoghiPerId, preferiti, t,
 *        onSalva({ id?, titolo, tappe }), onChiudi
 */
export default function EditorItinerario({ visibile, iniziale, luoghi, luoghiPerId, preferiti = [], t, onSalva, onChiudi }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orizzontale = width > height;
  const [titolo, setTitolo] = useState('');
  const [tappe, setTappe] = useState([]);
  const [vista, setVista] = useState('modifica'); // 'modifica' | 'scegli'
  const [cerca, setCerca] = useState('');
  const [categoria, setCategoria] = useState(null); // null = tutte
  const [zona, setZona] = useState(null); // null = tutte le zone
  const zone = useMemo(() => zonePresenti(luoghi), [luoghi]);

  useEffect(() => {
    if (!visibile) return;
    setTitolo(typeof iniziale?.titolo === 'string' ? iniziale.titolo : '');
    setTappe(iniziale?.tappe ? iniziale.tappe.filter((id) => luoghiPerId[id]) : []);
    setVista('modifica');
    setCerca('');
    setCategoria(null);
    setZona(null);
  }, [visibile, iniziale, luoghiPerId]);

  const metri = useMemo(() => (tappe.length > 1 ? metriTappe(tappe, luoghiPerId) : 0), [tappe, luoghiPerId]);
  const puoiSalvare = titolo.trim().length > 0 && tappe.length >= 2;

  const sposta = (i, d) =>
    setTappe((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const togli = (id) => setTappe((l) => l.filter((x) => x !== id));
  const cambia = (id) => setTappe((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const aggiungiCuore = () => setTappe((l) => [...l, ...preferiti.filter((id) => luoghiPerId[id] && !l.includes(id))]);

  const elenco = useMemo(() => {
    const q = semplifica(cerca.trim());
    return luoghi
      .filter(
        (l) =>
          (!categoria || l.categoria === categoria) &&
          (!zona || zoneDi(l).includes(zona)) &&
          (!q || semplifica(l.nome).includes(q))
      )
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [luoghi, cerca, categoria, zona]);

  const salva = () => puoiSalvare && onSalva({ id: iniziale?.id, titolo: titolo.trim(), tappe });
  const indietro = () => (vista === 'scegli' ? setVista('modifica') : onChiudi());

  const pulsanteTestata = (testo, azione, { attivo = true, primario = false, testID } = {}) => (
    <Pressable
      onPress={azione}
      disabled={!attivo}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [styles.pulsanteTestata, primario && styles.pulsantePrimario, !attivo && styles.spento, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !attivo }}
    >
      <Text style={[styles.testoPulsanteTestata, primario && { color: '#fff' }]}>{testo}</Text>
    </Pressable>
  );

  // ---- vista "modifica" ----
  const modifica = (
    <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
      <Text style={styles.etichetta}>{t('ed_nome')}</Text>
      <TextInput
        value={titolo}
        onChangeText={setTitolo}
        placeholder={t('ed_nomeEsempio')}
        placeholderTextColor="#94a3b8"
        style={styles.input}
        maxLength={40}
        testID="ed-nome"
        accessibilityLabel={t('ed_nome')}
      />

      <View style={styles.rigaTappe}>
        <Text style={styles.etichetta}>
          {t('ed_tappe')} ({tappe.length})
        </Text>
        {tappe.length > 1 && <Text style={styles.riepilogo}>{testoLunghezza({ metri }, t)}</Text>}
      </View>
      {tappe.length < 2 && <Text style={styles.suggerimento}>{t('ed_nessunaTappa')}</Text>}
      {tappe.map((id, i) => {
        const l = luoghiPerId[id];
        return (
          <View key={id} style={styles.tappa}>
            <View style={[styles.numero, { backgroundColor: coloreCategoria(l?.categoria) }]}>
              <Text style={styles.testoNumero}>{i + 1}</Text>
            </View>
            <Text style={styles.nomeTappa} numberOfLines={2}>
              {l?.nome || id}
            </Text>
            <Pressable onPress={() => sposta(i, -1)} disabled={i === 0} hitSlop={4} style={[styles.freccia, i === 0 && styles.spento]} accessibilityLabel={t('ed_su')}>
              <Text style={styles.testoFreccia}>▲</Text>
            </Pressable>
            <Pressable
              onPress={() => sposta(i, 1)}
              disabled={i === tappe.length - 1}
              hitSlop={4}
              style={[styles.freccia, i === tappe.length - 1 && styles.spento]}
              accessibilityLabel={t('ed_giu')}
            >
              <Text style={styles.testoFreccia}>▼</Text>
            </Pressable>
            <Pressable onPress={() => togli(id)} hitSlop={4} style={styles.freccia} accessibilityLabel={t('ed_togli')}>
              <Text style={[styles.testoFreccia, { color: '#b91c1c' }]}>✕</Text>
            </Pressable>
          </View>
        );
      })}

      {tappe.length > 2 && (
        <Pressable
          onPress={() => setTappe((l) => ordinaTappe(l, luoghiPerId))}
          testID="ed-ordina"
          style={({ pressed }) => [styles.azioneSecondaria, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
        >
          <Text style={styles.testoAzioneSecondaria}>🔀 {t('ed_ordina')}</Text>
        </Pressable>
      )}
      <Pressable
        onPress={() => setVista('scegli')}
        testID="ed-aggiungi"
        style={({ pressed }) => [styles.azione, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        <Text style={styles.testoAzione}>＋ {t('ed_aggiungi')}</Text>
      </Pressable>
    </ScrollView>
  );

  // ---- vista "scegli le tappe" ----
  const scegli = (
    <View style={{ flex: 1 }}>
      <View style={styles.filtri}>
        <TextInput
          value={cerca}
          onChangeText={setCerca}
          placeholder={t('cercaSegnaposto')}
          placeholderTextColor="#94a3b8"
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          testID="ed-cerca"
          accessibilityLabel={t('cerca')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => setCategoria(null)} style={[styles.chip, !categoria && styles.chipAttivo]}>
            <Text style={[styles.testoChip, !categoria && { color: '#fff' }]}>{t('tutti')}</Text>
          </Pressable>
          {CATEGORIE.map((c) => {
            const attiva = categoria === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategoria(attiva ? null : c.id)}
                style={[styles.chip, attiva && { backgroundColor: c.colore, borderColor: c.colore }]}
              >
                <View style={[styles.pallino, { backgroundColor: attiva ? '#fff' : c.colore }]} />
                <Text style={[styles.testoChip, attiva && { color: '#fff' }]}>{t(`cat_${c.id}`)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {/* zona: tutte oppure un solo sestiere / isola (es. un giro a Dorsoduro vicino all'albergo) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { marginTop: 6 }]} keyboardShouldPersistTaps="handled">
          {[null, ...zone].map((z) => {
            const attiva = zona === z;
            return (
              <Pressable
                key={z || 'tutte'}
                onPress={() => setZona(z)}
                testID={`ed-zona-${z || 'tutte'}`}
                style={[styles.chip, styles.chipZona, attiva && styles.chipAttivo]}
                accessibilityRole="radio"
                accessibilityState={{ selected: attiva }}
              >
                <Text style={[styles.testoChip, styles.testoZona, attiva && { color: '#fff' }]}>{z ? `📍 ${z}` : t('tutteLeZone')}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {preferiti.some((id) => luoghiPerId[id] && !tappe.includes(id)) && (
          <Pressable onPress={aggiungiCuore} style={({ pressed }) => [styles.azioneSecondaria, { marginTop: 4 }, pressed && { opacity: 0.8 }]}>
            <Text style={styles.testoAzioneSecondaria}>
              <Text style={{ color: ROSSO_CUORE }}>{'♥︎'}</Text> {t('ed_cuore')}
            </Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={elenco}
        keyExtractor={(l) => l.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
        renderItem={({ item: l }) => {
          const n = tappe.indexOf(l.id);
          const scelto = n >= 0;
          return (
            <Pressable
              onPress={() => cambia(l.id)}
              testID={`ed-luogo-${l.id}`}
              style={({ pressed }) => [styles.luogo, pressed && { backgroundColor: '#f1f5f9' }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: scelto }}
            >
              <View style={[styles.pallinoGrande, { backgroundColor: coloreCategoria(l.categoria) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nomeLuogo} numberOfLines={1}>
                  {l.nome}
                </Text>
                {l.sestiere ? <Text style={styles.sestiere}>{l.sestiere}</Text> : null}
              </View>
              <View style={[styles.casella, scelto && styles.casellaScelta]}>
                {scelto && <Text style={styles.testoCasella}>{n + 1}</Text>}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );

  return (
    <Modal visible={visibile} animationType="slide" onRequestClose={indietro} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <View
        style={[
          styles.pagina,
          orizzontale && { paddingHorizontal: '12%' },
          { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
        ]}
      >
        <View style={styles.testata}>
          {vista === 'scegli'
            ? pulsanteTestata('‹', () => setVista('modifica'))
            : pulsanteTestata('✕', onChiudi, { testID: 'ed-annulla' })}
          <Text style={styles.titolo} numberOfLines={1}>
            {vista === 'scegli' ? t('ed_aggiungi') : iniziale?.id ? t('ed_modifica') : t('ed_nuovo')}
          </Text>
          {vista === 'scegli'
            ? pulsanteTestata(t('ed_fatto'), () => setVista('modifica'), { primario: true, testID: 'ed-fatto' })
            : pulsanteTestata(t('ed_salva'), salva, { attivo: puoiSalvare, primario: true, testID: 'ed-salva' })}
        </View>
        {vista === 'scegli' ? scegli : modifica}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: '#fff' },
  testata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titolo: { flex: 1, fontSize: 19, fontWeight: '800', color: BLU },
  pulsanteTestata: {
    minWidth: 38,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsantePrimario: { backgroundColor: BLU },
  testoPulsanteTestata: { fontSize: 16, fontWeight: '800', color: '#334155' },
  spento: { opacity: 0.4 },
  contenuto: { padding: 16, paddingBottom: 24 },
  etichetta: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 16,
  },
  rigaTappe: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  riepilogo: { fontSize: 14, fontWeight: '700', color: '#b45309' },
  suggerimento: { fontSize: 14, color: '#64748b', lineHeight: 19, marginBottom: 10 },
  tappa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  numero: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  testoNumero: { color: '#fff', fontSize: 12, fontWeight: '800' },
  nomeTappa: { flex: 1, fontSize: 15, color: '#1f2937' },
  freccia: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  testoFreccia: { fontSize: 13, color: '#334155', fontWeight: '800' },
  azione: { marginTop: 14, backgroundColor: BLU, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  testoAzione: { color: '#fff', fontSize: 16, fontWeight: '800' },
  azioneSecondaria: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  testoAzioneSecondaria: { color: BLU, fontSize: 15, fontWeight: '700' },
  filtri: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  chips: { gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipAttivo: { backgroundColor: BLU, borderColor: BLU },
  chipZona: { paddingVertical: 5 },
  testoZona: { fontSize: 13 },
  testoChip: { fontSize: 14, fontWeight: '600', color: '#334155' },
  pallino: { width: 9, height: 9, borderRadius: 5 },
  luogo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pallinoGrande: { width: 14, height: 14, borderRadius: 7 },
  nomeLuogo: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  sestiere: { fontSize: 12, color: '#64748b', marginTop: 1 },
  casella: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  casellaScelta: { backgroundColor: BLU, borderColor: BLU },
  testoCasella: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
