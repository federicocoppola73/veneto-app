#!/usr/bin/env python3
"""Genera gli MP3 delle audioguide con Google Text-to-Speech (voci Chirp3-HD).

Uso (lo lancia la GitHub Action "Audioguide – genera"):
    GOOGLE_TTS_API_KEY=... python3 strumenti/audioguide.py <città> [lingue, es. it,en]

Testi:  pacchetti/<città>/audioguide/testi.json
        { "luoghi": {
            "<id luogo>": { "it": "testo…", "en": "text…" },                     ← una traccia
            "<id luogo>": { "tracce": [                                            ← più tracce, in ordine
                { "id": "esterno", "titolo": { "it": "Esterno", "en": "Outside" }, "testo": { "it": "…", "en": "…" } },
                { "id": "interno", "titolo": { "it": "Interno", "en": "Inside" },  "testo": { "it": "…", "en": "…" } } ] }
        } }
Voci:   strumenti/audioguide_voci.json  { "it": "it-IT-Chirp3-HD-Achernar", "en": "en-GB-Chirp3-HD-Achernar", … }
Pause: "pausa": "breve" | "media" | "lunga" | "nessuna" (nel luogo o nella singola traccia) aggiunge una pausa
        dopo ogni frase, con i tag di pausa delle voci Chirp3-HD ([pause short], [pause], [pause long]).
        Se manca vale "pausa_predefinita" di audioguide_voci.json.
Bozze: un luogo può avere "bozza": { …stessa forma di un luogo… }: la bozza si usa solo in anteprima,
        mentre la pubblicazione normale continua a usare il testo attuale.
Anteprima: con ANTEPRIMA="id1,id2" genera solo quei luoghi in anteprima/<lingua>/ (sempre, senza indice),
        per ascoltarli prima di pubblicarli. La cartella audioguide/ non viene toccata.
Uscita: audioguide/<città>/<lingua>/<id>.mp3 e audioguide/<città>/<lingua>/indice.json
        indice: { "versione", "voce", "luoghi": { id: { "byte", "secondi", "tracce": [
                    { "id", "titolo", "file", "byte", "secondi", "sha256", "testo" } ] } } }
        (una traccia: file <id>.mp3, titolo null; più tracce: <id>__<traccia>.mp3)
        ("testo" è l'impronta del testo + voce: se non cambia, l'MP3 non si rigenera)
"""
import base64
import hashlib
import json
import os
import re
import sys
import urllib.request

API = 'https://texttospeech.googleapis.com/v1/text:synthesize?key='
CODICI = {'it': 'it-IT', 'en': 'en-GB', 'fr': 'fr-FR', 'de': 'de-DE', 'es': 'es-ES'}
MAX_BYTE_RICHIESTA = 4500  # Google accetta al massimo 5000 byte di testo per richiesta
KBPS = 32  # MP3 di Google: serve solo come stima se la durata non si legge dal file


PAUSE = {'breve': '[pause short]', 'media': '[pause]', 'lunga': '[pause long]'}


def con_pause(testo, pausa):
    """Aggiunge il tag di pausa dopo ogni frase (e tra i paragrafi)."""
    tag = PAUSE.get(pausa or '')
    if not tag:
        return testo
    return re.sub(r'([.!?…])(["”»]?)(\s+)',
                  lambda m: m.group(1) + m.group(2) + ' ' + tag + ('\n\n' if '\n' in m.group(3) else ' '), testo.strip())


def pezzi(testo):
    """Divide un testo lungo in pezzi sotto il limite di Google, senza spezzare le frasi.
    Taglia di preferenza tra un paragrafo e l'altro, e nessun pezzo inizia o finisce con un tag di pausa
    (un pezzo che inizia con [pause …] fa produrre alla voce suoni senza senso)."""
    def sotto_limite(t):
        return len(t.encode('utf-8')) <= MAX_BYTE_RICHIESTA

    def pulito(t):
        return re.sub(r'^(\s*\[pause[^\]]*\])+\s*|(\s*\[pause[^\]]*\])+\s*$', '', t.strip())

    blocchi, attuale = [], ''
    for paragrafo in re.split(r'\n\s*\n', testo.strip()):
        prova = (attuale + '\n\n' + paragrafo).strip()
        if sotto_limite(prova):
            attuale = prova
            continue
        if attuale:
            blocchi.append(attuale)
        attuale = ''
        for f in re.split(r'(?<=[.!?…])\s+', paragrafo):
            prova = (attuale + ' ' + f).strip()
            if not sotto_limite(prova) and attuale:
                blocchi.append(attuale)
                attuale = f
            else:
                attuale = prova
    if attuale:
        blocchi.append(attuale)
    return [b for b in (pulito(x) for x in blocchi) if b]


def sintetizza(testo, voce, codice, chiave, pausa=None):
    audio = b''
    for blocco in pezzi(con_pause(testo, pausa)):
        corpo = json.dumps({
            'input': {'markup': blocco} if PAUSE.get(pausa or '') else {'text': blocco},
            'voice': {'languageCode': codice, 'name': voce},
            'audioConfig': {'audioEncoding': 'MP3', 'sampleRateHertz': 24000},
        }).encode()
        richiesta = urllib.request.Request(API + chiave, data=corpo, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(richiesta, timeout=120) as r:
            audio += base64.b64decode(json.load(r)['audioContent'])  # i pezzi MP3 si possono accodare
    return audio


def durata(percorso, byte):
    try:
        from mutagen.mp3 import MP3
        return round(MP3(percorso).info.length)
    except Exception:
        return round(byte * 8 / (KBPS * 1000))


def main():
    chiave = os.environ.get('GOOGLE_TTS_API_KEY')
    if not chiave or len(sys.argv) < 2:
        sys.exit(__doc__)
    citta = sys.argv[1].strip().lower()
    if not re.fullmatch(r'[a-z]+', citta):
        sys.exit('Città non valida: ' + citta)
    with open(f'pacchetti/{citta}/audioguide/testi.json', encoding='utf-8') as f:
        testi = json.load(f)['luoghi']
    with open('strumenti/audioguide_voci.json', encoding='utf-8') as f:
        voci = json.load(f)
    lingue = [l.strip() for l in sys.argv[2].split(',') if l.strip()] if len(sys.argv) > 2 and sys.argv[2].strip() else []
    lingue = [l for l in (lingue or CODICI) if l in CODICI and l in voci]
    predefinita = voci.get('pausa_predefinita')

    def pausa_di(valore):
        valore = predefinita if valore is None else valore
        return None if valore in (None, '', 'nessuna') else valore

    anteprima = {x.strip() for x in os.environ.get('ANTEPRIMA', '').split(',') if x.strip()}
    caratteri = 0
    for lingua in lingue:
        voce = voci[lingua]
        cartella = f'audioguide/{citta}/{lingua}'
        os.makedirs(cartella, exist_ok=True)
        percorso_indice = os.path.join(cartella, 'indice.json')
        try:
            with open(percorso_indice, encoding='utf-8') as f:
                vecchio = json.load(f).get('luoghi', {})
        except (OSError, ValueError):
            vecchio = {}
        # tracce già generate (anche dal vecchio formato a traccia unica), per non rigenerare i testi uguali
        gia = {}
        for id_luogo, v in vecchio.items():
            for tr in v.get('tracce') or [dict(v, id=None)]:
                if tr.get('file'):
                    gia[tr['file']] = tr
        luoghi = {}
        for id_luogo, voce_testi in sorted(testi.items()):
            if anteprima and id_luogo not in anteprima:
                continue
            if anteprima and 'bozza' in voce_testi:
                voce_testi = voce_testi['bozza']
            if 'tracce' in voce_testi:
                elenco = [
                    {'id': tr['id'], 'titolo': (tr.get('titolo') or {}).get(lingua), 'testo': (tr.get('testo') or {}).get(lingua),
                     'pausa': pausa_di(tr.get('pausa', voce_testi.get('pausa')))}
                    for tr in voce_testi['tracce']
                ]
                multiple = True
            else:
                elenco = [{'id': None, 'titolo': None, 'testo': voce_testi.get(lingua), 'pausa': pausa_di(voce_testi.get('pausa'))}]
                multiple = False
            tracce = []
            for tr in elenco:
                testo = (tr['testo'] or '').strip()
                if not testo:
                    continue
                if multiple and not re.fullmatch(r'[a-z0-9-]+', tr['id'] or ''):
                    sys.exit(f'{id_luogo}: id della traccia non valido ({tr["id"]}): usa lettere minuscole, numeri e trattini')
                chiave_testo = voce + '|' + testo if not tr['pausa'] else voce + '|pausa=' + tr['pausa'] + '|' + testo
                impronta = hashlib.sha256(chiave_testo.encode('utf-8')).hexdigest()[:16]
                if anteprima:
                    os.makedirs(f'anteprima/{lingua}', exist_ok=True)
                    nome = f'{id_luogo}__{tr["id"]}.mp3' if multiple else f'{id_luogo}.mp3'
                    audio = sintetizza(testo, voce, CODICI[lingua], chiave, tr['pausa'])
                    caratteri += len(testo)
                    with open(f'anteprima/{lingua}/{nome}', 'wb') as f:
                        f.write(audio)
                    print(f'anteprima/{lingua}/{nome}: {durata(f"anteprima/{lingua}/{nome}", len(audio))} s')
                    continue
                file = f'{id_luogo}__{tr["id"]}.mp3' if multiple else f'{id_luogo}.mp3'
                percorso = os.path.join(cartella, file)
                prima = gia.get(file)
                if prima and prima.get('testo') == impronta and os.path.exists(percorso):
                    tracce.append({**prima, 'id': tr['id'], 'titolo': tr['titolo'], 'file': file})
                    continue
                audio = sintetizza(testo, voce, CODICI[lingua], chiave, tr['pausa'])
                caratteri += len(testo)
                with open(percorso, 'wb') as f:
                    f.write(audio)
                tracce.append({
                    'id': tr['id'],
                    'titolo': tr['titolo'],
                    'file': file,
                    'byte': len(audio),
                    'secondi': durata(percorso, len(audio)),
                    'sha256': hashlib.sha256(audio).hexdigest(),
                    'testo': impronta,
                })
                print(f'{citta}/{lingua}/{file}: {tracce[-1]["secondi"]} s')
            if anteprima:
                continue
            if tracce:
                luoghi[id_luogo] = {
                    'byte': sum(x['byte'] for x in tracce),
                    'secondi': sum(x['secondi'] for x in tracce),
                    'tracce': tracce,
                }
        if anteprima:
            continue
        # MP3 di luoghi tolti dai testi: si cancellano
        usati = {tr['file'] for v in luoghi.values() for tr in v['tracce']}
        for f in os.listdir(cartella):
            if f.endswith('.mp3') and f not in usati:
                os.remove(os.path.join(cartella, f))
        versione = hashlib.sha256(
            ''.join(k + tr['sha256'] for k, v in sorted(luoghi.items()) for tr in v['tracce']).encode()
        ).hexdigest()[:12]
        with open(percorso_indice, 'w', encoding='utf-8') as f:
            json.dump({'versione': versione, 'voce': voce, 'luoghi': luoghi}, f, ensure_ascii=False, indent=1)
        print(f'{citta}/{lingua}: {len(luoghi)} audioguide, {round(sum(v["byte"] for v in luoghi.values()) / 1e6, 1)} MB')
    print(f'Caratteri inviati a Google in questa esecuzione: {caratteri}')


if __name__ == '__main__':
    main()
