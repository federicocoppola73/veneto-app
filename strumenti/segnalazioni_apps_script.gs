/**
 * Segnalazioni dall'app "Veneto: Monumenti & altro":
 * - "Segnala un problema" nella scheda di un luogo → scheda "Segnalazioni" del Foglio;
 * - "Segnala un problema dell'app" (Info e home) → scheda "App", con email e foto facoltative.
 *   Le foto vanno nella cartella "Segnalazioni Veneto – foto" del tuo Google Drive e arrivano anche in allegato.
 *
 * Come si installa (una volta sola):
 * 1. Crea un nuovo Foglio Google (es. "Segnalazioni Veneto").
 * 2. Menu Estensioni → Apps Script. Cancella il codice di esempio e incolla tutto questo file. Salva.
 * 3. Esegui una volta la funzione "prova" (menu in alto, pulsante Esegui) e accetta le autorizzazioni:
 *    servono per scrivere nel Foglio e mandare l'email. Ti arriva una email di prova.
 * 4. Pulsante "Esegui il deployment" → Nuovo deployment → tipo "Applicazione web".
 *    Esegui come: Me. Chi ha accesso: Chiunque. Poi "Esegui il deployment".
 * 5. Copia l'URL dell'applicazione web (finisce con /exec) e mandalo a chi aggiorna l'app:
 *    va in motore/src/segnalazioni.js (URL_SEGNALAZIONI).
 *
 * Se modifichi questo codice (o lo sostituisci con una versione nuova): Esegui il deployment →
 * Gestisci deployment → modifica (matita) → Versione: "Nuova versione" → Esegui il deployment.
 * Così l'URL resta lo stesso. Se Google chiede nuove autorizzazioni (per esempio per Drive), accettale.
 */

const EMAIL = 'info.fc.developer@gmail.com';
const CHIAVE = 'veneto-segnalazioni-1'; // la stessa di motore/src/segnalazioni.js
const NOME_FOGLIO = 'Segnalazioni';
const TIPI = {
  errata: 'Informazione errata',
  orari: 'Orari non aggiornati',
  chiuso: 'Luogo chiuso o non accessibile',
  foto: 'Fotografia non corretta',
  altro: 'Altro problema',
};
const INTESTAZIONE = ['Data', 'Città', 'Luogo', 'Id luogo', 'Problema', 'Descrizione', 'Lingua', 'Versione app', 'Id segnalazione', 'Stato'];

const NOME_FOGLIO_APP = 'App';
const CARTELLA_FOTO = 'Segnalazioni Veneto – foto';
const MAX_FOTO_BYTE = 2000000;
const TIPI_APP = {
  crash: "L'app si chiude da sola",
  nonfunziona: 'Qualcosa non funziona',
  testi: 'Errore nei testi o nelle traduzioni',
  suggerimento: 'Suggerimento',
  altro: 'Altro',
};
const INTESTAZIONE_APP = ['Data', 'Problema', 'Descrizione', 'Email', 'Città aperta', 'Versione app', 'Sistema', 'Telefono', 'Lingua', 'Foto', 'Id segnalazione', 'Stato'];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.chiave !== CHIAVE) return risposta({ ok: false, errore: 'dati' });
    if (d.ambito === 'app') return segnalazioneApp(d);
    if (!TIPI[d.tipo]) return risposta({ ok: false, errore: 'dati' });
    const s = {
      id: pulisci(d.id, 60),
      citta: pulisci(d.citta, 60),
      luogo: pulisci(d.luogoNome, 120),
      luogoId: pulisci(d.luogoId, 80),
      tipo: TIPI[d.tipo],
      descrizione: pulisci(d.descrizione, 1000),
      lingua: pulisci(d.lingua, 5),
      versione: pulisci(d.versione, 20),
    };
    const foglio = foglioSegnalazioni();
    // la stessa segnalazione può arrivare due volte (invio ripetuto senza rete): si scrive una volta sola
    if (s.id && foglio.getRange('I:I').createTextFinder(s.id).matchEntireCell(true).findNext()) {
      return risposta({ ok: true, doppia: true });
    }
    foglio.appendRow([new Date(), s.citta, s.luogo, s.luogoId, s.tipo, s.descrizione, s.lingua, s.versione, s.id, 'Da verificare']);
    MailApp.sendEmail({
      to: EMAIL,
      subject: 'Segnalazione: ' + s.luogo + ' – ' + s.citta + ' (' + s.tipo + ')',
      body:
        'Luogo: ' + s.luogo + ' (' + s.luogoId + ')\n' +
        'Città: ' + s.citta + '\n' +
        'Problema: ' + s.tipo + '\n' +
        'Descrizione: ' + (s.descrizione || '—') + '\n\n' +
        'Lingua: ' + s.lingua + ' · Versione app: ' + s.versione + '\n' +
        'Foglio: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    });
    return risposta({ ok: true });
  } catch (err) {
    // l'errore si vede in Apps Script → Esecuzioni (e nel registro, lanciando le funzioni di prova)
    console.error('Segnalazione non salvata: ' + (err && err.stack ? err.stack : err));
    return risposta({ ok: false, errore: String(err && err.message ? err.message : err) });
  }
}

// Segnalazione di un problema dell'app: riga nella scheda "App", foto su Drive, email (con risposta diretta a chi scrive)
function segnalazioneApp(d) {
  if (!TIPI_APP[d.tipo]) return risposta({ ok: false, errore: 'dati' });
  const s = {
    id: pulisci(d.id, 60),
    tipo: TIPI_APP[d.tipo],
    descrizione: pulisci(d.descrizione, 1000),
    email: pulisci(d.email, 120),
    citta: pulisci(d.citta, 60),
    versione: pulisci(d.versione, 20),
    sistema: pulisci(d.sistema, 60),
    modello: pulisci(d.modello, 80),
    lingua: pulisci(d.lingua, 5),
  };
  const emailValida = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email);
  const foglio = foglioCon(NOME_FOGLIO_APP, INTESTAZIONE_APP);
  if (s.id && foglio.getRange('K:K').createTextFinder(s.id).matchEntireCell(true).findNext()) {
    return risposta({ ok: true, doppia: true });
  }
  // foto facoltativa: solo JPEG/PNG e non troppo grande
  let file = null;
  if (d.foto && d.foto.base64 && /^image\/(jpeg|png)$/.test(d.foto.mime || '')) {
    const byte = Utilities.base64Decode(d.foto.base64);
    if (byte.length <= MAX_FOTO_BYTE) {
      const estensione = d.foto.mime === 'image/png' ? 'png' : 'jpg';
      const blob = Utilities.newBlob(byte, d.foto.mime, 'segnalazione-' + (s.id || Date.now()) + '.' + estensione);
      file = cartellaFoto().createFile(blob);
    }
  }
  foglio.appendRow([
    new Date(), s.tipo, s.descrizione, s.email, s.citta, s.versione, s.sistema, s.modello, s.lingua,
    file ? file.getUrl() : '', s.id, 'Da verificare',
  ]);
  const opzioni = {
    to: EMAIL,
    subject: 'App: ' + s.tipo + (s.citta ? ' (' + s.citta + ')' : ''),
    body:
      'Problema: ' + s.tipo + '\n' +
      'Descrizione: ' + (s.descrizione || '—') + '\n' +
      'Email di chi scrive: ' + (s.email || '— (non indicata)') + '\n\n' +
      'Città aperta: ' + (s.citta || '—') + '\n' +
      'Versione app: ' + s.versione + ' · ' + s.sistema + ' · ' + s.modello + ' · lingua ' + s.lingua + '\n' +
      (file ? 'Foto: ' + file.getUrl() + '\n' : '') +
      'Foglio: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  };
  if (emailValida) opzioni.replyTo = s.email; // basta premere "Rispondi" per scrivere a chi ha segnalato
  if (file) opzioni.attachments = [file.getBlob()];
  MailApp.sendEmail(opzioni);
  return risposta({ ok: true });
}

function cartellaFoto() {
  const trovate = DriveApp.getFoldersByName(CARTELLA_FOTO);
  return trovate.hasNext() ? trovate.next() : DriveApp.createFolder(CARTELLA_FOTO);
}

// Prova manuale dall'editor della segnalazione dell'app (scheda "App", senza foto)
function provaApp() {
  const esito = doPost({
    postData: {
      contents: JSON.stringify({
        chiave: CHIAVE, ambito: 'app', id: 'prova-app-' + Date.now(), tipo: 'nonfunziona', descrizione: 'Segnalazione di prova',
        email: '', citta: 'Venezia', versione: 'prova', sistema: 'Android 14 (API 34)', modello: 'Telefono di prova', lingua: 'it',
      }),
    },
  }).getContent();
  // nel Registro di esecuzione: {"ok":true} se è andato tutto bene, altrimenti il messaggio d'errore
  console.log('Esito: ' + esito);
  return esito;
}

// Prova manuale dall'editor: scrive una riga e manda l'email
function prova() {
  const esito = doPost({
    postData: {
      contents: JSON.stringify({
        chiave: CHIAVE, id: 'prova-' + Date.now(), tipo: 'orari', citta: 'Venezia', luogoNome: 'Basilica di San Marco',
        luogoId: 'basilica-san-marco', descrizione: 'Segnalazione di prova', lingua: 'it', versione: 'prova',
      }),
    },
  }).getContent();
  console.log('Esito: ' + esito);
  return esito;
}

function foglioSegnalazioni() {
  return foglioCon(NOME_FOGLIO, INTESTAZIONE);
}

// scheda del Foglio con quel nome; se non c'è la crea con l'intestazione
function foglioCon(nome, intestazione) {
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  let foglio = doc.getSheetByName(nome);
  if (!foglio) {
    foglio = doc.insertSheet(nome);
    foglio.appendRow(intestazione);
    foglio.setFrozenRows(1);
    foglio.getRange(1, 1, 1, intestazione.length).setFontWeight('bold');
  }
  return foglio;
}

// testo corto e senza formule (una cella che inizia con = + - @ verrebbe letta come formula)
function pulisci(valore, massimo) {
  let t = String(valore == null ? '' : valore).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, massimo);
  if (/^[=+\-@]/.test(t)) t = "'" + t;
  return t;
}

function risposta(oggetto) {
  return ContentService.createTextOutput(JSON.stringify(oggetto)).setMimeType(ContentService.MimeType.JSON);
}
