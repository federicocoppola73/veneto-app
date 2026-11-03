#!/usr/bin/env python3
"""Servizi utili (servizi.json) di una città dai dati OpenStreetMap.

Uso:
  python3 strumenti/servizi_osm.py <servizi-osm.json> <citta> "<regex reti urbane>"

<servizi-osm.json> è la risposta di Overpass a QUERY_OVERPASS (sostituire la bbox).
Le fermate degli autobus tenute sono quelle servite dalle linee urbane, cioè dalle relazioni
route=bus la cui rete o il cui gestore (network, operator) corrisponde alla regex
(es. "Urbano Treviso|Mobilità di Marca") e con numero di linea corto (1-2 cifre o una lettera):
le extraurbane hanno numeri da 100 in su.
Scrive pacchetti/<citta>/dati/servizi.json. Dati © OpenStreetMap contributors (ODbL).
"""
import json
import re
import sys

QUERY_OVERPASS = (
    '[out:json][timeout:300][bbox:SUD,OVEST,NORD,EST];('
    'nwr[amenity~"^(drinking_water|toilets|pharmacy|police|hospital|parking)$"];'
    'nwr[amenity=fountain][drinking_water=yes];nwr[emergency=yes][healthcare];'
    'node[highway=bus_stop];node[public_transport=platform][bus=yes];);out center tags;'
    'rel[route=bus];out body;'
)

PRIVATI = {'private', 'no', 'customers', 'permit', 'delivery', 'residents'}


def chiave_linea(ref):
    m = re.match(r'(\d+)(.*)', ref)
    return (int(m.group(1)), m.group(2)) if m else (10**6, ref)


def main():
    sorgente, citta, reti = sys.argv[1], sys.argv[2], re.compile(sys.argv[3], re.I)
    elementi = json.load(open(sorgente, encoding='utf-8'))['elements']

    # linee urbane per fermata
    linee_fermata = {}
    for r in elementi:
        if r['type'] != 'relation' or r.get('tags', {}).get('route') != 'bus':
            continue
        tag = r['tags']
        ref = tag.get('ref', '')
        if not reti.search(tag.get('network', '') + '|' + tag.get('operator', '')):
            continue
        if not re.fullmatch(r'\d{1,2}[a-zA-Z]?|[A-Z]', ref):
            continue
        for m in r.get('members', []):
            if m['type'] == 'node':
                linee_fermata.setdefault(m['ref'], set()).add(tag['ref'])

    servizi = {t: [] for t in ('farmacie', 'parcheggi', 'ospedali', 'acqua', 'polizia', 'bagni', 'autobus')}
    visti_nomi_fermate = {}
    for e in elementi:
        if e['type'] == 'relation' and e.get('tags', {}).get('route'):
            continue
        tag = e.get('tags', {})
        lat = e.get('lat', e.get('center', {}).get('lat'))
        lon = e.get('lon', e.get('center', {}).get('lon'))
        if lat is None or tag.get('access') in PRIVATI:
            continue
        am = tag.get('amenity')
        voce = {'lat': round(lat, 6), 'lon': round(lon, 6)}
        if tag.get('name'):
            voce['nome'] = tag['name']
        if tag.get('wheelchair') == 'yes':
            voce['disabili'] = True
        tel = tag.get('phone') or tag.get('contact:phone')
        if am == 'drinking_water' or (am == 'fountain' and tag.get('drinking_water') == 'yes'):
            voce.pop('nome', None)
            servizi['acqua'].append(voce)
        elif am == 'toilets':
            if tag.get('fee') == 'yes':
                voce['pagamento'] = True
            servizi['bagni'].append(voce)
        elif am == 'pharmacy':
            if tag.get('dispensing') == 'no':
                continue  # parafarmacie
            servizi['farmacie'].append(voce)
        elif am == 'police':
            if tel:
                voce['telefono'] = tel
            servizi['polizia'].append(voce)
        elif am == 'hospital' or (tag.get('emergency') == 'yes' and tag.get('healthcare')):
            if tag.get('emergency') == 'yes':
                voce['prontoSoccorso'] = True
            if tel:
                voce['telefono'] = tel
            servizi['ospedali'].append(voce)
        elif am == 'parking':
            if tag.get('parking') in ('street_side', 'lane', 'on_street'):
                continue
            capienza = int(tag['capacity']) if tag.get('capacity', '').isdigit() else 0
            if not tag.get('name') and capienza < 50:
                continue
            if tag.get('fee') == 'yes':
                voce['pagamento'] = True
            servizi['parcheggi'].append(voce)
        elif e['type'] == 'node' and e['id'] in linee_fermata:
            linee = sorted(linee_fermata[e['id']], key=chiave_linea)
            nome = tag.get('name') or 'Fermata'
            # le due fermate opposte con lo stesso nome restano entrambe: cambia solo l'id
            base = re.sub(r'[^a-z0-9]+', '-', nome.lower()).strip('-')
            n = visti_nomi_fermate[base] = visti_nomi_fermate.get(base, 0) + 1
            voce = {'id': f'autobus-{base}' + (f'-{n}' if n > 1 else ''), 'lat': voce['lat'], 'lon': voce['lon'],
                    'nome': nome, 'linee': linee}
            servizi['autobus'].append(voce)

    elenco = []
    for tipo, voci in servizi.items():
        voci.sort(key=lambda v: (v['lat'], v['lon']))
        for i, v in enumerate(voci, 1):
            elenco.append({'id': v.pop('id', f'{tipo}-{i}'), 'tipo': tipo, **v})
    uscita = {
        '_nota': 'Generato da strumenti/servizi_osm.py con i dati OpenStreetMap. Dati © OpenStreetMap contributors (ODbL). '
                 'Fermate degli autobus: solo quelle delle linee urbane, con le linee che vi fermano.',
        'servizi': elenco,
    }
    with open(f'pacchetti/{citta}/dati/servizi.json', 'w', encoding='utf-8') as f:
        json.dump(uscita, f, ensure_ascii=False, indent=1)
    print({t: len(v) for t, v in servizi.items()})


if __name__ == '__main__':
    main()
