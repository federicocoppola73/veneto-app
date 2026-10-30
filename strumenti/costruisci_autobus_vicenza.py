#!/usr/bin/env python3
"""Costruisce le linee bus SVT di Vicenza (autobus.json) dalle relazioni route=bus di OpenStreetMap.

Uso: python3 strumenti/costruisci_autobus_vicenza.py <file.osm.pbf> <uscita.json> <lat_min,lat_max,lon_min,lon_max>

Per ogni linea sceglie due direzioni: la relazione più lunga e quella di ritorno.
Le fermate sono i nodi con ruolo stop/platform, in ordine di percorso.
Dati © OpenStreetMap contributors, licenza ODbL.
"""
import json
import os
import struct
import sys
import zlib
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from costruisci_rete import fields, packed_sint, packed_uint  # noqa: E402

RUOLI_FERMATA = ('stop', 'stop_entry_only', 'stop_exit_only', 'platform', '')


def leggi(pbf):
    nodi = {}      # id -> (lat, lon, nome)
    relazioni = []
    dati = open(pbf, 'rb').read()
    i = 0
    while i < len(dati):
        hl = struct.unpack('>I', dati[i:i + 4])[0]
        i += 4
        bh = dati[i:i + hl]
        i += hl
        tipo, ds = None, 0
        for f, _, v in fields(bh):
            if f == 1:
                tipo = v.decode()
            elif f == 3:
                ds = v
        blocco = dati[i:i + ds]
        i += ds
        if tipo != 'OSMData':
            continue
        raw = None
        for f, _, v in fields(blocco):
            if f == 1:
                raw = v
            elif f == 3:
                raw = zlib.decompress(v)
        stringhe, gruppi = [], []
        gran, off_la, off_lo = 100, 0, 0
        for f, _, v in fields(raw):
            if f == 1:
                stringhe = [x for _, _, x in fields(v)]
            elif f == 2:
                gruppi.append(v)
            elif f == 17:
                gran = v
            elif f == 19:
                off_la = v
            elif f == 20:
                off_lo = v
        S = lambda k: stringhe[k].decode('utf8', 'replace')
        for g in gruppi:
            for f, _, v in fields(g):
                if f == 2:  # nodi densi, con tag
                    ids, las, los, kv = [], [], [], []
                    for ff, _, vv in fields(v):
                        if ff == 1:
                            ids = packed_sint(vv)
                        elif ff == 8:
                            las = packed_sint(vv)
                        elif ff == 9:
                            los = packed_sint(vv)
                        elif ff == 10:
                            kv = packed_uint(vv)
                    tag_per = [dict() for _ in ids]
                    idx, j = 0, 0
                    while j < len(kv):
                        if kv[j] == 0:
                            idx += 1
                            j += 1
                            continue
                        if idx < len(ids):
                            tag_per[idx][S(kv[j])] = S(kv[j + 1])
                        j += 2
                    for k, (nid, la, lo) in enumerate(zip(ids, las, los)):
                        nodi[nid] = (1e-9 * (off_la + gran * la), 1e-9 * (off_lo + gran * lo), tag_per[k].get('name', ''))
                elif f == 4:  # relazioni
                    keys, vals, roles, mem, typ = [], [], [], [], []
                    for ff, _, x in fields(v):
                        if ff == 2:
                            keys = packed_uint(x)
                        elif ff == 3:
                            vals = packed_uint(x)
                        elif ff == 8:
                            roles = packed_uint(x)
                        elif ff == 9:
                            mem = packed_sint(x)
                        elif ff == 10:
                            typ = packed_uint(x)
                    tags = {S(k): S(w) for k, w in zip(keys, vals)}
                    if tags.get('route') == 'bus':
                        relazioni.append({'tags': tags, 'membri': [(S(r), t, m) for r, t, m in zip(roles, typ, mem)]})
    return nodi, relazioni


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    pbf, uscita = sys.argv[1], sys.argv[2]
    la0, la1, lo0, lo1 = (float(x) for x in sys.argv[3].split(','))
    nodi, relazioni = leggi(pbf)

    per_linea = defaultdict(list)
    for r in relazioni:
        t = r['tags']
        ref = t.get('ref', '').strip()
        if not ref.isdigit() or 'flixbus' in t.get('name', '').lower():
            continue
        fermate = [m for role, typ, m in r['membri'] if typ == 0 and role in RUOLI_FERMATA and m in nodi]
        dentro = [m for m in fermate if la0 <= nodi[m][0] <= la1 and lo0 <= nodi[m][1] <= lo1]
        if len(dentro) < 3:
            continue
        per_linea[ref].append({'tags': t, 'fermate': fermate})

    linee, fermate_out, fermata_linee = [], {}, defaultdict(list)
    for ref in sorted(per_linea, key=int):
        varianti = sorted(per_linea[ref], key=lambda v: -len(v['fermate']))
        scelte = [varianti[0]]
        da, a = varianti[0]['tags'].get('from'), varianti[0]['tags'].get('to')
        ritorno = next((v for v in varianti[1:] if v['tags'].get('from') == a and v['tags'].get('to') == da), None)
        if ritorno is None:
            ritorno = next((v for v in varianti[1:] if v['tags'].get('from') != da), None)
        if ritorno:
            scelte.append(ritorno)
        direzioni = []
        for n, v in enumerate(scelte):
            ids = []
            for m in v['fermate']:
                lat, lon, nome = nodi[m]
                fid = f'osm-{m}'
                if fid not in fermate_out:
                    fermate_out[fid] = {'nome': nome or v['tags'].get('from', ''), 'lat': round(lat, 6), 'lon': round(lon, 6), 'linee': []}
                ids.append(fid)
                if f'AUT-{ref}' not in fermate_out[fid]['linee']:
                    fermate_out[fid]['linee'].append(f'AUT-{ref}')
                    fermata_linee[fid].append(f'AUT-{ref}')
            pulita = [x for k, x in enumerate(ids) if k == 0 or ids[k - 1] != x]
            direzioni.append({'direzione': n, 'circolare': False, 'fermate': pulita,
                              'titolo': f"{v['tags'].get('from', '')} → {v['tags'].get('to', '')}"})
        linee.append({'id': f'AUT-{ref}', 'etichetta': ref, 'mezzo': 'autobus', 'colore': '#0B6BB7', 'testo': '#FFFFFF',
                      'notturna': False, 'pdf': 'https://www.svt.vi.it', 'direzioni': direzioni})

    out = {'_nota': 'Vicenza: linee SVT urbane dalle relazioni bus di OpenStreetMap (© OpenStreetMap contributors, ODbL). Generato da strumenti/costruisci_autobus_vicenza.py.',
           'validita': [], 'linee': linee, 'fermate': fermate_out, 'fermataLinee': dict(fermata_linee)}
    with open(uscita, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f'linee: {len(linee)}, fermate: {len(fermate_out)}')


if __name__ == '__main__':
    main()
