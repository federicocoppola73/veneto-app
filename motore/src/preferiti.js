// Liste personali salvate sul telefono (AsyncStorage):
// - luoghi del cuore: l'utente li segna con il cuore nella scheda;
// - luoghi visitati: l'utente li segna con "Ci sono stato" nella scheda o con "Visitata" durante un itinerario.
// Senza il modulo nativo (per esempio in un'anteprima) valgono finché l'app resta aperta.
import { useCallback, useEffect, useRef, useState } from 'react';

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  AsyncStorage = null;
}
const CHIAVE_CUORE = 'luoghiDelCuore';
const CHIAVE_VISITATI = 'luoghiVisitati';

// Elenco di id salvato con la chiave indicata, nell'ordine in cui sono stati aggiunti
function useListaSalvata(chiave) {
  const [lista, setLista] = useState([]);
  const rifLista = useRef(lista); // copia sempre aggiornata, per sapere quanti id sono nuovi
  rifLista.current = lista;

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const s = AsyncStorage ? await AsyncStorage.getItem(chiave) : null;
        const salvata = s ? JSON.parse(s) : [];
        if (vivo && Array.isArray(salvata)) setLista((attuale) => [...new Set([...salvata, ...attuale])]);
      } catch {}
    })();
    return () => {
      vivo = false;
    };
  }, [chiave]);

  const salva = useCallback(
    (nuova) => {
      if (AsyncStorage) AsyncStorage.setItem(chiave, JSON.stringify(nuova)).catch(() => {});
      return nuova;
    },
    [chiave]
  );

  // aggiunge l'id se manca, lo toglie se c'è
  const cambia = useCallback((id) => {
    setLista((l) => salva(l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  }, [salva]);

  // aggiunge l'id solo se manca (per esempio dalla guida dell'itinerario)
  const aggiungi = useCallback((id) => {
    setLista((l) => (l.includes(id) ? l : salva([...l, id])));
  }, [salva]);

  // aggiunge più id insieme (per esempio da un link ricevuto); restituisce quanti erano nuovi
  const aggiungiMolti = useCallback(
    (ids) => {
      const nuovi = [...new Set(ids)].filter((id) => !rifLista.current.includes(id));
      if (nuovi.length) setLista((l) => salva([...l, ...nuovi.filter((id) => !l.includes(id))]));
      return nuovi.length;
    },
    [salva]
  );

  return { lista, cambia, aggiungi, aggiungiMolti };
}

export function usePreferiti() {
  const { lista, cambia, aggiungiMolti } = useListaSalvata(CHIAVE_CUORE);
  return { preferiti: lista, cambia, aggiungiMolti };
}

export function useVisitati() {
  const { lista, cambia, aggiungi } = useListaSalvata(CHIAVE_VISITATI);
  return { visitati: lista, cambia, aggiungi };
}
