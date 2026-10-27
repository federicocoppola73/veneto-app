# Veneto: Monumenti & altro

App regionale: scegli la città da esplorare. Il gratuito include i servizi pratici, un'anteprima di monumenti e le linee dei mezzi. Le città si acquistano separatamente o in pacchetto.

Stato: scheletro iniziale. Schermata di scelta e catalogo (`catalogo.json`). Da fare: download dei pacchetti, acquisti, cambio città.

Note:
- i prezzi non sono nel codice: li legge lo store tramite lo SKU di ogni città;
- i dati delle città arrivano dai repository di Venezia, Verona e Padova (generatori), pubblicati come pacchetti.

## Pacchetti delle città

- Ogni città in `catalogo.json` ha un campo `pacchetto`: l'indirizzo di un file JSON con l'elenco dei file da scaricare: `{ "file": [{ "path": "dati/luoghi.json", "url": "https://..." }] }`. Finché il campo è `null`, il pulsante "Scarica" è disattivato.
- I file si salvano nella cartella dell'app, per città. Lo stato (città attiva e installate) è in `stato.json`.
- La schermata mostra la città attiva con i suoi monumenti (da `dati/luoghi.json`, altrimenti l'anteprima gratuita).
- Dipendenze da installare prima della build: `npm install`.
