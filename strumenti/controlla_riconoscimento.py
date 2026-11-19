#!/usr/bin/env python3
"""Controlla la coerenza tra indice.json e fotografie di riferimento.

Uso dalla radice del repository:
  python strumenti/controlla_riconoscimento.py
  python strumenti/controlla_riconoscimento.py --citta padova
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CITTA_DEFAULT = "padova"
ESTENSIONI = {".jpg", ".jpeg", ".webp", ".png"}


def controlla(citta: str) -> int:
    base = ROOT / "riconoscimento" / citta
    indice_path = base / "indice.json"
    immagini_root = base / "immagini"

    if not indice_path.is_file():
        print(f"ERRORE: indice non trovato: {indice_path}")
        return 2
    if not immagini_root.is_dir():
        print(f"ERRORE: cartella immagini non trovata: {immagini_root}")
        return 2

    try:
        indice = json.loads(indice_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERRORE: impossibile leggere indice.json: {exc}")
        return 2

    luoghi = indice.get("luoghi")
    if not isinstance(luoghi, list):
        print("ERRORE: 'luoghi' deve essere un array.")
        return 2

    errori: list[str] = []
    avvisi: list[str] = []
    riferimenti: set[str] = set()
    ids: set[str] = set()
    totale = 0
    attivi = 0

    for luogo in luoghi:
        if not isinstance(luogo, dict):
            errori.append("Elemento non valido nell'array 'luoghi'.")
            continue
        luogo_id = luogo.get("id")
        immagini = luogo.get("immagini")
        if not isinstance(luogo_id, str) or not luogo_id:
            errori.append("Trovato luogo senza ID valido.")
            continue
        if luogo_id in ids:
            errori.append(f"ID luogo duplicato: {luogo_id}")
        ids.add(luogo_id)
        if not isinstance(immagini, list):
            errori.append(f"{luogo_id}: 'immagini' deve essere un array.")
            continue
        if immagini:
            attivi += 1
        viste: set[str] = set()
        for relativo in immagini:
            if not isinstance(relativo, str) or not relativo:
                errori.append(f"{luogo_id}: percorso immagine non valido: {relativo!r}")
                continue
            if relativo in viste:
                errori.append(f"{luogo_id}: percorso duplicato nell'indice: {relativo}")
            viste.add(relativo)
            if relativo in riferimenti:
                errori.append(f"Percorso associato più volte: {relativo}")
            riferimenti.add(relativo)
            file_path = immagini_root / relativo
            try:
                file_path.resolve().relative_to(immagini_root.resolve())
            except ValueError:
                errori.append(f"Percorso fuori dalla cartella immagini: {relativo}")
                continue
            if file_path.suffix.lower() not in ESTENSIONI:
                avvisi.append(f"Estensione non standard: {relativo}")
            if not file_path.is_file():
                errori.append(f"File indicato nell'indice ma assente: {relativo}")
            totale += 1

    presenti = {
        p.relative_to(immagini_root).as_posix()
        for p in immagini_root.rglob("*")
        if p.is_file() and p.suffix.lower() in ESTENSIONI
    }
    for relativo in sorted(presenti - riferimenti):
        avvisi.append(f"Foto presente ma non registrata nell'indice: {relativo}")

    print(f"Dataset: {citta}")
    print(f"Luoghi nell'indice: {len(ids)}")
    print(f"Luoghi con almeno una foto: {attivi}")
    print(f"Foto registrate: {totale}")
    print(f"Foto trovate nelle cartelle: {len(presenti)}")
    print(f"Errori: {len(errori)} | Avvisi: {len(avvisi)}")
    for voce in errori:
        print(f"ERRORE: {voce}")
    for voce in avvisi:
        print(f"AVVISO: {voce}")
    return 1 if errori else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--citta", default=CITTA_DEFAULT, help="ID città (default: padova)")
    args = parser.parse_args()
    raise SystemExit(controlla(args.citta))
