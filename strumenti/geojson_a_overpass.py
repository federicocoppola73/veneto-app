#!/usr/bin/env python3
"""Converte un export GeoJSON di Overpass Turbo nel JSON di Overpass ("elements") letto da disegna_mappa.py.

Uso: python3 strumenti/geojson_a_overpass.py <export.geojson> <output.json>

Ogni feature diventa un elemento: way (LineString o Polygon) con geometry, relation (Polygon) con un
membro "outer" che ha la stessa geometria. I buchi delle relazioni non sono ricostruiti.
Dati © OpenStreetMap contributors (ODbL).
"""
import json
import sys


def punti(coords):
    return [{'lat': y, 'lon': x} for x, y in coords]


def converti(geojson):
    elementi = []
    for f in geojson['features']:
        ident = f.get('properties', {}).get('@id', '')
        if '/' not in ident:
            continue
        tipo, numero = ident.split('/', 1)
        tags = {k: v for k, v in f['properties'].items() if k != '@id' and v is not None}
        g = f['geometry']
        if g['type'] == 'LineString':
            elementi.append({'type': 'way', 'id': int(numero), 'tags': tags, 'geometry': punti(g['coordinates'])})
        elif g['type'] == 'Polygon':
            anello = punti(g['coordinates'][0])
            if tipo == 'relation':
                elementi.append({'type': 'relation', 'id': int(numero), 'tags': tags,
                                 'members': [{'type': 'way', 'role': 'outer', 'geometry': anello}]})
            else:
                elementi.append({'type': 'way', 'id': int(numero), 'tags': tags, 'geometry': anello})
    return {'version': 0.6, 'generator': 'geojson_a_overpass', 'elements': elementi}


if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf-8') as f:
        dati = converti(json.load(f))
    with open(sys.argv[2], 'w', encoding='utf-8') as f:
        json.dump(dati, f)
    print(len(dati['elements']), 'elementi scritti')
