import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TarghettaLinea } from './FermataVaporetto';
import { fermateAutobusVicine, fermateVaporettoVicine } from '../vaporetti';
import { BLU_LUOGO } from './ListaLuoghiSalvati';

const RAGGIO = 300; // metri

/**
 * Finestrella sulla mappa con un luogo salvato: descrizione, mezzi pubblici entro 300 m e "Portami lì".
 * props: luogo { descrizione, latitudine, longitudine }, t, onChiudi, onPortami
 */
export default function SchedaLuogoSalvato({ luogo, t, onChiudi, onPortami }) {
  const { vaporetti, bus } = useMemo(
    () => ({
      vaporetti: fermateVaporettoVicine(luogo.latitudine, luogo.longitudine, RAGGIO),
      bus: fermateAutobusVicine(luogo.latitudine, luogo.longitudine, RAGGIO, 10),
    }),
    [luogo.latitudine, luogo.longitudine]
  );
  const vuoto = vaporetti.length === 0 && bus.length === 0;

  return (
    <View style={styles.contenitore} pointerEvents="box-none">
      <View style={styles.finestra}>
        <View style={styles.intestazione}>
          <Text style={styles.pin}>📍</Text>
          <Text style={styles.titolo} numberOfLines={2}>{luogo.descrizione}</Text>
          <Pressable onPress={onChiudi} hitSlop={10} accessibilityLabel={t('ls_chiudi')}>
            <Text style={styles.chiudi}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.etichetta}>{t('ls_mezzi')}</Text>
        <ScrollView style={styles.elenco} contentContainerStyle={{ gap: 8 }}>
          {vuoto ? <Text style={styles.nessuno}>{t('ls_nessunMezzo')}</Text> : null}
          {vaporetti.map((f) => (
            <View key={`v-${f.id}`} style={styles.fermata}>
              <Text style={styles.nomeFermata}>⛴ {f.testo}</Text>
              <View style={styles.targhette}>
                {f.linee.slice(0, 6).map((l) => (
                  <TarghettaLinea key={l.id} linea={l} piccola />
                ))}
              </View>
            </View>
          ))}
          {bus.map((f) => (
            <View key={`b-${f.id}`} style={styles.fermata}>
              <Text style={styles.nomeFermata}>🚌 {f.testo}</Text>
              <View style={styles.targhette}>
                {f.lineeBus.slice(0, 6).map((l) => (
                  <TarghettaLinea key={l.id} linea={l} piccola />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <Pressable onPress={onPortami} style={({ pressed }) => [styles.portami, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Text style={styles.testoPortami}>{t('ls_portami')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  finestra: { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 10, maxHeight: 320, shadowColor: '#0f172a', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  intestazione: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pin: { fontSize: 20 },
  titolo: { flex: 1, color: '#0f172a', fontSize: 18, fontWeight: '800' },
  chiudi: { color: '#64748b', fontSize: 20, paddingHorizontal: 4 },
  etichetta: { color: BLU_LUOGO, fontSize: 13, fontWeight: '800' },
  elenco: { maxHeight: 180 },
  nessuno: { color: '#64748b', fontSize: 14 },
  fermata: { gap: 4 },
  nomeFermata: { color: '#0f172a', fontSize: 15, fontWeight: '600' },
  targhette: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  portami: { backgroundColor: BLU_LUOGO, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  testoPortami: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
