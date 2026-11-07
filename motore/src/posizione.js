import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import * as Location from 'expo-location';

/**
 * Posizione dell'utente, solo mentre l'app è aperta e solo dopo che l'utente tocca il pulsante 📍.
 * La posizione resta sul telefono: non viene salvata né inviata a nessuno.
 *
 * stato: 'spento' | 'ricerca' | 'attivo' | 'negato' | 'errore'
 * coordinate: { latitudine, longitudine, precisione } oppure null
 */
export function usePosizione() {
  const [stato, setStato] = useState('spento');
  const [coordinate, setCoordinate] = useState(null);
  const [puoiChiedere, setPuoiChiedere] = useState(true);
  const abbonamento = useRef(null);
  const bussola = useRef(null);
  // direzione in cui guarda il telefono (gradi, 0 = nord), dalla bussola; null se non disponibile
  const [direzione, setDirezione] = useState(null);

  const ferma = useCallback(() => {
    abbonamento.current?.remove();
    abbonamento.current = null;
    bussola.current?.remove();
    bussola.current = null;
  }, []);

  useEffect(() => ferma, [ferma]); // alla chiusura dell'app smette di seguire la posizione

  const attiva = useCallback(async () => {
    try {
      setStato('ricerca');
      const permesso = await Location.requestForegroundPermissionsAsync();
      if (permesso.status !== 'granted') {
        setPuoiChiedere(permesso.canAskAgain !== false);
        setStato('negato');
        return null;
      }
      // prima posizione rapida, poi aggiornamenti mentre l'utente cammina
      const aggiorna = (p) =>
        setCoordinate({
          latitudine: p.coords.latitude,
          longitudine: p.coords.longitude,
          precisione: p.coords.accuracy,
        });
      const prima =
        (await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 200 })) ||
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      aggiorna(prima);
      setStato('attivo');
      ferma();
      abbonamento.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 15, timeInterval: 5000 },
        aggiorna
      );
      try {
        bussola.current = await Location.watchHeadingAsync((h) => {
          const gradi = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          setDirezione(gradi >= 0 ? gradi : null);
        });
      } catch {
        setDirezione(null); // il sensore non c'è: la freccia resta orientata a nord
      }
      return {
        latitudine: prima.coords.latitude,
        longitudine: prima.coords.longitude,
      };
    } catch {
      setStato('errore');
      return null;
    }
  }, [ferma]);

  const disattiva = useCallback(() => {
    ferma();
    setCoordinate(null);
    setDirezione(null);
    setStato('spento');
  }, [ferma]);

  const apriImpostazioni = useCallback(() => Linking.openSettings().catch(() => {}), []);

  return { stato, coordinate, direzione, puoiChiedere, attiva, disattiva, apriImpostazioni };
}
