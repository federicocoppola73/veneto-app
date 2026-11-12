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

Novità degli aggiornamenti: in manifest.json, campo "novita", c'è l'elenco delle differenze tra una versione
e la precedente pubblicata (quella in git HEAD), calcolato confrontando i file: luoghi nuovi/aggiornati/tolti,
foto, eventi, itinerari, curiosità, cibi, orari dei mezzi, servizi, mappa. L'app lo mostra prima di aggiornare.
Una nota scritta a mano (facoltativa) va in pacchetti/<città>/nota_aggiornamento.json, es.
{ "it": "Nuovi orari invernali dei musei", "en": "New winter opening hours" }: viene messa nell'aggiornamento
e il file viene svuotato, così non si ripete in quello successivo.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import date

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
            if percorso in ('manifest.json', 'manifest_prova.json', 'nota_aggiornamento.json') or percorso.startswith('prova/'):
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


# ---- Novità tra la versione pubblicata (git HEAD) e quella appena preparata ----

def da_git(percorso):
    """Contenuto di un file nella versione pubblicata (git HEAD), oppure None."""
    try:
        r = subprocess.run(['git', 'show', 'HEAD:' + percorso], capture_output=True, check=True)
        return r.stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def json_da_git(percorso):
    testo = da_git(percorso)
    try:
        return json.loads(testo) if testo else None
    except ValueError:
        return None


# campi di un luogo → aspetto che l'app mostra ("orari", "descrizioni", …)
ASPETTI = {
    'orari': 'orari', 'chiuso': 'orari',
    'descrizione': 'descrizioni', 'nota': 'descrizioni', 'lo_sapevi_che': 'descrizioni', 'curiosita': 'descrizioni',
    'storia': 'descrizioni', 'note_finali': 'descrizioni', 'curiosita_teaser': 'descrizioni',
    'accessibilita': 'accessibilita',
    'biglietto': 'prezzi',
    'immagine': 'foto', 'galleria': 'foto', 'video': 'foto',
}
ORDINE_ASPETTI = ['orari', 'descrizioni', 'accessibilita', 'prezzi', 'foto', 'altro']


def per_id(elenco, chiave='id'):
    return {x.get(chiave): x for x in (elenco or []) if isinstance(x, dict) and x.get(chiave)}


def differenze(cartella, nome, vecchio, nuovo):
    """Riepilogo delle differenze tra due manifest (vecchio da git HEAD, nuovo appena scritto)."""
    base = 'pacchetti/' + nome + '/'
    vecchi = {v['path']: v for v in vecchio['file']}
    nuovi = {v['path']: v for v in nuovo['file']}
    cambiati = [p for p, v in nuovi.items() if p not in vecchi or vecchi[p]['sha256'] != v['sha256']]

    def leggi(nome_file):
        with open(os.path.join(cartella, 'dati', nome_file), encoding='utf-8') as f:
            return json.load(f)

    def coppia(nome_file, campo):
        if 'dati/' + nome_file not in cambiati:
            return None, None
        prima = json_da_git(base + 'dati/' + nome_file) or {}
        return prima.get(campo) or [], leggi(nome_file).get(campo) or []

    n = {}
    # luoghi
    prima, dopo = coppia('luoghi.json', 'luoghi')
    if dopo is not None:
        a, b = per_id(prima), per_id(dopo)
        nuovi_luoghi = [b[i]['nome'] for i in b if i not in a]
        tolti = [i for i in a if i not in b]
        aspetti = set()
        aggiornati = 0
        for i in b:
            if i in a and a[i] != b[i]:
                aggiornati += 1
                for campo in set(a[i]) | set(b[i]):
                    if a[i].get(campo) != b[i].get(campo):
                        aspetti.add(ASPETTI.get(campo, 'altro'))
        if nuovi_luoghi:
            n['luoghi_nuovi'] = nuovi_luoghi
        if tolti:
            n['luoghi_tolti'] = len(tolti)
        if aggiornati:
            n['luoghi_aggiornati'] = aggiornati
            n['aspetti'] = [x for x in ORDINE_ASPETTI if x in aspetti]
    # foto nuove dei luoghi (file che prima non c'erano)
    foto = [p for p in cambiati if p.startswith('assets/luoghi/') and p not in vecchi]
    if foto:
        n['foto_nuove'] = len(foto)
    # eventi, curiosità, cibi: quanti nuovi
    prima, dopo = coppia('eventi.json', 'eventi')
    if dopo is not None:
        chiave = lambda e: (e.get('nome'), e.get('inizio'))
        visti = {chiave(e) for e in prima}
        k = sum(1 for e in dopo if chiave(e) not in visti)
        if k:
            n['eventi_nuovi'] = k
    for file_dati, campo, voce in (('curiosita.json', 'curiosita', 'curiosita_nuove'), ('cibi.json', 'cibi', 'cibi_nuovi')):
        prima, dopo = coppia(file_dati, campo)
        if dopo is not None:
            k = len(set(per_id(dopo)) - set(per_id(prima)))
            if k:
                n[voce] = k
    # itinerari nuovi e aggiornati
    prima, dopo = coppia('itinerari.json', 'itinerari')
    if dopo is not None:
        a, b = per_id(prima), per_id(dopo)
        nuovi_it = sum(1 for i in b if i not in a)
        agg_it = sum(1 for i in b if i in a and a[i] != b[i])
        if nuovi_it:
            n['itinerari_nuovi'] = nuovi_it
        if agg_it:
            n['itinerari_aggiornati'] = agg_it
    # orari e linee dei mezzi, servizi, mappa
    if any(p in cambiati for p in ('dati/autobus.json', 'dati/vaporetti.json', 'dati/orari_autobus.json', 'dati/orari_vaporetti.json')):
        n['mezzi'] = True
    if 'dati/servizi.json' in cambiati:
        n['servizi'] = True
    if any(p.startswith('assets/mappa') or p in ('dati/mappa.json', 'dati/tessere.json', 'dati/rete.json') for p in cambiati):
        n['mappa'] = True
    # MB da scaricare passando dalla versione precedente a questa
    n['byte'] = sum(nuovi[p].get('byte', 0) for p in cambiati)
    return n


def leggi_nota(cartella):
    percorso = os.path.join(cartella, 'nota_aggiornamento.json')
    try:
        with open(percorso, encoding='utf-8') as f:
            nota = json.load(f)
        return {k: v for k, v in nota.items() if isinstance(v, str) and v.strip() and not k.startswith('_')}, percorso
    except (OSError, ValueError):
        return {}, percorso


def aggiungi_novita(cartella, nome, completo):
    """Mette in completo['novita'] lo storico delle novità, aggiungendo quella rispetto alla versione pubblicata."""
    pubblicato = json_da_git('pacchetti/' + nome + '/manifest.json')
    try:
        with open(os.path.join(cartella, 'manifest.json'), encoding='utf-8') as f:
            storico = json.load(f).get('novita', [])
    except (OSError, ValueError):
        storico = []
    if pubblicato:
        # lo storico pubblicato vale più di quello del file locale (che può contenere prove non pubblicate)
        storico = pubblicato.get('novita', [])
    nota, percorso_nota = leggi_nota(cartella)
    if pubblicato and pubblicato.get('versione') and pubblicato['versione'] != completo['versione']:
        voce = {'versione': completo['versione'], 'da': pubblicato['versione'], 'data': date.today().isoformat()}
        voce.update(differenze(cartella, nome, pubblicato, completo))
        precedente = next((x for x in storico if x.get('da') == voce['da']), None)
        if nota:
            voce['nota'] = nota
        elif precedente and precedente.get('nota'):
            voce['nota'] = precedente['nota']  # lanciato di nuovo prima di pubblicare: la nota resta
        storico = [x for x in storico if x.get('da') != voce['da'] and x.get('versione') != voce['versione']] + [voce]
        if nota:
            with open(percorso_nota, 'w', encoding='utf-8') as f:
                json.dump({'_nota': 'Nota del prossimo aggiornamento (it, en, fr, de, es). Si svuota da sola.'}, f, ensure_ascii=False, indent=1)
    completo['novita'] = storico[-20:]


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
    aggiungi_novita(cartella, nome, completo)
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
