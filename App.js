import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { CITTA, cittaPerId } from './src/catalogo';
import { datiCitta, datiMappa, installa, leggiStato, rimuovi } from './src/pacchetti';
import { etichettaStato, LINGUE, testi } from './src/lingue';
import CittaApp from './src/schermate/CittaApp';
import MotoreApp from './motore/App';
import { caricaCitta } from './motore/src/apriCitta';

// città che si aprono nel motore unico (stesso codice, dati del loro pacchetto)
const MOTORE_CITTA = ['venezia', 'verona', 'padova'];
import * as FileSystem from 'expo-file-system/legacy';

const CHIAVE_LINGUA = 'lingua';

// copertine delle città (foto reali); senza foto resta il colore di sfondo
const COPERTINE = {
  venezia: require('./assets/copertine/venezia.jpg'),
  verona: require('./assets/copertine/verona.jpg'),
  padova: require('./assets/copertine/padova.jpg'),
};

const NOMI_LINGUE = { it: 'Italiano', en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español' };

// colore di sfondo provvisorio di ogni città (finché non ci sono le foto vere)
const COLORI = {
  venezia: '#2c6e8f',
  verona: '#9c5b3a',
  padova: '#5b7a3a',
  treviso: '#3a6d6d',
  vicenza: '#7a6a4a',
  belluno: '#4a6a7a',
  rovigo: '#6a5a7a',
};

// Lingua del telefono se supportata, altrimenti italiano; poi quella scelta dall'utente.
function linguaIniziale() {
  try {
    const codice = getLocales()[0]?.languageCode;
    return LINGUE.includes(codice) ? codice : 'it';
  } catch {
    return 'it';
  }
}

// Gratuito sempre attivo; le città si scaricano, si aprono e si rimuovono da qui.
export default function App() {
  const [lingua, setLingua] = useState(linguaIniziale);
  const [stato, setStato] = useState({ attiva: null, installate: [] });
  const [occupata, setOccupata] = useState(null); // id della città in download/rimozione
  const [progresso, setProgresso] = useState(null); // { id, fatti, totale } durante il download
  const [cittaAperta, setCittaAperta] = useState(null); // id della città aperta nel contenitore
  const [datiAperti, setDatiAperti] = useState(null); // { luoghi, mappa }
  const [motorePronto, setMotorePronto] = useState(false);
  const [linguaAperta, setLinguaAperta] = useState(false); // menu della lingua
  const [creditiAperti, setCreditiAperti] = useState(false); // pagina crediti
  const t = testi(lingua);

  useEffect(() => {
    leggiStato().then(setStato);
    AsyncStorage.getItem(CHIAVE_LINGUA)
      .then((salvata) => {
        if (salvata && LINGUE.includes(salvata)) setLingua(salvata);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!cittaAperta) {
      setDatiAperti(null);
      setMotorePronto(false);
      return;
    }
    if (MOTORE_CITTA.includes(cittaAperta)) {
      // le città del motore unico usano i dati del loro pacchetto
      const cartella = FileSystem.documentDirectory + 'citta/' + cittaAperta + '/';
      caricaCitta(cartella)
        .then(() => setMotorePronto(true))
        .catch(() => {
          Alert.alert(t.errore, t.riprova);
          setCittaAperta(null);
        });
      return;
    }
    Promise.all([datiCitta(cittaAperta), datiMappa(cittaAperta)]).then(([dati, mappa]) => {
      if (!dati || !mappa) {
        Alert.alert(t.errore, t.riprova);
        setCittaAperta(null);
        return;
      }
      setDatiAperti({ luoghi: dati.luoghi, mappa });
    });
  }, [cittaAperta]);

  // Tasto indietro di Android: se una città è aperta, torna all'elenco (il motore ha la precedenza)
  useEffect(() => {
    if (!cittaAperta) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setCittaAperta(null);
      return true;
    });
    return () => sub.remove();
  }, [cittaAperta]);

  function cambiaLingua(nuova) {
    setLingua(nuova);
    AsyncStorage.setItem(CHIAVE_LINGUA, nuova).catch(() => {});
  }

  async function esegui(id, azione) {
    setOccupata(id);
    setProgresso(null);
    try {
      setStato(await azione(id, (fatti, totale) => setProgresso({ id, fatti, totale })));
    } catch (e) {
      Alert.alert(t.errore, e.message || t.riprova);
    } finally {
      setOccupata(null);
      setProgresso(null);
    }
  }

  if (MOTORE_CITTA.includes(cittaAperta)) {
    if (!motorePronto) return <ActivityIndicator style={{ flex: 1 }} />;
    return (
      <View style={{ flex: 1, backgroundColor: '#1e3a8a' }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#1e3a8a' }}>
          <Pressable onPress={() => setCittaAperta(null)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>← Città</Text>
          </Pressable>
        </SafeAreaView>
        <View style={{ flex: 1 }}>
          <MotoreApp lingua={lingua} />
        </View>
      </View>
    );
  }

  if (cittaAperta && datiAperti) {
    return (
      <SafeAreaView style={styles.contenitore} edges={['top', 'left', 'right']}>
        <CittaApp
          nome={cittaPerId(cittaAperta)?.nome}
          luoghi={datiAperti.luoghi}
          mappa={datiAperti.mappa}
          lingua={lingua}
          t={t}
          onIndietro={() => setCittaAperta(null)}
        />
      </SafeAreaView>
    );
  }

  const intestazione = (
    <View>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Image source={require('./assets/guida-veneto.png')} style={styles.logo} />
          <View style={styles.testiHero}>
            <Text style={styles.brand} numberOfLines={1} adjustsFontSizeToFit>VENETO EXPERIENCE</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeTesto}>Guida turistica</Text>
            </View>
          </View>
        </View>
        <Text style={styles.heroTitolo} numberOfLines={1} adjustsFontSizeToFit>Il tuo viaggio comincia qui.</Text>
        <Text style={styles.heroSottotitolo}>Scopri le città del Veneto nella tua lingua.</Text>
        <Pressable style={styles.lingua} onPress={() => setLinguaAperta(true)}>
          <Text style={styles.linguaEtichetta}>LINGUA / LANGUAGE</Text>
          <View style={styles.linguaRiga}>
            <Text style={styles.linguaValore}>{NOMI_LINGUE[lingua]}</Text>
            <Text style={styles.chevron}>⌄</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.sezione}>
        <Text style={styles.sezioneTitolo}>Esplora le città</Text>
        <Text style={styles.sezioneConto}>Veneto · {CITTA.length} destinazioni</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.contenitore} edges={['top', 'left', 'right']}>
      <FlatList
        data={CITTA}
        keyExtractor={(c) => c.id}
        numColumns={2}
        columnWrapperStyle={styles.colonne}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={intestazione}
        ListFooterComponent={
          <Pressable onPress={() => setCreditiAperti(true)} style={styles.crediti}>
            <Text style={styles.testoCrediti}>Crediti</Text>
          </Pressable>
        }
        renderItem={({ item }) => {
          const installata = stato.installate.includes(item.id);
          const impegnata = occupata === item.id;
          return (
            <View style={styles.card}>
              <View style={[styles.immagine, { backgroundColor: COLORI[item.id] || '#64748b' }]}>
                {COPERTINE[item.id] ? <Image source={COPERTINE[item.id]} style={styles.copertina} /> : null}
                <Text style={styles.immagineNome}>{item.nome}</Text>
              </View>
              <Text style={styles.nomeCitta}>{item.nome}</Text>
              <Text style={styles.motto}>{item.motto || item.provincia}</Text>
              <View style={[styles.stato, installata && styles.statoOk]}>
                <Text style={[styles.statoTesto, installata && styles.statoTestoOk]}>
                  {installata ? t.installata : etichettaStato(t, item.stato)}
                </Text>
              </View>

              {impegnata ? (
                progresso && progresso.id === item.id ? (
                  <Text style={styles.percentuale}>{Math.round((progresso.fatti / progresso.totale) * 100)}%</Text>
                ) : (
                  <ActivityIndicator style={styles.attesa} />
                )
              ) : installata ? (
                <>
                  <Pressable style={[styles.bottone, styles.bottoneApri]} onPress={() => setCittaAperta(item.id)}>
                    <Text style={styles.testoApri}>{t.apriCitta} ↗</Text>
                  </Pressable>
                  <Pressable style={styles.rimuovi} onPress={() => esegui(item.id, rimuovi)}>
                    <Text style={styles.testoRimuovi}>{t.rimuoviCitta}</Text>
                  </Pressable>
                </>
              ) : item.pacchetto ? (
                <Pressable style={[styles.bottone, styles.bottoneScarica]} onPress={() => esegui(item.id, installa)}>
                  <Text style={styles.testoScarica}>↓ {t.scaricaCitta}</Text>
                </Pressable>
              ) : (
                <Text style={styles.nonDisponibile}>{t.nonAncora}</Text>
              )}
            </View>
          );
        }}
      />

      <Modal visible={creditiAperti} transparent animationType="fade" onRequestClose={() => setCreditiAperti(false)}>
        <Pressable style={styles.velo} onPress={() => setCreditiAperti(false)}>
          <View style={styles.menu}>
            <View style={styles.creditiBox}>
              <Text style={styles.creditiTitolo}>Crediti</Text>
              <Text style={styles.creditiTesto}>
                Copertina di Venezia: Wolfgang Moroder, da Wikimedia Commons. Licenza CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/). Foto originale: https://commons.wikimedia.org/w/index.php?curid=25556194

                Copertina di Verona: K93, da Wikimedia Commons. Licenza CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/). Foto originale: https://commons.wikimedia.org/w/index.php?curid=28269034

                Copertina di Padova: Fioccof, da Wikimedia Commons. Licenza CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
              </Text>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={linguaAperta} transparent animationType="fade" onRequestClose={() => setLinguaAperta(false)}>
        <Pressable style={styles.velo} onPress={() => setLinguaAperta(false)}>
          <View style={styles.menu}>
            {LINGUE.map((codice) => (
              <Pressable
                key={codice}
                style={styles.voceMenu}
                onPress={() => {
                  cambiaLingua(codice);
                  setLinguaAperta(false);
                }}
              >
                <Text style={[styles.voceMenuTesto, lingua === codice && styles.voceMenuAttiva]}>
                  {NOMI_LINGUE[codice]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const VERDE = '#1f3d36';
const CREMA = '#e9e1c7';
const TESTO = '#1d1d1d';
const GRIGIO = '#6b6b6b';

const styles = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: '#fff' },
  lista: { paddingHorizontal: 16, paddingBottom: 40 },
  colonne: { justifyContent: 'space-between' },

  // Hero
  hero: { backgroundColor: VERDE, borderRadius: 24, padding: 20, marginTop: 8 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 56, height: 56, borderRadius: 28 },
  testiHero: { flex: 1, minWidth: 0 },
  brand: { color: '#fff', fontFamily: 'serif', fontSize: 22, letterSpacing: 1.5 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  badgeTesto: { color: '#fff', fontSize: 13, fontWeight: '500' },
  heroTitolo: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 30, marginTop: 22, marginBottom: 10 },
  heroSottotitolo: { color: 'rgba(255,255,255,0.9)', fontSize: 17, marginBottom: 18 },
  lingua: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  linguaEtichetta: { color: GRIGIO, fontSize: 13, letterSpacing: 0.4 },
  linguaRiga: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  linguaValore: { flex: 1, color: TESTO, fontSize: 19, fontWeight: '500' },
  chevron: { color: TESTO, fontSize: 18 },

  // Sezione città
  sezione: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 26, marginBottom: 16, paddingHorizontal: 4 },
  sezioneTitolo: { color: TESTO, fontSize: 24, fontWeight: '700' },
  sezioneConto: { color: GRIGIO, fontSize: 15 },

  // Card città
  card: { width: '47%', marginBottom: 18 },
  immagine: { height: 150, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  copertina: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  immagineNome: { color: '#fff', fontSize: 18, fontWeight: '700' },
  crediti: { alignItems: 'center', paddingVertical: 20 },
  testoCrediti: { color: GRIGIO, fontSize: 14, textDecorationLine: 'underline' },
  creditiBox: { padding: 20 },
  creditiTitolo: { color: TESTO, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  creditiTesto: { color: TESTO, fontSize: 14, lineHeight: 20 },
  nomeCitta: { color: TESTO, fontSize: 22, fontWeight: '700', marginTop: 14 },
  motto: { color: GRIGIO, fontSize: 16, lineHeight: 21, marginTop: 4, minHeight: 42 },
  stato: { alignSelf: 'flex-start', backgroundColor: '#ececec', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },
  statoOk: { backgroundColor: '#dcf3e2' },
  statoTesto: { color: '#333', fontSize: 15 },
  statoTestoOk: { color: '#2f7a4b' },

  bottone: { height: 54, borderRadius: 16, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  bottoneApri: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e4e4' },
  testoApri: { color: TESTO, fontSize: 18, fontWeight: '500' },
  bottoneScarica: { backgroundColor: VERDE },
  testoScarica: { color: '#fff', fontSize: 18, fontWeight: '500' },
  rimuovi: { alignItems: 'center', paddingVertical: 8, marginTop: 6 },
  testoRimuovi: { color: GRIGIO, fontSize: 16 },
  nonDisponibile: { color: '#94a3b8', fontSize: 14, fontWeight: '700', marginTop: 12 },
  attesa: { marginTop: 16 },
  percentuale: { color: VERDE, fontSize: 16, fontWeight: '800', marginTop: 16 },

  // Menu lingua
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 32 },
  menu: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  voceMenu: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  voceMenuTesto: { color: TESTO, fontSize: 18 },
  voceMenuAttiva: { fontWeight: '700', color: VERDE },
});
