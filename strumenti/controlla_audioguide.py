#!/usr/bin/env python3
"""Controllo automatico delle audioguide: trascrive gli MP3 con Whisper e li confronta con il testo.

Uso (lo lancia la GitHub Action "Audioguide – controllo"):
    python3 strumenti/controlla_audioguide.py <città> <lingua> [modello whisper, es. base] [id luoghi separati da virgola]

Segnala, con il minuto, i tratti in cui l'audio dice parole che nel testo non ci sono (la voce che "deraglia":
parole in altre lingue, suoni senza senso) e i tratti del testo che nell'audio mancano.
Uscita: controllo/<città>/<lingua>.md e .json
"""
import difflib
import json
import os
import re
import sys
import unicodedata

from faster_whisper import WhisperModel

MIN_EXTRA = 5     # parole in più consecutive da segnalare
MIN_MANCANTI = 7  # parole mancanti consecutive da segnalare


def norm(parola):
    p = unicodedata.normalize('NFKD', parola.lower())
    p = ''.join(c for c in p if not unicodedata.combining(c))
    return re.sub(r"[^\w]", '', p)


def parole(testo):
    return [w for w in (norm(x) for x in re.split(r"[\s'’\-]+", testo)) if w]


def mmss(s):
    return '%d:%02d' % divmod(int(s), 60)


def main():
    citta, lingua = sys.argv[1], sys.argv[2]
    modello = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else 'base'
    solo = {x for x in (sys.argv[4] if len(sys.argv) > 4 else '').split(',') if x}
    testi = json.load(open(f'pacchetti/{citta}/audioguide/testi.json', encoding='utf-8'))['luoghi']
    indice = json.load(open(f'audioguide/{citta}/{lingua}/indice.json', encoding='utf-8'))['luoghi']
    m = WhisperModel(modello, device='cpu', compute_type='int8')
    risultati = []
    for id_luogo, info in sorted(indice.items()):
        if solo and id_luogo not in solo:
            continue
        voce = testi.get(id_luogo, {})
        for tr in info['tracce']:
            if tr['id']:
                testo = next(t for t in voce['tracce'] if t['id'] == tr['id'])['testo'][lingua]
            else:
                testo = voce[lingua]
            segs, _ = m.transcribe(f'audioguide/{citta}/{lingua}/{tr["file"]}', language=lingua,
                                   word_timestamps=True, vad_filter=True, beam_size=1)
            segs = list(segs)
            ascoltate = [(norm(w.word), w.start) for s in segs for w in (s.words or []) if norm(w.word)]
            attese = parole(testo)
            sm = difflib.SequenceMatcher(None, attese, [w for w, _ in ascoltate], autojunk=False)
            problemi = []
            for op, a1, a2, b1, b2 in sm.get_opcodes():
                extra, mancanti = b2 - b1, a2 - a1
                if op in ('insert', 'replace') and extra >= MIN_EXTRA and extra > mancanti + 2:
                    problemi.append({'tipo': 'parole in più', 'minuto': mmss(ascoltate[b1][1]),
                                     'audio': ' '.join(w for w, _ in ascoltate[b1:b2]),
                                     'testo': ' '.join(attese[a1:a2])})
                elif op in ('delete', 'replace') and mancanti >= MIN_MANCANTI and mancanti > extra + 2:
                    t = ascoltate[min(b1, len(ascoltate) - 1)][1] if ascoltate else 0
                    problemi.append({'tipo': 'testo mancante', 'minuto': mmss(t),
                                     'audio': ' '.join(w for w, _ in ascoltate[b1:b2]),
                                     'testo': ' '.join(attese[a1:a2])})
            risultati.append({'luogo': id_luogo, 'traccia': tr['id'], 'file': tr['file'],
                              'somiglianza': round(sm.ratio() * 100), 'problemi': problemi,
                              'trascrizione': [[mmss(s.start), s.text.strip()] for s in segs]})
            print(f'{tr["file"]}: {round(sm.ratio() * 100)}% · {len(problemi)} problemi', flush=True)
    os.makedirs(f'controllo/{citta}', exist_ok=True)
    json.dump(risultati, open(f'controllo/{citta}/{lingua}.json', 'w'), ensure_ascii=False, indent=1)
    with open(f'controllo/{citta}/{lingua}.md', 'w') as f:
        f.write(f'# Controllo audioguide {citta} · {lingua} (whisper {modello})\n\n')
        for r in risultati:
            f.write(f'## {r["file"]} — somiglianza {r["somiglianza"]}%\n')
            for p in r['problemi']:
                f.write(f'- **{p["minuto"]}** {p["tipo"]}\n  - audio: {p["audio"]}\n  - testo: {p["testo"]}\n')
            f.write('\n' if r['problemi'] else '- nessun problema\n\n')


if __name__ == '__main__':
    main()
