/**
 * Segnalazioni dall'app "Veneto: Monumenti & altro" (pulsante "Segnala un problema" nella scheda di un luogo).
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
 * Se modifichi questo codice: Esegui il deployment → Gestisci deployment → modifica (matita) →
 * Versione: "Nuova versione". Così l'URL resta lo stesso.
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

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.chiave !== CHIAVE || !TIPI[d.tipo]) return risposta({ ok: false, errore: 'dati' });
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
    return risposta({ ok: false, errore: 'interno' });
  }
}

// Prova manuale dall'editor: scrive una riga e manda l'email
function prova() {
  return doPost({
    postData: {
      contents: JSON.stringify({
        chiave: CHIAVE, id: 'prova-' + Date.now(), tipo: 'orari', citta: 'Venezia', luogoNome: 'Basilica di San Marco',
        luogoId: 'basilica-san-marco', descrizione: 'Segnalazione di prova', lingua: 'it', versione: 'prova',
      }),
    },
  }).getContent();
}

function foglioSegnalazioni() {
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  let foglio = doc.getSheetByName(NOME_FOGLIO);
  if (!foglio) {
    foglio = doc.insertSheet(NOME_FOGLIO);
    foglio.appendRow(INTESTAZIONE);
    foglio.setFrozenRows(1);
    foglio.getRange(1, 1, 1, INTESTAZIONE.length).setFontWeight('bold');
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
