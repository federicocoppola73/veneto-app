import { Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
// API "legacy": il metodo saveToLibraryAsync dell'import principale è deprecato in SDK 57
import * as MediaLibrary from 'expo-media-library/legacy';
import { LARGHEZZA_CARTOLINA } from './components/Cartolina';

// Cattura la cartolina come immagine PNG 1080 px di larghezza (file temporaneo).
export async function catturaCartolina(cartaRef, altezza) {
  return captureRef(cartaRef, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: LARGHEZZA_CARTOLINA * 3,
    height: altezza * 3,
  });
}

// Salva l'immagine nelle foto del telefono. Chiede solo il permesso di scrivere:
// l'app non legge le altre foto della galleria per questo.
export async function salvaInGalleria(uri, t) {
  try {
    const permesso = await MediaLibrary.requestPermissionsAsync(true);
    if (!permesso.granted) {
      Alert.alert(t('cart_permesso_galleria'));
      return false;
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert(t('cart_salvata'));
    return true;
  } catch (e) {
    // dettaglio tecnico, per capire la causa del problema
    Alert.alert(t('cart_errore_salva'), `${e?.message || String(e)}\n\n${uri || ''}`);
    return false;
  }
}
