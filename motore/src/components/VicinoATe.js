import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { coloreCategoria } from '../categorie';
import { formattaDistanza, testoDistanza } from '../distanza';

/**
 * Riquadro in basso sulla mappa, visibile quando il pulsante 📍 è attivo:
 * mostra i luoghi più vicini all'utente (tra le tipologie selezionate) oppure lo stato del GPS.
 * props: stato, puoiChiedere, vicini [{ luogo, metri }], distanzaDaVenezia (metri, se l'utente è lontano),
 *        t, onScegli(id), onChiudi, onRiprova, onImpostazioni, larghezzaMax
 */
export default function VicinoATe({
  stato,
  puoiChiedere,
  vicini,
  distanzaDaVenezia,
  t,
  onScegli,
  onChiudi,
  onRiprova,
  onImpostazioni,
  larghezzaMax,
}) {
  if (stato === 'spento') return null;

  let contenuto;
  if (stato === 'ricerca') {
    contenuto = (
      <View style={styles.riga}>
        <ActivityIndicator color="#1d4ed8" />
        <Text style={styles.messaggio}>{t('cercoPosizione')}</Text>
      </View>
    );
  } else if (stato === 'negato' || stato === 'errore') {
    const negato = stato === 'negato';
    contenuto = (
      <>
        <Text style={styles.messaggio}>{negato ? t('permessoNegato') : t('posizioneErrore')}</Text>
        <Pressable
          onPress={negato && !puoiChiedere ? onImpostazioni : onRiprova}
          style={({ pressed }) => [styles.azione, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.testoAzione}>{negato && !puoiChiedere ? t('apriImpostazioni') : t('riprova')}</Text>
        </Pressable>
      </>
    );
  } else if (distanzaDaVenezia != null) {
    contenuto = (
      <Text style={styles.messaggio}>{t('fuoriMappa').replace('{d}', formattaDistanza(distanzaDaVenezia, t))}</Text>
    );
  } else if (vicini.length === 0) {
    contenuto = <Text style={styles.messaggio}>{t('nessunVicino')}</Text>;
  } else {
    contenuto = vicini.map(({ luogo, metri }) => (
      <Pressable
        key={luogo.id}
        onPress={() => onScegli(luogo.id)}
        style={({ pressed }) => [styles.voce, pressed && { backgroundColor: '#eff6ff' }]}
        accessibilityRole="button"
      >
        <View style={[styles.pallino, { backgroundColor: coloreCategoria(luogo.categoria) }]} />
        <Text style={styles.nome} numberOfLines={1}>
          {luogo.nome}
        </Text>
        <Text style={styles.distanza}>{testoDistanza(metri, t)}</Text>
      </Pressable>
    ));
  }

  return (
    <View style={[styles.riquadro, larghezzaMax ? { maxWidth: larghezzaMax } : null]}>
      <View style={styles.intestazione}>
        <Text style={styles.titolo}>📍 {t('vicinoATe')}</Text>
        <Pressable onPress={onChiudi} hitSlop={10} accessibilityLabel={t('chiudi')}>
          <Text style={styles.chiudi}>✕</Text>
        </Pressable>
      </View>
      {contenuto}
    </View>
  );
}

const styles = StyleSheet.create({
  riquadro: {
    position: 'absolute',
    left: 12,
    right: 68,
    bottom: 30,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  intestazione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  titolo: { fontSize: 13, fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.4 },
  chiudi: { fontSize: 14, color: '#64748b', paddingHorizontal: 4 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  messaggio: { fontSize: 14, color: '#334155', lineHeight: 19, flexShrink: 1 },
  azione: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  testoAzione: { color: '#fff', fontWeight: '700', fontSize: 14 },
  voce: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderRadius: 8 },
  pallino: { width: 11, height: 11, borderRadius: 6 },
  nome: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  distanza: { fontSize: 13, color: '#475569' },
});
