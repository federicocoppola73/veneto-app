// Luoghi salvati: posizioni che l'utente salva con "+" nella scheda 📍 Salvati.
// Sono separate per città (una lista per ciascuna) e restano sul telefono (AsyncStorage).
// Ogni luogo: { id, descrizione, latitudine, longitudine, creato }
import { useCallback, useEffect, useState } from 'react';

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  AsyncStorage = null;
}

const chiave = (citta) => `luoghiSalvati:${citta}`;

export function useLuoghiSalvati(citta) {
  const [luoghi, setLuoghi] = useState([]);

  useEffect(() => {
    let vivo = true;
    setLuoghi([]);
    (async () => {
      try {
        const s = AsyncStorage ? await AsyncStorage.getItem(chiave(citta)) : null;
        const salvati = s ? JSON.parse(s) : [];
        if (vivo && Array.isArray(salvati)) setLuoghi(salvati);
      } catch {}
    })();
    return () => {
      vivo = false;
    };
  }, [citta]);

  const scrivi = useCallback(
    (nuova) => {
      if (AsyncStorage) AsyncStorage.setItem(chiave(citta), JSON.stringify(nuova)).catch(() => {});
      return nuova;
    },
    [citta]
  );

  // salva la posizione attuale con una descrizione breve
  const aggiungi = useCallback(
    (descrizione, coordinate) => {
      const nuovo = {
        id: `ls-${Date.now()}`,
        descrizione: descrizione.trim(),
        latitudine: coordinate.latitudine,
        longitudine: coordinate.longitudine,
        creato: new Date().toISOString(),
      };
      setLuoghi((l) => scrivi([nuovo, ...l]));
      return nuovo;
    },
    [scrivi]
  );

  const cancella = useCallback(
    (id) => {
      setLuoghi((l) => scrivi(l.filter((x) => x.id !== id)));
    },
    [scrivi]
  );

  return { luoghi, aggiungi, cancella };
}
