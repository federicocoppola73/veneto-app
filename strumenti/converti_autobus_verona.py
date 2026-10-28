#!/usr/bin/env python3
"""Converte linee e orari ATV di Verona nel formato del motore (autobus.json e orari_autobus.json).

Uso: python3 strumenti/converti_autobus_verona.py <cartella_dati_verona_app> <pacchetti/verona/dati>

Legge da <cartella_dati_verona_app>: orari_linee.json (percorsi delle linee) e orari_fermate.json
(orari per fermata). Le fermate sono quelle di servizi.json (id autobus-N), già nel pacchetto.
Scrive in <pacchetti/verona/dati>: autobus.json e orari_autobus.json.
"""
import json
import os
import re
import sys
import unicodedata

VALIDITA = ['20261025', '20261124']  # dal feed ATV in orari_fermate.json
COLORE_DEFAULT = '#0B6BB7'
URL_ORARI_ATV = 'https://www.atv.verona.it/orari-urbani/dettaglio-percorsi-orari-pdf'
# giorni di servizio: indice nella lista "servizi" di orari_autobus.json
SERVIZI = [
    {'giorni': '1111100', 'da': VALIDITA[0], 'a': VALIDITA[1]},  # feriale: lun-ven
    {'giorni': '0000010', 'da': VALIDITA[0], 'a': VALIDITA[1]},  # sabato
    {'giorni': '0000001', 'da': VALIDITA[0], 'a': VALIDITA[1]},  # domenica e festivi
]
INDICE_GIORNO = {'feriale': 0, 'sabato': 1, 'festivo': 2}


def normalizza(nome):
    s = unicodedata.normalize('NFKD', nome or '').encode('ascii', 'ignore').decode().lower()
    return ''.join(c if c.isalnum() else ' ' for c in s).split()


def chiave(nome):
    # via i codici finali delle paline GTFS (I, II, IV, D1, B2...): "Via Galvani II" -> "via galvani"
    parole = normalizza(nome)
    while parole and (re.fullmatch(r'[ivx]+', parole[-1]) or re.fullmatch(r'[a-z]\d+', parole[-1]) or parole[-1].isdigit()):
        parole = parole[:-1]
    return ' '.join(parole)


def minuti(orario):
    h, m = orario.split(':')
    return int(h) * 60 + int(m)


def base36(n):
    cifre = '0123456789abcdefghijklmnopqrstuvwxyz'
    if n == 0:
        return '0'
    out = ''
    while n:
        n, r = divmod(n, 36)
        out = cifre[r] + out
    return out


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    sorgente, dati = sys.argv[1], sys.argv[2]
    linee_src = json.load(open(os.path.join(sorgente, 'orari_linee.json'), encoding='utf-8'))['linee']
    fermate_src = json.load(open(os.path.join(sorgente, 'orari_fermate.json'), encoding='utf-8'))['fermate']
    servizi = json.load(open(os.path.join(dati, 'servizi.json'), encoding='utf-8'))['servizi']
    fermate_servizi = {s['id']: s for s in servizi if s['tipo'] == 'autobus'}

    # nome normalizzato -> id fermata (solo nomi univoci)
    per_nome = {}
    for s in fermate_servizi.values():
        per_nome.setdefault(chiave(s.get('nome', '')), []).append(s['id'])
    # per ogni fermata, le coppie (linea, direzione) che la servono (da orari_fermate.json)
    righe_per_fermata = {fid: {(r['linea'], r['direzione']) for r in d.get('linee', [])} for fid, d in fermate_src.items()}
    def id_fermata(nome, linea, direzione):
        ids = per_nome.get(chiave(nome), [])
        if len(ids) == 1:
            return ids[0]
        # nomi uguali (es. due Piazza Bra Arena): la fermata giusta è quella che serve questa linea e direzione
        ok = [i for i in ids if (linea, direzione) in righe_per_fermata.get(i, set())]
        if not ok:
            # nel feed la direzione delle righe orario spesso non è il nome della corsa (es. la stazione):
            # si prende la palina che ha almeno un orario di questa linea, quella con più orari
            per_linea = [i for i in ids if any(l == linea for l, _ in righe_per_fermata.get(i, set()))]
            ok = sorted(per_linea, key=lambda i: -sum(1 for l, _ in righe_per_fermata[i] if l == linea))
        return ok[0] if ok else None

    linee_out = []
    fermata_linee = {}
    direzioni_per_linea = {}
    non_trovate = 0
    totale_nomi = 0
    for linea, corse in linee_src.items():
        # due sensi di marcia per linea (come sui PDF ATV): ogni percorso va nel senso del percorso più lungo
        # che ha le stesse fermate in ordine avanti o indietro; le varianti dello stesso senso si fondono
        unici = list(dict.fromkeys((c['direzione'], tuple(c['fermate'])) for c in corse))
        idx_dir = {}
        direzioni = []
        if unici:
            riferimento = max(unici, key=lambda k: len(k[1]))[1]
            pos_rif = {n: i for i, n in enumerate(riferimento)}

            def senso(fermate):
                comuni = [pos_rif[n] for n in fermate if n in pos_rif]
                avanti = sum(1 for a, b in zip(comuni, comuni[1:]) if b > a)
                indietro = sum(1 for a, b in zip(comuni, comuni[1:]) if b < a)
                return 0 if avanti >= indietro else 1

            per_senso = {0: [], 1: []}
            for nome_c, fermate_c in unici:
                per_senso[senso(fermate_c)].append((nome_c, fermate_c))
            sensi = [x for x in (0, 1) if per_senso[x]]
            idx_senso = {x: i for i, x in enumerate(sensi)}
            # ogni nome di corsa va nel senso della corsa più lunga che lo porta
            senso_nome = {}
            for nome_c, fermate_c in sorted(unici, key=lambda k: -len(k[1])):
                senso_nome.setdefault(nome_c, senso(fermate_c))
            for x in sensi:
                nome_dir, fermate_dir = max(per_senso[x], key=lambda k: len(k[1]))
                fermate_ids = []
                for nome in fermate_dir:
                    totale_nomi += 1
                    fid = id_fermata(nome, linea, nome_dir)
                    if fid is None:
                        non_trovate += 1
                        continue
                    if fid not in fermate_ids:
                        fermate_ids.append(fid)
                        fermata_linee.setdefault(fid, [])
                        if f'AUT-{linea}' not in fermata_linee[fid]:
                            fermata_linee[fid].append(f'AUT-{linea}')
                direzioni.append({'direzione': idx_senso[x], 'circolare': False, 'fermate': fermate_ids, 'richiesta': []})
            for nome_c, x in senso_nome.items():
                idx_dir[nome_c] = idx_senso[x]
        direzioni_per_linea[linea] = idx_dir
        url = URL_ORARI_ATV  # pagina generica ATV: i PDF per linea non sono chiari
        linee_out.append({
            'id': f'AUT-{linea}', 'etichetta': linea, 'mezzo': 'autobus', 'colore': COLORE_DEFAULT,
            'testo': '#FFFFFF', 'notturna': False, 'pdf': url, 'direzioni': direzioni,
        })

    # orari: orari[fermata][linea][direzione] = [[indici servizi], "minuti in base 36,..."]
    orari = {}
    righe_senza_direzione = 0
    for fid, dati_f in fermate_src.items():
        if fid not in fermate_servizi:
            continue
        gruppi = {}  # (linea, direzione, giorno) -> [minuti]
        for riga in dati_f.get('linee', []):
            linea = riga['linea']
            dirs = direzioni_per_linea.get(linea, {})
            if riga['direzione'] not in dirs:
                righe_senza_direzione += 1
                continue
            giorno = INDICE_GIORNO.get(riga.get('giorno'))
            if giorno is None:
                continue
            gruppi.setdefault((linea, dirs[riga['direzione']], giorno), []).extend(minuti(o) for o in riga.get('orari', []))
        if not gruppi:
            continue
        per_linea = {}
        for (linea, direzione, giorno), mins in gruppi.items():
            testo = ','.join(base36(m) for m in sorted(set(mins)))
            per_linea.setdefault(f'AUT-{linea}', {}).setdefault(str(direzione), []).append([[giorno], testo])
        orari[fid] = per_linea

    # le linee che passano da una fermata: dalle righe degli orari (id esatto della fermata)
    fermata_linee = {}
    for fid, dati_f in fermate_src.items():
        if fid not in fermate_servizi:
            continue
        for riga in dati_f.get('linee', []):
            lid = f"AUT-{riga['linea']}"
            elenco = fermata_linee.setdefault(fid, [])
            if lid not in elenco:
                elenco.append(lid)

    fermate_out = {}
    for fid, s in fermate_servizi.items():
        fermate_out[fid] = {'nome': s.get('nome') or fid, 'lat': s['lat'], 'lon': s['lon'], 'linee': fermata_linee.get(fid, [])}

    autobus = {
        '_nota': 'Verona: linee e fermate ATV, dal feed GTFS (orari_fermate.json e orari_linee.json). Generato da strumenti/converti_autobus_verona.py.',
        'validita': VALIDITA,
        'linee': linee_out,
        'fermate': fermate_out,
        'fermataLinee': fermata_linee,
    }
    orari_out = {
        '_nota': 'Verona: orari ATV (feriale, sabato, festivo), validità 25 ottobre - 24 novembre 2026. Verificare sul sito ATV.',
        'validita': VALIDITA,
        'servizi': SERVIZI,
        'date': {},
        'capolinea': [],
        'orari': orari,
    }
    json.dump(autobus, open(os.path.join(dati, 'autobus.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(orari_out, open(os.path.join(dati, 'orari_autobus.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'linee: {len(linee_out)}, fermate con linee: {len(fermata_linee)}, fermate con orari: {len(orari)}')
    print(f'nomi di fermata non trovati nei servizi: {non_trovate} su {totale_nomi}; righe orari senza direzione: {righe_senza_direzione}')


if __name__ == '__main__':
    main()
