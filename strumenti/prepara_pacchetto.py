#!/usr/bin/env python3
"""Prepara un pacchetto città del motore unico.

Uso: python3 strumenti/prepara_pacchetto.py pacchetti/<città>

Scrive dentro la cartella del pacchetto:
- dati/immagini.json: quali foto esistono in assets/ (luoghi, cibi, aguzza), così il motore
  non ha più elenchi di file scritti a mano;
- manifest.json: l'elenco di tutti i file del pacchetto con l'URL pubblico su GitHub;
- prova/dati/*.json e manifest_prova.json: il pacchetto "prova" della versione gratuita, con mappa,
  servizi, linee dei mezzi e i 10 monumenti di anteprima indicati in catalogo.json ("anteprima").
  Le foto non si copiano: manifest_prova.json punta agli stessi file del pacchetto completo.
Aggiorna anche in catalogo.json "dimensione_mb" e "dimensione_prova_mb" della città.
"""
import hashlib
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
            if percorso in ('manifest.json', 'manifest_prova.json') or percorso.startswith('prova/'):
                continue
            with open(os.path.join(radice, f), 'rb') as h:
                impronta = hashlib.sha256(h.read()).hexdigest()
            voci.append({
                'path': percorso,
                'url': RADICE_GITHUB + 'pacchetti/' + nome_pacchetto + '/' + percorso,
                'sha256': impronta,
                'byte': os.path.getsize(os.path.join(radice, f)),
            })
    voci.sort(key=lambda v: v['path'])
    return {'versione': versione_di(voci), 'file': voci}


def versione_di(voci):
    # versione del pacchetto: cambia se cambia anche un solo file (e quindi va riscaricato)
    return hashlib.sha256(''.join(v['path'] + v['sha256'] for v in voci).encode()).hexdigest()[:12]


# File di dati che nella prova restano vuoti (stessa forma, liste vuote)
VUOTI_PROVA = {
    'aguzza.json': {'itinerari': [], 'domande': []},
    'cibi.json': {'cibi': []},
    'curiosita.json': {'curiosita': []},
    'itinerari.json': {'itinerari': []},
    'personaggi.json': {'personaggi': []},
}


def pacchetto_prova(cartella, nome_pacchetto, anteprima, completo):
    """Scrive prova/dati/ e restituisce il manifest della prova (stesso formato di manifest.json)."""
    ids = set(anteprima)
    cartella_prova = os.path.join(cartella, 'prova', 'dati')
    os.makedirs(cartella_prova, exist_ok=True)
    nota = 'Pacchetto prova (versione gratuita), generato da strumenti/prepara_pacchetto.py'

    def leggi(nome):
        with open(os.path.join(cartella, 'dati', nome), encoding='utf-8') as f:
            return json.load(f)

    filtrati = {}
    for voce in completo['file']:
        if not voce['path'].startswith('dati/'):
            continue
        nome = voce['path'][5:]
        if nome in VUOTI_PROVA:
            filtrati[nome] = {'_nota': nota, **VUOTI_PROVA[nome]}
        elif nome == 'luoghi.json':
            d = leggi(nome)
            d['luoghi'] = [l for l in d['luoghi'] if l['id'] in ids]
            filtrati[nome] = d
        elif nome == 'principali.json':
            d = leggi(nome)
            d['luoghi'] = [i for i in d.get('luoghi', []) if i in ids]
            filtrati[nome] = d
        elif nome == 'rete.json':
            d = leggi(nome)
            d['luoghi'] = {k: v for k, v in d.get('luoghi', {}).items() if k in ids}
            filtrati[nome] = d
        elif nome == 'immagini.json':
            d = leggi(nome)
            d['luoghi'] = {k: v for k, v in d.get('luoghi', {}).items() if k in ids}
            d['cibi'] = []
            d['aguzza'] = []
            filtrati[nome] = d
        elif nome == 'eventi.json':
            d = leggi(nome)
            d['eventi'] = []
            filtrati[nome] = d

    # file della prova: i dati filtrati (da prova/dati) + quelli invariati + mappa e foto dei luoghi di anteprima
    for f in os.listdir(cartella_prova):
        if f not in filtrati:
            os.remove(os.path.join(cartella_prova, f))
    voci = []
    for voce in completo['file']:
        percorso = voce['path']
        if percorso.startswith('dati/'):
            nome = percorso[5:]
            if nome in filtrati:
                testo = json.dumps(filtrati[nome], ensure_ascii=False, indent=1).encode('utf-8')
                with open(os.path.join(cartella_prova, nome), 'wb') as f:
                    f.write(testo)
                voci.append({
                    'path': percorso,
                    'url': RADICE_GITHUB + 'pacchetti/' + nome_pacchetto + '/prova/' + percorso,
                    'sha256': hashlib.sha256(testo).hexdigest(),
                    'byte': len(testo),
                })
            else:
                voci.append(voce)
        elif percorso.startswith('assets/mappa') or (
            percorso.startswith('assets/luoghi/')
            and re.sub(r'(_\d+)?\.webp$', '', percorso[len('assets/luoghi/'):]) in ids
        ):
            voci.append(voce)
    return {'versione': versione_di(voci), 'tipo': 'prova', 'file': voci}


def megabyte(m):
    return round(sum(v.get('byte', 0) for v in m['file']) / 1_000_000, 1)


def aggiorna_catalogo(nome, completo, prova):
    percorso = 'catalogo.json'
    with open(percorso, encoding='utf-8') as f:
        catalogo = json.load(f)
    for c in catalogo['citta']:
        if c['id'] == nome:
            c['dimensione_mb'] = megabyte(completo)
            c['dimensione_prova_mb'] = megabyte(prova)
            c['pacchetto_prova'] = RADICE_GITHUB + 'pacchetti/' + nome + '/manifest_prova.json'
    with open(percorso, 'w', encoding='utf-8') as f:
        json.dump(catalogo, f, ensure_ascii=False, indent=2)
        f.write('\n')


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    cartella = sys.argv[1].rstrip('/')
    nome = os.path.basename(cartella)
    with open(os.path.join(cartella, 'dati', 'immagini.json'), 'w', encoding='utf-8') as f:
        json.dump(indice_immagini(cartella), f, ensure_ascii=False, indent=1)
    completo = manifest(cartella, nome)
    with open(os.path.join(cartella, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(completo, f, ensure_ascii=False, indent=1)
    with open('catalogo.json', encoding='utf-8') as f:
        citta = next((c for c in json.load(f)['citta'] if c['id'] == nome), {})
    anteprima = citta.get('anteprima') or []
    if not anteprima:
        print(f'{nome}: manca "anteprima" in catalogo.json, pacchetto prova non creato')
        return
    prova = pacchetto_prova(cartella, nome, anteprima, completo)
    with open(os.path.join(cartella, 'manifest_prova.json'), 'w', encoding='utf-8') as f:
        json.dump(prova, f, ensure_ascii=False, indent=1)
    aggiorna_catalogo(nome, completo, prova)
    print(f'{nome}: immagini.json, manifest.json e manifest_prova.json aggiornati '
          f'({megabyte(completo)} MB, prova {megabyte(prova)} MB)')


if __name__ == '__main__':
    main()
