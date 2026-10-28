import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { testoDistanza } from '../distanza';
import { tipoServizio } from '../servizi';
import { testoLocalizzato } from '../i18n';
import { fermataVicina, lineeDellaFermata, URL_ORARI_NAVIGAZIONE } from '../vaporetti';
import FermataVaporetto, { TarghettaLinea } from './FermataVaporetto';

/**
 * Piccola scheda di un servizio (fontanella, bagno, farmacia, parcheggio, fermata del vaporetto).
 * props: servizio, t, lingua, onChiudi, distanza (metri a piedi dall'utente, già calcolati lungo le calli) | null
 */
export default function SchedaServizio({ servizio, t, lingua, onChiudi, distanza }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // per le fermate del vaporetto: fermata ACTV corrispondente (la più vicina) e pannello linee aperto
  const fermataActv = useMemo(
    () => (servizio?.tipo === 'vaporetto' ? fermataVicina(servizio.lat, servizio.lon) : null),
    [servizio]
  );
  const lineeActv = fermataActv ? lineeDellaFermata(fermataActv) : [];
  const [lineeAperte, setLineeAperte] = useState(false);
  useEffect(() => setLineeAperte(false), [servizio?.id]);
  if (!servizio) return null;
  const tipo = tipoServizio(servizio.tipo);
  const titolo = servizio.nome || t(`${tipo.chiave}_uno`);
  const portami = () =>
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${servizio.lat},${servizio.lon}&travelmode=walking`
    ).catch(() => {});

  const dettagli = [];
  if (servizio.tipo === 'acqua') dettagli.push(t('srv_acquaNota'));
  if (servizio.tipo === 'bagni') dettagli.push(servizio.pagamento ? t('srv_pagamento') : t('srv_pagamentoForse'));
  if (servizio.disabili) dettagli.push(`♿ ${t('srv_accessibile')}`);
  if (servizio.prontoSoccorso) dettagli.push(`🚑 ${t('srv_prontoSoccorso')}`);
  if (servizio.tipo === 'ospedali' && !servizio.prontoSoccorso) dettagli.push(t('srv_noPronto'));
  if (servizio.orari) dettagli.push(`🕘 ${servizio.orari === '24/7' ? t('srv_24ore') : servizio.orari}`);
  if (servizio.nota) dettagli.push(testoLocalizzato(servizio.nota, lingua));
  const emergenza = servizio.tipo === 'polizia' || servizio.tipo === 'ospedali';
  const chiama = (n) => Linking.openURL(`tel:${n.replace(/\s/g, '')}`).catch(() => {});

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <Pressable style={styles.sfondo} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
      <View style={[styles.scheda, { paddingBottom: 18 + insets.bottom }]}>
        <View style={styles.maniglia} />
        {lineeAperte ? (
          <FermataVaporetto
            fermataId={fermataActv}
            t={t}
            onIndietro={() => setLineeAperte(false)}
            altezza={Math.round(height * 0.86) - 30 - insets.bottom}
          />
        ) : (
        <>
        <View style={styles.testata}>
          <View style={[styles.icona, { borderColor: tipo.colore }]}>
            <Text style={[styles.testoIcona, { color: tipo.colore }]}>{tipo.icona}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {servizio.nome ? <Text style={[styles.tipo, { color: tipo.colore }]}>{t(`${tipo.chiave}_uno`)}</Text> : null}
            <Text style={styles.nome}>{titolo}</Text>
          </View>
          <Pressable onPress={onChiudi} style={styles.chiudi} hitSlop={8} accessibilityLabel={t('chiudi')}>
            <Text style={styles.testoChiudi}>✕</Text>
          </Pressable>
        </View>

        {distanza != null && <Text style={styles.distanza}>{`${testoDistanza(distanza, t)} ${t('daTe')}`}</Text>}

        {lineeActv.length > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.blocco, styles.lineeActv, pressed && { opacity: 0.7 }]}
            onPress={() => setLineeAperte(true)}
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.etichetta}>{t('srv_linee')}</Text>
              <View style={styles.linee}>
                {lineeActv.map((l) => (
                  <TarghettaLinea key={l.id} linea={l} piccola />
                ))}
              </View>
              <Text style={styles.apriLinee}>{t('vap_percorsi')} ›</Text>
            </View>
          </Pressable>
        ) : servizio.linee?.length > 0 && (
          <View style={styles.blocco}>
            <Text style={styles.etichetta}>{t('srv_linee')}</Text>
            <View style={styles.linee}>
              {servizio.linee.map((l) => (
                <View key={l} style={styles.linea}>
                  <Text style={styles.testoLinea}>{l}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.nota}>{t('srv_lineeNota')}</Text>
          </View>
        )}

        {dettagli.map((d) => (
          <Text key={d} style={styles.dettaglio}>
            {d}
          </Text>
        ))}

        {emergenza && (
          <Pressable
            style={({ pressed }) => [styles.emergenza, pressed && { opacity: 0.85 }]}
            onPress={() => chiama('112')}
            accessibilityRole="button"
          >
            <Text style={styles.testoEmergenza}>📞 112</Text>
            <Text style={styles.notaEmergenza}>{t('srv_112')}</Text>
          </Pressable>
        )}
        {servizio.telefono ? (
          <Pressable onPress={() => chiama(servizio.telefono)} accessibilityRole="button">
            <Text style={styles.collegamento}>📞 {servizio.telefono}</Text>
          </Pressable>
        ) : null}

        <Pressable style={({ pressed }) => [styles.bottone, pressed && { opacity: 0.85 }]} onPress={portami}>
          <Text style={styles.testoBottone}>🧭 {t('portamiLi')}</Text>
        </Pressable>
        {servizio.tipo === 'vaporetto' && (
          <Pressable onPress={() => Linking.openURL(URL_ORARI_NAVIGAZIONE).catch(() => {})}>
            <Text style={styles.collegamento}>{t('vap_orariTutte')} ›</Text>
          </Pressable>
        )}
        </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  scheda: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
  },
  maniglia: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', marginTop: 8, marginBottom: 10 },
  testata: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icona: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  testoIcona: { fontSize: 17, fontWeight: '800' },
  tipo: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  nome: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  chiudi: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  testoChiudi: { fontSize: 16, color: '#334155', fontWeight: '700' },
  distanza: { marginTop: 10, fontSize: 14, color: '#1d4ed8', fontWeight: '600' },
  blocco: { marginTop: 12 },
  etichetta: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  linee: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  linea: { minWidth: 34, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#1e40af', alignItems: 'center' },
  testoLinea: { color: '#fff', fontWeight: '800', fontSize: 14 },
  nota: { fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 17 },
  lineeActv: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12 },
  apriLinee: { marginTop: 8, color: '#1d4ed8', fontWeight: '700', fontSize: 14 },
  dettaglio: { marginTop: 8, fontSize: 14, color: '#334155', lineHeight: 20 },
  emergenza: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  testoEmergenza: { fontSize: 20, fontWeight: '900', color: '#b91c1c' },
  notaEmergenza: { flex: 1, fontSize: 13, color: '#7f1d1d', lineHeight: 18 },
  bottone: { marginTop: 16, backgroundColor: '#0f3d5e', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  testoBottone: { color: '#fff', fontWeight: '700', fontSize: 15 },
  collegamento: { marginTop: 10, textAlign: 'center', color: '#1d4ed8', fontWeight: '600' },
});
