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


STOP = {'di', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'dell', 'e', 'il', 'la', 'lo', 'le', 'i', 'gli', 'a', 'al', 'alla', 'in', 'da'}


def somiglianza(nome, titolo, citta):
    """Quota delle parole del nome che compaiono nel titolo (0-1); 0 se il titolo è solo la città."""
    t = norm(re.sub(r'\(.*?\)', '', titolo))
    if t == norm(citta):
        return 0
    parole = [w for w in norm(nome).split() if w not in STOP]
    return sum(1 for w in parole if w in t.split()) / len(parole) if parole else 0


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
        if any(v['dist'] is not None and v['dist'] <= 400 and somiglianza(luogo['nome'], t, citta) >= 0.6 for t, v in visti.items()):
            break
        time.sleep(0.2)
    vicini = sorted((v['dist'], v['indice'], t) for t, v in visti.items()
                    if v['dist'] is not None and v['dist'] <= 400 and somiglianza(luogo['nome'], t, citta) >= 0.6)
    if vicini:
        t = vicini[0][2]
        esito.update(it=t, stato='sicuro', dist=round(vicini[0][0]))
    else:
        simili = [t for t, v in visti.items() if somiglianza(luogo['nome'], t, citta) >= 0.6 and (v['dist'] is None or v['dist'] <= 3000)]
        if simili:
            t = min(simili, key=lambda k: visti[k]['indice'])
            esito.update(it=t, stato='incerto', dist=round(visti[t]['dist']) if visti[t]['dist'] is not None else None)
    if esito['it']:
        esito.update(visti[esito['it']]['ll'])
    # lingue già indicate nel pacchetto
    for l in LINGUE:
        if wk.get(l) and l not in esito:
            esito[l] = wk[l]
    return esito


GENERICI = {  # it: (en, fr, de, es)
    'chiesa': ('Church', 'Église', 'Kirche', 'Iglesia'), 'basilica': ('Basilica', 'Basilique', 'Basilika', 'Basílica'),
    'cattedrale': ('Cathedral', 'Cathédrale', 'Kathedrale', 'Catedral'), 'duomo': ('Cathedral', 'Cathédrale', 'Dom', 'Catedral'),
    'palazzo': ('Palace', 'Palais', 'Palast', 'Palacio'), 'piazza': ('Square', 'Place', 'Platz', 'Plaza'),
    'ponte': ('Bridge', 'Pont', 'Brücke', 'Puente'), 'porta': ('Gate', 'Porte', 'Tor', 'Puerta'),
    'castello': ('Castle', 'Château', 'Burg', 'Castillo'), 'torre': ('Tower', 'Tour', 'Turm', 'Torre'),
    'museo': ('Museum', 'Musée', 'Museum', 'Museo'), 'teatro': ('Theatre', 'Théâtre', 'Theater', 'Teatro'),
    'villa': ('Villa', 'Villa', 'Villa', 'Villa'), 'abbazia': ('Abbey', 'Abbaye', 'Abtei', 'Abadía'),
    'santuario': ('Sanctuary', 'Sanctuaire', 'Heiligtum', 'Santuario'), 'battistero': ('Baptistery', 'Baptistère', 'Baptisterium', 'Baptisterio'),
    'monastero': ('Monastery', 'Monastère', 'Kloster', 'Monasterio'), 'convento': ('Convent', 'Couvent', 'Kloster', 'Convento'),
    'fontana': ('Fountain', 'Fontaine', 'Brunnen', 'Fuente'), 'giardino': ('Garden', 'Jardin', 'Garten', 'Jardín'),
    'giardini': ('Gardens', 'Jardins', 'Gärten', 'Jardines'), 'parco': ('Park', 'Parc', 'Park', 'Parque'),
    'cimitero': ('Cemetery', 'Cimetière', 'Friedhof', 'Cementerio'), 'oratorio': ('Oratory', 'Oratoire', 'Oratorium', 'Oratorio'),
    'loggia': ('Loggia', 'Loge', 'Loggia', 'Logia'), 'mura': ('Walls', 'Murailles', 'Stadtmauer', 'Murallas'),
}
SANTI = ('san ', 'santa ', "sant'", 'santi ', 'santo ', 'ss. ')
DI = ('di ', "d'")


def per_regola(nome):
    """Genere + "di" + nome proprio, oppure genere + santo: traduce il genere e lascia il nome proprio. Altrimenti None."""
    p = nome.split(' ', 1)
    if len(p) < 2 or p[0].lower() not in GENERICI:
        return None
    g, resto = GENERICI[p[0].lower()], p[1]
    low = resto.lower()
    if low.startswith(DI):
        proprio = resto[3:] if low.startswith('di ') else resto[2:]
        if proprio.split(' ')[0].lower() in STOP or proprio.lower().startswith(("l'", 'la ', 'il ', 'le ', 'lo ')):
            return None
        return {'en': f'{g[0]} of {proprio}', 'fr': f'{g[1]} de {proprio}', 'de': f'{g[2]} {proprio}', 'es': f'{g[3]} de {proprio}'}
    if low.startswith(SANTI):
        return {'en': f'{g[0]} of {resto}', 'fr': f'{g[1]} de {resto}', 'de': f'{g[2]} {resto}', 'es': f'{g[3]} de {resto}'}
    return None


def main():
    os.makedirs('docs/nomi', exist_ok=True)
    for citta in sys.argv[1:]:
        raw = json.load(open(f'pacchetti/{citta}/dati/luoghi.json', encoding='utf-8'))
        luoghi = raw['luoghi'] if isinstance(raw, dict) else raw
        out = {}
        for n, l in enumerate(luoghi):
            if l.get('latitudine') is None:
                continue
            r = cerca(l, citta.capitalize())
            if r['stato'] == 'sicuro' and sum(1 for k in LINGUE if r.get(k)) >= 2:
                r['tipo'] = 'wikipedia'
            else:
                prop = per_regola(l['nome'])
                if prop:
                    r = {**{k: v for k, v in r.items() if k not in LINGUE}, **prop, 'tipo': 'regola'}
                elif r['stato'] == 'sicuro' and r.get('en'):
                    r['tipo'] = 'wikipedia'
                elif not l['nome'].split(' ')[0].lower() in GENERICI:
                    r = {'it': r.get('it'), 'stato': r['stato'], 'dist': r.get('dist'), 'tipo': 'invariato',
                         **{k: l['nome'] for k in LINGUE}}
                else:
                    r['tipo'] = 'da decidere'
            out[l['id']] = {'nome': l['nome'], **r}
            time.sleep(0.2)
            if n % 20 == 0:
                print(citta, n, '/', len(luoghi), flush=True)
        json.dump(out, open(f'docs/nomi/{citta}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        righe = [f'# Nomi dei luoghi: {citta.capitalize()}', '',
                 'Tipo: wikipedia = titoli degli articoli Wikipedia; regola = genere tradotto e nome proprio invariato; invariato = resta in italiano; da decidere = serve una scelta.', '',
                 '| Luogo (it) | Tipo | EN | FR | DE | ES | Articolo Wikipedia (stato) |', '|---|---|---|---|---|---|---|']
        for i, v in out.items():
            cella = lambda k: (v.get(k) or '—').replace('|', '/')
            righe.append(f"| {v['nome']} | {v['tipo']} | {cella('en')} | {cella('fr')} | {cella('de')} | {cella('es')} | {(v.get('it') or '—')} ({v['stato']}) |")
        open(f'docs/nomi/{citta}.md', 'w', encoding='utf-8').write('\n'.join(righe) + '\n')
        from collections import Counter
        print(citta, Counter(v['tipo'] for v in out.values()))


if __name__ == '__main__':
    main()
