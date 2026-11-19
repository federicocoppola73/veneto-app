# Search by Photo — piano tecnico iniziale

## Obiettivo della prima versione

Riconoscere esclusivamente i luoghi presenti nel catalogo dell'app. Il risultato del motore è l'ID stabile del luogo (per esempio `basilica-di-sant-antonio`); l'app userà quell'ID per aprire la scheda già esistente. Non si tenta di identificare qualsiasi oggetto o monumento del mondo.

## Stato del dataset Padova

Le immagini di riferimento sono in `riconoscimento/padova/immagini/<id-luogo>/` e sono elencate in `riconoscimento/padova/indice.json`. L'indice è la fonte di verità: il motore non deve dedurre gli ID dai nomi dei file.

## Architettura proposta

1. **Dataset** — fotografie di riferimento per ogni ID. Includere viste frontali, laterali, dettagli riconoscibili, distanze e condizioni di luce diverse. Le foto usate per la verifica devono essere scatti indipendenti, non copie o ritagli delle immagini di riferimento.
2. **Pre-elaborazione** — normalizzare orientamento EXIF e dimensioni; controllare file corrotti e duplicati.
3. **Rappresentazione visiva** — usare un modello visuale pre-addestrato (prima prova: famiglia CLIP/OpenCLIP) per convertire ogni immagine in un vettore numerico (*embedding*). Normalizzare i vettori.
4. **Indice** — salvare embedding e ID del luogo in un artefatto versionato, separato dalle immagini. Per una prima prova con poche centinaia di immagini è sufficiente una ricerca lineare per similarità coseno; non serve un database vettoriale.
5. **Matching** — convertire la foto dell'utente con lo stesso modello, confrontare il vettore con l'indice e aggregare i risultati per ID luogo. Restituire i migliori candidati, punteggio e margine tra primo e secondo risultato.
6. **Decisione** — mostrare un luogo solo se punteggio e margine superano soglie calibrate sui test. Altrimenti dichiarare che il luogo non è riconosciuto; evitare di forzare sempre una risposta.
7. **Integrazione app** — solo dopo i test, aggiungere acquisizione foto e apertura della scheda tramite ID. Valutare se l'inferenza può avvenire sul dispositivo o se serve un servizio remoto; la scelta dipende da dimensione del modello, prestazioni, privacy e costi.

## Test di qualità

Preparare un set separato di foto scattate con telefoni diversi, non presenti nel dataset di riferimento. Misurare almeno:
- Top-1 accuracy: quante volte il primo risultato è corretto;
- Top-3 accuracy: quante volte il luogo corretto compare nei primi tre;
- tasso di rifiuto corretto su foto non appartenenti al catalogo;
- confusione tra luoghi simili e prestazioni con luce, distanza e inquadrature diverse.

Non fissare soglie arbitrarie prima di avere risultati. GPS, se autorizzato dall'utente, potrà essere un segnale aggiuntivo per disambiguare luoghi vicini, mai l'unico criterio.

## Privacy e costi

La prima fase è una prova offline sul dataset pubblico del repository: non richiede di inviare foto degli utenti a un servizio esterno e non richiede modifiche all'app. Prima di introdurre un servizio remoto o un modello cloud, definire esplicitamente provider, costo, conservazione delle immagini e informativa privacy.

## Prossimi passi

- [x] Organizzare l'indice e le cartelle immagini di Padova.
- [x] Aggiungere un controllo automatico di coerenza tra indice e file.
- [ ] Eseguire il controllo sul dataset completo e correggere eventuali anomalie.
- [ ] Preparare un set di foto di test indipendenti.
- [ ] Generare embedding e misurare la qualità del matching.
- [ ] Scegliere runtime e modalità di distribuzione.
- [ ] Integrare la funzione nell'app.
