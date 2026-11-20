#!/usr/bin/env python3
"""Scrive in luoghi.json il campo "nomi" ({en, fr, de, es}) di ogni luogo, partendo da docs/nomi/<città>.json
e da docs/nomi/<città>_da_decidere.json. "nome" resta il nome italiano. Se in tutte le lingue il nome è uguale a quello italiano, "nomi" non c'è.

Regole: Palazzo e Piazza restano in italiano (salvo ESCLUSI); i monumenti con titolo Wikipedia pulito in tutte e 4 le lingue usano quello;
gli altri: genere tradotto + nome proprio (regola) oppure nome italiano.
Uso: python3 strumenti/applica_nomi.py <citta> [...]
"""
import json
import re
import sys

sys.path.insert(0, 'strumenti')
from nomi_wikipedia import GENERICI, STOP, norm, per_regola  # noqa: E402

L = ('en', 'fr', 'de', 'es')
ESCLUSI = {'palazzo-ducale', 'piazza-san-marco'}  # Palazzo/Piazza con nome tradotto consolidato (Doge's Palace, St Mark's Square)
SOLO_ITALIANO = ('palazzo ', 'piazza ', 'piazzale ')


def pulito(v, nome):
    """Titoli in tutte e 4 le lingue, senza disambiguazioni; se il nome inizia con un genere (chiesa, ponte…) il titolo deve contenerne uno."""
    if not all(v.get(k) and not re.search(r'[,(]', v[k]) for k in L):
        return False
    if nome.split(' ')[0].lower() in GENERICI:
        for i, k in enumerate(L):
            parole = {g[i].lower() for g in GENERICI.values()}
            if not any(w in v[k].lower() for w in parole):
                return False
    return True


BUONI = {'guggenheim'}  # abbinamenti Wikipedia giusti anche se il titolo italiano è diverso dal nome
STRUTTURALI = {'campo', 'campiello', 'isola', 'squero', 'scala', 'fondazione', 'fondamenta'}


def stesso_luogo(nome, titolo_it):
    """L'articolo è proprio quel luogo: tutte le parole del nome sono nel titolo, o tutte quelle del titolo sono nel nome."""
    a = {w for w in norm(nome).split() if w not in STOP}
    b = {w for w in norm(re.sub(r'\(.*?\)', '', titolo_it or '')).split() if w not in STOP}
    if not a or not b:
        return False
    if nome.split(' ')[0].lower() in STRUTTURALI and norm(titolo_it or '').split()[:1] != norm(nome).split()[:1]:
        return False
    return a <= b or b <= a


def nomi_di(id_, nome, v, dec, man):
    if id_ in man:
        return man[id_]
    if id_ in dec:
        return dec[id_]
    if nome.lower().startswith(SOLO_ITALIANO) and id_ not in ESCLUSI:
        return {k: nome for k in L}
    if v['tipo'] == 'wikipedia' and (id_ in BUONI or stesso_luogo(nome, v.get('it'))) and pulito(v, nome):
        return {k: v[k] for k in L}
    r = per_regola(nome)
    if r:
        return r
    return {k: nome for k in L}


for citta in sys.argv[1:]:
    p = f'pacchetti/{citta}/dati/luoghi.json'
    raw = json.load(open(p, encoding='utf-8'))
    luoghi = raw['luoghi'] if isinstance(raw, dict) else raw
    prop = json.load(open(f'docs/nomi/{citta}.json', encoding='utf-8'))
    try:
        dec = json.load(open(f'docs/nomi/{citta}_da_decidere.json', encoding='utf-8'))
    except FileNotFoundError:
        dec = {}
    try:
        man = json.load(open(f'docs/nomi/{citta}_manuali.json', encoding='utf-8'))
    except FileNotFoundError:
        man = {}
    n = 0
    for l in luoghi:
        l.pop('nomi', None)
        v = prop.get(l['id'])
        if not v:
            continue
        nomi = nomi_di(l['id'], l['nome'], v, dec, man)
        diversi = {k: nomi[k] for k in L if nomi[k] != l['nome']}
        if diversi:
            # la chiave contiene tutte le lingue, così il motore non deve ripiegare su altre
            l['nomi'] = {k: nomi[k] for k in L}
            n += 1
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(citta, 'luoghi con nomi tradotti:', n, 'su', len(luoghi))
