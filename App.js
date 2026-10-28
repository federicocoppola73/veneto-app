import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { CITTA, cittaPerId } from './src/catalogo';
import { attiva, datiCitta, datiMappa, installa, leggiStato, rimuovi } from './src/pacchetti';
import { etichettaStato, LINGUE, testi } from './src/lingue';
import CittaApp from './src/schermate/CittaApp';
import MotoreApp from './motore/App';
import { caricaCitta } from './motore/src/apriCitta';
import * as FileSystem from 'expo-file-system/legacy';

const CHIAVE_LINGUA = 'lingua';

// Lingua del telefono se supportata, altrimenti italiano; poi quella scelta dall'utente.
function linguaIniziale() {
  try {
    const codice = getLocales()[0]?.languageCode;
    return LINGUE.includes(codice) ? codice : 'it';
  } catch {
    return 'it';
  }
}

// Gratuito sempre attivo; le città si scaricano, si attivano e si eliminano da qui.
// I prezzi compariranno quando i prodotti saranno creati negli store.
export default function App() {
  const [lingua, setLingua] = useState(linguaIniziale);
  const [stato, setStato] = useState({ attiva: null, installate: [] });
  const [occupata, setOccupata] = useState(null); // id della città in download/eliminazione
  const [progresso, setProgresso] = useState(null); // { id, fatti, totale } durante il download
  const [luoghiAttiva, setLuoghiAttiva] = useState(null);
  const [cittaAperta, setCittaAperta] = useState(null); // id della città aperta nel contenitore
  const [datiAperti, setDatiAperti] = useState(null); // { luoghi, mappa }
  const [motorePronto, setMotorePronto] = useState(false);
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
    if (cittaAperta === 'venezia') {
      // Venezia usa il motore completo, con i dati del suo pacchetto
      const cartella = FileSystem.documentDirectory + 'citta/venezia/';
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

  useEffect(() => {
    if (!stato.attiva) {
      setLuoghiAttiva(null);
      return;
    }
    datiCitta(stato.attiva).then(setLuoghiAttiva);
  }, [stato.attiva]);

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

  const cittaAttiva = stato.attiva ? cittaPerId(stato.attiva) : null;
  const numeroLuoghi = luoghiAttiva ? luoghiAttiva.luoghi.length : (cittaAttiva?.anteprima?.length || 0);

  if (cittaAperta === 'venezia') {
    return motorePronto ? <MotoreApp onEsci={() => setCittaAperta(null)} /> : <ActivityIndicator style={{ flex: 1 }} />;
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

  return (
    <SafeAreaView style={styles.contenitore} edges={['top', 'left', 'right']}>
      <Text style={styles.titolo}>{t.titolo}</Text>

      <View style={styles.lingue}>
        {LINGUE.map((codice) => (
          <Pressable
            key={codice}
            onPress={() => cambiaLingua(codice)}
            style={[styles.lingua, lingua === codice && styles.linguaAttiva]}
          >
            <Text style={[styles.testoLingua, lingua === codice && styles.testoLinguaAttiva]}>
              {codice.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {cittaAttiva ? (
        <View style={styles.attiva}>
          <Text style={styles.attivaEtichetta}>{t.cittaAttiva}</Text>
          <Text style={styles.attivaNome}>{cittaAttiva.nome}</Text>
          <Text style={styles.attivaTesto}>{numeroLuoghi} {t.luoghi}</Text>
          {luoghiAttiva ? (
            <Pressable style={[styles.bottone, styles.bottoneLuoghi]} onPress={() => setCittaAperta(stato.attiva)}>
              <Text style={styles.testoBottone}>{t.apri} →</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.gratuito}>
          <Text style={styles.gratuitoTitolo}>{t.gratuito}</Text>
          <Text style={styles.gratuitoTesto}>{t.gratuitoTesto}</Text>
        </View>
      )}

      <Text style={styles.sottotitolo}>{t.lePiazze}</Text>
      <FlatList
        data={CITTA}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => {
          const installata = stato.installate.includes(item.id);
          const attivaOra = stato.attiva === item.id;
          const impegnata = occupata === item.id;
          return (
            <View style={[styles.card, attivaOra && styles.cardAttiva]}>
              <View style={styles.cardTesto}>
                <Text style={styles.nomeCitta}>{item.nome}</Text>
                <Text style={styles.provincia}>
                  {installata ? (attivaOra ? t.attiva : t.installata) : etichettaStato(t, item.stato)}
                </Text>
              </View>
              {impegnata ? (
                progresso && progresso.id === item.id ? (
                  <Text style={styles.percentuale}>{Math.round((progresso.fatti / progresso.totale) * 100)}%</Text>
                ) : (
                  <ActivityIndicator />
                )
              ) : installata ? (
                <View style={styles.azioni}>
                  <Pressable style={styles.bottone} onPress={() => setCittaAperta(item.id)}><Text style={styles.testoBottone}>{t.apri}</Text></Pressable>
                  {!attivaOra && <Pressable style={styles.bottone} onPress={() => esegui(item.id, attiva)}><Text style={styles.testoBottone}>{t.attiva}</Text></Pressable>}
                  <Pressable style={[styles.bottone, styles.bottoneSecondario]} onPress={() => esegui(item.id, rimuovi)}><Text style={styles.testoSecondario}>{t.elimina}</Text></Pressable>
                </View>
              ) : item.pacchetto ? (
                <Pressable style={styles.bottone} onPress={() => esegui(item.id, installa)}><Text style={styles.testoBottone}>{t.scarica}</Text></Pressable>
              ) : (
                <Text style={styles.nonDisponibile}>{t.nonAncora}</Text>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenitore: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
  titolo: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  lingue: { flexDirection: 'row', gap: 6, marginTop: 8 },
  lingua: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, backgroundColor: '#e2e8f0' },
  linguaAttiva: { backgroundColor: '#1d4ed8' },
  testoLingua: { fontSize: 12, fontWeight: '700', color: '#334155' },
  testoLinguaAttiva: { color: '#fff' },
  gratuito: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 10, marginTop: 8 },
  gratuitoTitolo: { fontSize: 15, fontWeight: '700', color: '#065f46' },
  gratuitoTesto: { fontSize: 13, color: '#065f46', marginTop: 4 },
  attiva: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 10, marginTop: 8 },
  attivaEtichetta: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  attivaNome: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  attivaTesto: { fontSize: 13, color: '#334155', marginTop: 6 },
  bottoneLuoghi: { alignSelf: 'flex-start', marginTop: 8 },
  sottotitolo: { fontSize: 14, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 6 },
  lista: { gap: 6, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardAttiva: { borderColor: '#1d4ed8' },
  cardTesto: { flex: 1 },
  nomeCitta: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  provincia: { fontSize: 12, color: '#64748b', marginTop: 0 },
  azioni: { flexDirection: 'row', gap: 8 },
  bottone: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  testoBottone: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bottoneSecondario: { backgroundColor: '#f1f5f9' },
  testoSecondario: { color: '#334155', fontWeight: '700', fontSize: 13 },
  nonDisponibile: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  percentuale: { fontSize: 15, fontWeight: '800', color: '#1d4ed8', minWidth: 48, textAlign: 'right' },
});
