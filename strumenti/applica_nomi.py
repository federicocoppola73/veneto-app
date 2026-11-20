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
from nomi_wikipedia import GENERICI, per_regola  # noqa: E402

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


def nomi_di(id_, nome, v, dec):
    if id_ in dec:
        return dec[id_]
    if nome.lower().startswith(SOLO_ITALIANO) and id_ not in ESCLUSI:
        return {k: nome for k in L}
    if v['tipo'] == 'wikipedia' and pulito(v, nome):
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
    n = 0
    for l in luoghi:
        l.pop('nomi', None)
        v = prop.get(l['id'])
        if not v:
            continue
        nomi = nomi_di(l['id'], l['nome'], v, dec)
        diversi = {k: nomi[k] for k in L if nomi[k] != l['nome']}
        if diversi:
            # la chiave contiene tutte le lingue, così il motore non deve ripiegare su altre
            l['nomi'] = {k: nomi[k] for k in L}
            n += 1
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(citta, 'luoghi con nomi tradotti:', n, 'su', len(luoghi))
