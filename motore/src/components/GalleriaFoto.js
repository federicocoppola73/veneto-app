import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import VisoreFoto from './VisoreFoto';

/**
 * Galleria della scheda: foto da scorrere con il dito, puntini sotto, contatore "2/4".
 * Toccando una foto si apre a schermo intero (VisoreFoto).
 * props: foto [{ source, autore, licenza, fonte }], altezza, t, children (pulsante di chiusura sopra la foto)
 */
export default function GalleriaFoto({ foto, altezza, t, children }) {
  const [larghezza, setLarghezza] = useState(0);
  const [indice, setIndice] = useState(0);
  const [visore, setVisore] = useState(null); // indice della foto aperta a schermo intero
  const pagine = foto.length;
  const corrente = foto[indice];

  const aggiornaIndice = (e) => {
    if (!larghezza) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / larghezza);
    if (i !== indice) setIndice(Math.max(0, Math.min(pagine - 1, i)));
  };

  return (
    <>
      <View style={[styles.box, { height: altezza }]} onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)}>
        {larghezza > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={aggiornaIndice}
            scrollEventThrottle={32}
            nestedScrollEnabled
          >
            {foto.map((f, i) => (
              <Pressable key={i} onPress={() => setVisore(i)} accessibilityRole="imagebutton" accessibilityLabel={`${t('foto')} ${i + 1}/${foto.length}`}>
                <Image source={f.source} style={{ width: larghezza, height: altezza }} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        )}
        {pagine > 1 && (
          <View style={styles.contatore} pointerEvents="none">
            <Text style={styles.testoContatore}>
              {indice + 1}/{foto.length}
            </Text>
          </View>
        )}
        {children}
      </View>

      {pagine > 1 && (
        <View style={styles.puntini}>
          {Array.from({ length: pagine }).map((_, i) => (
            <View
              key={i}
              style={[styles.puntino, i === indice && styles.puntinoAttivo]}
            />
          ))}
        </View>
      )}

      {corrente?.autore ? (
        <Text style={styles.crediti} onPress={() => corrente.fonte && Linking.openURL(corrente.fonte).catch(() => {})}>
          {t('foto')}: {corrente.autore}
          {corrente.licenza ? ` · ${corrente.licenza}` : ''} · Wikimedia Commons
        </Text>
      ) : (
        <View style={{ height: 12 }} />
      )}

      <VisoreFoto foto={foto} indice={visore ?? 0} visibile={visore != null} onChiudi={() => setVisore(null)} t={t} />
    </>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#e2ecf3' },
  contatore: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  testoContatore: { color: '#fff', fontSize: 12, fontWeight: '700' },
  puntini: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  puntino: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#cbd5e1' },
  puntinoAttivo: { backgroundColor: '#0f3d5e', width: 18 },
  crediti: { fontSize: 11, color: '#6b7280', marginTop: 6, marginBottom: 12 },
});
