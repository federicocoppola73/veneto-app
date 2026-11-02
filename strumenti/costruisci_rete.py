#!/usr/bin/env python3
"""Costruisce la rete pedonale di una città dai dati OpenStreetMap (file .osm.pbf).

Uso: python3 strumenti/costruisci_rete.py <file.osm.pbf> pacchetti/<città> <lat_min,lat_max,lon_min,lon_max>

Scrive pacchetti/<città>/dati/rete.json:
- nodi: coordinate dei vertici in unità di 1e-5 grado, codificate come differenze (come si legge in motore/src/rete.js);
- archi: coppie di indici dei nodi, lunghezza calcolata in metri dal motore;
- luoghi: id del luogo -> indice del nodo della rete più vicino (solo entro 150 m).
Dati © OpenStreetMap contributors, licenza ODbL.
"""
import json
import math
import os
import struct
import sys
import zlib

# strade percorribili a piedi (esclusi autostrade, superstrade e simili)
STRADE_PEDONALI = {
    'footway', 'pedestrian', 'path', 'steps', 'living_street', 'residential', 'service',
    'unclassified', 'tertiary', 'tertiary_link', 'secondary', 'secondary_link',
    'primary', 'primary_link', 'track', 'road', 'cycleway',
}
MAX_AGGANCIO = 150  # metri: distanza massima tra un luogo e il nodo della rete


def varint(b, i):
    r = 0
    s = 0
    while True:
        c = b[i]
        i += 1
        r |= (c & 0x7F) << s
        s += 7
        if not c & 0x80:
            return r, i


def fields(b):
    i = 0
    n = len(b)
    while i < n:
        k, i = varint(b, i)
        f, wt = k >> 3, k & 7
        if wt == 0:
            v, i = varint(b, i)
        elif wt == 1:
            v = b[i:i + 8]
            i += 8
        elif wt == 2:
            ln, i = varint(b, i)
            v = b[i:i + ln]
            i += ln
        elif wt == 5:
            v = b[i:i + 4]
            i += 4
        else:
            raise ValueError(wt)
        yield f, wt, v


def zig(v):
    return (v >> 1) ^ -(v & 1)


def packed_sint(b):
    out = []
    i = 0
    prev = 0
    while i < len(b):
        v, i = varint(b, i)
        prev += zig(v)
        out.append(prev)
    return out


def packed_uint(b):
    out = []
    i = 0
    while i < len(b):
        v, i = varint(b, i)
        out.append(v)
    return out


def leggi_pbf(percorso, bbox):
    """Restituisce (nodi: id -> (lat, lon), vie: [(tags, refs)]) delle vie che toccano il riquadro."""
    la0, la1, lo0, lo1 = bbox
    nodi = {}
    vie = []
    dati = open(percorso, 'rb').read()
    i = 0
    while i < len(dati):
        hl = struct.unpack('>I', dati[i:i + 4])[0]
        i += 4
        bh = dati[i:i + hl]
        i += hl
        tipo = None
        dimensione = 0
        for f, _, v in fields(bh):
            if f == 1:
                tipo = v.decode()
            elif f == 3:
                dimensione = v
        blocco = dati[i:i + dimensione]
        i += dimensione
        if tipo != 'OSMData':
            continue
        raw = None
        for f, _, v in fields(blocco):
            if f == 1:
                raw = v
            elif f == 3:
                raw = zlib.decompress(v)
        stringhe = []
        gruppi = []
        gran = 100
        off_lat = 0
        off_lon = 0
        for f, _, v in fields(raw):
            if f == 1:
                stringhe = [x for _, _, x in fields(v)]
            elif f == 2:
                gruppi.append(v)
            elif f == 17:
                gran = v
            elif f == 19:
                off_lat = v
            elif f == 20:
                off_lon = v
        S = lambda k: stringhe[k].decode('utf8', 'replace')
        for g in gruppi:
            for f, _, v in fields(g):
                if f == 2:  # nodi densi
                    ids, lats, lons = [], [], []
                    for ff, _, vv in fields(v):
                        if ff == 1:
                            ids = packed_sint(vv)
                        elif ff == 8:
                            lats = packed_sint(vv)
                        elif ff == 9:
                            lons = packed_sint(vv)
                    for nid, la, lo in zip(ids, lats, lons):
                        nodi[nid] = (1e-9 * (off_lat + gran * la), 1e-9 * (off_lon + gran * lo))
                elif f == 3:  # vie
                    refs = []
                    tags = {}
                    chiavi, valori = [], []
                    for ff, _, vv in fields(v):
                        if ff == 2:
                            chiavi = packed_uint(vv)
                        elif ff == 3:
                            valori = packed_uint(vv)
                        elif ff == 8:
                            refs = packed_sint(vv)
                    if not refs or not chiavi:
                        continue
                    tags = {S(k): S(x) for k, x in zip(chiavi, valori)}
                    if 'highway' in tags:
                        vie.append((tags, refs))
    # solo le vie che toccano il riquadro (i nodi servono solo per le vie tenute)
    tenute = []
    for tags, refs in vie:
        if tags['highway'] not in STRADE_PEDONALI or tags.get('access') in ('no', 'private'):
            continue
        pts = [nodi[r] for r in refs if r in nodi]
        if any(la0 <= la <= la1 and lo0 <= lo <= lo1 for la, lo in pts):
            tenute.append(refs)
    return nodi, tenute


def distanza(a, b):
    R = 6371000.0
    la1, lo1 = math.radians(a[0]), math.radians(a[1])
    la2, lo2 = math.radians(b[0]), math.radians(b[1])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    pbf, cartella, riquadro = sys.argv[1], sys.argv[2].rstrip('/'), sys.argv[3]
    bbox = tuple(float(x) for x in riquadro.split(','))
    nodi_osm, vie = leggi_pbf(pbf, bbox)

    # vertici della rete: id OSM -> indice; archi tra vertici consecutivi di ogni via
    indice = {}
    coord = []
    archi = set()
    for refs in vie:
        refs = [r for r in refs if r in nodi_osm]
        for a, b in zip(refs, refs[1:]):
            if a == b:
                continue
            for r in (a, b):
                if r not in indice:
                    indice[r] = len(coord)
                    coord.append(nodi_osm[r])
            x, y = indice[a], indice[b]
            archi.add((min(x, y), max(x, y)))

    # coordinate in unità di 1e-5 grado, codificate come differenze progressive
    interi = [(round(la * 1e5), round(lo * 1e5)) for la, lo in coord]
    codificati = []
    pa = pb = 0
    for la, lo in interi:
        codificati += [la - pa, lo - pb]
        pa, pb = la, lo

    # luoghi del pacchetto: nodo della rete più vicino, entro MAX_AGGANCIO
    luoghi_file = json.load(open(os.path.join(cartella, 'dati', 'luoghi.json'), encoding='utf-8'))
    luoghi = luoghi_file['luoghi'] if isinstance(luoghi_file, dict) else luoghi_file
    agganci = {}
    for l in luoghi:
        p = (l['latitudine'], l['longitudine'])
        migliore, dmin = None, float('inf')
        for k, c in enumerate(coord):
            d = distanza(p, c)
            if d < dmin:
                migliore, dmin = k, d
        if migliore is not None and dmin <= MAX_AGGANCIO:
            agganci[l['id']] = migliore
        else:
            print(f"attenzione: {l['id']} non è vicino alla rete ({round(dmin)} m)")

    rete = {
        '_nota': 'Rete pedonale generata da strumenti/costruisci_rete.py dai dati OpenStreetMap. © OpenStreetMap contributors (ODbL). Non modificare a mano.',
        'nodi': codificati,
        'archi': [v for a in sorted(archi) for v in a],
        'luoghi': agganci,
    }
    with open(os.path.join(cartella, 'dati', 'rete.json'), 'w', encoding='utf-8') as f:
        json.dump(rete, f, ensure_ascii=False, separators=(',', ':'))
    print(f'rete: {len(coord)} nodi, {len(archi)} archi, {len(agganci)} luoghi agganciati')


if __name__ == '__main__':
    main()
