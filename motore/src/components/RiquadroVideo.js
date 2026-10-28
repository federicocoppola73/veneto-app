import React, { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Riquadro del video sotto la descrizione: miniatura con ▶, titolo, canale e durata.
 * Toccandolo si apre il video su YouTube (serve internet; senza connessione la miniatura
 * non si carica e resta il riquadro con il testo).
 * props: video { id, titolo, canale, durata }, t
 */
export default function RiquadroVideo({ video, t }) {
  const [errore, setErrore] = useState(false);
  if (!video?.id) return null;
  const apri = () => Linking.openURL(`https://www.youtube.com/watch?v=${video.id}`).catch(() => {});
  return (
    <Pressable
      onPress={apri}
      style={({ pressed }) => [styles.riquadro, pressed && { opacity: 0.85 }]}
      accessibilityRole="link"
      accessibilityLabel={`${t('video_guarda')}: ${video.titolo || ''}`}
    >
      <View style={styles.miniatura}>
        {!errore ? (
          <Image
            source={{ uri: `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setErrore(true)}
          />
        ) : null}
        <View style={styles.play}>
          <Text style={styles.triangolo}>▶</Text>
        </View>
      </View>
      <View style={styles.testi}>
        <Text style={styles.titolo} numberOfLines={2}>
          {video.titolo || t('video')}
        </Text>
        <Text style={styles.dettaglio} numberOfLines={1}>
          {[video.canale, video.durata].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.link}>{t('video_youtube')} ›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  riquadro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  miniatura: {
    width: 128,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: 36,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(220,38,38,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triangolo: { color: '#fff', fontSize: 13, marginLeft: 2 },
  testi: { flex: 1, gap: 2 },
  titolo: { fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 18 },
  dettaglio: { fontSize: 12, color: '#64748b' },
  link: { fontSize: 12, color: '#dc2626', fontWeight: '700', marginTop: 2 },
});
