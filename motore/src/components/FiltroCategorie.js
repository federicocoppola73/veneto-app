import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORIE } from '../categorie';
import { GRIGIO_CUORE, ROSSO_CUORE, VERDE_VISITATO } from './Preferiti';

/**
 * Filtro a scelta multipla per tipologia.
 * - con tutte le tipologie attive, toccarne una mostra solo quella;
 * - poi ogni tocco aggiunge o toglie una tipologia;
 * - "Tutti" riattiva tutte le tipologie.
 * - "♥ Del cuore" mostra solo i luoghi del cuore ed è esclusivo: con il cuore acceso le tipologie sono spente;
 *   toccando una tipologia (o "Tutti") si torna al filtro per tipologia.
 * - "✓ Visitati" funziona come il cuore, per i luoghi segnati con "Ci sono stato".
 * Due righe: in alto le cose personali (Itinerari, Del cuore, Visitati), sotto "Tutti" e le tipologie (scorre di lato).
 * props: selezionate (array di id), conteggi ({ id: numero }), onCambia(nuovoArray), t, onItinerari,
 *        soloCuore (bool), nCuore (numero di luoghi del cuore), onCuore(),
 *        soloVisitati (bool), nVisitati (numero di luoghi visitati), onVisitati()
 */
export default function FiltroCategorie({
  selezionate,
  conteggi,
  onCambia,
  t,
  onItinerari,
  soloCuore,
  nCuore = 0,
  onCuore,
  soloVisitati,
  nVisitati = 0,
  onVisitati,
}) {
  const raccolta = soloCuore || soloVisitati; // un filtro personale acceso spegne le tipologie
  const tutte = !raccolta && selezionate.length === CATEGORIE.length;

  const tocca = (id) => {
    if (tutte || raccolta) return onCambia([id]);
    const attiva = selezionate.includes(id);
    const nuove = attiva ? selezionate.filter((c) => c !== id) : [...selezionate, id];
    // mantiene l'ordine delle categorie
    onCambia(CATEGORIE.map((c) => c.id).filter((c) => nuove.includes(c)));
  };

  return (
    <View style={styles.barra}>
      {/* riga 1: le cose personali */}
      <View style={styles.rigaPersonale}>
        {onItinerari && (
          <Pressable
            onPress={onItinerari}
            style={({ pressed }) => [styles.chip, styles.chipPersonale, styles.chipItinerari, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={t('itinerari')}
          >
            <Text style={styles.iconaItinerari}>🧭</Text>
            <Text style={[styles.testo, styles.testoRestringibile, styles.testoItinerari]} numberOfLines={1}>{t('itinerari')}</Text>
          </Pressable>
        )}
        {onCuore && (
          <Pressable
            onPress={onCuore}
            style={[styles.chip, styles.chipPersonale, soloCuore ? styles.chipCuoreAttivo : styles.chipSpento]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!soloCuore }}
            accessibilityLabel={`${t('filtroCuore')} (${nCuore})`}
          >
            <Text style={[styles.cuore, { color: soloCuore ? '#fff' : nCuore ? ROSSO_CUORE : GRIGIO_CUORE }]}>
              {nCuore ? '♥\uFE0E' : '♡\uFE0E'}
            </Text>
            <Text style={[styles.testo, styles.testoRestringibile, soloCuore ? styles.testoAttivo : styles.testoSpento]} numberOfLines={1}>
              {t('filtroCuore')}
            </Text>
            <Text style={[styles.numero, soloCuore ? styles.testoAttivo : styles.testoSpento]}>{nCuore}</Text>
          </Pressable>
        )}
        {onVisitati && (
          <Pressable
            onPress={onVisitati}
            testID="filtro-visitati"
            style={[styles.chip, styles.chipPersonale, soloVisitati ? styles.chipVisitatiAttivo : styles.chipSpento]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!soloVisitati }}
            accessibilityLabel={`${t('filtroVisitati')} (${nVisitati})`}
          >
            <Text style={[styles.spunta, { color: soloVisitati ? '#fff' : nVisitati ? VERDE_VISITATO : GRIGIO_CUORE }]}>
              {'✓\uFE0E'}
            </Text>
            <Text style={[styles.testo, styles.testoRestringibile, soloVisitati ? styles.testoAttivo : styles.testoSpento]} numberOfLines={1}>
              {t('filtroVisitati')}
            </Text>
            <Text style={[styles.numero, soloVisitati ? styles.testoAttivo : styles.testoSpento]}>{nVisitati}</Text>
          </Pressable>
        )}
      </View>
      {/* riga 2: "Tutti" e le tipologie */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.riga}>
        <Pressable
          onPress={() => onCambia(CATEGORIE.map((c) => c.id))}
          style={[styles.chip, tutte ? styles.chipTuttiAttivo : styles.chipSpento]}
          accessibilityRole="button"
          accessibilityState={{ selected: tutte }}
        >
          <Text style={[styles.testo, tutte ? styles.testoAttivo : styles.testoSpento]}>{t('tutti')}</Text>
        </Pressable>
        {CATEGORIE.map((c) => {
          const attiva = !raccolta && selezionate.includes(c.id);
          return (
            <Pressable
              key={c.id}
              onPress={() => tocca(c.id)}
              style={[styles.chip, attiva ? { backgroundColor: c.colore, borderColor: c.colore } : styles.chipSpento]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: attiva }}
              accessibilityLabel={t(`cat_${c.id}`)}
            >
              <View style={[styles.pallino, { backgroundColor: attiva ? '#fff' : c.colore }]} />
              <Text style={[styles.testo, attiva ? styles.testoAttivo : styles.testoSpento]}>
                {t(`cat_${c.id}`)}
              </Text>
              <Text style={[styles.numero, attiva ? styles.testoAttivo : styles.testoSpento]}>
                {conteggi[c.id] || 0}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  rigaPersonale: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8, gap: 8, alignItems: 'center' },
  riga: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipPersonale: { flexShrink: 1, minWidth: 0 }, // in riga 1 i pulsanti si stringono se lo schermo è stretto
  testoRestringibile: { flexShrink: 1 },
  chipSpento: { backgroundColor: '#fff', borderColor: '#cbd5e1' },
  chipItinerari: { backgroundColor: '#f3d98b', borderColor: '#e5b94a' },
  iconaItinerari: { fontSize: 14 },
  testoItinerari: { color: '#0f3d5e', fontWeight: '800' },
  chipTuttiAttivo: { backgroundColor: '#0f3d5e', borderColor: '#0f3d5e' },
  chipCuoreAttivo: { backgroundColor: ROSSO_CUORE, borderColor: ROSSO_CUORE },
  chipVisitatiAttivo: { backgroundColor: VERDE_VISITATO, borderColor: VERDE_VISITATO },
  spunta: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  cuore: { fontSize: 15, lineHeight: 18, fontWeight: '700' },
  pallino: { width: 13, height: 13, borderRadius: 7 },
  testo: { fontSize: 14, fontWeight: '600' },
  numero: { fontSize: 12, fontWeight: '700', opacity: 0.8 },
  testoAttivo: { color: '#fff' },
  testoSpento: { color: '#334155' },
});
