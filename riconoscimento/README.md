# Archivio immagini per il riconoscimento dei luoghi

Questa cartella contiene le immagini di riferimento usate dal futuro sistema **Search by Photo**. È separata dalle immagini già incluse nell'app e non modifica il funzionamento attuale.

## Struttura

- `padova/indice.json`: elenco dei luoghi e delle immagini associate, usando gli ID già presenti nei pacchetti/catalogo.
- `padova/immagini/`: fotografie di riferimento, organizzate in sottocartelle per ID luogo.

## Convenzioni

- Una cartella per luogo, con nome uguale all'ID stabile del luogo (es. `basilica-di-sant-antonio`).
- File JPEG: `01.jpg`, `02.jpg`, `03.jpg`…
- Preferire scatti reali da smartphone, da angolazioni e distanze diverse; evitare duplicati e immagini con watermark.
- Come punto di partenza: 3–5 foto per luogo. Immagini orientativamente 1024 px sul lato lungo, JPEG ottimizzato.
- Non rinominare gli ID dei luoghi: devono corrispondere a quelli usati dall'app.
- Non inserire ancora embedding o dati generati automaticamente: verranno aggiunti quando sarà definito e testato il motore di matching.

## Procedura iniziale

1. Aggiungere le foto in `padova/immagini/<id-luogo>/`.
2. Aggiornare `padova/indice.json` con i nomi dei file.
3. Provare il dataset con fotografie indipendenti scattate da smartphone prima di estenderlo alle altre città.

L'indice di Padova è stato precompilato con i 10 ID di anteprima del catalogo; gli elenchi immagini sono inizialmente vuoti.
