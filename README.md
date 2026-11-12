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
- Campo facoltativo `sede` di un luogo (testo nelle lingue, es. `{ "it": "presso Ca' Pesaro" }`): compare accanto alla zona nella scheda, per i musei ospitati in un altro edificio.
- Campo facoltativo `note_finali` di un luogo: riquadri in fondo alla scheda, `[{ "icona": "🪑", "titolo": { "it": "…" }, "testo": { "it": "…" } }]`.
- Accessibilità dei luoghi: campo facoltativo `accessibilita` in `dati/luoghi.json`. Le icone compaiono accanto alla categoria nella scheda solo se ci sono sia `fonte` sia `verificato`; al tocco si apre un popup con la spiegazione. Tipi: `motoria`, `ascensore`, `visiva`, `tattile`, `uditiva`, `cognitiva`, `servizi` (servizi igienici; icone in `assets/icone/accessibilita/`). Se un tipo non ha dati verificati, non si scrive. Per un luogo non accessibile a persone con disabilità motoria si usa `"non_accessibile": true` (icona della mobilità barrata, in rosso), oppure un testo `{ "it": "…" }` che compare come nota sotto la frase standard; in quel caso l'icona `motoria` non si mostra.
- Ricerca dei luoghi: il chip "Con info accessibilità" mostra solo i luoghi con almeno una voce verificata (fonte e data), con il contatore "n di N luoghi" per la copertura dei controlli nelle tipologie e nella zona scelte. Nei risultati questi luoghi hanno l'icona generale di accessibilità (bianca su cerchio azzurro, `assets/icone/accessibilita/accessibilita_generale.svg`) sulla riga della tipologia. Scrivere solo "accessibile", "carrozzina", "wheelchair"… nel campo equivale ad attivare il chip.

  ```json
  "accessibilita": {
    "fonte": "https://sito-ufficiale-del-luogo/accessibilita",
    "verificato": "2026-11-10",
    "voci": {
      "motoria": { "it": "Ingresso con rampa e percorso senza gradini al piano terra.", "en": "…" },
      "ascensore": { "it": "Ascensore per il primo piano.", "en": "…" }
    }
  }
  ```
- Le foto con autore e licenza sono in `assets/` di ogni città; i crediti stanno nei file `dati/*.json`. Le immagini generate con AI sono indicate come "Immagine generata con AI".

## Sviluppo

- Dipendenze: `npm install`.
- Avvio: `npm start`.
- Build di prova (Android): `npm run build:prova`.
- Build per lo store (Android): `npm run build:store`.
- Informativa sulla privacy: `docs/privacy/index.html`.
