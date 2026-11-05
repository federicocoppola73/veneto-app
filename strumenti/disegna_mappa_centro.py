#!/usr/bin/env python3
"""Tessere di livello 2 (ingrandimento x4) per il solo centro di una città.

Disegna con lo stesso stile di disegna_mappa.py, ma solo nel rettangolo del centro, a una scala
doppia rispetto al livello 1. Le tessere vanno in assets/mappa/2/<x>_<y>.webp e vengono
elencate in dati/tessere.json sotto il livello "2". Fuori dal centro la mappa resta quella base.

Uso:
  python3 strumenti/disegna_mappa_centro.py <osm.json> <citta> <sud> <ovest> <nord> <est> \
      <centro_sud> <centro_ovest> <centro_nord> <centro_est>

I primi quattro valori sono la bbox intera della mappa di disegna_mappa.py (le stesse usate lì),
gli ultimi quattro il rettangolo del centro da dettagliare.
Dati © OpenStreetMap contributors (ODbL).
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import disegna_mappa as dm  # noqa: E402  stili e funzioni comuni

Image.MAX_IMAGE_PIXELS = None

SCALA = 4  # il livello 2 è quattro volte l'immagine base
TESSERA = 512
LIVELLO = '2'


def main():
    sorgente, citta = sys.argv[1], sys.argv[2]
    sud, ovest, nord, est = map(float, sys.argv[3:7])
    csud, covest, cnord, cest = map(float, sys.argv[7:11])

    lat_media = math.radians((sud + nord) / 2)
    altezza = round(dm.LARGHEZZA * (nord - sud) / ((est - ovest) * math.cos(lat_media)))
    W, H = dm.LARGHEZZA * SCALA, altezza * SCALA

    def xy(lat, lon):
        return ((lon - ovest) / (est - ovest) * W, (nord - lat) / (nord - sud) * H)

    # rettangolo del centro in pixel del livello 2, allineato alla griglia delle tessere
    a = xy(cnord, covest)
    b = xy(csud, cest)
    x0 = max(0, int(a[0] // TESSERA) * TESSERA)
    y0 = max(0, int(a[1] // TESSERA) * TESSERA)
    x1 = min(W, math.ceil(b[0] / TESSERA) * TESSERA)
    y1 = min(H, math.ceil(b[1] / TESSERA) * TESSERA)
    w, h = x1 - x0, y1 - y0
    print('area', w, 'x', h, 'px (livello 2)', flush=True)

    def sposta(punti):
        return [(x - x0, y - y0) for x, y in punti]

    print('lettura dati…', flush=True)
    with open(sorgente, encoding='utf-8') as f:
        elementi = json.load(f)['elements']

    verde, acqua_aree, acqua_linee, edifici, ferrovie, strade = [], [], [], [], [], []
    for e in elementi:
        tag = e.get('tags', {})
        if e['type'] == 'way':
            if not e.get('geometry'):
                continue
            punti = [xy(p['lat'], p['lon']) for p in e['geometry']]
            forme = [punti]
        elif e['type'] == 'relation':
            forme = [[xy(*p) for p in anello] for anello in dm.anelli([m for m in e.get('members', []) if m.get('role') != 'inner'])]
            punti = None
        else:
            continue
        # scarta ciò che sta fuori dal rettangolo (con un margine)
        xs = [p[0] for f_ in forme for p in f_] if forme else []
        if not xs or max(xs) < x0 - 200 or min(xs) > x1 + 200:
            continue
        ys = [p[1] for f_ in forme for p in f_]
        if max(ys) < y0 - 200 or min(ys) > y1 + 200:
            continue
        if 'building' in tag:
            edifici += forme
        elif tag.get('natural') == 'water' or tag.get('waterway') == 'riverbank':
            acqua_aree += forme
        elif tag.get('landuse') in dm.VERDI_LANDUSE or tag.get('leisure') in dm.VERDI_LEISURE or tag.get('natural') in dm.VERDI_NATURAL:
            verde += forme
        elif tag.get('waterway') in dm.CORSI_ACQUA and punti and tag.get('tunnel') not in ('yes', 'culvert'):
            acqua_linee.append((dm.CORSI_ACQUA[tag['waterway']], punti))
        elif tag.get('railway') in ('rail', 'light_rail') and punti and tag.get('tunnel') != 'yes' and tag.get('service') not in ('yard', 'siding', 'spur'):
            ferrovie.append(punti)
        elif tag.get('highway') in dm.STRADE and punti and tag.get('area') != 'yes':
            strade.append((tag['highway'], punti, tag.get('name')))

    print('disegno…', flush=True)
    img = Image.new('RGB', (w, h), dm.SFONDO)
    d = ImageDraw.Draw(img)
    for forma in verde:
        if len(forma) >= 3:
            d.polygon(sposta(forma), fill=dm.VERDE)
    for forma in acqua_aree:
        if len(forma) >= 3:
            d.polygon(sposta(forma), fill=dm.ACQUA)
    for larghezza, punti in sorted(acqua_linee, key=lambda t: t[0]):
        d.line(sposta(punti), fill=dm.ACQUA, width=larghezza * SCALA, joint='curve')
    for forma in edifici:
        if len(forma) >= 3:
            d.polygon(sposta(forma), fill=dm.EDIFICIO)
    for punti in ferrovie:
        d.line(sposta(punti), fill=dm.FERROVIA, width=2 * SCALA)
    ordine = list(dm.STRADE)
    for tipo, punti, _ in sorted(strade, key=lambda s: -ordine.index(s[0])):
        ww = dm.STRADE[tipo] * SCALA
        p2 = sposta(punti)
        d.line(p2, fill=dm.STRADA, width=ww, joint='curve')
        if ww >= 8:
            r = ww / 2
            for x, y in (p2[0], p2[-1]):
                d.ellipse((x - r, y - r, x + r, y + r), fill=dm.STRADA)

    print('nomi delle vie…', flush=True)
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 8 * SCALA)
    tratti = {}
    for tipo, punti, nome in strade:
        if not nome or tipo not in dm.CON_NOME:
            continue
        p2 = sposta(punti)
        for p, q in zip(p2, p2[1:]):
            lun = math.dist(p, q)
            if lun > tratti.get(nome, (0,))[0]:
                tratti[nome] = (lun, ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2))
    occupati = []
    for nome, (lun, (x, y)) in sorted(tratti.items(), key=lambda t: -t[1][0]):
        if lun < 40 * SCALA:
            continue
        l, t, r, b = d.textbbox((x, y), nome, font=font, anchor='mm')
        box = (l - 30, t - 30, r + 30, b + 30)
        if l < 0 or t < 0 or r > w or b > h:
            continue
        if any(not (box[2] < o[0] or box[0] > o[2] or box[3] < o[1] or box[1] > o[3]) for o in occupati):
            continue
        occupati.append(box)
        d.text((x, y), nome, font=font, fill=dm.TESTO, anchor='mm', stroke_width=SCALA, stroke_fill=dm.SFONDO)

    radice = os.path.join('pacchetti', citta)
    cartella = os.path.join(radice, 'assets', 'mappa', LIVELLO)
    os.makedirs(cartella, exist_ok=True)
    nomi = []
    for ty in range(h // TESSERA):
        for tx in range(w // TESSERA):
            pezzo = img.crop((tx * TESSERA, ty * TESSERA, (tx + 1) * TESSERA, (ty + 1) * TESSERA))
            # chiave nella griglia globale del livello 2
            gx = (x0 // TESSERA) + tx
            gy = (y0 // TESSERA) + ty
            pezzo.save(os.path.join(cartella, f'{gx}_{gy}.webp'), 'WEBP', quality=80)
            nomi.append(f'{gx}_{gy}')
    nomi.sort(key=lambda n: (int(n.split('_')[1]), int(n.split('_')[0])))

    percorso = os.path.join(radice, 'dati', 'tessere.json')
    with open(percorso, encoding='utf-8') as f:
        tessere = json.load(f)
    tessere['livelli'][LIVELLO] = nomi
    tessere['_nota'] = 'Tessere della mappa dettagliata. Livello 1: tutta la città. Livello 2: solo il centro storico. Dati OpenStreetMap (ODbL).'
    with open(percorso, 'w', encoding='utf-8') as f:
        json.dump(tessere, f, ensure_ascii=False, indent=1)
    print('fatto:', len(nomi), 'tessere di livello 2', flush=True)


if __name__ == '__main__':
    main()
