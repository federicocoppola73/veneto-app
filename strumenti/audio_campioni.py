#!/usr/bin/env python3
"""Genera alcune frasi di prova con le voci di Google Text-to-Speech, per scegliere la voce delle audioguide.

Uso (lo lancia la GitHub Action "Audioguide – voci di prova"):
    GOOGLE_TTS_API_KEY=... python3 strumenti/audio_campioni.py campioni/

Per ogni lingua (it, en, fr, de, es) e per ogni famiglia di voci (Chirp3-HD, Neural2, Wavenet)
prende una voce femminile e una maschile e salva un MP3: campioni/<lingua>/<famiglia>-<genere>-<voce>.mp3
"""
import base64
import json
import os
import sys
import urllib.request

API = 'https://texttospeech.googleapis.com/v1/'
LINGUE = {'it': 'it-IT', 'en': 'en-GB', 'fr': 'fr-FR', 'de': 'de-DE', 'es': 'es-ES'}
FAMIGLIE = ['Chirp3-HD', 'Neural2', 'Wavenet']

TESTI = {
    'it': "Benvenuti nella Basilica di San Marco. Alzate lo sguardo: le cupole sono coperte da oltre ottomila metri quadrati di mosaici dorati, realizzati in più di otto secoli. Sulla facciata, i quattro cavalli di bronzo sono copie: gli originali si trovano al riparo nel museo, al piano superiore.",
    'en': "Welcome to Saint Mark's Basilica. Look up: the domes are covered by more than eight thousand square metres of golden mosaics, made over more than eight centuries. On the facade, the four bronze horses are copies: the originals are kept safe in the museum upstairs.",
    'fr': "Bienvenue dans la basilique Saint-Marc. Levez les yeux : les coupoles sont couvertes de plus de huit mille mètres carrés de mosaïques dorées, réalisées pendant plus de huit siècles. Sur la façade, les quatre chevaux de bronze sont des copies : les originaux sont à l'abri dans le musée, à l'étage.",
    'de': "Willkommen im Markusdom. Schauen Sie nach oben: Die Kuppeln sind mit über achttausend Quadratmetern goldener Mosaiken bedeckt, entstanden in mehr als acht Jahrhunderten. Die vier Bronzepferde an der Fassade sind Kopien: Die Originale stehen geschützt im Museum im Obergeschoss.",
    'es': "Bienvenidos a la basílica de San Marcos. Levanten la mirada: las cúpulas están cubiertas por más de ocho mil metros cuadrados de mosaicos dorados, realizados a lo largo de más de ocho siglos. En la fachada, los cuatro caballos de bronce son copias: los originales se conservan en el museo, en el piso superior.",
}


def chiama(percorso, chiave, dati=None):
    url = API + percorso + ('&' if '?' in percorso else '?') + 'key=' + chiave
    corpo = json.dumps(dati).encode() if dati is not None else None
    richiesta = urllib.request.Request(url, data=corpo, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(richiesta, timeout=60) as r:
        return json.load(r)


def main():
    chiave = os.environ.get('GOOGLE_TTS_API_KEY')
    if not chiave:
        sys.exit('Manca GOOGLE_TTS_API_KEY')
    uscita = sys.argv[1] if len(sys.argv) > 1 else 'campioni'
    riepilogo = []
    for lingua, codice in LINGUE.items():
        voci = chiama('voices?languageCode=' + codice, chiave).get('voices', [])
        cartella = os.path.join(uscita, lingua)
        os.makedirs(cartella, exist_ok=True)
        for famiglia in FAMIGLIE:
            for genere in ('FEMALE', 'MALE'):
                voce = next(
                    (v for v in sorted(voci, key=lambda v: v['name'])
                     if codice in v.get('languageCodes', []) and f'-{famiglia}-' in v['name'] and v.get('ssmlGender') == genere),
                    None,
                )
                if not voce:
                    continue
                risposta = chiama('text:synthesize', chiave, {
                    'input': {'text': TESTI[lingua]},
                    'voice': {'languageCode': codice, 'name': voce['name']},
                    'audioConfig': {'audioEncoding': 'MP3', 'sampleRateHertz': 24000},
                })
                nome = f"{famiglia}-{'donna' if genere == 'FEMALE' else 'uomo'}-{voce['name']}.mp3"
                with open(os.path.join(cartella, nome), 'wb') as f:
                    f.write(base64.b64decode(risposta['audioContent']))
                riepilogo.append(f'{lingua}/{nome}')
                print('creato', lingua, nome)
    with open(os.path.join(uscita, 'LEGGIMI.txt'), 'w', encoding='utf-8') as f:
        f.write('Voci di prova per le audioguide (stesso testo in ogni lingua):\n\n' + '\n'.join(riepilogo) + '\n')


if __name__ == '__main__':
    main()
