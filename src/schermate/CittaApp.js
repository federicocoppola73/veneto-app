import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MappaZoomabile from '../components/MappaZoomabile';
import { creaProiezione } from '../geo';
import { etichette, testoLingua } from '../lingue';
import ListaLuoghi from './ListaLuoghi';
import DettaglioLuogo from './DettaglioLuogo';

// L'app di una città dentro il contenitore: mappa con i luoghi, elenco e schede.
export default function CittaApp({ nome, luoghi, mappa, lingua, t, onIndietro }) {
  const e = etichette(lingua);
  const [sezione, setSezione] = useState('mappa'); // 'mappa' | 'elenco' | 'scheda'
  const [luogoId, setLuogoId] = useState(null);
  const [daDove, setDaDove] = useState('mappa');

  const punti = useMemo(() => {
    const proiezione = creaProiezione(mappa);
    return luoghi.map((l) => {
      const p = proiezione(l.latitudine, l.longitudine);
      return { id: l.id, x: p.x, y: p.y, etichetta: l.nome, colore: '#1d4ed8' };
    });
  }, [luoghi, mappa]);

  const apri = (id, da) => {
    setLuogoId(id);
    setDaDove(da);
    setSezione('scheda');
  };

  const luogo = luoghi.find((l) => l.id === luogoId);

  return (
    <View style={styles.contenitore}>
      <View style={styles.barra}>
        <Pressable onPress={onIndietro} style={styles.indietro}>
          <Text style={styles.indietroTesto}>← {t.indietro}</Text>
        </Pressable>
        <Text style={styles.nome} numberOfLines={1}>{nome}</Text>
      </View>

      {sezione !== 'scheda' && (
        <View style={styles.schede}>
          <Pressable onPress={() => setSezione('mappa')} style={[styles.scheda, sezione === 'mappa' && styles.schedaAttiva]}>
            <Text style={[styles.testoScheda, sezione === 'mappa' && styles.testoSchedaAttiva]}>{e.mappa}</Text>
          </Pressable>
          <Pressable onPress={() => setSezione('elenco')} style={[styles.scheda, sezione === 'elenco' && styles.schedaAttiva]}>
            <Text style={[styles.testoScheda, sezione === 'elenco' && styles.testoSchedaAttiva]}>{e.luoghi}</Text>
          </Pressable>
        </View>
      )}

      {sezione === 'mappa' && (
        <View style={styles.mappa}>
          <MappaZoomabile
            sorgente={{ uri: mappa.uri }}
            larghezzaImmagine={mappa.larghezza}
            altezzaImmagine={mappa.altezza}
            punti={punti}
            percorso={null}
            onPressPunto={(id) => apri(id, 'mappa')}
          />
        </View>
      )}

      {sezione === 'elenco' && (
        <View style={styles.corpo}>
          <ListaLuoghi luoghi={luoghi} lingua={lingua} t={t} onApri={(id) => apri(id, 'elenco')} onIndietro={() => setSezione('mappa')} />
        </View>
      )}

      {sezione === 'scheda' && luogo && (
        <View style={styles.corpo}>
          <DettaglioLuogo luogo={luogo} lingua={lingua} t={t} onIndietro={() => setSezione(daDove)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: { flex: 1 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  indietro: { paddingVertical: 6 },
  indietroTesto: { color: '#1d4ed8', fontWeight: '700', fontSize: 15 },
  nome: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0f172a' },
  schede: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  scheda: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#e2e8f0' },
  schedaAttiva: { backgroundColor: '#1d4ed8' },
  testoScheda: { fontSize: 13, fontWeight: '700', color: '#334155' },
  testoSchedaAttiva: { color: '#fff' },
  mappa: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  corpo: { flex: 1 },
});
