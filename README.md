# Veneto: Monumenti & altro

App regionale per esplorare le città del Veneto. Il gratuito include i servizi pratici, un'anteprima di 10 monumenti per città e le linee dei mezzi con orario teorico. Ogni città si scarica come pacchetto.

## Stato attuale

- Catalogo con 7 città (Venezia, Verona, Padova, Treviso, Vicenza, Rovigo, Belluno), tutte con pacchetto pubblicato in `pacchetti/`.
- Schermata iniziale per scegliere, scaricare, aggiornare, aprire e rimuovere le città. La città attiva e quelle installate sono salvate in `stato.json`.
- Lingue: italiano, inglese, francese, tedesco e spagnolo.
- Dentro la città: elenco e schede dei luoghi, mappa con zoom, personaggi, itinerari, meteo e marea, cartoline e condivisione. Dove il pacchetto li include: cibi, fermate e orari dei mezzi.
- Acquisti: non ancora implementati. In `catalogo.json` il campo `sku` è vuoto per tutte le città; i prezzi non sono nel codice e arriveranno dallo store.

## Da sistemare

- `motore/src/store.js`: `LINK_APP_STORE` è vuoto finché l'app non è su Apple.
- Acquisti delle città a pagamento: serve lo SKU per ogni città; il pacchetto a pagamento arriverà dal server dopo l'acquisto.

## Pacchetti delle città

- Ogni città in `catalogo.json` ha un campo `pacchetto`: l'indirizzo del manifest con l'elenco dei file da scaricare, `{ "file": [{ "path": "dati/luoghi.json", "url": "https://...", "sha256": "..." }] }`. Se il campo è `null`, il pulsante "Scarica" è disattivato.
- I file si salvano nella cartella dell'app, per città.
- Il manifest e `dati/immagini.json` si rigenerano con `python3 strumenti/prepara_pacchetto.py pacchetti/<città>`.
- Le foto con autore e licenza sono in `assets/` di ogni città; i crediti stanno nei file `dati/*.json`. Le immagini generate con AI sono indicate come "Immagine generata con AI".

## Sviluppo

- Dipendenze: `npm install`.
- Avvio: `npm start`.
- Build di prova (Android): `npm run build:prova`.
- Build per lo store (Android): `npm run build:store`.
- Informativa sulla privacy: `docs/privacy/index.html`.
