import { haMarea } from '../citta';
import React, { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { datiProxy } from '../dati';
const configApp = datiProxy('app.json');

const SVILUPPATORE = 'fc.developer';
const EMAIL = 'info.fc.developer@gmail.com';

const apri = (url) => url && Linking.openURL(url).catch(() => {});

// Pulsante "i" nell'intestazione che apre la schermata dei crediti:
// mappa, marea, meteo, foto (autore e licenza di ognuna), software e sviluppatore
export default function Crediti({ luoghi, t }) {
  const [aperto, setAperto] = useState(false);
  const insets = useSafeAreaInsets();
  const versione = configApp?.expo?.version;

  const foto = useMemo(
    () =>
      luoghi
        .filter((l) => l.immagine && l.immagine.autore)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    [luoghi]
  );

  return (
    <>
      <Pressable
        onPress={() => setAperto(true)}
        style={({ pressed }) => [styles.pulsante, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={t('crediti')}
        hitSlop={6}
      >
        <Text style={styles.testoPulsante}>i</Text>
      </Pressable>

      <Modal
        visible={aperto}
        animationType="slide"
        onRequestClose={() => setAperto(false)}
        statusBarTranslucent
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={[styles.pagina, { paddingTop: insets.top + 8 }]}>
          <View style={[styles.barra, { paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
            <Text style={styles.titolo}>{t('crediti')}</Text>
            <Pressable
              onPress={() => setAperto(false)}
              style={({ pressed }) => [styles.chiudi, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel={t('chiudi')}
            >
              <Text style={styles.testoChiudi}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingLeft: 16 + insets.left,
              paddingRight: 16 + insets.right,
              paddingBottom: 24 + insets.bottom,
            }}
          >
            <Text style={styles.intro}>{t('cr_intro')}</Text>

            <Sezione titolo={t('cr_mappa')}>
              <Text style={styles.testo}>{t('cr_mappa_testo')}</Text>
              <Collegamento url="https://www.openstreetmap.org/copyright" />
            </Sezione>

            {haMarea() && (
            <Sezione titolo={t('cr_marea')}>
              <Text style={styles.testo}>{t('cr_marea_testo')}</Text>
              <Collegamento url="https://dati.venezia.it/?q=content%2Fcpsm-dati-meteomarini-laguna-e-litorale-veneziano" etichetta="dati.venezia.it" />
              <Collegamento url="https://creativecommons.org/licenses/by/4.0/" etichetta="Creative Commons BY" />
            </Sezione>
            )}

            <Sezione titolo={t('cr_vaporetto')}>
              <Text style={styles.testo}>{t('cr_vaporetto_testo')}</Text>
              <Collegamento url="https://actv.avmspa.it/it/content/catalogo-dei-dati-metadati-e-banche-dati-actv" etichetta="actv.avmspa.it – Open Data" />
            </Sezione>

            <Sezione titolo={t('cr_meteo')}>
              <Text style={styles.testo}>{t('cr_meteo_testo')}</Text>
              <Collegamento url="https://open-meteo.com" />
            </Sezione>

            <Sezione titolo={t('cr_dati')}>
              <Text style={styles.testo}>{t('cr_dati_testo')}</Text>
            </Sezione>

            <Sezione titolo={`${t('cr_foto')} (${foto.length})`}>
              <Text style={styles.testo}>{t('cr_foto_testo')}</Text>
              {foto.map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => apri(l.immagine.fonte)}
                  style={({ pressed }) => [styles.riga, pressed && { backgroundColor: '#e0eef7' }]}
                  accessibilityRole="link"
                >
                  <Text style={styles.nomeLuogo}>{l.nome}</Text>
                  <Text style={styles.dettaglio}>
                    {l.immagine.autore}
                    {l.immagine.licenza ? ` · ${l.immagine.licenza}` : ''} · Wikimedia Commons
                  </Text>
                </Pressable>
              ))}
            </Sezione>

            <Sezione titolo={t('cr_software')}>
              <Text style={styles.testo}>{t('cr_software_testo')}</Text>
            </Sezione>

            <Sezione titolo={t('cr_sviluppo')}>
              <Text style={styles.testo}>{SVILUPPATORE}</Text>
              <Collegamento url={`mailto:${EMAIL}`} etichetta={EMAIL} />
              {versione ? (
                <Text style={styles.dettaglio}>
                  {t('cr_versione')} {versione}
                </Text>
              ) : null}
            </Sezione>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function Sezione({ titolo, children }) {
  return (
    <View style={styles.sezione}>
      <Text style={styles.titoloSezione}>{titolo}</Text>
      {children}
    </View>
  );
}

function Collegamento({ url, etichetta }) {
  return (
    <Text style={styles.link} onPress={() => apri(url)} accessibilityRole="link">
      {etichetta || url.replace(/^https?:\/\//, '')}
    </Text>
  );
}

const styles = StyleSheet.create({
  pulsante: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoPulsante: { color: '#fff', fontSize: 17, fontWeight: '800', fontStyle: 'italic', fontFamily: 'serif' },
  pagina: { flex: 1, backgroundColor: '#f8fafc' },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titolo: { fontSize: 22, fontWeight: '800', color: '#0f3d5e' },
  chiudi: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f3d5e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testoChiudi: { color: '#fff', fontSize: 16, fontWeight: '700' },
  intro: { fontSize: 15, color: '#334155', marginTop: 16, lineHeight: 21 },
  sezione: { marginTop: 22 },
  titoloSezione: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f3d5e',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  testo: { fontSize: 14, color: '#1e293b', lineHeight: 20 },
  link: { fontSize: 14, color: '#1d4ed8', marginTop: 4, textDecorationLine: 'underline' },
  riga: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', borderRadius: 4 },
  nomeLuogo: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  dettaglio: { fontSize: 12, color: '#64748b', marginTop: 2 },
});
