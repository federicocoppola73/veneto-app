// Immagini della città attiva. Il percorso della cartella "assets" del pacchetto viene impostato
// all'apertura della città; l'oggetto legge l'uri al momento del disegno, quindi resta valido.
let CARTELLA = null;
export function impostaCartellaAssets(percorso) {
  CARTELLA = percorso;
}
export function immagine(relativo) {
  return {
    get uri() {
      return CARTELLA ? CARTELLA + relativo : '';
    },
  };
}
