import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { coloreCategoria } from '../categorie';
import { formattaDistanza } from '../distanza';
import { testoLocalizzato } from '../i18n';
import { iconaItinerario, passoItinerario } from '../itinerari';
import { formattaOra, oraVenezia, statoApertura, testoAperturaBreve, coloreApertura } from '../orari';

/**
 * Guida passo passo dell'itinerario (riquadro in basso sulla mappa).
 * props: itinerario, luoghiPerId, lingua, t, posizione { stato, puoiChiedere, attiva, apriImpostazioni },
 *        distanzaDaVenezia, prossima { id, indice, metri, stimato, arrivato } | null (finito),
 *        visitate (numero), adesso, onScheda(id), onVisitata, onSalta, onFine, larghezzaMax
 */
export default function GuidaItinerario({
  itinerario,
  luoghiPerId,
  lingua,
  t,
  posizione,
  distanzaDaVenezia,
  prossima,
  visitate,
  adesso,
  onScheda,
  onVisitata,
  onSalta,
  onFine,
  larghezzaMax,
}) {
  const totale = itinerario.tappe.length;
  let contenuto;

  if (!prossima) {
    contenuto = (
      <>
        <Text style={styles.fine}>🎉 {t('guida_finito')}</Text>
        <Pressable onPress={onFine} accessibilityRole="button" style={({ pressed }) => [styles.azione, pressed && { opacity: 0.85 }]}>
          <Text style={styles.testoAzione}>{t('guida_esci')}</Text>
        </Pressable>
      </>
    );
  } else {
    const luogo = luoghiPerId[prossima.id];
    let riga;
    if (posizione.stato === 'ricerca' || posizione.stato === 'spento') {
      riga = (
        <View style={styles.rigaStato}>
          <ActivityIndicator color="#1d4ed8" />
          <Text style={styles.messaggio}>{t('cercoPosizione')}</Text>
        </View>
      );
    } else if (posizione.stato === 'negato' || posizione.stato === 'errore') {
      const impostazioni = posizione.stato === 'negato' && !posizione.puoiChiedere;
      riga = (
        <View>
          <Text style={styles.messaggio}>{posizione.stato === 'negato' ? t('permessoNegato') : t('posizioneErrore')}</Text>
          <Pressable onPress={impostazioni ? posizione.apriImpostazioni : posizione.attiva} accessibilityRole="button">
            <Text style={styles.collegamento}>{impostazioni ? t('apriImpostazioni') : t('riprova')}</Text>
          </Pressable>
        </View>
      );
    } else if (distanzaDaVenezia != null) {
      riga = <Text style={styles.messaggio}>{t('guida_lontano').replace('{d}', formattaDistanza(distanzaDaVenezia, t))}</Text>;
    } else if (prossima.arrivato) {
      const s = statoApertura(luogo, adesso);
      riga = (
        <Text style={styles.arrivato}>
          📍 {t('guida_arrivato')}
          {s && s.tipo !== 'sempre' ? (
            <Text style={{ color: coloreApertura(s) }}>{` · ${testoAperturaBreve(s, t)}`}</Text>
          ) : null}
        </Text>
      );
    } else if (prossima.metri != null) {
      const minuti = Math.max(1, Math.round(prossima.metri / passoItinerario(itinerario)));
      const arrivo = new Date(adesso.getTime() + minuti * 60000);
      const s = statoApertura(luogo, arrivo);
      const chiusoAllArrivo = s && s.tipo === 'chiuso';
      riga = (
        <>
          <Text style={styles.distanza}>
            {prossima.stimato ? `${t('circa')} ` : ''}
            {formattaDistanza(prossima.metri, t)} · {minuti} min ·{' '}
            {t('guida_arrivo').replace('{h}', formattaOra(oraVenezia(arrivo).minuti))}
          </Text>
          {s && s.tipo !== 'sempre' && (
            <Text style={[styles.apertura, { color: coloreApertura(s) }]}>
              {chiusoAllArrivo ? `⚠ ${t('guida_chiusoArrivo')} · ` : ''}
              {testoAperturaBreve(s, t)}
            </Text>
          )}
        </>
      );
    }

    contenuto = (
      <>
        <Pressable onPress={() => onScheda(prossima.id)} style={styles.tappa} accessibilityRole="button">
          <View style={[styles.numero, { backgroundColor: coloreCategoria(luogo?.categoria) }]}>
            <Text style={styles.testoNumero}>{prossima.indice + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.etichetta}>{prossima.arrivato ? t('guida_qui') : t('guida_prossima')}</Text>
            <Text style={styles.nome} numberOfLines={1}>
              {luogo?.nome}
            </Text>
          </View>
          <Text style={styles.freccia}>›</Text>
        </Pressable>
        {riga}
        <View style={styles.bottoni}>
          <Pressable onPress={onVisitata} accessibilityRole="button" style={({ pressed }) => [styles.azione, pressed && { opacity: 0.85 }]}>
            <Text style={styles.testoAzione}>
              {prossima.indice + 1 < totale ? `✓ ${t('guida_avanti')}` : `✓ ${t('guida_ultima')}`}
            </Text>
          </Pressable>
          {!prossima.arrivato && prossima.indice + 1 < totale && (
            <Pressable onPress={onSalta} accessibilityRole="button" style={({ pressed }) => [styles.secondario, pressed && { opacity: 0.7 }]}>
              <Text style={styles.testoSecondario}>{t('guida_salta')}</Text>
            </Pressable>
          )}
        </View>
      </>
    );
  }

  return (
    <View style={[styles.riquadro, larghezzaMax ? { maxWidth: larghezzaMax } : null]}>
      <View style={styles.intestazione}>
        <Text style={styles.titolo} numberOfLines={1}>
          {iconaItinerario(itinerario)} {testoLocalizzato(itinerario.titolo, lingua)} · {Math.min(visitate, totale)}/{totale}
        </Text>
        <Pressable onPress={onFine} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('guida_esci')}>
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
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  intestazione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  titolo: { flex: 1, fontSize: 12, fontWeight: '800', color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.4 },
  chiudi: { fontSize: 14, color: '#64748b', paddingHorizontal: 4 },
  tappa: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numero: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  testoNumero: { color: '#fff', fontSize: 14, fontWeight: '800' },
  etichetta: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  nome: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  freccia: { fontSize: 24, color: '#94a3b8', paddingHorizontal: 4 },
  distanza: { marginTop: 6, fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  apertura: { marginTop: 2, fontSize: 13, fontWeight: '600' },
  arrivato: { marginTop: 6, fontSize: 14, fontWeight: '700', color: '#15803d' },
  rigaStato: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  messaggio: { marginTop: 6, fontSize: 14, color: '#334155', lineHeight: 19, flexShrink: 1 },
  collegamento: { marginTop: 4, color: '#1d4ed8', fontWeight: '700' },
  bottoni: { flexDirection: 'row', gap: 8, marginTop: 9, alignItems: 'center' },
  azione: { backgroundColor: '#0f3d5e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  testoAzione: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondario: { paddingHorizontal: 10, paddingVertical: 8 },
  testoSecondario: { color: '#475569', fontWeight: '700', fontSize: 14 },
  fine: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
});
