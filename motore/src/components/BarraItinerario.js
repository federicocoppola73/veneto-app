import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { coloreCategoria } from '../categorie';
import { testoLocalizzato } from '../i18n';
import { iconaItinerario, PARTENZE, testoLunghezza } from '../itinerari';
import { coloreApertura, statoApertura } from '../orari';

/**
 * Barra sotto l'intestazione mentre un itinerario è attivo (prende il posto dei filtri):
 * nome, lunghezza dalla partenza scelta e tappe numerate (tocca una tappa per aprirla).
 * Il pallino accanto a ogni tappa dice se adesso è aperta (verde), chiude a breve (arancio) o è chiusa (rosso).
 * props: itinerario, luoghiPerId, lingua, t, partenza, lunghezza, onTappa(id), onCambia, onEsci,
 *        adesso, guida (true se la guida passo passo è attiva), onGuida, visitate (array di id)
 */
export default function BarraItinerario({
  itinerario,
  luoghiPerId,
  lingua,
  t,
  partenza,
  lunghezza,
  onTappa,
  onCambia,
  onEsci,
  adesso,
  guida,
  onGuida,
  visitate = [],
}) {
  const p = PARTENZE.find((x) => x.id === partenza);
  const l = lunghezza || { metri: itinerario.metri };
  return (
    <View style={styles.barra}>
      <View style={styles.testata}>
        <Pressable onPress={onCambia} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={t('cambiaItinerario')}>
          <Text style={styles.titolo} numberOfLines={1}>
            {iconaItinerario(itinerario)} {testoLocalizzato(itinerario.titolo, lingua)}
          </Text>
          <Text style={styles.dettaglio} numberOfLines={1}>
            {testoLunghezza(l, t, itinerario.nautico)}
            {p && !l.soloItinerario ? ` · ${p.id === 'posizione' ? t('daTuaPosizione') : `${t('daPartenza')} ${t(p.chiave)}`}` : ''}
          </Text>
        </Pressable>
        {!guida && (
          <Pressable
            onPress={onGuida}
            style={({ pressed }) => [styles.pulsanteGuida, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={styles.testoPulsanteGuida}>▶ {t('guida_inizia')}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onCambia}
          style={({ pressed }) => [styles.pulsante, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
        >
          <Text style={styles.testoPulsante}>{t('cambiaItinerario')}</Text>
        </Pressable>
        <Pressable
          onPress={onEsci}
          style={({ pressed }) => [styles.esci, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={t('esciItinerario')}
          hitSlop={6}
        >
          <Text style={styles.testoEsci}>✕</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tappe}>
        {itinerario.tappe.map((id, i) => {
          const luogo = luoghiPerId[id];
          const ap = luogo ? statoApertura(luogo, adesso) : null;
          const fatta = visitate.includes(id);
          return (
            <Pressable
              key={id}
              onPress={() => onTappa(id)}
              style={({ pressed }) => [styles.tappa, pressed && { backgroundColor: '#e0eef7' }]}
              accessibilityRole="button"
            >
              <View style={[styles.numero, { backgroundColor: fatta ? '#94a3b8' : coloreCategoria(luogo?.categoria) }]}>
                <Text style={styles.testoNumero}>{fatta ? '✓' : i + 1}</Text>
              </View>
              <Text style={[styles.nome, fatta && styles.nomeFatto]} numberOfLines={1}>
                {luogo?.nome || id}
              </Text>
              {ap && ap.tipo !== 'sempre' && <View style={[styles.pallinoAp, { backgroundColor: coloreApertura(ap) }]} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingTop: 8 },
  testata: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  titolo: { fontSize: 16, fontWeight: '800', color: '#0f3d5e' },
  dettaglio: { fontSize: 13, fontWeight: '600', color: '#b45309', marginTop: 1 },
  pulsante: { borderRadius: 999, borderWidth: 1.5, borderColor: '#0f3d5e', paddingHorizontal: 12, paddingVertical: 5 },
  testoPulsante: { fontSize: 13, fontWeight: '700', color: '#0f3d5e' },
  esci: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  testoEsci: { fontSize: 15, fontWeight: '700', color: '#334155' },
  tappe: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tappa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    maxWidth: 220,
  },
  numero: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  testoNumero: { color: '#fff', fontSize: 11, fontWeight: '800' },
  nome: { fontSize: 13, fontWeight: '600', color: '#1f2937', flexShrink: 1 },
  nomeFatto: { color: '#94a3b8', textDecorationLine: 'line-through' },
  pallinoAp: { width: 8, height: 8, borderRadius: 4 },
  pulsanteGuida: { borderRadius: 999, backgroundColor: '#0f3d5e', paddingHorizontal: 12, paddingVertical: 6 },
  testoPulsanteGuida: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
