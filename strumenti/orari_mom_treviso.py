#!/usr/bin/env python3
"""Orari urbani MOM di Treviso: dai PDF delle linee a autobus.json + orari_autobus.json.

Uso:
  python3 strumenti/orari_mom_treviso.py <cartella PDF> <calendario.json> <servizi-osm.json> pacchetti/treviso

<cartella PDF> contiene i PDF scaricati dalla pagina "Urbano Treviso invernale 2026/2027" di
mobilitadimarca.it e il file indice.txt (nome_file|linea|etichetta|url), una riga per PDF.
L'etichetta (es. "Orario feriale Scolastico Lunedì - Venerdì") decide i giorni di validità.
<calendario.json> dà per ogni data il tipo di giorno (scolastico, non_scolastico, festivo, estivo),
ricavato dal calendario MOM 2026/27.
Le coordinate delle fermate vengono dalle fermate OpenStreetMap (servizi-osm.json, © OpenStreetMap
contributors, ODbL), abbinate per nome con le correzioni in strumenti/fermate_mom_treviso.json.
"""
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict

import pdfplumber

ORA = re.compile(r'\b(\d{1,2})\.(\d{2})\b')
PAROLE_GIORNO = ('SCOLASTICO', 'FERIALE', 'FESTIVO', 'SABATO', 'LUN-VEN', 'INVERNALE')

# servizi: 0 lun-ven scolastico, 1 sabato scolastico, 2 festivo, 3 lun-ven non scolastico, 4 sabato non scolastico
GIORNI = ['1111100', '0000010', '0000001', '1111100', '0000010']


def servizi_da_etichetta(et):
    e = et.upper()
    if 'FESTIV' in e:
        return [2]
    non = 'NON' in e
    lv = 'LUNEDI' in e or 'LUNEDÌ' in e
    sab = 'SABATO' in e
    if not lv and not sab:  # feriale lun-sab (scolastico e non)
        return [3, 4] if non else [0, 1, 3, 4]
    if non:
        return [3] if lv else [4]
    return [0] if lv else [1]


def leggi_pdf(percorso, linea):
    tabelle = []
    cur = None
    titolo_aperto = False
    for pg in pdfplumber.open(percorso).pages:
        for riga in (pg.extract_text(x_tolerance=1) or '').split('\n'):
            r = riga.strip()
            if not r or re.fullmatch(r'\d+', r):
                continue
            m = re.match(r'^(\d+E?)\s+(.*)$', r)
            if m and m.group(1) == linea and not ORA.search(m.group(2)):
                cur = {'titolo': m.group(2).strip(), 'righe': []}
                tabelle.append(cur)
                titolo_aperto = True
                continue
            if cur is None:
                continue
            ru = r.upper().replace(' ', '')
            if any(p.replace(' ', '') in ru for p in PAROLE_GIORNO) and not ORA.search(r):
                titolo_aperto = False
                continue
            if r.startswith('Note') or re.match(r'^\w{1,3}\)\s', r):
                titolo_aperto = False
                continue
            orari = ORA.findall(r)
            if titolo_aperto and not orari:
                cur['titolo'] += ' ' + r
                continue
            titolo_aperto = False
            prima = ORA.search(r)
            nome = (r[:prima.start()] if prima else r).strip()
            if not nome or not orari:
                continue
            cur['righe'].append((nome, [int(h) * 60 + int(mi) for h, mi in orari]))
    return tabelle


def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '', s)


def chiave_titolo(t):
    return norm(re.sub(r'\s*-\s*$', '', t))


def b36(n):
    s = ''
    while True:
        n, r = divmod(n, 36)
        s = '0123456789abcdefghijklmnopqrstuvwxyz'[r] + s
        if not n:
            return s


def main():
    cartella, cal_file, osm_file, uscita = sys.argv[1:5]
    indice = [r.rstrip('\r\n').split('|') for r in open(os.path.join(cartella, 'indice.txt'), encoding='utf-8-sig') if r.strip()]
    tabelle = []
    for nome_file, linea, etichetta, url in indice:
        for t in leggi_pdf(os.path.join(cartella, nome_file), linea):
            t.update(linea=linea, servizi=servizi_da_etichetta(etichetta), url=url.replace(' ', '%20'))
            tabelle.append(t)
    # linee senza orario "non scolastico": nei giorni non scolastici valgono gli orari scolastici
    per_linea = defaultdict(set)
    for t in tabelle:
        per_linea[t['linea']].update(t['servizi'])
    for t in tabelle:
        s = per_linea[t['linea']]
        if 3 not in s and 0 in t['servizi']:
            t['servizi'] = t['servizi'] + [3]
        if 4 not in s and 1 in t['servizi']:
            t['servizi'] = t['servizi'] + [4]
    json.dump(tabelle, open('/tmp/tv/tabelle_mom.json', 'w'), ensure_ascii=False)
    if os.environ.get('SOLO_LETTURA'):
        nomi = defaultdict(set)
        for t in tabelle:
            for n, _ in t['righe']:
                nomi[n].add(t['linea'])
        for n in sorted(nomi):
            print(n, '|', ','.join(sorted(nomi[n], key=lambda x: (len(x), x))))
        print(len(tabelle), 'tabelle,', len(nomi), 'fermate')
        return
    costruisci(tabelle, cal_file, osm_file, uscita)


def costruisci(tabelle, cal_file, osm_file, uscita):
    corr = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fermate_mom_treviso.json'), encoding='utf-8'))
    posizioni = corr['posizioni']  # nome PDF -> [nome mostrato, lat, lon] oppure null (fuori zona)

    # direzioni: per ogni linea i titoli diversi, nell'ordine in cui compaiono
    titoli = defaultdict(list)
    for t in tabelle:
        k = chiave_titolo(t['titolo'])
        trovato = next((x for x in titoli[t['linea']] if x.startswith(k) or k.startswith(x)), None)
        if trovato is None:
            titoli[t['linea']].append(k)
            trovato = k
        t['dir'] = titoli[t['linea']].index(trovato)
        if len(k) > len(trovato):  # titolo completo (non spezzato)
            titoli[t['linea']][t['dir']] = k
    nome_dir = {}
    for t in tabelle:
        vecchio = nome_dir.get((t['linea'], t['dir']), '')
        if len(t['titolo']) > len(vecchio):
            nome_dir[(t['linea'], t['dir'])] = t['titolo']

    ids = {}
    sequenze = defaultdict(list)
    orari = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(set))))
    pdf_linea = {}
    mancanti = defaultdict(set)
    for t in tabelle:
        lid = 'AUT-' + t['linea']
        pdf_linea.setdefault(lid, t['url'])
        seq, viste = [], set()
        for nome, tt in t['righe']:
            pos = posizioni.get(nome, 'MANCA')
            if pos == 'MANCA':
                mancanti[nome].add(t['linea'])
                continue
            if pos is None:
                continue
            fid = 'autobus-mom-' + re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', pos[0]).encode('ascii', 'ignore').decode().lower()).strip('-')
            ids[fid] = pos
            if fid in viste:
                continue
            viste.add(fid)
            seq.append(fid)
            for s in t['servizi']:
                orari[fid][lid][t['dir']][s].update(tt)
        sequenze[(lid, t['dir'])].append(seq)
    if mancanti:
        print('FERMATE SENZA POSIZIONE:', {k: sorted(v) for k, v in mancanti.items()})

    per_linea = defaultdict(dict)
    for (lid, d), seqs in sequenze.items():
        seqs = sorted(seqs, key=len, reverse=True)
        ordine = list(seqs[0])
        for s in seqs[1:]:
            for k, f in enumerate(s):
                if f not in ordine:
                    pos = ordine.index(s[k - 1]) + 1 if k and s[k - 1] in ordine else 0
                    ordine.insert(pos, f)
        if ordine:
            per_linea[lid][d] = ordine

    def bel_titolo(s):
        s = re.sub(r'\s*-\s*', ' → ', s.strip(' -'))
        s = s.replace('Fs', 'FS').replace('P.zza', 'Piazza').replace('V.le', 'Viale')
        return re.sub(r'\s+', ' ', s)

    linee_out, fermate_out, fermata_linee = [], {}, defaultdict(list)
    for lid in sorted(per_linea, key=lambda x: (int(re.sub(r'\D', '', x)), x)):
        direzioni = []
        for d in sorted(per_linea[lid]):
            fer = per_linea[lid][d]
            for f in fer:
                nome, lat, lon = ids[f]
                fermate_out.setdefault(f, {'nome': nome, 'lat': lat, 'lon': lon, 'linee': []})
                if lid not in fermate_out[f]['linee']:
                    fermate_out[f]['linee'].append(lid)
                    fermata_linee[f].append(lid)
            circ = len(fer) > 2 and fer[0] == fer[-1]
            direzioni.append({'direzione': d, 'circolare': circ, 'fermate': fer,
                              'titolo': bel_titolo(nome_dir[(lid[4:], d)])})
        linee_out.append({'id': lid, 'etichetta': lid[4:], 'mezzo': 'autobus', 'colore': '#E30613', 'testo': '#FFFFFF',
                          'notturna': False, 'gestore': 'MOM', 'pdf': pdf_linea[lid], 'direzioni': direzioni})

    cal = json.load(open(cal_file))
    inizio = min(k for k, v in cal.items() if v == 'scolastico').replace('-', '')
    fine = max(k for k, v in cal.items() if v == 'scolastico').replace('-', '')
    servizi = [{'giorni': g, 'da': inizio, 'a': fine} for g in GIORNI]
    sospesi = {'2026-12-25', '2027-03-28', '2027-05-01'}  # servizio sospeso (Natale, Pasqua, 1° maggio)
    date = {}
    for k, v in sorted(cal.items()):
        g = k.replace('-', '')
        if not (inizio <= g <= fine):
            continue
        wd = __import__('datetime').date.fromisoformat(k).weekday()
        if k in sospesi:
            date[g] = {'piu': [], 'meno': [0, 1, 2, 3, 4]}
        elif v == 'festivo' and wd < 6:
            date[g] = {'piu': [2], 'meno': [0, 1, 3, 4]}
        elif v == 'non_scolastico' and wd < 6:
            date[g] = {'piu': [3] if wd < 5 else [4], 'meno': [0] if wd < 5 else [1]}
    # nei giorni scolastici non valgono gli orari non scolastici
    servizi[3]['giorni'] = '0000000'
    servizi[4]['giorni'] = '0000000'

    orari_out = {}
    for f, per in orari.items():
        orari_out[f] = {}
        for lid, dirs in per.items():
            orari_out[f][lid] = {}
            for d, serv in dirs.items():
                orari_out[f][lid][str(d)] = [[[s], ','.join(b36(m) for m in sorted(v))] for s, v in sorted(serv.items())]

    nota = ('Treviso: orari urbani MOM (Mobilità di Marca), servizio invernale 2026/2027 dai PDF delle linee. '
            'Solo le fermate indicate negli orari. Verificare sul sito mobilitadimarca.it.')
    json.dump({'_nota': nota, 'validita': [inizio, fine], 'servizi': servizi, 'date': date, 'capolinea': [],
               'orari': orari_out}, open(os.path.join(uscita, 'dati', 'orari_autobus.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    json.dump({'_nota': nota + ' Coordinate delle fermate © OpenStreetMap contributors (ODbL).',
               'validita': [inizio, fine], 'linee': linee_out, 'fermate': fermate_out,
               'fermataLinee': fermata_linee}, open(os.path.join(uscita, 'dati', 'autobus.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    for l in linee_out:
        print(l['etichetta'], [(x['titolo'], len(x['fermate'])) for x in l['direzioni']])
    print(len(fermate_out), 'fermate')


if __name__ == '__main__':
    main()
