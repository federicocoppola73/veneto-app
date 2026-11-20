#!/usr/bin/env python3
"""Propone i nomi dei luoghi nelle 5 lingue ricavandoli dai titoli di Wikipedia (it → en, fr, de, es).

Uso: python3 strumenti/nomi_wikipedia.py <citta> [<citta> ...]   (es. venezia padova)
Per ogni luogo cerca su it.wikipedia l'articolo vicino alle coordinate del luogo e ne legge i collegamenti interlingua.
Scrive docs/nomi/<citta>.md (tabella da rivedere) e docs/nomi/<citta>.json (dati). NON modifica luoghi.json.
Affidabilità: "sicuro" = articolo entro 400 m dal luogo; "incerto" = articolo trovato ma lontano o senza coordinate; "nessuno" = niente.
"""
import json
import math
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

LINGUE = ['en', 'fr', 'de', 'es']
UA = 'ToscanaVenetoApp-nomi/1.0 (https://github.com/federicocoppola73/veneto-app)'


def api(params):
    url = 'https://it.wikipedia.org/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json'})
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(2 + i * 3)
    return {}


def dist(a, b):
    R = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(b[1] - a[1]) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return re.sub(r'[^a-z0-9 ]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn')).strip()


def cerca(luogo, citta):
    pos = (luogo['latitudine'], luogo['longitudine'])
    esito = {'it': None, 'stato': 'nessuno', 'dist': None, 'altri': []}
    # titolo già noto nel pacchetto
    wk = luogo.get('wikipedia') or {}
    interrogazioni = [wk['it']] if wk.get('it') else []
    interrogazioni += [luogo['nome'], f"{luogo['nome']} {citta}"]
    visti = {}
    for q in interrogazioni:
        d = api({'action': 'query', 'generator': 'search', 'gsrsearch': q, 'gsrlimit': 5, 'gsrnamespace': 0,
                 'prop': 'coordinates|langlinks', 'colimit': 5, 'lllimit': 500})
        for p in (d.get('query', {}).get('pages', {}) or {}).values():
            t = p['title']
            if t in visti:
                continue
            c = (p.get('coordinates') or [None])[0]
            visti[t] = {'indice': p.get('index', 99),
                        'dist': dist(pos, (c['lat'], c['lon'])) if c else None,
                        'll': {x['lang']: x['*'] for x in p.get('langlinks', []) if x['lang'] in LINGUE},
                        'esatto': norm(t) == norm(luogo['nome'])}
        if any(v['dist'] is not None and v['dist'] <= 400 for v in visti.values()):
            break
        time.sleep(0.2)
    vicini = sorted((v['dist'], v['indice'], t) for t, v in visti.items() if v['dist'] is not None and v['dist'] <= 400)
    if vicini:
        t = vicini[0][2]
        esito.update(it=t, stato='sicuro', dist=round(vicini[0][0]))
    else:
        esatti = [t for t, v in visti.items() if v['esatto']]
        if esatti:
            t = esatti[0]
            esito.update(it=t, stato='incerto', dist=round(visti[t]['dist']) if visti[t]['dist'] is not None else None)
        elif visti:
            t = min(visti, key=lambda k: visti[k]['indice'])
            esito.update(it=t, stato='incerto', dist=round(visti[t]['dist']) if visti[t]['dist'] is not None else None)
    if esito['it']:
        esito.update(visti[esito['it']]['ll'])
    # lingue già indicate nel pacchetto
    for l in LINGUE:
        if wk.get(l) and l not in esito:
            esito[l] = wk[l]
    return esito


def main():
    os.makedirs('docs/nomi', exist_ok=True)
    for citta in sys.argv[1:]:
        raw = json.load(open(f'pacchetti/{citta}/dati/luoghi.json', encoding='utf-8'))
        luoghi = raw['luoghi'] if isinstance(raw, dict) else raw
        out = {}
        for n, l in enumerate(luoghi):
            if l.get('latitudine') is None:
                continue
            out[l['id']] = {'nome': l['nome'], **cerca(l, citta.capitalize())}
            time.sleep(0.2)
            if n % 20 == 0:
                print(citta, n, '/', len(luoghi), flush=True)
        json.dump(out, open(f'docs/nomi/{citta}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        righe = [f'# Nomi dei luoghi: {citta.capitalize()}', '',
                 'Da Wikipedia (it → en, fr, de, es). Stato: sicuro = articolo entro 400 m; incerto = da controllare; nessuno = senza articolo.', '',
                 '| Luogo (it) | Stato | EN | FR | DE | ES | Articolo it |', '|---|---|---|---|---|---|---|']
        for i, v in out.items():
            cella = lambda k: (v.get(k) or '—').replace('|', '/')
            righe.append(f"| {v['nome']} | {v['stato']} | {cella('en')} | {cella('fr')} | {cella('de')} | {cella('es')} | {(v.get('it') or '—')} |")
        open(f'docs/nomi/{citta}.md', 'w', encoding='utf-8').write('\n'.join(righe) + '\n')
        from collections import Counter
        print(citta, Counter(v['stato'] for v in out.values()))


if __name__ == '__main__':
    main()
