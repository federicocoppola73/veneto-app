import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, FlatList, Image, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { useFonts } from 'expo-font';
import { Marcellus_400Regular } from '@expo-google-fonts/marcellus';
import { CITTA, cittaPerId } from './src/catalogo';
import { controllaAggiornamenti, datiCitta, datiMappa, datiTessere, installa, leggiStato, rimuovi } from './src/pacchetti';
import { acquista, prezzoCitta } from './src/acquisti';
import { inviaInAttesa } from './motore/src/segnalazioni';
import { traduttore } from './motore/src/i18n';
import { SegnalaApp } from './motore/src/components/SegnalaProblema';
import { LINGUE, testi, testoLingua } from './src/lingue';
import SchedaCitta, { VERDE as VERDE_SCHEDA } from './src/components/SchedaCitta';
import PopupAggiornamento from './src/components/PopupAggiornamento';
import {
  IconaCalendario,
  IconaCestino,
  IconaGiu,
  IconaGlobo,
  IconaLente,
  IconaMonumenti,
  IconaNuvola,
  IconaPassi,
  IconaPosate,
} from './src/components/IconeHome';
import CittaApp from './src/schermate/CittaApp';
import MotoreApp from './motore/App';
import { caricaCitta } from './motore/src/apriCitta';

// tutte le città si aprono nel motore unico (stesso codice, dati del loro pacchetto):
// così una città nuova funziona appena è nel catalogo, senza cambiare l'app
const apreNelMotore = (id) => !!id;
import * as FileSystem from 'expo-file-system/legacy';

const CHIAVE_LINGUA = 'lingua';

// copertine delle città; senza foto resta il colore di sfondo
const COPERTINE = {
  venezia: require('./assets/copertine/venezia.jpg'),
  verona: require('./assets/copertine/verona.jpg'),
  padova: require('./assets/copertine/padova.jpg'),
  treviso: require('./assets/copertine/treviso.jpg'),
  vicenza: require('./assets/copertine/vicenza.jpg'),
  rovigo: require('./assets/copertine/rovigo.jpg'),
  belluno: require('./assets/copertine/belluno.jpg'),
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

// Schermata iniziale: ogni città si visita gratis (pacchetto prova) o si acquista (pacchetto completo);
// da qui si apre, si aggiorna e si cancella dal telefono.
// il provider degli spazi sicuri serve anche sul web, dove SafeAreaView lo richiede
export default function App() {
  // font del titolo "Veneto Experience" (Marcellus); finché non è caricato RN usa il font di sistema
  useFonts({ Marcellus_400Regular });
  return (
    <SafeAreaProvider>
      <AppRadice />
    </SafeAreaProvider>
  );
}

function AppRadice() {
  const [lingua, setLingua] = useState(linguaIniziale);
  const [stato, setStato] = useState({ attiva: null, installate: [], versioni: {}, tipi: {}, acquistate: [] });
  const [daCancellare, setDaCancellare] = useState(null); // id della città nel popup "Cancellare…?"
  const [novita, setNovita] = useState({}); // { id: riepilogo delle novità dell'aggiornamento }
  const [daMostrareAggiornamento, setDaMostrareAggiornamento] = useState(null); // id della città nel popup "Aggiornamento di…"

  const [daAggiornare, setDaAggiornare] = useState([]); // città installate con una versione più recente sul server
  const [occupata, setOccupata] = useState(null); // id della città in download/rimozione
  const [progresso, setProgresso] = useState(null); // { id, fatti, totale } durante il download
  const [scaricando, setScaricando] = useState(false); // avviso "non chiudere l'app" durante il download
  const [cittaAperta, setCittaAperta] = useState(null); // id della città aperta nel contenitore
  const [datiAperti, setDatiAperti] = useState(null); // { luoghi, mappa }
  const [motorePronto, setMotorePronto] = useState(false);
  const [linguaAperta, setLinguaAperta] = useState(false); // menu della lingua
  const [creditiAperti, setCreditiAperti] = useState(false); // pagina crediti
  const t = testi(lingua);
  const margini = useSafeAreaInsets();

  useEffect(() => {
    // segnalazioni rimaste sul telefono senza connessione: si riprova a ogni avvio
    inviaInAttesa();
    leggiStato().then((s) => {
      setStato(s);
      controllaAggiornamenti(s)
        .then(({ ids, novita: n }) => {
          setDaAggiornare(ids);
          setNovita(n);
        })
        .catch(() => {});
    });
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
    if (apreNelMotore(cittaAperta)) {
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
    Promise.all([datiCitta(cittaAperta), datiMappa(cittaAperta), datiTessere(cittaAperta)]).then(([dati, mappa, tessere]) => {
      if (!dati || !mappa) {
        Alert.alert(t.errore, t.riprova);
        setCittaAperta(null);
        return;
      }
      setDatiAperti({ luoghi: dati.luoghi, mappa, tessere });
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

  // Esegue un'azione su una città (download o rimozione); restituisce true se è andata a buon fine
  async function esegui(id, azione, { download = false } = {}) {
    setOccupata(id);
    setProgresso(null);
    setScaricando(download);
    try {
      const nuovo = await azione((fatti, totale) => setProgresso({ id, fatti, totale }));
      setStato(nuovo);
      if (download) setDaAggiornare((d) => d.filter((x) => x !== id));
      return true;
    } catch (e) {
      Alert.alert(t.errore, t.riprova);
      return false;
    } finally {
      setOccupata(null);
      setProgresso(null);
      setScaricando(false);
    }
  }

  const scarica = (id, tipo) => esegui(id, (p) => installa(id, p, tipo), { download: true });

  // Visita (versione gratuita): la prima volta, o se c'è una versione nuova, scarica la prova; poi apre la città
  async function visita(id) {
    const presente = stato.installate.includes(id) && !daAggiornare.includes(id);
    if (presente || (await scarica(id, 'prova'))) setCittaAperta(id);
  }

  async function compra(id) {
    try {
      const nuovo = await acquista(id);
      setStato(nuovo);
    } catch (e) {
      Alert.alert(t.acquista, e.codice === 'acquisti_non_attivi' ? t.acquistiNonAttivi : t.riprova);
      return;
    }
    // dopo l'acquisto si scarica subito il pacchetto completo
    await scarica(id, 'completo');
  }

  function confermaCancella() {
    const id = daCancellare;
    setDaCancellare(null);
    if (id) esegui(id, () => rimuovi(id));
  }

  if (apreNelMotore(cittaAperta)) {
    if (!motorePronto) return <ActivityIndicator style={{ flex: 1 }} />;
    return (
      <View style={{ flex: 1, backgroundColor: '#1e3a8a' }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#1e3a8a' }}>
          <View style={styles.barraCitta}>
            <Pressable onPress={() => setCittaAperta(null)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t.indietroCitta}</Text>
            </Pressable>
            {stato.tipi?.[cittaAperta] === 'prova' ? (
              <Text style={styles.barraGratuita} numberOfLines={1}>{t.barraGratuita}</Text>
            ) : null}
          </View>
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
          tessere={datiAperti.tessere}
          lingua={lingua}
          t={t}
          onIndietro={() => setCittaAperta(null)}
        />
      </SafeAreaView>
    );
  }

  const funzioni = [IconaMonumenti, IconaPassi, IconaLente, IconaPosate, IconaCalendario];
  const intestazione = (
    <View>
      <View style={[styles.hero, { paddingTop: margini.top + 16 }]}>
        {/* foto a destra che sfuma nel verde verso sinistra */}
        <Image source={COPERTINE.venezia} style={[styles.heroFoto, { top: margini.top + 80 }]} />
        <View style={[styles.heroSfumatura, { top: margini.top + 80 }]} pointerEvents="none">
          {[0.95, 0.8, 0.62, 0.45, 0.3, 0.16, 0.06].map((o, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: VERDE, opacity: o }} />
          ))}
        </View>
        <View style={styles.heroTop}>
          <Image source={require('./assets/guida-veneto.png')} style={styles.logo} />
          <View style={styles.testiHero}>
            <Text style={styles.brand} numberOfLines={1} adjustsFontSizeToFit>Veneto Experience</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeTesto}>{t.guidaTuristica}</Text>
            </View>
          </View>
          <Pressable
            style={styles.lingua}
            onPress={() => setLinguaAperta(true)}
            accessibilityRole="button"
            accessibilityLabel={`Lingua / Language: ${NOMI_LINGUE[lingua]}`}
          >
            <IconaGlobo colore="#fff" />
            <Text style={styles.linguaValore}>{lingua.toUpperCase()}</Text>
            <IconaGiu colore="#fff" />
          </Pressable>
        </View>
        <Text style={styles.heroTitolo}>{t.heroTitolo}</Text>
        <Text style={styles.heroSottotitolo}>{t.heroSottotitolo}</Text>
      </View>

      <View style={styles.funzioni}>
        {funzioni.map((Icona, i) => (
          <View key={i} style={styles.funzione}>
            <Icona colore={VERDE} />
            <Text style={styles.funzioneTesto} numberOfLines={2}>{t.funzioni[i]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.offline}>
        <IconaNuvola colore={VERDE} />
        <View style={{ flex: 1 }}>
          <Text style={styles.offlineTitolo}>{t.offlineTitolo}</Text>
          <Text style={styles.offlineTesto}>{t.offlineTesto}</Text>
        </View>
      </View>

      <View style={styles.sezione}>
        <Text style={styles.sezioneTitolo}>{t.esploraCitta}</Text>
        <Text style={styles.sezioneConto}>{t.destinazioni(CITTA.length)}</Text>
      </View>
    </View>
  );

  const citta = CITTA.find((c) => c.id === daCancellare);

  return (
    <SafeAreaView style={styles.contenitore} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={CITTA.length % 2 ? [...CITTA, { id: '_vuoto' }] : CITTA}
        keyExtractor={(c) => c.id}
        numColumns={2}
        columnWrapperStyle={styles.colonne}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={intestazione}
        ListFooterComponent={
          <View style={styles.piede}>
            {/* segnalazione di problemi dell'app: raggiungibile anche se una città non si apre */}
            <SegnalaApp lingua={lingua} t={traduttore(lingua)} />
            <Pressable onPress={() => setCreditiAperti(true)} style={styles.crediti}>
              <Text style={styles.testoCrediti}>Crediti</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          // con un numero dispari di città l'ultima resta larga metà, come le altre
          if (item.id === '_vuoto') return <View style={{ flex: 1 }} />;
          const installata = stato.installate.includes(item.id);
          const tipo = stato.tipi?.[item.id];
          const impegnata = occupata === item.id;
          return (
            <SchedaCitta
              citta={item}
              motto={testoLingua(lingua, item.motto) || item.provincia}
              copertina={COPERTINE[item.id]}
              coloreSfondo={COLORI[item.id] || '#64748b'}
              t={t}
              acquistata={stato.acquistate.includes(item.id)}
              completaInstallata={installata && tipo === 'completo'}
              provaInstallata={installata && tipo === 'prova'}
              aggiornabile={installata && daAggiornare.includes(item.id)}
              impegnata={impegnata}
              percentuale={impegnata && progresso?.id === item.id ? Math.round((progresso.fatti / progresso.totale) * 100) : null}
              prezzo={prezzoCitta(item)}
              onVisita={() => visita(item.id)}
              onAcquista={() => compra(item.id)}
              onApri={() => setCittaAperta(item.id)}
              onAggiorna={() => setDaMostrareAggiornamento(item.id)}
              onCancella={() => setDaCancellare(item.id)}
              onScarica={() => scarica(item.id, 'completo')}
            />
          );
        }}
      />

      <PopupAggiornamento
        citta={CITTA.find((c) => c.id === daMostrareAggiornamento)}
        novita={novita[daMostrareAggiornamento]}
        lingua={lingua}
        t={t}
        onChiudi={() => setDaMostrareAggiornamento(null)}
        onAggiorna={() => {
          const id = daMostrareAggiornamento;
          setDaMostrareAggiornamento(null);
          scarica(id, 'completo');
        }}
      />

      <Modal visible={!!citta} transparent animationType="fade" onRequestClose={() => setDaCancellare(null)}>
        {/* un solo contenitore a tutto schermo: sfondo scuro e popup centrato (un po' sopra il centro) */}
        <View style={styles.popupContenitore}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDaCancellare(null)} accessibilityLabel={t.annulla} />
          <View style={styles.popup} accessibilityViewIsModal>
            <View style={styles.popupIcona}>
              <IconaCestino misura={24} colore={ROSSO} />
            </View>
            <Text style={styles.popupTitolo}>{t.cancellaTitolo.replace('{nome}', citta?.nome || '')}</Text>
            <Text style={styles.popupTesto}>
              {t.cancellaTesto.replace('{mb}', String(Math.ceil(citta?.dimensione_mb || 0)))}
            </Text>
            <Text style={styles.popupTesto}>{t.cancellaAcquisto}</Text>
            <View style={styles.popupPulsanti}>
              <Pressable onPress={() => setDaCancellare(null)} style={[styles.popupPulsante, styles.popupAnnulla]} accessibilityRole="button">
                <Text style={styles.popupAnnullaTesto}>{t.annulla}</Text>
              </Pressable>
              <Pressable onPress={confermaCancella} style={[styles.popupPulsante, styles.popupCancella]} accessibilityRole="button">
                <Text style={styles.popupCancellaTesto}>{t.cancella}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={scaricando} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.velo}>
          <View style={[styles.menu, styles.avvisoScarica]}>
            <ActivityIndicator style={{ marginBottom: 12 }} />
            <Text style={styles.avvisoScaricaTesto}>{t.nonChiudere}</Text>
            {progresso ? (
              <Text style={styles.avvisoScaricaPerc}>{Math.round((progresso.fatti / progresso.totale) * 100)}%</Text>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={creditiAperti} transparent animationType="fade" onRequestClose={() => setCreditiAperti(false)}>
        <Pressable style={styles.velo} onPress={() => setCreditiAperti(false)}>
          <View style={styles.menu}>
            <View style={styles.creditiBox}>
              <Text style={styles.creditiTitolo}>Crediti</Text>
              <Text style={styles.creditiTesto}>
                Copertina di Treviso: Maddalena Addeo, da Wikimedia Commons (https://commons.wikimedia.org/wiki/User:Maddalena_Addeo). Licenza CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).

                Copertina di Vicenza: Alessandro Vecchi, da Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Vicenza_panorama.jpg). Licenza CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/).

                Copertina di Rovigo: Agenzia del Turismo del Veneto, pagina ufficiale Flickr. Licenza CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/).

                Copertina di Belluno: Jacobus, da Wikimedia Commons. Licenza CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/).

                Copertina di Verona: Arne Müseler, da Wikimedia Commons. Licenza CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/).

                Copertina di Padova: Didier Descouens, da Wikimedia Commons. Licenza CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).

                Copertina di Venezia: Horst-schlaemma. Licenza CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/).
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

const VERDE = VERDE_SCHEDA;
const CREMA = '#f7f4ec';
const TESTO = '#1c2b26';
const GRIGIO = '#5b6b64';
const ROSSO = '#b42318';

const styles = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: CREMA },
  lista: { paddingBottom: 40 },
  colonne: { gap: 12, paddingHorizontal: 14, marginBottom: 12 },

  // Intestazione verde con la foto
  hero: {
    backgroundColor: VERDE,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 48,
    overflow: 'hidden',
  },
  heroFoto: { position: 'absolute', right: 0, bottom: 0, width: '62%', opacity: 0.9 },
  heroSfumatura: { position: 'absolute', right: 0, bottom: 0, width: '62%', flexDirection: 'row' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 60, height: 60, borderRadius: 30 },
  testiHero: { flex: 1, minWidth: 0 },
  brand: { color: '#fff', fontFamily: 'Marcellus_400Regular', fontSize: 22 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  badgeTesto: { color: '#fff', fontSize: 12, fontWeight: '600' },
  lingua: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 40,
  },
  linguaValore: { color: '#fff', fontSize: 13, fontWeight: '700' },
  heroTitolo: {
    color: '#fff',
    fontFamily: 'Marcellus_400Regular',
    fontSize: 30,
    lineHeight: 34,
    marginTop: 26,
    maxWidth: 260,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 6,
  },
  heroSottotitolo: { color: '#e3eee8', fontSize: 14, lineHeight: 20, marginTop: 12, maxWidth: 240 },

  // Fascia delle funzioni
  funzioni: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: -28,
    backgroundColor: '#fbf9f3',
    borderWidth: 1,
    borderColor: '#e7e1d3',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 4,
    elevation: 4,
    shadowColor: VERDE,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  funzione: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  funzioneTesto: { color: TESTO, fontSize: 10.5, lineHeight: 13, textAlign: 'center' },

  // Riquadro "sempre con te"
  offline: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 14, marginTop: 14, backgroundColor: '#dcebdc', borderRadius: 16, padding: 14 },
  offlineTitolo: { color: VERDE, fontSize: 15, fontWeight: '700' },
  offlineTesto: { color: '#3c5148', fontSize: 12.5, marginTop: 2 },

  // Sezione città
  sezione: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 14, paddingHorizontal: 14 },
  sezioneTitolo: { color: VERDE, fontFamily: 'Marcellus_400Regular', fontSize: 25 },
  sezioneConto: { color: GRIGIO, fontSize: 12 },

  piede: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 14 },
  crediti: { alignItems: 'center', paddingVertical: 20 },
  testoCrediti: { color: GRIGIO, fontSize: 14, textDecorationLine: 'underline' },
  creditiBox: { padding: 20 },
  creditiTitolo: { color: TESTO, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  creditiTesto: { color: TESTO, fontSize: 14, lineHeight: 20 },

  // Barra in alto dentro una città
  barraCitta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 14 },
  barraGratuita: { flex: 1, color: '#dbeafe', fontSize: 12, fontWeight: '600', textAlign: 'right' },

  // Popup "Cancellare…?"
  popupContenitore: { flex: 1, backgroundColor: 'rgba(15,30,25,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  popup: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 60 },
  popupIcona: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fde8e6', alignItems: 'center', justifyContent: 'center' },
  popupTitolo: { color: TESTO, fontSize: 19, fontWeight: '800', marginTop: 14 },
  popupTesto: { color: '#3c4a44', fontSize: 14.5, lineHeight: 21, marginTop: 8 },
  popupPulsanti: { flexDirection: 'row', gap: 10, marginTop: 20 },
  popupPulsante: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  popupAnnulla: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d6cfbf' },
  popupAnnullaTesto: { color: TESTO, fontSize: 15, fontWeight: '700' },
  popupCancella: { backgroundColor: ROSSO },
  popupCancellaTesto: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Menu lingua, avviso download, crediti
  velo: { flex: 1, backgroundColor: 'rgba(15,30,25,0.5)', justifyContent: 'center', padding: 32 },
  avvisoScarica: { padding: 24, alignItems: 'center' },
  avvisoScaricaTesto: { fontSize: 15, textAlign: 'center', color: '#0f172a', lineHeight: 21 },
  avvisoScaricaPerc: { marginTop: 12, fontSize: 18, fontWeight: '700', color: VERDE },
  menu: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  voceMenu: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  voceMenuTesto: { color: TESTO, fontSize: 18 },
  voceMenuAttiva: { fontWeight: '700', color: VERDE },
});
