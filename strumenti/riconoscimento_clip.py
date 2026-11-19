#!/usr/bin/env python3
"""Crea un indice CLIP locale e confronta una foto con il catalogo.

Dipendenze: pip install -r strumenti/requirements-riconoscimento.txt

Esempi dalla radice del repository:
  python strumenti/riconoscimento_clip.py build --citta padova
  python strumenti/riconoscimento_clip.py query foto_turista.jpg --citta padova

Il programma non invia immagini in rete. I pesi del modello vengono scaricati
da open_clip la prima volta e poi riutilizzati dalla cache locale.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
import open_clip
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
MODEL_NAME = "ViT-B-32"
PRETRAINED = "laion2b_s34b_b79k"


def carica_modello(device: str):
    model, _, preprocess = open_clip.create_model_and_transforms(
        MODEL_NAME, pretrained=PRETRAINED, device=device
    )
    model.eval()
    return model, preprocess


def apri_immagine(path: Path) -> Image.Image:
    with Image.open(path) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


def embedding_file(path: Path, model, preprocess, device: str) -> np.ndarray:
    image = apri_immagine(path)
    tensor = preprocess(image).unsqueeze(0).to(device)
    with torch.inference_mode():
        vector = model.encode_image(tensor)
        vector = vector / vector.norm(dim=-1, keepdim=True)
    return vector.cpu().numpy()[0].astype(np.float32)


def percorsi_dataset(citta: str):
    base = ROOT / "riconoscimento" / citta
    indice_path = base / "indice.json"
    immagini_root = base / "immagini"
    if not indice_path.is_file():
        raise SystemExit(f"Indice non trovato: {indice_path}")
    indice = json.loads(indice_path.read_text(encoding="utf-8"))
    records = []
    for luogo in indice.get("luoghi", []):
        luogo_id = luogo["id"]
        for relativo in luogo.get("immagini", []):
            path = (immagini_root / relativo).resolve()
            try:
                path.relative_to(immagini_root.resolve())
            except ValueError:
                raise SystemExit(f"Percorso non consentito nell'indice: {relativo}")
            records.append((luogo_id, relativo, path))
    return base, records


def build(args):
    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    base, records = percorsi_dataset(args.citta)
    model, preprocess = carica_modello(device)
    vectors, valid = [], []
    errors = []
    for i, (luogo_id, relativo, path) in enumerate(records, 1):
        try:
            if not path.is_file():
                raise FileNotFoundError(path)
            vectors.append(embedding_file(path, model, preprocess, device))
            valid.append({"id": luogo_id, "file": relativo})
        except (OSError, UnidentifiedImageError, ValueError) as exc:
            errors.append({"file": relativo, "errore": str(exc)})
        print(f"\rElaborazione {i}/{len(records)}", end="", flush=True)
    print()
    if not vectors:
        raise SystemExit("Nessuna immagine valida: indice non creato.")
    out = base / "indice_clip"
    out.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(out / "embeddings.npz", embeddings=np.stack(vectors))
    metadata = {
        "versione": 1,
        "modello": MODEL_NAME,
        "pesi": PRETRAINED,
        "normalizzati": True,
        "record": valid,
        "errori": errors,
    }
    (out / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Indice creato: {out}")
    print(f"Immagini indicizzate: {len(valid)} | errori: {len(errors)}")
    print("I file indice_clip/ sono locali: non vengono caricati su GitHub.")


def query(args):
    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    base, _ = percorsi_dataset(args.citta)
    out = base / "indice_clip"
    metadata_path, vectors_path = out / "metadata.json", out / "embeddings.npz"
    if not metadata_path.is_file() or not vectors_path.is_file():
        raise SystemExit("Indice CLIP assente. Esegui prima il comando build.")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("modello") != MODEL_NAME or metadata.get("pesi") != PRETRAINED:
        raise SystemExit("Il modello dell'indice non coincide con quello dello script.")
    data = np.load(vectors_path)
    vectors = data["embeddings"]
    records = metadata["record"]
    if len(records) != len(vectors):
        raise SystemExit("Metadata e matrice embedding hanno dimensioni diverse.")
    model, preprocess = carica_modello(device)
    query_vector = embedding_file(Path(args.foto), model, preprocess, device)
    similarities = vectors @ query_vector
    best_by_place: dict[str, float] = {}
    for record, score in zip(records, similarities):
        place_id = record["id"]
        best_by_place[place_id] = max(best_by_place.get(place_id, -1.0), float(score))
    ranking = sorted(best_by_place.items(), key=lambda item: item[1], reverse=True)
    print("Classifica preliminare (similarità coseno; non è una probabilità):")
    for place_id, score in ranking[: args.top]:
        print(f"{score:.4f}  {place_id}")
    if ranking:
        print("\nNota: le soglie di riconoscimento/rifiuto vanno calibrate su foto di test indipendenti.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    build_parser = sub.add_parser("build", help="genera l'indice locale")
    build_parser.add_argument("--citta", default="padova")
    build_parser.add_argument("--device", choices=("cpu", "cuda"))
    build_parser.set_defaults(func=build)
    query_parser = sub.add_parser("query", help="confronta una foto con l'indice")
    query_parser.add_argument("foto", help="percorso della foto da riconoscere")
    query_parser.add_argument("--citta", default="padova")
    query_parser.add_argument("--top", type=int, default=5)
    query_parser.add_argument("--device", choices=("cpu", "cuda"))
    query_parser.set_defaults(func=query)
    args = parser.parse_args()
    if getattr(args, "top", 1) < 1:
        parser.error("--top deve essere almeno 1")
    args.func(args)


if __name__ == "__main__":
    main()
