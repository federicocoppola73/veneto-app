#!/usr/bin/env python3
"""Genera gli MP3 delle audioguide con Google Text-to-Speech (voci Chirp3-HD).

Uso (lo lancia la GitHub Action "Audioguide – genera"):
    GOOGLE_TTS_API_KEY=... python3 strumenti/audioguide.py <città> [lingue, es. it,en]

Testi:  pacchetti/<città>/audioguide/testi.json
        { "luoghi": { "<id luogo>": { "it": "testo…", "en": "text…" } } }
Voci:   strumenti/audioguide_voci.json  { "it": "it-IT-Chirp3-HD-Achernar", "en": "en-GB-Chirp3-HD-Achernar", … }
Uscita: audioguide/<città>/<lingua>/<id>.mp3 e audioguide/<città>/<lingua>/indice.json
        indice: { "versione", "voce", "luoghi": { id: { "file", "byte", "secondi", "sha256", "testo" } } }
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


def pezzi(testo):
    """Divide un testo lungo in pezzi sotto il limite di Google, senza spezzare le frasi."""
    frasi = re.split(r'(?<=[.!?…])\s+', testo.strip())
    blocchi, attuale = [], ''
    for f in frasi:
        prova = (attuale + ' ' + f).strip()
        if len(prova.encode('utf-8')) > MAX_BYTE_RICHIESTA and attuale:
            blocchi.append(attuale)
            attuale = f
        else:
            attuale = prova
    if attuale:
        blocchi.append(attuale)
    return blocchi


def sintetizza(testo, voce, codice, chiave):
    audio = b''
    for blocco in pezzi(testo):
        corpo = json.dumps({
            'input': {'text': blocco},
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
        luoghi = {}
        for id_luogo, per_lingua in sorted(testi.items()):
            testo = (per_lingua.get(lingua) or '').strip()
            if not testo:
                continue
            impronta = hashlib.sha256((voce + '|' + testo).encode('utf-8')).hexdigest()[:16]
            file = f'{id_luogo}.mp3'
            percorso = os.path.join(cartella, file)
            if vecchio.get(id_luogo, {}).get('testo') == impronta and os.path.exists(percorso):
                luoghi[id_luogo] = vecchio[id_luogo]  # testo e voce uguali: si tiene l'MP3 che c'è
                continue
            audio = sintetizza(testo, voce, CODICI[lingua], chiave)
            caratteri += len(testo)
            with open(percorso, 'wb') as f:
                f.write(audio)
            luoghi[id_luogo] = {
                'file': file,
                'byte': len(audio),
                'secondi': durata(percorso, len(audio)),
                'sha256': hashlib.sha256(audio).hexdigest(),
                'testo': impronta,
            }
            print(f'{citta}/{lingua}/{file}: {luoghi[id_luogo]["secondi"]} s')
        # MP3 di luoghi tolti dai testi: si cancellano
        for f in os.listdir(cartella):
            if f.endswith('.mp3') and f[:-4] not in luoghi:
                os.remove(os.path.join(cartella, f))
        versione = hashlib.sha256(''.join(k + v['sha256'] for k, v in sorted(luoghi.items())).encode()).hexdigest()[:12]
        with open(percorso_indice, 'w', encoding='utf-8') as f:
            json.dump({'versione': versione, 'voce': voce, 'luoghi': luoghi}, f, ensure_ascii=False, indent=1)
        print(f'{citta}/{lingua}: {len(luoghi)} audioguide, {round(sum(v["byte"] for v in luoghi.values()) / 1e6, 1)} MB')
    print(f'Caratteri inviati a Google in questa esecuzione: {caratteri}')


if __name__ == '__main__':
    main()
