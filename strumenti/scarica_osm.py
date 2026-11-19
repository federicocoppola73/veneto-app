#!/usr/bin/env python3
"""Scarica da Overpass i dati OpenStreetMap letti da disegna_mappa.py, a pezzi se l'area è grande.

Uso: python3 strumenti/scarica_osm.py <sud> <ovest> <nord> <est> <output.json> [parti_per_lato]
Dati © OpenStreetMap contributors (ODbL).
"""
import json
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from disegna_mappa import QUERY_OVERPASS

SERVER = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
          'https://overpass.private.coffee/api/interpreter']


def prova(sud, ovest, nord, est, tentativi):
    q = QUERY_OVERPASS.replace('SUD', str(sud)).replace('OVEST', str(ovest)).replace('NORD', str(nord)).replace('EST', str(est))
    dati = urllib.parse.urlencode({'data': q}).encode()
    for t in range(tentativi):
        for url in SERVER:
            try:
                req = urllib.request.Request(url, data=dati, headers={'User-Agent': 'veneto-app-mappe/1.0'})
                with urllib.request.urlopen(req, timeout=300) as r:
                    return json.load(r)['elements']
            except Exception as e:
                print('  errore', url, str(e)[:80], flush=True)
        time.sleep(20)
    return None


def scarica(sud, ovest, nord, est, profondita=0):
    """Scarica l'area; se i server non ce la fanno la divide in quattro e riprova (fino a 3 livelli)."""
    el = prova(sud, ovest, nord, est, 1 if profondita < 3 else 4)
    if el is not None:
        return el
    if profondita >= 3:
        sys.exit('Overpass non risponde')
    print(f'  divido l\'area in quattro (livello {profondita + 1})', flush=True)
    ms, mo = (sud + nord) / 2, (ovest + est) / 2
    risultato = []
    for s0, s1 in ((sud, ms), (ms, nord)):
        for o0, o1 in ((ovest, mo), (mo, est)):
            risultato += scarica(round(s0, 5), round(o0, 5), round(s1, 5), round(o1, 5), profondita + 1)
    return risultato


def main():
    sud, ovest, nord, est = map(float, sys.argv[1:5])
    out = sys.argv[5]
    n = int(sys.argv[6]) if len(sys.argv) > 6 else 1
    visti, elementi = set(), []
    for i in range(n):
        for j in range(n):
            s0, s1 = sud + (nord - sud) * i / n, sud + (nord - sud) * (i + 1) / n
            o0, o1 = ovest + (est - ovest) * j / n, ovest + (est - ovest) * (j + 1) / n
            print(f'pezzo {i * n + j + 1}/{n * n}…', flush=True)
            for e in scarica(round(s0, 5), round(o0, 5), round(s1, 5), round(o1, 5)):
                k = (e['type'], e['id'])
                if k not in visti:
                    visti.add(k)
                    elementi.append(e)
    print(len(elementi), 'elementi', flush=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'elements': elementi}, f)


main()
