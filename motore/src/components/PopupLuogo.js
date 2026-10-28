import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coloreCategoria } from '../categorie';
import { testoDistanza } from '../distanza';
import { formattaBiglietto, formattaGiorni, formattaOre, formattaPeriodo, giornoLungo } from '../formato';
import { testoLocalizzato } from '../i18n';
import { coloreApertura, statoApertura, testoApertura } from '../orari';
import IMMAGINI, { GALLERIA } from '../immagini';
import GalleriaFoto from './GalleriaFoto';
import RiquadroVideo from './RiquadroVideo';
import { GRIGIO_CUORE, ROSSO_CUORE, VERDE_VISITATO } from './Preferiti';
import FermataVaporetto, { TarghettaLinea } from './FermataVaporetto';
import CondividiLuogo from './CondividiLuogo';
import LoSapeviChe from './LoSapeviChe';
import AguzzaLaVista from './AguzzaLaVista';
import { domandePerLuogo } from '../aguzza';
import IconaCondividi from './IconaCondividi';
import PulsanteCopia from './PulsanteCopia';
import { testoLuogo } from '../copia';
import { linkWikipedia } from '../wikipedia';
import { fermateDelLuogo, lineaVaporetto, lineeAutobusDellaFermata, lineeDellaFermata } from '../vaporetti';

const MAX_TARGHETTE = 6; // targhette delle linee mostrate accanto al nome della fermata

// Scheda del luogo: si apre dal basso quando si tocca un pallino sulla mappa
// distanza: metri dall'utente (se la posizione è attiva); preferito / onPreferito: cuore dei luoghi del cuore;
// visitato / onVisitato: spunta "Ci sono stato"
export default function PopupLuogo({ luogo, lingua, t, onChiudi, distanza, preferito, onPreferito, visitato, onVisitato }) {
  const { width, height } = useWindowDimensions();
  // in orizzontale la scheda si apre di lato, così la mappa resta visibile
  const orizzontale = width > height;
  const insets = useSafeAreaInsets();
  // fermata del vaporetto aperta al posto della scheda: { id, linea }
  const [fermataAperta, setFermataAperta] = useState(null);
  useEffect(() => setFermataAperta(null), [luogo?.id]);
  // cartolina da condividere (anteprima + menu di condivisione)
  const [condividi, setCondividi] = useState(false);
  useEffect(() => setCondividi(false), [luogo?.id]);
  // foglio "Lo sapevi che?" del luogo aperto
  const [loSapevi, setLoSapevi] = useState(false);
  useEffect(() => setLoSapevi(false), [luogo?.id]);
  // domande "Aguzza la vista" del luogo aperto
  const [aguzza, setAguzza] = useState(false);
  useEffect(() => setAguzza(false), [luogo?.id]);
  if (!luogo) return null;

  // foto principale + foto della galleria, ognuna con i suoi crediti
  const fotoGalleria = [
    ...(IMMAGINI[luogo.id] ? [{ source: IMMAGINI[luogo.id], ...(luogo.immagine || {}) }] : []),
    ...(GALLERIA[luogo.id] || []).map((source, i) => ({ source, ...((luogo.galleria || [])[i] || {}) })),
  ];
  const colore = coloreCategoria(luogo.categoria);
  const descrizione = testoLocalizzato(luogo.descrizione, lingua);
  const nota = testoLocalizzato(luogo.nota, lingua);
  const biglietto = formattaBiglietto(luogo.biglietto, t);
  const notaBiglietto = luogo.biglietto?.nota ? t(luogo.biglietto.nota) : '';
  const orari = luogo.orari || [];
  const apertura = statoApertura(luogo);
  const haInfo = orari.length > 0 || biglietto || notaBiglietto || (luogo.chiuso || []).length > 0;

  const apri = (url) => url && Linking.openURL(url).catch(() => {});
  // A Venezia ci si muove a piedi: indicazioni pedonali
  const apriNavigatore = () =>
    apri(
      `https://www.google.com/maps/dir/?api=1&destination=${luogo.latitudine},${luogo.longitudine}&travelmode=walking`
    );

  const pulsanteChiudi = (
    <Pressable style={styles.chiudi} onPress={onChiudi} hitSlop={10} accessibilityLabel={t('chiudi')}>
      <Text style={styles.testoChiudi}>✕</Text>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi} statusBarTranslucent supportedOrientations={["portrait", "landscape"]}>
      <Pressable style={styles.sfondo} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
      <View
        style={[
          styles.scheda,
          orizzontale ? [styles.schedaLaterale, { width: Math.min(480, width * 0.55) }] : styles.schedaInBasso,
        ]}
      >
        {!orizzontale && <View style={styles.maniglia} />}
        {fermataAperta ? (
          <View style={[styles.contenuto, { paddingBottom: 12 + insets.bottom }]}>
            <FermataVaporetto
              key={`${fermataAperta.id}-${fermataAperta.linea || ''}`}
              fermataId={fermataAperta.id}
              lineaIniziale={fermataAperta.linea}
              t={t}
              onIndietro={() => setFermataAperta(null)}
              altezza={orizzontale ? height - 40 - insets.bottom : Math.round(height * 0.86) - 30 - insets.bottom}
            />
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={[styles.contenuto, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {fotoGalleria.length > 0 ? (
            <GalleriaFoto key={luogo.id} foto={fotoGalleria} altezza={orizzontale ? 170 : 230} t={t}>
              {pulsanteChiudi}
            </GalleriaFoto>
          ) : (
            <View style={[styles.boxImmagine, orizzontale && styles.boxImmagineBassa, { marginBottom: 12 }]}>
              <View style={[StyleSheet.absoluteFill, styles.segnaposto]}>
                <Text style={styles.testoSegnaposto}>{t('immagineNonDisponibile')}</Text>
              </View>
              {pulsanteChiudi}
            </View>
          )}

          <View style={[styles.badge, { backgroundColor: colore }]}>
            <Text style={styles.testoBadge}>{t(`cat_${luogo.categoria}`)}</Text>
          </View>
          <View style={styles.rigaNome}>
            <Text style={[styles.nome, { flex: 1 }]}>{luogo.nome}</Text>
            {onPreferito && (
              <Pressable
                onPress={() => onPreferito(luogo.id)}
                hitSlop={10}
                style={({ pressed }) => [styles.cuore, preferito && styles.cuoreAttivo, pressed && { transform: [{ scale: 0.9 }] }]}
                accessibilityRole="button"
                accessibilityState={{ selected: !!preferito }}
                accessibilityLabel={preferito ? t('pref_togli') : t('pref_aggiungi')}
              >
                <Text style={[styles.testoCuore, { color: preferito ? ROSSO_CUORE : GRIGIO_CUORE }]}>{'♥\uFE0E'}</Text>
              </Pressable>
            )}
            {onVisitato && (
              <Pressable
                onPress={() => onVisitato(luogo.id)}
                hitSlop={10}
                testID="ci-sono-stato"
                style={({ pressed }) => [styles.cuore, visitato && styles.visitatoAttivo, pressed && { transform: [{ scale: 0.9 }] }]}
                accessibilityRole="button"
                accessibilityState={{ selected: !!visitato }}
                accessibilityLabel={visitato ? t('vis_togli') : t('vis_aggiungi')}
              >
                <Text style={[styles.testoVisitato, { color: visitato ? '#fff' : GRIGIO_CUORE }]}>{'✓\uFE0E'}</Text>
              </Pressable>
            )}
            <PulsanteCopia testo={testoLuogo(luogo, lingua)} t={t} style={styles.cuore} />
            <Pressable
              onPress={() => setCondividi(true)}
              hitSlop={10}
              style={({ pressed }) => [styles.cuore, pressed && { transform: [{ scale: 0.9 }] }]}
              accessibilityRole="button"
              accessibilityLabel={t('cond_condividi')}
            >
              <IconaCondividi />
            </Pressable>
          </View>
          <Text style={styles.sestiere}>
            📍 {luogo.sestiere}
            {distanza != null ? (
              <Text style={styles.distanza}>{`  ·  ${testoDistanza(distanza, t)} ${t('daTe')}`}</Text>
            ) : null}
          </Text>

          {apertura && (
            <View style={[styles.apertura, { borderColor: coloreApertura(apertura) }]}>
              <View style={[styles.pallinoApertura, { backgroundColor: coloreApertura(apertura) }]} />
              <Text style={[styles.testoApertura, { color: coloreApertura(apertura) }]}>
                {testoApertura(apertura, t, giornoLungo)}
              </Text>
            </View>
          )}

          <Text style={styles.descrizione}>{descrizione}</Text>

          {luogo.lo_sapevi_che?.length || domandePerLuogo(luogo.id).length ? (
            <View style={styles.riga}>
              {luogo.lo_sapevi_che?.length ? (
                <Pressable
                  onPress={() => setLoSapevi(true)}
                  style={({ pressed }) => [styles.loSapevi, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.testoLoSapevi}>💡 {t('losapevi')}</Text>
                </Pressable>
              ) : null}
              {domandePerLuogo(luogo.id).length ? (
                <Pressable
                  onPress={() => setAguzza(true)}
                  style={({ pressed }) => [styles.loSapevi, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.testoLoSapevi}>👁️ {t('aguzza')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <RiquadroVideo video={luogo.video} t={t} />

          {nota ? (
            <View style={styles.nota}>
              <Text style={styles.testoNota}>ℹ️ {nota}</Text>
            </View>
          ) : null}

          {haInfo && (
            <View style={styles.tabella}>
              {orari.length > 0 && (
                <View style={styles.blocco}>
                  <Text style={styles.titoloBlocco}>🕘 {t('orari')}</Text>
                  {orari.map((o, i) => (
                    <View key={i} style={styles.rigaOrario}>
                      <Text style={styles.giorni}>
                        {formattaGiorni(o.giorni, t)}
                        {o.periodo ? <Text style={styles.periodo}>{`  ${formattaPeriodo(o.periodo)}`}</Text> : null}
                      </Text>
                      <Text style={styles.ore}>{formattaOre(o.ore, t)}</Text>
                    </View>
                  ))}
                  {(luogo.chiuso || []).length > 0 && (
                    <Text style={styles.chiusoTesto}>
                      {t('chiuso')}: {luogo.chiuso.map((g) => giornoLungo(g, t)).join(', ')}
                    </Text>
                  )}
                </View>
              )}
              {(biglietto || notaBiglietto) && (
                <View style={[styles.blocco, orari.length > 0 && styles.bloccoSeparato]}>
                  <Text style={styles.titoloBlocco}>🎟 {t('biglietto')}</Text>
                  {biglietto ? <Text style={styles.valore}>{biglietto}</Text> : null}
                  {notaBiglietto ? <Text style={styles.notaBiglietto}>{notaBiglietto}</Text> : null}
                </View>
              )}
            </View>
          )}

          <FermateLuogo voce={luogo.fermata} t={t} onApri={setFermataAperta} />

          <View style={styles.bottoni}>
            <Pressable
              style={({ pressed }) => [styles.bottone, pressed && { opacity: 0.85 }]}
              onPress={apriNavigatore}
            >
              <Text style={styles.testoBottone}>🚶 {t('portamiLi')}</Text>
            </Pressable>
            {luogo.sito ? (
              <Pressable
                style={({ pressed }) => [styles.bottone, styles.bottoneSecondario, pressed && { opacity: 0.85 }]}
                onPress={() => apri(luogo.sito)}
              >
                <Text style={[styles.testoBottone, styles.testoBottoneSecondario]}>🌐 {t('sitoUfficiale')}</Text>
              </Pressable>
            ) : linkWikipedia(luogo.wikipedia, lingua) ? (
              <Pressable
                style={({ pressed }) => [styles.bottone, styles.bottoneSecondario, pressed && { opacity: 0.85 }]}
                onPress={() => apri(linkWikipedia(luogo.wikipedia, lingua))}
              >
                <Text style={[styles.testoBottone, styles.testoBottoneSecondario]}>📖 {t('scopriDiPiu')}</Text>
              </Pressable>
            ) : null}
          </View>

          {haInfo && <Text style={styles.avviso}>{t('avvisoOrari')}</Text>}
        </ScrollView>
        )}
      </View>
      {condividi && <CondividiLuogo luogo={luogo} lingua={lingua} t={t} onChiudi={() => setCondividi(false)} />}
      {loSapevi && <LoSapeviChe voci={luogo.lo_sapevi_che} lingua={lingua} t={t} onChiudi={() => setLoSapevi(false)} />}
      {aguzza && <AguzzaLaVista domande={domandePerLuogo(luogo.id)} lingua={lingua} t={t} onChiudi={() => setAguzza(false)} />}
    </Modal>
  );
}

// Fermate del vaporetto del luogo: ognuna con le sue linee, si tocca per vedere linee e percorsi
function FermateLuogo({ voce, t, onApri }) {
  const fermate = fermateDelLuogo(voce);
  if (fermate.length === 0) return null;
  return (
    <View style={styles.tabellaSemplice}>
      <Text style={styles.titoloFermate}>⛴ {t('fermata')}</Text>
      {fermate.map((f, i) => {
        const linee = f.linea ? [lineaVaporetto(f.linea)].filter(Boolean) : lineeDellaFermata(f.id);
        const separata = i > 0 && styles.fermataSeparata;
        const lineeBus = f.id && !f.linea ? lineeAutobusDellaFermata(f.id) : [];
        if (!f.id || linee.length === 0) {
          return (
            <Text key={f.testo} style={[styles.nomeFermataSemplice, separata]}>
              {f.testo}
            </Text>
          );
        }
        return (
          <Pressable
            key={f.testo}
            onPress={() => onApri({ id: f.id, linea: f.linea })}
            testID={`fermata-${f.id}`}
            style={({ pressed }) => [styles.fermata, separata, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityHint={t('vap_tocca')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.nomeFermata}>{f.testo}</Text>
              <View style={styles.targhetteFermata}>
                {linee.slice(0, MAX_TARGHETTE).map((l) => (
                  <TarghettaLinea key={l.id} linea={l} piccola />
                ))}
                {linee.length > MAX_TARGHETTE ? (
                  <Text style={styles.altreLinee}>+{linee.length - MAX_TARGHETTE}</Text>
                ) : null}
              </View>
              {lineeBus.length > 0 && (
                <View style={styles.targhetteFermata}>
                  <Text style={styles.etichettaBus}>🚌</Text>
                  {lineeBus.slice(0, MAX_TARGHETTE).map((l) => (
                    <TarghettaLinea key={l.id} linea={l} piccola />
                  ))}
                  {lineeBus.length > MAX_TARGHETTE ? (
                    <Text style={styles.altreLinee}>+{lineeBus.length - MAX_TARGHETTE}</Text>
                  ) : null}
                </View>
              )}
            </View>
            <Text style={styles.freccia}>›</Text>
          </Pressable>
        );
      })}
      <Text style={styles.suggerimento}>{t('vap_tocca')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  scheda: {
    position: 'absolute',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  // verticale: la scheda sale dal basso
  schedaInBasso: {
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  // orizzontale: pannello a destra, alto quanto lo schermo
  schedaLaterale: {
    right: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    paddingTop: 12,
  },
  maniglia: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginVertical: 8,
  },
  contenuto: { paddingHorizontal: 18 },
  boxImmagine: { height: 230, borderRadius: 14, overflow: 'hidden', backgroundColor: '#e2ecf3' },
  boxImmagineBassa: { height: 170 },
  immagine: { width: '100%', height: '100%' },
  segnaposto: { alignItems: 'center', justifyContent: 'center' },
  testoSegnaposto: { color: '#64748b' },
  chiudi: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoChiudi: { color: '#fff', fontSize: 16, fontWeight: '700' },
  crediti: { fontSize: 11, color: '#6b7280', marginTop: 4, marginBottom: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6 },
  testoBadge: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  nome: { fontSize: 25, fontWeight: '800', color: '#0f172a' },
  rigaNome: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cuore: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  cuoreAttivo: { borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
  visitatoAttivo: { borderColor: VERDE_VISITATO, backgroundColor: VERDE_VISITATO },
  testoVisitato: { fontSize: 22, lineHeight: 26, fontWeight: '800' },
  testoCuore: { fontSize: 24, lineHeight: 28 },
  sestiere: { fontSize: 14, color: '#64748b', marginTop: 2 },
  distanza: { color: '#1d4ed8', fontWeight: '600' },
  apertura: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  pallinoApertura: { width: 9, height: 9, borderRadius: 5 },
  testoApertura: { fontSize: 14, fontWeight: '700' },
  descrizione: { fontSize: 15, lineHeight: 22, color: '#334155', marginTop: 12 },
  riga: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  loSapevi: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  testoLoSapevi: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  nota: {
    marginTop: 14,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  testoNota: { fontSize: 14, lineHeight: 20, color: '#78350f' },
  tabella: { marginTop: 16, borderRadius: 12, backgroundColor: '#f1f5f9', padding: 14 },
  blocco: {},
  bloccoSeparato: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  titoloBlocco: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  rigaOrario: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 12 },
  giorni: { fontSize: 14, color: '#334155', flexShrink: 1 },
  periodo: { fontSize: 12, color: '#64748b' },
  ore: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  chiusoTesto: { fontSize: 14, color: '#b91c1c', fontWeight: '600', marginTop: 4 },
  valore: { fontSize: 15, color: '#0f172a', fontWeight: '600' },
  notaBiglietto: { fontSize: 13, color: '#475569', marginTop: 3, lineHeight: 18 },
  tabellaSemplice: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  titoloFermate: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 8, marginBottom: 2 },
  fermata: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  fermataSeparata: { borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  nomeFermata: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  nomeFermataSemplice: { fontSize: 15, fontWeight: '600', color: '#0f172a', paddingVertical: 8 },
  targhetteFermata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 5 },
  etichettaBus: { fontSize: 13, fontWeight: '700', color: '#475569' },
  altreLinee: { fontSize: 12, fontWeight: '700', color: '#475569' },
  freccia: { fontSize: 26, color: '#94a3b8', fontWeight: '300' },
  suggerimento: { fontSize: 12, color: '#64748b', marginBottom: 8, marginTop: 2 },
  bottoni: { flexDirection: 'row', gap: 10, marginTop: 18 },
  bottone: {
    flex: 1,
    backgroundColor: '#0f3d5e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bottoneSecondario: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#0f3d5e' },
  testoBottone: { color: '#fff', fontSize: 15, fontWeight: '700' },
  testoBottoneSecondario: { color: '#0f3d5e' },
  avviso: { fontSize: 11, color: '#94a3b8', marginTop: 14, textAlign: 'center', lineHeight: 15 },
});
