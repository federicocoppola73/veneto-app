#!/usr/bin/env python3
"""Prepara un pacchetto città del motore unico.

Uso: python3 strumenti/prepara_pacchetto.py pacchetti/<città>

Scrive dentro la cartella del pacchetto:
- dati/immagini.json: quali foto esistono in assets/ (luoghi, cibi, aguzza), così il motore
  non ha più elenchi di file scritti a mano;
- manifest.json: l'elenco di tutti i file del pacchetto con l'URL pubblico su GitHub.
"""
import json
import os
import re
import sys

RADICE_GITHUB = 'https://raw.githubusercontent.com/federicocoppola73/veneto-app/main/'


def indice_immagini(cartella):
    assets = os.path.join(cartella, 'assets')
    luoghi = {}
    cibi = []
    aguzza = []
    cartella_luoghi = os.path.join(assets, 'luoghi')
    if os.path.isdir(cartella_luoghi):
        file = set(os.listdir(cartella_luoghi))
        for f in file:
            m = re.fullmatch(r'(.+)\.webp', f)
            if m and not re.search(r'_\d+$', m.group(1)):
                id_luogo = m.group(1)
                # foto in più: <id>_2.webp, <id>_3.webp, ... in ordine senza buchi
                n = 0
                while f'{id_luogo}_{n + 2}.webp' in file:
                    n += 1
                luoghi[id_luogo] = n
    cartella_cibi = os.path.join(assets, 'cibi')
    if os.path.isdir(cartella_cibi):
        cibi = sorted(f[:-5] for f in os.listdir(cartella_cibi) if f.endswith('.webp'))
    cartella_aguzza = os.path.join(assets, 'aguzza')
    if os.path.isdir(cartella_aguzza):
        aguzza = sorted('aguzza/' + f for f in os.listdir(cartella_aguzza) if f.endswith('.webp'))
    return {
        '_nota': 'Generato da strumenti/prepara_pacchetto.py: foto presenti in assets/',
        'luoghi': dict(sorted(luoghi.items())),
        'cibi': cibi,
        'aguzza': aguzza,
    }


def manifest(cartella, nome_pacchetto):
    voci = []
    for radice, _, fs in os.walk(cartella):
        for f in fs:
            percorso = os.path.relpath(os.path.join(radice, f), cartella).replace(os.sep, '/')
            if percorso == 'manifest.json':
                continue
            voci.append({'path': percorso, 'url': RADICE_GITHUB + 'pacchetti/' + nome_pacchetto + '/' + percorso})
    voci.sort(key=lambda v: v['path'])
    return {'file': voci}


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    cartella = sys.argv[1].rstrip('/')
    nome = os.path.basename(cartella)
    with open(os.path.join(cartella, 'dati', 'immagini.json'), 'w', encoding='utf-8') as f:
        json.dump(indice_immagini(cartella), f, ensure_ascii=False, indent=1)
    with open(os.path.join(cartella, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest(cartella, nome), f, ensure_ascii=False, indent=1)
    print(f'{nome}: immagini.json e manifest.json aggiornati')


if __name__ == '__main__':
    main()
