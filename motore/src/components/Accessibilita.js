import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { testoLocalizzato } from '../i18n';

// Accessibilità del luogo: icone accanto alla categoria nella scheda, con un popup al tocco.
// Si mostrano SOLO con dati controllati: nel luogo serve
//   "accessibilita": {
//     "fonte": "https://…",            indirizzo da cui viene l'informazione (obbligatorio)
//     "verificato": "2026-11-10",      data dell'ultimo controllo (obbligatoria)
//     "voci": { "motoria": { "it": "…", "en": "…" }, "ascensore": { … }, … }
//   }
// "non_accessibile": luogo non accessibile a persone con disabilità motoria (mobilità barrata, in rosso).
//   Basta true; con un testo localizzato { "it": "…" } la nota compare sotto la frase standard.
// Senza fonte o senza data di verifica non compare nessuna icona.
// Disegni originali in assets/icone/accessibilita/*.svg (griglia 64×64, solo contorno).

// ordine in cui compaiono le icone
export const TIPI_ACCESSIBILITA = ['non_accessibile', 'motoria', 'ascensore', 'visiva', 'tattile', 'uditiva', 'cognitiva', 'servizi'];

// tipi segnalati come limitazione (colore rosso al posto del blu)
const LIMITAZIONI = ['non_accessibile'];
export const ROSSO_LIMITAZIONE = '#b91c1c';

const DISEGNI = {
  motoria: () => (
    <>
      <Circle cx={25} cy={9.5} r={4.2} />
      <Path d="M23 18l-3 15 12 1 5 10" />
      <Path d="M20 27l-9 8" />
      <Path d="M31 34l8 2 4 9" />
      <Path d="M18 34a18 18 0 1 0 32 10" />
      <Path d="M24 46h15" />
    </>
  ),
  // mobilità barrata: stessa figura di "motoria" con una barra diagonale (alone bianco per staccarla dal disegno)
  non_accessibile: (colore) => (
    <>
      {DISEGNI.motoria()}
      <Path d="M8 8l48 48" stroke="#fff" strokeWidth={9} />
      <Path d="M8 8l48 48" stroke={colore} strokeWidth={4.4} />
    </>
  ),
  ascensore: () => (
    <>
      <Rect x={13} y={7} width={38} height={50} rx={4} />
      <Path d="M32 8v48M21 23l4-5 4 5M21 42l4 5 4-5M35 23l4-5 4 5M35 42l4 5 4-5" />
    </>
  ),
  visiva: (colore) => (
    <>
      <Path d="M5 32s9-16 27-16 27 16 27 16-9 16-27 16S5 32 5 32z" />
      <Circle cx={32} cy={32} r={8} />
      <Circle cx={32} cy={32} r={2} fill={colore} stroke="none" />
      <Path d="M49 9l-5 5M56 19l-6 2" />
    </>
  ),
  tattile: (colore) => (
    <>
      <Path d="M13 55V9M13 12h34l-7 9 7 9H13" />
      <Path d="M13 42h18" />
      <Circle cx={39} cy={43} r={2} fill={colore} stroke="none" />
      <Circle cx={47} cy={43} r={2} fill={colore} stroke="none" />
      <Circle cx={39} cy={51} r={2} fill={colore} stroke="none" />
      <Circle cx={47} cy={51} r={2} fill={colore} stroke="none" />
    </>
  ),
  uditiva: () => (
    <>
      <Path d="M17 27c0-11 7-18 17-18 10 0 17 7 17 17 0 8-4 12-9 17-3 3-4 6-5 10-1 4-4 6-8 6-5 0-8-3-8-8" />
      <Path d="M25 28c0-6 3-10 9-10 6 0 9 4 9 9 0 5-3 8-7 12-2 2-3 4-3 7" />
      <Path d="M31 28c0-2 1-3 3-3 2 0 3 1 3 3 0 2-1 3-3 5" />
    </>
  ),
  // servizi igienici: uomo e donna separati da una linea
  servizi: () => (
    <>
      <Path d="M32 8v48" />
      <Circle cx={18} cy={12} r={4.2} />
      <Rect x={11} y={21} width={14} height={17} rx={3} />
      <Path d="M15 38v16M21 38v16" />
      <Circle cx={46} cy={12} r={4.2} />
      <Path d="M46 21l-8 20h16z" />
      <Path d="M43 41v13M49 41v13" />
    </>
  ),
  cognitiva: () => (
    <>
      <Path d="M31 12c-3-5-11-5-14 1-7 0-11 8-7 14-4 6-1 14 6 16 0 7 8 11 14 7V12z" />
      <Path d="M33 12c3-5 11-5 14 1 7 0 11 8 7 14 4 6 1 14-6 16 0 7-8 11-14 7V12z" />
      <Path d="M20 23h5M18 33h8M22 42h5M39 23h5M38 33h8M38 42h5M32 13v39" />
    </>
  ),
};

export function IconaAccessibilita({ tipo, colore, misura = 20 }) {
  const disegno = DISEGNI[tipo];
  colore = colore || (LIMITAZIONI.includes(tipo) ? ROSSO_LIMITAZIONE : '#0f3d5e');
  if (!disegno) return null;
  return (
    <Svg width={misura} height={misura} viewBox="0 0 64 64">
      <G fill="none" stroke={colore} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round">
        {disegno(colore)}
      </G>
    </Svg>
  );
}

// voci da mostrare: solo con fonte e data di verifica, e solo i tipi conosciuti con un testo
// "non_accessibile" vale anche senza testo (true): nel popup c'è comunque la frase standard
export function vociAccessibilita(luogo, lingua) {
  const a = luogo?.accessibilita;
  if (!a || !a.fonte || !a.verificato || !a.voci) return [];
  const nonAccessibile = !!a.voci.non_accessibile;
  return TIPI_ACCESSIBILITA.filter((tipo) => !(nonAccessibile && tipo === 'motoria')) // le due cose si escludono
    .map((tipo) => {
      const valore = a.voci[tipo];
      const testo = valore === true ? '' : testoLocalizzato(valore, lingua).trim();
      return { tipo, testo, presente: tipo === 'non_accessibile' ? !!valore : !!testo };
    })
    .filter((v) => v.presente);
}

// "2026-11-10" → "10/11/2026"
function formattaData(data) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(data));
  if (!m) return String(data);
  return m[3] ? `${m[3]}/${m[2]}/${m[1]}` : `${m[2]}/${m[1]}`;
}

// Riga di icone (da mettere accanto alla categoria) + popup della voce toccata
export default function IconeAccessibilita({ luogo, lingua, t }) {
  const [aperta, setAperta] = useState(null);
  const voci = vociAccessibilita(luogo, lingua);
  if (voci.length === 0) return null;
  const voce = voci.find((v) => v.tipo === aperta);
  const { fonte, verificato } = luogo.accessibilita;

  return (
    <>
      <View style={styles.riga} testID="accessibilita-luogo">
        {voci.map((v) => (
          <Pressable
            key={v.tipo}
            onPress={() => setAperta(v.tipo)}
            hitSlop={6}
            testID={`accessibilita-${v.tipo}`}
            style={({ pressed }) => [styles.icona, LIMITAZIONI.includes(v.tipo) && styles.iconaLimitazione, pressed && { transform: [{ scale: 0.9 }], backgroundColor: '#e0ecf5' }]}
            accessibilityRole="button"
            accessibilityLabel={t(`acc_${v.tipo}`)}
            accessibilityHint={t('acc_tocca')}
          >
            <IconaAccessibilita tipo={v.tipo} misura={18} />
          </Pressable>
        ))}
      </View>

      {voce && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setAperta(null)}
          statusBarTranslucent
          supportedOrientations={['portrait', 'landscape']}
        >
          <Pressable style={styles.sfondo} onPress={() => setAperta(null)} accessibilityLabel={t('chiudi')} />
          <View style={styles.contenitore} pointerEvents="box-none">
            <View style={styles.box}>
              <View style={styles.testa}>
                <View style={[styles.iconaGrande, LIMITAZIONI.includes(voce.tipo) && styles.iconaGrandeLimitazione]}>
                  <IconaAccessibilita tipo={voce.tipo} misura={30} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sopratitolo}>{t('acc_titolo')}</Text>
                  <Text style={[styles.titolo, LIMITAZIONI.includes(voce.tipo) && { color: ROSSO_LIMITAZIONE }]}>
                    {t(`acc_${voce.tipo}`)}
                  </Text>
                </View>
                <Pressable onPress={() => setAperta(null)} hitSlop={10} accessibilityLabel={t('chiudi')} style={styles.chiudi}>
                  <Text style={styles.testoChiudi}>✕</Text>
                </Pressable>
              </View>
              {/* testi lunghi: scorrono dentro il riquadro */}
              <ScrollView style={styles.corpo} showsVerticalScrollIndicator={false}>
                {voce.tipo === 'non_accessibile' && <Text style={styles.testo}>{t('acc_non_accessibile_testo')}</Text>}
                {voce.testo ? (
                  <Text style={[styles.testo, voce.tipo === 'non_accessibile' && styles.nota]}>{voce.testo}</Text>
                ) : null}
              </ScrollView>
              <View style={styles.piede}>
                <Text style={styles.verificato}>✓ {t('acc_verificato').replace('{data}', formattaData(verificato))}</Text>
                <Pressable onPress={() => Linking.openURL(fonte).catch(() => {})} hitSlop={8} accessibilityRole="link">
                  <Text style={styles.fonte}>{t('acc_fonte')} ›</Text>
                </Pressable>
              </View>
              <Text style={styles.avviso}>{t('acc_avviso')}</Text>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  riga: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  icona: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconaLimitazione: { borderColor: '#fca5a5', backgroundColor: '#fff' },
  iconaGrandeLimitazione: { backgroundColor: '#fee2e2' },
  nota: { marginTop: 10, backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#f87171' },
  sfondo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  contenitore: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  testa: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconaGrande: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f0f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sopratitolo: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  titolo: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  chiudi: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  testoChiudi: { fontSize: 15, fontWeight: '700', color: '#475569' },
  corpo: { flexGrow: 0, flexShrink: 1 },
  testo: { fontSize: 15, lineHeight: 22, color: '#334155', marginTop: 14 },
  piede: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  verificato: { fontSize: 13, fontWeight: '600', color: '#15803d', flexShrink: 1 },
  fonte: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  avviso: { fontSize: 11, color: '#94a3b8', marginTop: 10, lineHeight: 15 },
});
