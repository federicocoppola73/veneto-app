#!/usr/bin/env python3
"""Disegna la mappa di una città (stile delle mappe di Vicenza) dai dati OpenStreetMap.

Uso:
  python3 strumenti/disegna_mappa.py <osm.json> <citta> <sud> <ovest> <nord> <est> [--centro LAT LON]

<osm.json> è la risposta di Overpass ("out geom") con strade, edifici, acque, verde e ferrovia,
ottenuta con la query in QUERY_OVERPASS qui sotto (sostituire la bbox).

Produce in pacchetti/<citta>/:
  assets/mappa-<citta>.webp       immagine base, larga LARGHEZZA px
  assets/mappa/1/<x>_<y>.webp     tessere 512 px del livello 1 (immagine doppia)
  dati/mappa.json                 dimensioni e punti di riferimento (angoli e centro)
  dati/tessere.json               elenco delle tessere
Dati © OpenStreetMap contributors (ODbL).
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None


def carica_font(dimensione):
    """Cerca un font TrueType disponibile su Linux, Windows o macOS; altrimenti usa quello predefinito di Pillow."""
    candidati = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/segoeui.ttf',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/Library/Fonts/Arial.ttf',
    ]
    for percorso in candidati:
        if os.path.exists(percorso):
            return ImageFont.truetype(percorso, dimensione)
    return ImageFont.load_default(size=dimensione)


QUERY_OVERPASS = (
    '[out:json][timeout:900][maxsize:1073741824][bbox:SUD,OVEST,NORD,EST];('
    'way[highway];way[building];relation[building];way[waterway];way[natural=water];relation[natural=water];'
    'way[landuse~"^(grass|meadow|forest|recreation_ground|village_green|cemetery|orchard|vineyard|railway)$"];'
    'relation[landuse~"^(grass|meadow|forest|cemetery)$"];'
    'way[leisure~"^(park|garden|pitch|playground|golf_course)$"];relation[leisure=park];'
    'way[natural~"^(wood|scrub|grassland)$"];relation[natural=wood];way[railway~"^(rail|light_rail)$"];);out geom;'
)

LARGHEZZA = 8000          # immagine base
SCALA = 2                 # il livello 1 è il doppio della base: si disegna lì e si riduce
TESSERA = 512

SFONDO = (244, 241, 233)
VERDE = (207, 230, 181)
ACQUA = (170, 212, 230)
EDIFICIO = (221, 210, 196)
FERROVIA = (120, 120, 120)
STRADA = (255, 255, 255)
TESTO = (85, 85, 85)

# larghezze in pixel dell'immagine base
STRADE = {
    'motorway': 16, 'trunk': 15, 'primary': 13, 'secondary': 12, 'tertiary': 11,
    'motorway_link': 9, 'trunk_link': 9, 'primary_link': 9, 'secondary_link': 8, 'tertiary_link': 8,
    'residential': 9, 'unclassified': 9, 'living_street': 8, 'pedestrian': 8, 'road': 8,
    'service': 5, 'track': 3, 'footway': 3, 'path': 3, 'cycleway': 3, 'steps': 3, 'bridleway': 3,
}
CORSI_ACQUA = {'river': 14, 'canal': 9, 'stream': 4, 'ditch': 2, 'drain': 2}
CON_NOME = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified',
            'living_street', 'pedestrian', 'service'}
LUNGHEZZA_MIN_VIA = 20    # sotto questa lunghezza (pixel dell'immagine base) la via non viene etichettata
DISTANZA_ETICHETTE = 150  # distanza minima tra due etichette della stessa via (pixel dell'immagine base)
MARGINE_ETICHETTE = 10    # spazio libero attorno a ogni etichetta, per non sovrapporle

VERDI_LANDUSE = {'grass', 'meadow', 'forest', 'recreation_ground', 'village_green', 'cemetery', 'orchard', 'vineyard'}
VERDI_LEISURE = {'park', 'garden', 'pitch', 'playground', 'golf_course'}
VERDI_NATURAL = {'wood', 'scrub', 'grassland'}


def anelli(membri):
    """Unisce le vie di una relazione in anelli chiusi (liste di (lat, lon))."""
    pezzi = [[(p['lat'], p['lon']) for p in m['geometry']] for m in membri if m.get('geometry')]
    risultato = []
    while pezzi:
        anello = pezzi.pop(0)
        cambiato = True
        while anello[0] != anello[-1] and cambiato:
            cambiato = False
            for i, p in enumerate(pezzi):
                if p[0] == anello[-1]:
                    anello += p[1:]
                elif p[-1] == anello[-1]:
                    anello += p[::-1][1:]
                elif p[-1] == anello[0]:
                    anello = p[:-1] + anello
                elif p[0] == anello[0]:
                    anello = p[::-1][:-1] + anello
                else:
                    continue
                pezzi.pop(i)
                cambiato = True
                break
        if len(anello) >= 3:
            risultato.append(anello)
    return risultato


def etichetta_vie(d, strade, font, W, H):
    """Scrive i nomi delle vie: più etichette per via (una ogni ~350 m) dove c'è spazio libero.
    Le vie più lunghe vengono scritte per prime, così hanno la precedenza sulle altre."""
    candidati = []
    for tipo, punti, nome in strade:
        if not nome or tipo not in CON_NOME or len(punti) < 2:
            continue
        coppie = list(zip(punti, punti[1:]))
        lun_tot = sum(math.dist(a, b) for a, b in coppie)
        a, b = max(coppie, key=lambda c: math.dist(*c))
        candidati.append((lun_tot, nome, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)))
    candidati.sort(key=lambda c: -c[0])

    occupati, posti = [], {}
    for lun, nome, (x, y) in candidati:
        if lun < LUNGHEZZA_MIN_VIA * SCALA:
            continue
        if any(math.dist((x, y), p) < DISTANZA_ETICHETTE * SCALA for p in posti.get(nome, [])):
            continue
        l, t, r, b = d.textbbox((x, y), nome, font=font, anchor='mm')
        box = (l - MARGINE_ETICHETTE, t - MARGINE_ETICHETTE, r + MARGINE_ETICHETTE, b + MARGINE_ETICHETTE)
        if l < 0 or t < 0 or r > W or b > H:
            continue
        if any(not (box[2] < o[0] or box[0] > o[2] or box[3] < o[1] or box[1] > o[3]) for o in occupati):
            continue
        occupati.append(box)
        posti.setdefault(nome, []).append((x, y))
        d.text((x, y), nome, font=font, fill=TESTO, anchor='mm', stroke_width=SCALA, stroke_fill=SFONDO)


def main():
    args = sys.argv[1:]
    centro = None
    if '--centro' in args:
        i = args.index('--centro')
        centro = (float(args[i + 1]), float(args[i + 2]))
        args = args[:i] + args[i + 3:]
    sorgente, citta = args[0], args[1]
    sud, ovest, nord, est = map(float, args[2:6])
    if centro is None:
        centro = ((sud + nord) / 2, (ovest + est) / 2)

    lat_media = math.radians((sud + nord) / 2)
    altezza = round(LARGHEZZA * (nord - sud) / ((est - ovest) * math.cos(lat_media)))
    W, H = LARGHEZZA * SCALA, altezza * SCALA

    def xy(lat, lon):
        return ((lon - ovest) / (est - ovest) * W, (nord - lat) / (nord - sud) * H)

    print('lettura dati…', flush=True)
    with open(sorgente, encoding='utf-8') as f:
        elementi = json.load(f)['elements']
    print(len(elementi), 'elementi', flush=True)

    verde, acqua_aree, acqua_linee, edifici, ferrovie, strade = [], [], [], [], [], []
    for e in elementi:
        tag = e.get('tags', {})
        if e['type'] == 'way':
            if not e.get('geometry'):
                continue
            punti = [xy(p['lat'], p['lon']) for p in e['geometry']]
            forme = [punti]
        elif e['type'] == 'relation':
            forme = [[xy(*p) for p in a] for a in anelli([m for m in e.get('members', []) if m.get('role') != 'inner'])]
            punti = None
        else:
            continue
        if 'building' in tag:
            edifici += forme
        elif tag.get('natural') == 'water' or tag.get('waterway') == 'riverbank':
            acqua_aree += forme
        elif tag.get('landuse') in VERDI_LANDUSE or tag.get('leisure') in VERDI_LEISURE or tag.get('natural') in VERDI_NATURAL:
            verde += forme
        elif tag.get('waterway') in CORSI_ACQUA and punti and tag.get('tunnel') not in ('yes', 'culvert'):
            acqua_linee.append((CORSI_ACQUA[tag['waterway']], punti))
        elif tag.get('railway') in ('rail', 'light_rail') and punti and tag.get('tunnel') != 'yes' and tag.get('service') not in ('yard', 'siding', 'spur'):
            ferrovie.append(punti)
        elif tag.get('highway') in STRADE and punti and tag.get('area') != 'yes':
            strade.append((tag['highway'], punti, tag.get('name')))

    print('disegno…', flush=True)
    img = Image.new('RGB', (W, H), SFONDO)
    d = ImageDraw.Draw(img)
    for forma in verde:
        if len(forma) >= 3:
            d.polygon(forma, fill=VERDE)
    for forma in acqua_aree:
        if len(forma) >= 3:
            d.polygon(forma, fill=ACQUA)
    for larghezza, punti in sorted(acqua_linee, key=lambda x: x[0]):
        d.line(punti, fill=ACQUA, width=larghezza * SCALA, joint='curve')
    for forma in edifici:
        if len(forma) >= 3:
            d.polygon(forma, fill=EDIFICIO)
    for punti in ferrovie:
        d.line(punti, fill=FERROVIA, width=2 * SCALA)
    ordine = list(STRADE)
    for tipo, punti, _ in sorted(strade, key=lambda s: -ordine.index(s[0])):
        w = STRADE[tipo] * SCALA
        d.line(punti, fill=STRADA, width=w, joint='curve')
        if w >= 8:
            r = w / 2
            for x, y in (punti[0], punti[-1]):
                d.ellipse((x - r, y - r, x + r, y + r), fill=STRADA)

    etichetta_vie(d, strade, carica_font(8 * SCALA), W, H)

    radice = os.path.join('pacchetti', citta)
    os.makedirs(os.path.join(radice, 'assets', 'mappa', '1'), exist_ok=True)
    os.makedirs(os.path.join(radice, 'dati'), exist_ok=True)

    print('tessere…', flush=True)
    nomi = []
    for ty in range(math.ceil(H / TESSERA)):
        for tx in range(math.ceil(W / TESSERA)):
            pezzo = img.crop((tx * TESSERA, ty * TESSERA, min(W, (tx + 1) * TESSERA), min(H, (ty + 1) * TESSERA)))
            pezzo.save(os.path.join(radice, 'assets', 'mappa', '1', f'{tx}_{ty}.webp'), 'WEBP', quality=80)
            nomi.append(f'{tx}_{ty}')
    nomi.sort(key=lambda n: (int(n.split('_')[1]), int(n.split('_')[0])))

    print('immagine base…', flush=True)
    base = img.resize((LARGHEZZA, altezza), Image.LANCZOS)
    base.save(os.path.join(radice, 'assets', f'mappa-{citta}.webp'), 'WEBP', quality=82)

    def punto(nome, lat, lon):
        x, y = xy(lat, lon)
        return {'nome': nome, 'latitudine': lat, 'longitudine': lon, 'x': round(x / SCALA, 1), 'y': round(y / SCALA, 1)}

    mappa = {
        '_nota': "Mappa disegnata con dati © OpenStreetMap contributors (licenza ODbL). I punti di riferimento servono all'app per posizionare i luoghi a partire da latitudine e longitudine.",
        'immagine': f'mappa-{citta}.webp',
        'larghezza': LARGHEZZA,
        'altezza': altezza,
        'punti_riferimento': [
            punto('Angolo nord-ovest', nord, ovest), punto('Angolo nord-est', nord, est),
            punto('Angolo sud-ovest', sud, ovest), punto('Angolo sud-est', sud, est),
            punto('Centro', *centro),
        ],
    }
    with open(os.path.join(radice, 'dati', 'mappa.json'), 'w', encoding='utf-8') as f:
        json.dump(mappa, f, ensure_ascii=False, indent=2)
        f.write('\n')
    tessere = {
        '_nota': 'Tessere della mappa dettagliata (solo livello 1, per contenere il peso). Dati OpenStreetMap (ODbL).',
        'dimensione': TESSERA,
        'livelli': {'1': nomi},
    }
    with open(os.path.join(radice, 'dati', 'tessere.json'), 'w', encoding='utf-8') as f:
        json.dump(tessere, f, ensure_ascii=False, indent=1)
    print('fatto:', LARGHEZZA, 'x', altezza, '-', len(nomi), 'tessere', flush=True)


if __name__ == '__main__':
    main()
