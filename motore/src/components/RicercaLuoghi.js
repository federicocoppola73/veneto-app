import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CATEGORIE, coloreCategoria } from '../categorie';
import { testoLocalizzato } from '../i18n';
import { zoneDi, zonePresenti } from '../zone';
import { AZZURRO_ACCESSIBILITA as AZZURRO, IconaAccessibilitaGenerale, haAccessibilitaVerificata } from './Accessibilita';
import { BadgeCuffie, IconaCuffie, VIOLA } from './Audioguida';
import { useAudioguide } from '../audioguide';

const ALTEZZA_BARRA_STATO = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;

// Testo "semplificato" per la ricerca: minuscolo, senza accenti e senza apostrofi (Ca' d'Oro -> ca doro)
export const semplifica = (testo = '') =>
  testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[·'’.\-]/g, '')
    .toLowerCase()
    .trim();

// "2027-04-02" -> "2/4/2027"
const formattaData = (iso) => {
  const [a, m, g] = iso.split('-').map(Number);
  return `${g}/${m}/${a}`;
};

const perNome = (a, b) => a.nome.localeCompare(b.nome, 'it');

// Parole che mostrano i luoghi con informazioni di accessibilità verificate.
// Basta l'inizio della parola (almeno 5 lettere): "carrozz" trova già "carrozzina".
const PAROLE_ACCESSIBILITA = (
  [
    'accessibile', 'accessibili', 'accessibilita', 'disabili', 'disabile', 'disabilita', 'carrozzina', 'sedia a rotelle',
    'accessible', 'accessibility', 'wheelchair', 'disabled', 'disability',
    'accessibilite', 'fauteuil roulant', 'handicap',
    'barrierefrei', 'barrierefreiheit', 'rollstuhl', 'behindert',
    'accesible', 'accesibilidad', 'silla de ruedas', 'discapacidad',
  ].map((p) => semplifica(p))
);
const eParolaAccessibilita = (q) => q.length >= 5 && PAROLE_ACCESSIBILITA.some((p) => p.startsWith(q));

/**
 * Pulsante con la lente: apre un pannello con il campo di ricerca e i risultati.
 * Senza testo mostra solo i luoghi (come prima). Scrivendo, cerca anche tra personaggi, cibi ed eventi.
 * - luoghi: si possono restringere alle tipologie attive e a una zona (sestiere o isola)
 * - eventi: la zona vale anche per loro (tramite il luogo); toccandone uno si illumina il luogo sulla mappa
 * - personaggi e cibi non hanno zona: compaiono solo con "Tutte le zone"
 * props: luoghi, selezionate (tipologie attive), t, lingua, personaggi, cibi, eventi (eventi.json),
 *        onScegli(idLuogo), onScegliPersonaggio(id), onScegliCibo(id)
 */
export default function RicercaLuoghi({
  luoghi,
  selezionate,
  t,
  lingua = 'it',
  personaggi = [],
  cibi = [],
  eventi = [],
  onScegli,
  onScegliPersonaggio,
  onScegliCibo,
}) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState('');
  const [ambito, setAmbito] = useState('filtrati'); // 'filtrati' | 'tutti'
  const [zona, setZona] = useState(null); // null = tutte le zone
  const [soloAccessibilita, setSoloAccessibilita] = useState(false); // solo luoghi con info di accessibilità verificate
  const [soloAudio, setSoloAudio] = useState(false); // solo luoghi con audioguida
  const { indice: indiceAudio, presenti: audioPresenti } = useAudioguide();

  const zone = useMemo(() => zonePresenti(luoghi), [luoghi]);
  const conAccessibilita = useMemo(() => new Set(luoghi.filter(haAccessibilitaVerificata).map((l) => l.id)), [luoghi]);
  const luoghiPerId = useMemo(() => Object.fromEntries(luoghi.map((l) => [l.id, l])), [luoghi]);

  const filtroAttivo = selezionate.length < CATEGORIE.length;

  // Sezioni dei risultati: ogni voce ha chiave, titolo, dettaglio e l'id da aprire (null = non cliccabile)
  const { sezioni, conteggio, conteggioAudio, soloAcc } = useMemo(() => {
    const q = semplifica(testo);
    // "carrozzina", "accessib", "wheelchair"…: oltre ai nomi che contengono il testo, compaiono i luoghi
    // con informazioni di accessibilità verificate
    const parolaAccessibilita = eParolaAccessibilita(q);
    const soloAcc = soloAccessibilita;
    const cerca = (campi) => !q || campi.some((c) => semplifica(c || '').includes(q));
    const altriTipi = q.length > 0 && !soloAcc && !soloAudio;

    const perTipo = ambito === 'filtrati' ? luoghi.filter((l) => selezionate.includes(l.categoria)) : luoghi;
    const perZona = zona ? perTipo.filter((l) => zoneDi(l).includes(zona)) : perTipo;
    // copertura dei controlli nei luoghi considerati (tipologie e zona, senza il testo cercato)
    const conteggio = { n: perZona.filter((l) => conAccessibilita.has(l.id)).length, tot: perZona.length };
    const haAudio = (l) => !!indiceAudio?.luoghi?.[l.id];
    const conteggioAudio = { n: perZona.filter(haAudio).length, tot: perZona.length };
    const luoghiTrovati = perZona
      .filter((l) => !soloAcc || conAccessibilita.has(l.id))
      .filter((l) => !soloAudio || haAudio(l))
      .filter(
        (l) =>
          cerca([l.nome, l.sestiere, t(`cat_${l.categoria}`)]) || (parolaAccessibilita && conAccessibilita.has(l.id))
      )
      .sort(perNome);
    const vociLuoghi = luoghiTrovati.map((l) => ({
      chiave: `luogo-${l.id}`,
      tipo: 'luogo',
      id: l.id,
      titolo: l.nome,
      dettaglio: `${t(`cat_${l.categoria}`)} · ${l.sestiere}`,
      colore: coloreCategoria(l.categoria),
      accessibilita: conAccessibilita.has(l.id),
      audio: haAudio(l) ? (audioPresenti.has(l.id) ? 'scaricata' : 'da_scaricare') : null,
    }));

    const vociPersonaggi = altriTipi && !zona
      ? personaggi
          .filter((p) => cerca([p.nome, testoLocalizzato(p.professione, lingua)]))
          .sort(perNome)
          .map((p) => ({
            chiave: `personaggio-${p.id}`,
            tipo: 'personaggio',
            id: p.id,
            titolo: p.nome,
            dettaglio: testoLocalizzato(p.professione, lingua),
            icona: '👤',
          }))
      : [];

    const vociCibi = altriTipi && !zona
      ? cibi
          .filter((c) => cerca([c.nome, c.portata]))
          .sort(perNome)
          .map((c) => ({
            chiave: `cibo-${c.id}`,
            tipo: 'cibo',
            id: c.id,
            titolo: c.nome,
            dettaglio: c.portata ? c.portata.charAt(0).toUpperCase() + c.portata.slice(1) : '',
            icona: '🍽️',
          }))
      : [];

    const vociEventi = altriTipi
      ? eventi
          .map((e, i) => ({ e, i }))
          .filter(({ e }) => {
            if (zona) {
              const luogo = e.luogoId ? luoghiPerId[e.luogoId] : null;
              if (!luogo || !zoneDi(luogo).includes(zona)) return false;
            }
            return cerca([e.nome, testoLocalizzato(e.tipo, lingua), e.luogo]);
          })
          .sort((a, b) => (a.e.inizio || '').localeCompare(b.e.inizio || '') || a.e.nome.localeCompare(b.e.nome, 'it'))
          .map(({ e, i }) => {
            const data = e.inizio === e.fine ? formattaData(e.inizio) : `${formattaData(e.inizio)} – ${formattaData(e.fine)}`;
            const tipo = testoLocalizzato(e.tipo, lingua);
            return {
              chiave: `evento-${i}`,
              tipo: 'evento',
              id: e.luogoId && luoghiPerId[e.luogoId] ? e.luogoId : null,
              titolo: e.nome,
              dettaglio: [data, tipo].filter(Boolean).join(' · '),
              icona: '📅',
            };
          })
      : [];

    const sezioni = [
      { chiave: 'luoghi', titolo: altriTipi ? t('cercaSezLuoghi') : null, data: vociLuoghi },
      { chiave: 'personaggi', titolo: t('cercaSezPersonaggi'), data: vociPersonaggi },
      { chiave: 'cibi', titolo: t('cercaSezCibi'), data: vociCibi },
      { chiave: 'eventi', titolo: t('cercaSezEventi'), data: vociEventi },
    ].filter((s) => s.data.length > 0);
    return { sezioni, conteggio, conteggioAudio, soloAcc };
  }, [testo, luoghi, luoghiPerId, conAccessibilita, soloAccessibilita, soloAudio, indiceAudio, audioPresenti, selezionate, ambito, zona, t, lingua, personaggi, cibi, eventi]);

  const tutteLeVoci = sezioni.flatMap((s) => s.data);

  const chiudi = () => {
    Keyboard.dismiss();
    setAperto(false);
    setTesto('');
  };

  const scegli = (voce) => {
    if (voce.tipo === 'personaggio') {
      chiudi();
      onScegliPersonaggio?.(voce.id);
    } else if (voce.tipo === 'cibo') {
      chiudi();
      onScegliCibo?.(voce.id);
    } else if (voce.id) {
      // luogo, oppure evento collegato a un luogo: si illumina il luogo sulla mappa
      chiudi();
      onScegli(voce.id);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setAmbito('filtrati');
          setZona(null);
          setSoloAccessibilita(false);
          setSoloAudio(false);
          setAperto(true);
        }}
        style={({ pressed }) => [styles.pulsante, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={t('cerca')}
        hitSlop={6}
      >
        <Text style={styles.lente}>🔍</Text>
      </Pressable>

      <Modal visible={aperto} transparent animationType="fade" onRequestClose={chiudi} statusBarTranslucent supportedOrientations={["portrait", "landscape"]}>
        <View style={[styles.pannello, { paddingTop: ALTEZZA_BARRA_STATO + 10 }]}>
          <View style={styles.rigaRicerca}>
            <View style={styles.campo}>
              <Text style={styles.lenteCampo}>🔍</Text>
              <TextInput
                value={testo}
                onChangeText={setTesto}
                placeholder={t('cercaSegnaposto')}
                placeholderTextColor="#94a3b8"
                style={styles.input}
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={() => tutteLeVoci.length === 1 && scegli(tutteLeVoci[0])}
                accessibilityLabel={t('cerca')}
              />
              {testo.length > 0 && (
                <Pressable onPress={() => setTesto('')} hitSlop={10} accessibilityLabel={t('cancella')}>
                  <Text style={styles.cancella}>✕</Text>
                </Pressable>
              )}
            </View>
            <Pressable onPress={chiudi} hitSlop={8}>
              <Text style={styles.annulla}>{t('chiudi')}</Text>
            </Pressable>
          </View>

          {/* Dove cercare: in tutti i luoghi o solo nelle tipologie selezionate (vale per i luoghi) */}
          <View style={styles.rigaAmbito}>
            <Text style={styles.etichettaAmbito}>{t('cercaIn')}</Text>
            <View style={styles.segmenti}>
              {[
                ['filtrati', t('cercaFiltrati')],
                ['tutti', t('cercaTutti')],
              ].map(([valore, etichetta]) => (
                <Pressable
                  key={valore}
                  onPress={() => setAmbito(valore)}
                  style={[styles.segmento, ambito === valore && styles.segmentoAttivo]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ambito === valore }}
                >
                  <Text style={[styles.testoSegmento, ambito === valore && styles.testoSegmentoAttivo]}>
                    {etichetta}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {ambito === 'filtrati' && filtroAttivo && (
            <View style={styles.filtriAttivi}>
              {selezionate.map((c) => (
                <View key={c} style={styles.filtro}>
                  <View style={[styles.pallinoPiccolo, { backgroundColor: coloreCategoria(c) }]} />
                  <Text style={styles.testoFiltro}>{t(`cat_${c}`)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Zona: tutte oppure un solo sestiere / isola */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.rigaZone}
            contentContainerStyle={styles.contenutoZone}
          >
            {[null, ...zone].map((z) => {
              const attiva = zona === z;
              return (
                <Pressable
                  key={z || '_tutte'}
                  onPress={() => setZona(z)}
                  style={[styles.zona, attiva && styles.zonaAttiva]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: attiva }}
                >
                  <Text style={[styles.testoZona, attiva && styles.testoZonaAttiva]}>
                    {z ? `📍 ${z}` : t('tutteLeZone')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Solo luoghi con informazioni di accessibilità verificate + copertura dei controlli */}
          <View style={styles.rigaAccessibilita}>
            <Pressable
              onPress={() => setSoloAccessibilita((v) => !v)}
              style={[styles.chipAccessibilita, soloAccessibilita && styles.chipAccessibilitaAttivo]}
              accessibilityRole="switch"
              accessibilityState={{ checked: soloAccessibilita }}
              testID="filtro-accessibilita"
            >
              <IconaAccessibilitaGenerale
                misura={18}
                colore={soloAccessibilita ? AZZURRO : '#fff'}
                sfondo={soloAccessibilita ? '#fff' : AZZURRO}
              />
              <Text style={[styles.testoChipAccessibilita, soloAccessibilita && styles.testoChipAccessibilitaAttivo]}>
                {t('acc_filtro')}
              </Text>
            </Pressable>
            <Text style={styles.conteggioAccessibilita} testID="conteggio-accessibilita">
              {t('acc_conteggio').replace('{n}', conteggio.n).replace('{tot}', conteggio.tot)}
            </Text>
          </View>

          {/* Solo luoghi con audioguida (se la città ne ha) */}
          {indiceAudio?.luoghi && conteggioAudio.n > 0 && (
            <View style={styles.rigaAccessibilita}>
              <Pressable
                onPress={() => setSoloAudio((v) => !v)}
                style={[styles.chipAccessibilita, styles.chipAudio, soloAudio && styles.chipAudioAttivo]}
                accessibilityRole="switch"
                accessibilityState={{ checked: soloAudio }}
                testID="filtro-audioguida"
              >
                <View style={[styles.cerchioCuffie, soloAudio && { backgroundColor: '#fff' }]}>
                  <IconaCuffie misura={12} colore={soloAudio ? VIOLA : '#fff'} piena />
                </View>
                <Text style={[styles.testoChipAccessibilita, { color: '#5b21b6' }, soloAudio && styles.testoChipAccessibilitaAttivo]}>
                  {t('aud_filtro')}
                </Text>
              </Pressable>
              <Text style={styles.conteggioAccessibilita}>
                {t('aud_conteggio').replace('{n}', conteggioAudio.n).replace('{tot}', conteggioAudio.tot)}
              </Text>
            </View>
          )}

          <SectionList
            sections={sezioni}
            keyExtractor={(voce) => voce.chiave}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            style={styles.lista}
            ListEmptyComponent={
              <Text style={styles.vuoto}>
                {ambito === 'filtrati' && selezionate.length === 0
                  ? t('nessunaCategoria')
                  : soloAcc && conteggio.n === 0
                    ? t('acc_nessun_luogo')
                    : t('nessunRisultato')}
              </Text>
            }
            ItemSeparatorComponent={() => <View style={styles.separatore} />}
            renderSectionHeader={({ section }) =>
              section.titolo ? <Text style={styles.titoloSezione}>{section.titolo}</Text> : null
            }
            renderItem={({ item: voce }) => (
              <Pressable
                onPress={() => scegli(voce)}
                disabled={!voce.id && voce.tipo === 'evento'}
                style={({ pressed }) => [styles.risultato, pressed && voce.id && { backgroundColor: '#f0f6fb' }]}
                accessibilityRole="button"
              >
                {voce.colore ? (
                  <View style={[styles.pallino, { backgroundColor: voce.colore }]} />
                ) : (
                  <View style={styles.icona}>
                    <Text style={styles.testoIcona}>{voce.icona}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.nome}>{voce.titolo}</Text>
                  {!!voce.dettaglio && (
                    <View style={styles.rigaDettaglio}>
                      {/* icona sulla riga della tipologia: il nome può essere lungo */}
                      {voce.accessibilita && (
                        <View accessible accessibilityLabel={t('acc_info')} testID={`accessibilita-risultato-${voce.id}`}>
                          <IconaAccessibilitaGenerale misura={16} />
                        </View>
                      )}
                      {voce.audio && (
                        <View accessible accessibilityLabel={voce.audio === 'scaricata' ? t('aud_badgeSi') : t('aud_badgeNo')}>
                          <BadgeCuffie scaricata={voce.audio === 'scaricata'} />
                        </View>
                      )}
                      <Text style={[styles.dettaglio, { flexShrink: 1 }]}>{voce.dettaglio}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            )}
          />
        </View>
        <Pressable style={styles.sfondo} onPress={chiudi} accessibilityLabel={t('chiudi')} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pulsante: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lente: { fontSize: 17 },
  pannello: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingBottom: 8,
    maxHeight: '80%',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sfondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  rigaRicerca: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  lenteCampo: { fontSize: 15, opacity: 0.6 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10, color: '#0f172a' },
  cancella: { fontSize: 15, color: '#64748b', paddingHorizontal: 4 },
  annulla: { fontSize: 15, color: '#0f3d5e', fontWeight: '600' },
  rigaAmbito: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  etichettaAmbito: { fontSize: 13, color: '#64748b' },
  segmenti: { flex: 1, flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3 },
  segmento: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  segmentoAttivo: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  testoSegmento: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  testoSegmentoAttivo: { color: '#0f3d5e' },
  filtriAttivi: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  filtro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pallinoPiccolo: { width: 8, height: 8, borderRadius: 4 },
  testoFiltro: { fontSize: 12, color: '#334155' },
  // flexShrink 0 e altezza minima: altrimenti su Android la riga viene schiacciata dalla lista sotto
  rigaZone: { flexGrow: 0, flexShrink: 0, minHeight: 40, marginBottom: 6, marginHorizontal: -14 },
  contenutoZone: { gap: 6, paddingHorizontal: 14, paddingVertical: 3, alignItems: 'center' },
  zona: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  zonaAttiva: { backgroundColor: '#0f3d5e', borderColor: '#0f3d5e' },
  testoZona: { fontSize: 13, color: '#334155' },
  testoZonaAttiva: { color: '#fff', fontWeight: '600' },
  lista: { flexGrow: 0, flexShrink: 1 },
  titoloSezione: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: 10,
    paddingBottom: 4,
  },
  separatore: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 34 },
  risultato: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 4 },
  pallino: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff', elevation: 2 },
  icona: { width: 14, alignItems: 'center' },
  testoIcona: { fontSize: 14 },
  nome: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  dettaglio: { fontSize: 13, color: '#64748b' },
  rigaDettaglio: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rigaAccessibilita: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  chipAccessibilita: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#bcdcf3',
    backgroundColor: '#eef6fc',
    borderRadius: 999,
    paddingLeft: 5,
    paddingRight: 11,
    paddingVertical: 4,
    flexShrink: 1,
  },
  chipAccessibilitaAttivo: { backgroundColor: AZZURRO, borderColor: AZZURRO },
  testoChipAccessibilita: { fontSize: 13, color: '#0f3d5e', fontWeight: '600', flexShrink: 1 },
  testoChipAccessibilitaAttivo: { color: '#fff' },
  chipAudio: { borderColor: '#ddd6fe', backgroundColor: '#f5f3ff' },
  chipAudioAttivo: { backgroundColor: VIOLA, borderColor: VIOLA },
  cerchioCuffie: { width: 18, height: 18, borderRadius: 9, backgroundColor: VIOLA, alignItems: 'center', justifyContent: 'center' },
  conteggioAccessibilita: { fontSize: 12, color: '#64748b' },
  vuoto: { textAlign: 'center', color: '#64748b', paddingVertical: 20 },
});
