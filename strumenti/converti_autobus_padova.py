#!/usr/bin/env python3
"""Converte il feed GTFS del trasporto pubblico di Padova nel formato del motore (autobus.json e orari_autobus.json).

Uso: python3 strumenti/converti_autobus_padova.py <cartella_gtfs_estratta> <pacchetti/padova/dati> <pacchetti/padova/dati/luoghi.json>

Include solo le linee che passano entro RAGGIO_M metri da un luogo del pacchetto (le fermate "vicine").
Le fermate GTFS vengono agganciate alle fermate autobus di servizi.json quando sono entro 60 m,
altrimenti diventano fermate nuove con id "gtfs-<stop_id>" dentro autobus.json.
"""
import csv
import datetime
import json
import math
import os
import re
import sys
from collections import defaultdict

RAGGIO_M = 400
AGGANCIO_M = 60
COLORE_DEFAULT = '#bb7b68'
FESTIVI = {'20261108', '20261208', '20261225', '20261226'}  # feste comandate nel periodo del feed
URL_AZIENDA = 'https://www.fsbusitalia.it/content/fsbusitalia/it/veneto.html'
URL_ORARI = 'https://www.fsbusitalia.it/content/dam/fsbusitalia/documenti/veneto/orari/invernali2627/urbanopd/'
URL_EXTRA = 'http://fsbusitalia.it/content/dam/fsbusitalia/documenti/veneto/orari/invernali2627/extrapd/'
TRAM = {'SIR1'}  # linee tram nel feed Busitalia


def id_linea(etichetta):
    return f'TRAM-{etichetta}' if etichetta in TRAM else f'AUT-{etichetta}'


def pdf_linea(etichetta):
    if etichetta in TRAM:
        return URL_ORARI + f'{etichetta}.pdf'
    if etichetta.startswith('U'):
        return URL_ORARI + f'Linea{etichetta}.pdf'
    if re.fullmatch(r'E\d{3}[A-Z]?', etichetta):
        return URL_EXTRA + f'{etichetta}.pdf'
    return URL_AZIENDA  # altre linee (A, AT, M, T, SST...): nessun link per linea


def leggi(cartella, nome):
    with open(os.path.join(cartella, nome), encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))


def distanza(a, b):
    R = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp = p2 - p1
    dl = math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def minuti(orario):
    h, m, _ = orario.split(':')
    return int(h) * 60 + int(m)


def base36(n):
    cifre = '0123456789abcdefghijklmnopqrstuvwxyz'
    if n == 0:
        return '0'
    out = ''
    while n:
        n, r = divmod(n, 36)
        out = cifre[r] + out
    return out


def tipo_giorno(data):
    if data in FESTIVI:
        return 2
    d = datetime.datetime.strptime(data, '%Y%m%d')
    if d.weekday() == 6:
        return 2
    if d.weekday() == 5:
        return 1
    return 0


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    gtfs, dati, luoghi_path = sys.argv[1], sys.argv[2], sys.argv[3]

    routes = {r['route_id']: r for r in leggi(gtfs, 'routes.txt')}
    trips = {t['trip_id']: t for t in leggi(gtfs, 'trips.txt')}
    stops = {}
    for s in leggi(gtfs, 'stops.txt'):
        nome = (s.get('stop_desc') or '').strip() or (s.get('stop_name') or '').strip()
        stops[s['stop_id']] = {'nome': nome, 'pos': (float(s['stop_lat']), float(s['stop_lon']))}

    # date di servizio per service_id (solo aggiunte)
    date_servizio = defaultdict(set)
    for r in leggi(gtfs, 'calendar_dates.txt'):
        if r['exception_type'] == '1':
            date_servizio[r['service_id']].add(r['date'])
    tutte_le_date = sorted({d for ds in date_servizio.values() for d in ds})
    validita = [tutte_le_date[0], tutte_le_date[-1]]

    # orari grezzi per corsa
    corse = defaultdict(list)  # trip_id -> [(seq, stop_id, minuti)]
    for r in leggi(gtfs, 'stop_times.txt'):
        corse[r['trip_id']].append((int(r['stop_sequence']), r['stop_id'], minuti(r['departure_time'])))

    # luoghi del pacchetto
    with open(luoghi_path, encoding='utf-8') as f:
        raw = json.load(f)
    luoghi = raw if isinstance(raw, list) else raw['luoghi']
    centri = [(l['latitudine'], l['longitudine']) for l in luoghi if l.get('latitudine') is not None]

    # fermate GTFS entro RAGGIO_M da un luogo
    vicine = {sid for sid, s in stops.items() if any(distanza(s['pos'], c) <= RAGGIO_M for c in centri)}

    # linee che passano dalle fermate vicine
    rotte_vicine = {trips[t]['route_id'] for t, seq in corse.items() if t in trips and any(sid in vicine for _, sid, _ in seq)}

    # fermate autobus già in servizi.json
    servizi = json.load(open(os.path.join(dati, 'servizi.json'), encoding='utf-8'))['servizi']
    autobus_servizi = [s for s in servizi if s['tipo'] == 'autobus']
    aggancio = {}
    for sid, s in stops.items():
        best, bd = None, AGGANCIO_M
        for a in autobus_servizi:
            d = distanza(s['pos'], (a['lat'], a['lon']))
            if d <= bd:
                best, bd = a['id'], d
        aggancio[sid] = best

    def id_fermata(sid):
        return aggancio.get(sid) or f'gtfs-{sid}'

    # direzioni per linea: la corsa più lunga per ciascun verso
    linee_out, fermata_linee = [], defaultdict(list)
    fermate_out = {}
    usate = set()  # fermate usate da linee (id motore)
    rep_per_linea = {}  # (route, dir) -> (trip_id, seq ids)
    nomi_linee = {}
    for rid in sorted(rotte_vicine, key=lambda r: routes[r].get('route_short_name', r)):
        rt = routes[rid]
        etichetta = rt.get('route_short_name') or rid
        etichetta = etichetta if etichetta not in nomi_linee.values() else f'{etichetta}-{rid}'
        nomi_linee[rid] = etichetta
        lid = id_linea(etichetta)
        direzioni = []
        for verso in ('0', '1'):
            cand = [(t, corse[t]) for t, tr in trips.items() if tr['route_id'] == rid and (tr.get('direction_id') or '0') == verso and t in corse]
            if not cand:
                continue
            t_best, seq_best = max(cand, key=lambda c: len(c[1]))
            ids = []
            for _, sid, _ in sorted(seq_best, key=lambda x: x[0]):
                fid = id_fermata(sid)
                if fid not in ids:
                    ids.append(fid)
                if sid not in stops:
                    continue
                usate.add(fid)
                if fid not in fermate_out:
                    fermate_out[fid] = {'nome': stops[sid]['nome'], 'lat': stops[sid]['pos'][0], 'lon': stops[sid]['pos'][1], 'linee': []}
                if lid not in fermate_out[fid]['linee']:
                    fermate_out[fid]['linee'].append(lid)
                if lid not in fermata_linee[fid]:
                    fermata_linee[fid].append(lid)
            direzioni.append({'direzione': int(verso), 'circolare': False, 'fermate': ids, 'richiesta': []})
            rep_per_linea[(rid, verso)] = t_best
        linee_out.append({
            'id': lid, 'etichetta': etichetta, 'mezzo': 'tram' if etichetta in TRAM else 'autobus',
            'colore': '#' + rt['route_color'] if rt.get('route_color') else COLORE_DEFAULT,
            'testo': '#' + rt['route_text_color'] if rt.get('route_text_color') else '#FFFFFF',
            'notturna': False, 'pdf': pdf_linea(etichetta), 'direzioni': direzioni,
        })

    # orari: per fermata usata, linea, verso e tipo di giorno
    orari = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(set))))
    for t, seq in corse.items():
        tr = trips.get(t)
        if not tr or tr['route_id'] not in nomi_linee:
            continue
        verso = tr.get('direction_id') or '0'
        lid = id_linea(nomi_linee[tr['route_id']])
        tipi = {tipo_giorno(d) for d in date_servizio.get(tr['service_id'], [])}
        if not tipi:
            continue
        for _, sid, mins in seq:
            fid = id_fermata(sid)
            if fid not in usate:
                continue
            for g in tipi:
                orari[fid][lid][verso][g].add(mins)

    orari_out = {}
    for fid, per_linea in orari.items():
        orari_out[fid] = {}
        for lid, per_verso in per_linea.items():
            orari_out[fid][lid] = {}
            for verso, per_g in per_verso.items():
                gruppi = defaultdict(list)
                for g, mins in per_g.items():
                    gruppi[tuple(sorted(mins))].append(g)
                voci = []
                for mins, gs in gruppi.items():
                    voci.append([sorted(gs), ','.join(base36(m) for m in mins)])
                orari_out[fid][lid][str(int(verso))] = voci

    # le fermate senza linee non servono
    fermate_out = {k: v for k, v in fermate_out.items() if v['linee']}

    servizi_out = [
        {'giorni': '1111100', 'da': validita[0], 'a': validita[1]},
        {'giorni': '0000010', 'da': validita[0], 'a': validita[1]},
        {'giorni': '0000001', 'da': validita[0], 'a': validita[1]},
    ]
    autobus = {
        '_nota': 'Padova: linee e fermate Busitalia Veneto dal feed GTFS, solo le fermate entro 400 m dai luoghi. Generato da strumenti/converti_autobus_padova.py.',
        'validita': validita,
        'linee': linee_out,
        'fermate': fermate_out,
        'fermataLinee': {k: v for k, v in fermata_linee.items() if k in fermate_out},
    }
    orari_doc = {
        '_nota': f'Padova: orari bus Busitalia Veneto (feriale, sabato, festivo), validità {validita[0]} - {validita[1]}. Generato da strumenti/converti_autobus_padova.py.',
        'validita': validita,
        'servizi': servizi_out,
        'date': {},
        'capolinea': [],
        'orari': orari_out,
    }
    json.dump(autobus, open(os.path.join(dati, 'autobus.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(orari_doc, open(os.path.join(dati, 'orari_autobus.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'linee: {len(linee_out)}, fermate: {len(fermate_out)}, fermate con orari: {len(orari_out)}, validità {validita[0]}-{validita[1]}')


if __name__ == '__main__':
    main()
