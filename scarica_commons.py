import argparse
import os
import re
import time
from io import BytesIO

import requests
from PIL import Image, ImageOps

API_URL = "https://commons.wikimedia.org/w/api.php"
# Wikimedia chiede un nome del client e un contatto: scrivi qui un contatto tuo (email o sito).
USER_AGENT = "VenetoAppBot/2.0 (https://github.com/federicocoppola73/veneto-app) python-requests"
TIMEOUT = 30
RISULTATI_PER_PAGINA = 50
PAUSA_TRA_FOTO = 3  # secondi


def pulisci_nome(testo):
    """Rende il testo un nome di file valido anche su Windows."""
    testo = testo.replace("File:", "").replace(" ", "_")
    testo = re.sub(r'[<>:"/\\|?*]', "_", testo)
    return testo.strip("._")[:120]


def pulisci_html(testo):
    return re.sub(r"<[^>]+>", "", testo).strip()


def get_con_retry(sessione, url, tentativi=5, **kwargs):
    """GET che aspetta e riprova se il server risponde 429 (troppe richieste) o 503."""
    kwargs.setdefault("timeout", TIMEOUT)
    for tentativo in range(tentativi):
        risposta = sessione.get(url, **kwargs)
        if risposta.status_code not in (429, 503):
            risposta.raise_for_status()
            return risposta
        attesa = int(risposta.headers.get("Retry-After", 0)) or 10 * (tentativo + 1)
        print(f"Wikimedia chiede di rallentare, aspetto {attesa} secondi...")
        time.sleep(attesa)
    risposta.raise_for_status()
    return risposta


def scarica_una_foto(sessione, titolo, percorso, lato_massimo, dimensione_fissa, qualita):
    """Scarica, ridimensiona e salva una foto. Restituisce i dati per il report, oppure None se non è una foto."""
    risposta = get_con_retry(sessione, API_URL, params={
        "action": "query",
        "format": "json",
        "prop": "imageinfo",
        "titles": titolo,
        "iiprop": "url|user|mime|extmetadata",
    })
    pagine = risposta.json().get("query", {}).get("pages", {})

    for pagina in pagine.values():
        if "imageinfo" not in pagina:
            return None
        info = pagina["imageinfo"][0]
        mime = info.get("mime", "")
        if not mime.startswith("image/") or mime == "image/svg+xml":
            return None

        meta = info.get("extmetadata", {})
        autore = meta.get("Artist", {}).get("value", info.get("user", "Sconosciuto"))
        licenza = meta.get("LicenseShortName", {}).get("value", "Licenza non specificata")
        url_licenza = meta.get("LicenseUrl", {}).get("value", "N/D")

        dati_immagine = get_con_retry(sessione, info["url"], timeout=60).content
        img = Image.open(BytesIO(dati_immagine)).convert("RGB")

        if dimensione_fissa:
            img = ImageOps.fit(img, dimensione_fissa)    # ritaglia al centro alla misura fissa
        else:
            img.thumbnail((lato_massimo, lato_massimo))  # riduce mantenendo le proporzioni

        img.save(percorso, "JPEG", quality=qualita, optimize=True)

        return {
            "autore": pulisci_html(autore),
            "licenza": licenza,
            "url_licenza": url_licenza,
            "url_originale": info["url"],
            "dimensioni": img.size,
        }
    return None


def scarica(ricerca, numero, lato_massimo, dimensione_fissa, qualita, cartella_base):
    cartella = os.path.join(cartella_base, f"immagini_{pulisci_nome(ricerca)}")
    os.makedirs(cartella, exist_ok=True)
    percorso_report = os.path.join(cartella, "report_licenze.txt")

    sessione = requests.Session()
    sessione.headers.update({"User-Agent": USER_AGENT})

    nuove = 0
    viste = set()
    offset = 0

    with open(percorso_report, "a", encoding="utf-8") as report:
        if report.tell() == 0:
            report.write(f"REPORT CREDITI E LICENZE - Categoria: {ricerca}\n")
            report.write("=" * 60 + "\n\n")

        while nuove < numero:
            risposta = get_con_retry(sessione, API_URL, params={
                "action": "query",
                "format": "json",
                "list": "search",
                "srsearch": f"File:{ricerca}",
                "srnamespace": "6",
                "srlimit": RISULTATI_PER_PAGINA,
                "sroffset": offset,
            })
            dati = risposta.json()
            risultati = dati.get("query", {}).get("search", [])

            if not risultati:
                break

            for item in risultati:
                if nuove >= numero:
                    break

                titolo = item["title"]
                if titolo in viste:
                    continue
                viste.add(titolo)

                nome = os.path.splitext(pulisci_nome(titolo))[0] + ".jpg"
                percorso = os.path.join(cartella, nome)

                if os.path.exists(percorso):
                    print(f"Già presente, salto: {nome}")
                    continue

                try:
                    esito = scarica_una_foto(sessione, titolo, percorso,
                                             lato_massimo, dimensione_fissa, qualita)
                except Exception as e:
                    print(f"Saltata {nome}: {e}")
                    continue

                if esito is None:
                    continue

                report.write(f"File: {nome}\n")
                report.write(f"Autore/Creatore: {esito['autore']}\n")
                report.write(f"Licenza: {esito['licenza']}\n")
                report.write(f"Link Licenza: {esito['url_licenza']}\n")
                report.write(f"URL Originale: {esito['url_originale']}\n")
                report.write(f"Dimensioni salvate: {esito['dimensioni'][0]} x {esito['dimensioni'][1]} px\n")
                report.write("-" * 40 + "\n")
                report.flush()

                nuove += 1
                print(f"Scaricata ({nuove}/{numero}): {nome} - {esito['licenza']}")
                time.sleep(PAUSA_TRA_FOTO)

            if "continue" not in dati:
                break
            offset = dati["continue"]["sroffset"]

    if nuove < numero:
        print(f"Attenzione: trovate solo {nuove} foto nuove su {numero} richieste.")
    print(f"\nFatto. Report: {percorso_report}")


def main():
    p = argparse.ArgumentParser(description="Scarica foto con licenza da Wikimedia Commons, ridimensionandole.")
    p.add_argument("ricerca", help='Parola chiave, es. "Vicenza"')
    p.add_argument("numero", type=int, help="Quante foto NUOVE scaricare")
    p.add_argument("--lato", type=int, default=1200, help="Lato lungo massimo in pixel (default 1200)")
    p.add_argument("--dimensione", help="Misura fissa LARGHEZZAxALTEZZA, es. 1200x800 (ritaglia al centro)")
    p.add_argument("--qualita", type=int, default=85, help="Qualità JPEG da 1 a 95 (default 85)")
    p.add_argument("--cartella", default=".", help="Cartella in cui creare immagini_<ricerca> (default: cartella corrente)")
    args = p.parse_args()

    if args.numero < 1:
        p.error("numero deve essere almeno 1")

    dimensione_fissa = None
    if args.dimensione:
        try:
            larghezza, altezza = (int(x) for x in args.dimensione.lower().split("x"))
            dimensione_fissa = (larghezza, altezza)
        except ValueError:
            p.error("--dimensione deve avere il formato LARGHEZZAxALTEZZA, es. 1200x800")

    scarica(args.ricerca, args.numero, args.lato, dimensione_fissa, args.qualita, args.cartella)


if __name__ == "__main__":
    main()