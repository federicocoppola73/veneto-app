#!/usr/bin/env python3
"""Orari urbani SVT di Vicenza: dal libretto PDF a autobus.json + orari_autobus.json.

Uso: python3 strumenti/converti_orari_vicenza.py <libretto.pdf> pacchetti/vicenza

Legge il libretto "Orari urbano Vicenza" (servizio invernale 2026/27, 79 pagine) con pdfplumber:
per ogni tabella ricava linea, direzione (dal titolo), tipo di giorno e, per ogni fermata
(i punti orario del libretto), gli orari di passaggio. Le coordinate delle fermate sono in
strumenti/fermate_svt_vicenza.json (da OpenStreetMap, © OpenStreetMap contributors, ODbL);
le fermate senza coordinate (frazioni fuori città) vengono saltate.
"""
import json
import os
import re
import sys
from collections import OrderedDict, defaultdict

import pdfplumber

INIZIO, FINE = '20260907', '20270611'
PDF_URL = 'https://www.svt.vi.it/sites/default/files/2026-10/invernale-2026-2027-urbano-vicenza-2026-10-08.pdf'
ORA = re.compile(r'^\d{1,2}[.:]\d{2}$')

# servizi: 0 feriale, 1 sabato, 2 festivo, 3 lun-ven scolastico, 4 lun-ven vacanza scolastica
SERVIZI = [
    {'giorni': '1111100', 'da': INIZIO, 'a': FINE},
    {'giorni': '0000010', 'da': INIZIO, 'a': FINE},
    {'giorni': '0000001', 'da': INIZIO, 'a': FINE},
    {'giorni': '1111100', 'da': INIZIO, 'a': FINE},
    {'giorni': '0000000', 'da': INIZIO, 'a': FINE},
]
FESTIVI = ['20261208', '20261225', '20261226', '20270101', '20270106', '20270329', '20270425', '20270501', '20270602']
# giorni feriali senza scuola in Veneto (calendario scolastico 2026/27, indicativo)
VACANZE = ['20260907', '20260908', '20260909', '20261030', '20261102', '20261207'] + \
    [f'202612{d}' for d in (24, 28, 29, 30, 31)] + ['20270104', '20270105'] + \
    [f'202702{d:02d}' for d in (8, 9, 10, 11, 12)] + ['20270325', '20270326', '20270330'] + \
    ['20270429', '20270430', '20270609', '20270610', '20270611']


def tipo_giorno(t):
    t = t.upper()
    if 'VACANZA' in t:
        return [4]
    if 'SCOLASTIC' in t:
        return [3]
    if 'FESTIV' in t:
        return [2]
    if 'SABATO' in t and 'LUNEDI' in t:
        return [0, 1]
    if 'SABATO' in t:
        return [1]
    return [0]


def righe_di(parole, tol=3):
    righe = []
    for w in sorted(parole, key=lambda w: (w['top'], w['x0'])):
        for r in righe:
            if abs(r['top'] - w['top']) < tol:
                r['w'].append(w)
                break
        else:
            righe.append({'top': w['top'], 'w': [w]})
    for r in righe:
        r['w'].sort(key=lambda w: w['x0'])
        r['text'] = ' '.join(w['text'] for w in r['w'])
    return righe


def leggi_tabelle(pdf):
    tabelle = []
    for p in pdfplumber.open(pdf).pages[3:]:
        fp = p.filter(lambda o: not (o.get('object_type') == 'char' and o.get('size', 10) < 1))
        ws = fp.extract_words(x_tolerance=1.2, y_tolerance=2)
        sx = righe_di([w for w in ws if w['x0'] < 92 and not ORA.match(w['text'])])
        dx = [w for w in ws if w['x0'] >= 92]
        segni = []
        for r in sx:
            if r['text'].startswith('Linea'):
                segni.append(('linea', r['top'], r['text']))
        for r in righe_di(dx):
            if all(ORA.match(w['text']) for w in r['w']):
                continue
            tn = r['text'].replace(' ', '').upper()
            if any(k in tn for k in ('LUNEDI', 'SABATO', 'FESTIV', 'VACANZA', 'SCOLAST')):
                segni.append(('giorno', r['top'], r['text']))
            else:
                segni.append(('titolo', r['top'], r['text']))
        segni.sort(key=lambda m: m[1])
        orari = [w for w in dx if ORA.match(w['text'])]
        fermate = [r for r in sx if not r['text'].startswith('Linea')]
        giorni = [m for m in segni if m[0] == 'giorno']
        for i, g in enumerate(giorni):
            fine = 999
            if i + 1 < len(giorni):
                ln = [m[1] for m in segni if m[0] == 'linea' and g[1] < m[1] <= giorni[i + 1][1]]
                fine = min(ln) if ln else giorni[i + 1][1] - 12
            lin = [m for m in segni if m[0] == 'linea' and m[1] <= g[1]]
            tit = [m for m in segni if m[0] == 'titolo' and m[1] <= g[1] and m[1] >= lin[-1][1] - 3]
            righe = []
            for f in fermate:
                if not g[1] < f['top'] < fine:
                    continue
                tt = sorted((w for w in orari if abs(w['top'] - f['top']) < 4), key=lambda w: w['x0'])
                if tt:
                    righe.append((f['text'], [w['text'].replace(':', '.') for w in tt]))
            tabelle.append({'linea': lin[-1][2].split()[1], 'titolo': ' '.join(x[2] for x in tit),
                            'giorno': g[2], 'righe': righe})
    return tabelle


def minuti(lista):
    out, prima = [], -1
    for t in lista:
        h, m = t.split('.')
        v = int(h) * 60 + int(m)
        while v < prima - 600:  # dopo mezzanotte
            v += 1440
        out.append(v)
        prima = v
    return out


def b36(n):
    s = ''
    while True:
        n, r = divmod(n, 36)
        s = '0123456789abcdefghijklmnopqrstuvwxyz'[r] + s
        if not n:
            return s


SOSTITUZIONI = [('Fs', 'FS'), ('Svt', 'SVT'), ("Citta'", 'Città'), ("Lanze'", 'Lanzè'), ("Setteca'", 'Settecà'),
                ("Leva'", 'Levà'), ("Contra'", 'Contrà'), ('Xxiii', 'XXIII'), ('X°', 'X'), ('Q.Lo', 'Q.lo'),
                ('C.Otto', 'Conte Otto'), ('Vic.', 'Vicentino'), ('Vic ', 'Vicentino '), ('S.', 'S. '),
                (' Dei ', ' dei '), (' Di ', ' di '), (' Del ', ' del '), (' Degli ', ' degli '), ('Comm.', 'Comm. ')]


def bel_titolo(t):
    t = re.sub(r'\s*>\s*', ' → ', t.title())
    for a, b in SOSTITUZIONI:
        t = t.replace(a, b)
    return re.sub(r'\s+', ' ', t).replace('Vicentinoentino', 'Vicentino').strip()


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    pdf, cartella = sys.argv[1], sys.argv[2]
    mappa = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fermate_svt_vicenza.json')))
    tabelle = leggi_tabelle(pdf)

    # 12 e 14 (e la circolare 12C/14C) diventano una linea sola
    def linea_di(t):
        return '12' if t['linea'] in ('12', '14', '1214') else t['linea']

    titoli = defaultdict(list)
    for t in tabelle:
        tit = re.sub(r'^\d+C:\s*', '', t['titolo']).split('....')[0].strip()
        t['tit'] = tit
        if tit not in titoli[(t['linea'])]:
            titoli[t['linea']].append(tit)

    ids, sequenze = {}, defaultdict(list)
    orari = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(set))))
    saltate = defaultdict(set)
    for t in tabelle:
        lid = 'AUT-' + linea_di(t)
        d = titoli[t['linea']].index(t['tit'])
        serv = tuple(tipo_giorno(t['giorno']))
        seq, viste = [], set()
        for nome, tt in t['righe']:
            if nome not in mappa:
                saltate[nome].add(t['linea'])
                continue
            fid = 'svt-' + re.sub(r'[^a-z0-9]+', '-', mappa[nome][0].lower()).strip('-')
            ids[fid] = mappa[nome]
            if fid in viste:  # stessa fermata ripetuta (arrivo a fine giro): tengo la prima
                continue
            viste.add(fid)
            seq.append(fid)
            orari[fid][lid][d][serv].update(minuti(tt))
        sequenze[(lid, d)].append(seq)

    # ordine delle fermate per direzione: la sequenza più lunga, poi le altre fermate inserite dopo la precedente
    linee_out, fermate_out, fermata_linee = [], {}, defaultdict(list)
    per_linea = defaultdict(dict)
    for (lid, d), seqs in sequenze.items():
        seqs = sorted(seqs, key=len, reverse=True)
        ordine = list(seqs[0])
        for s in seqs[1:]:
            for k, f in enumerate(s):
                if f not in ordine:
                    pos = ordine.index(s[k - 1]) + 1 if k and s[k - 1] in ordine else 0
                    ordine.insert(pos, f)
        per_linea[lid][d] = ordine
    nomi_titolo = {}
    for t in tabelle:
        nomi_titolo.setdefault(('AUT-' + linea_di(t), titoli[t['linea']].index(t['tit'])), t['tit'])
    for lid in sorted(per_linea, key=lambda x: int(x[4:])):
        direzioni = []
        for d in sorted(per_linea[lid]):
            fer = per_linea[lid][d]
            for f in fer:
                nome, lat, lon = ids[f]
                fermate_out.setdefault(f, {'nome': nome, 'lat': lat, 'lon': lon, 'linee': []})
                if lid not in fermate_out[f]['linee']:
                    fermate_out[f]['linee'].append(lid)
                    fermata_linee[f].append(lid)
            tit = bel_titolo(nomi_titolo[(lid, d)])
            direzioni.append({'direzione': d, 'circolare': False, 'fermate': fer, 'titolo': re.sub(r'\s+', ' ', tit)})
        linee_out.append({'id': lid, 'etichetta': '12/14' if lid == 'AUT-12' else lid[4:], 'mezzo': 'autobus',
                          'colore': '#0B6BB7', 'testo': '#FFFFFF', 'notturna': False, 'pdf': PDF_URL,
                          'direzioni': direzioni})

    date = {}
    for g in FESTIVI:
        date[g] = {'piu': [2], 'meno': [0, 1, 3, 4]}
    for g in VACANZE:
        if g not in date:
            date[g] = {'piu': [4], 'meno': [3]}
    orari_out = {}
    for f, per in orari.items():
        orari_out[f] = {}
        for lid, dirs in per.items():
            orari_out[f][lid] = {}
            for d, serv in dirs.items():
                orari_out[f][lid][str(d)] = [[list(s), ','.join(b36(m) for m in sorted(v))] for s, v in sorted(serv.items())]

    nota = ('Vicenza: orari urbani SVT, servizio invernale dal 7 settembre 2026 all\'11 giugno 2027 '
            '(libretto PDF SVT). Solo le fermate indicate nel libretto. Verificare sul sito SVT.')
    json.dump({'_nota': nota, 'validita': [INIZIO, FINE], 'servizi': SERVIZI, 'date': date, 'capolinea': [],
               'orari': orari_out}, open(os.path.join(cartella, 'dati', 'orari_autobus.json'), 'w'),
              ensure_ascii=False, indent=1)
    json.dump({'_nota': nota + ' Coordinate delle fermate © OpenStreetMap contributors (ODbL).',
               'validita': [INIZIO, FINE], 'linee': linee_out, 'fermate': fermate_out,
               'fermataLinee': fermata_linee}, open(os.path.join(cartella, 'dati', 'autobus.json'), 'w'),
              ensure_ascii=False, indent=1)
    for l in linee_out:
        print(l['etichetta'], [(x['titolo'], len(x['fermate'])) for x in l['direzioni']])
    print(len(fermate_out), 'fermate;', 'senza coordinate:', {k: sorted(v) for k, v in saltate.items()})


if __name__ == '__main__':
    main()
