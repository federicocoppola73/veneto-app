#!/usr/bin/env python3
"""Proposte di nome nelle 5 lingue per i luoghi "da decidere" (docs/nomi/<città>.json, tipo = da decidere).
Scrive docs/nomi/<città>_da_decidere.md e docs/nomi/<città>_da_decidere.json. Le proposte sono da rivedere."""
import json
import sys

L = ('en', 'fr', 'de', 'es')
tutte = lambda x: (x, x, x, x)
pal = lambda x: tutte(f'Palazzo {x}')  # Palazzo e Piazza restano in italiano in tutte le lingue
villa = lambda x: tutte(f'Villa {x}')
piazza = lambda x: tutte(f'Piazza {x}')
ponte = lambda x: (f'{x} Bridge', f'Pont {x}', f'{x}-Brücke', f'Puente {x}')
porta = lambda x: (f'{x} Gate', f'Porte {x}', f'{x}-Tor', f'Puerta {x}')
torre = lambda x: (f'{x} Tower', f'Tour {x}', f'{x}-Turm', f'Torre {x}')
giardini = lambda x: (f'{x} Gardens', f'Jardins {x}', f'{x}-Gärten', f'Jardines {x}')
giardino = lambda x: (f'{x} Garden', f'Jardin {x}', f'{x}-Garten', f'Jardín {x}')
parco = lambda x: (f'{x} Park', f'Parc {x}', f'{x}-Park', f'Parque {x}')
museo = lambda x: (f'{x} Museum', f'Musée {x}', f'Museum {x}', f'Museo {x}')
M = {  # id -> 4 forme (en, fr, de, es); gli id non elencati qui sono nel dizionario per città
    'padova': {
        'museo-della-natura-e-dell-uomo': ('Museum of Nature and Man', "Musée de la Nature et de l'Homme", 'Museum für Natur und Mensch', 'Museo de la Naturaleza y del Hombre'),
        'giardini-dell-arena': ('Arena Gardens', "Jardins de l'Arena", 'Arena-Gärten', 'Jardines de la Arena'),
        'battistero-della-cattedrale': ('Baptistery of the Cathedral', 'Baptistère de la cathédrale', 'Baptisterium der Kathedrale', 'Baptisterio de la catedral'),
        'giardino-treves-de-bonfili': giardino("Treves de' Bonfili"),
        'museo-bottacin': museo('Bottacin')[:3] + ('Museo Bottacin',),
        'palazzo-moroni': pal('Moroni'), 'palazzo-maldura': pal('Maldura'),
        'ponte-delle-torricelle': ('Torricelle Bridge', 'Pont des Torricelle', 'Torricelle-Brücke', 'Puente de las Torricelle'),
        'piazza-della-frutta': piazza('della Frutta'), 'piazza-del-santo': piazza('del Santo'), 'piazza-eremitani': piazza('Eremitani'),
        'piazza-garibaldi': piazza('Garibaldi'), 'piazza-antenore': piazza('Antenore'),
        'torre-degli-anziani': ('Tower of the Anziani', 'Tour des Anziani', 'Turm der Anziani', 'Torre de los Anziani'),
        'porta-altinate': porta('Altinate'), 'porta-savonarola': porta('Savonarola'),
        'palazzo-zuckermann-museo-di-arti-applicate-e-decorative': ('Palazzo Zuckermann – Museum of Applied and Decorative Arts', 'Palazzo Zuckermann – Musée des arts appliqués et décoratifs', 'Palazzo Zuckermann – Museum für angewandte und dekorative Kunst', 'Palazzo Zuckermann – Museo de Artes Aplicadas y Decorativas'),
        'palazzo-della-cassa-di-risparmio': pal('della Cassa di Risparmio'),
        'giardino-della-rotonda': ('Rotonda Garden', 'Jardin de la Rotonda', 'Rotonda-Garten', 'Jardín de la Rotonda'),
        'museo-del-risorgimento-e-dell-eta-contemporanea': ('Museum of the Risorgimento and the Contemporary Age', "Musée du Risorgimento et de l'époque contemporaine", 'Museum des Risorgimento und der Zeitgeschichte', 'Museo del Risorgimento y de la Edad Contemporánea'),
        'ponte-dei-quattro-papi': ('Bridge of the Four Popes', 'Pont des Quatre Papes', 'Brücke der vier Päpste', 'Puente de los Cuatro Papas'),
        'ponte-della-morte': ('Bridge of Death', 'Pont de la Mort', 'Todesbrücke', 'Puente de la Muerte'),
        'museo-antoniano': ('Antonian Museum', 'Musée antonien', 'Antonianisches Museum', 'Museo Antoniano'),
    },
    'verona': {
        'palazzo-della-ragione': pal('della Ragione'), 'palazzo-del-capitanio': pal('del Capitanio'), 'palazzo-del-podesta': pal('del Podestà'),
        'ponte-scaligero': ('Scaliger Bridge', 'Pont Scaliger', 'Scaligerbrücke', 'Puente Scaligero'),
        'ponte-navi': ponte('Navi'), 'giardini-pradaval': giardini('Pradaval'), 'giardini-cesare-lombroso': giardini('Cesare Lombroso'),
        'museo-degli-affreschi-g-b-cavalcaselle': ('G.B. Cavalcaselle Frescoes Museum', 'Musée des fresques G.B. Cavalcaselle', 'G.B. Cavalcaselle Freskenmuseum', 'Museo de los Frescos G.B. Cavalcaselle'),
        'museo-miniscalchi-erizzo': ('Miniscalchi-Erizzo Museum', 'Musée Miniscalchi-Erizzo', 'Museum Miniscalchi-Erizzo', 'Museo Miniscalchi-Erizzo'),
        'cimitero-monumentale': ('Monumental Cemetery', 'Cimetière monumental', 'Monumentalfriedhof', 'Cementerio Monumental'),
        'loggia-del-consiglio': tutte('Loggia del Consiglio'),
        'museo-archeologico-nazionale-di-verona': ('National Archaeological Museum', 'Musée archéologique national', 'Archäologisches Nationalmuseum', 'Museo Arqueológico Nacional'),
        'museo-africano': ('African Museum', 'Musée africain', 'Afrikanisches Museum', 'Museo Africano'),
        'ponte-aleardi': ponte('Aleardi'), 'piazza-indipendenza': piazza('Indipendenza'),
        'teatro-romano': ('Roman Theatre', 'Théâtre romain', 'Römisches Theater', 'Teatro Romano'),
        'ponte-garibaldi': ponte('Garibaldi'),
        'ponte-della-vittoria': ('Victory Bridge', 'Pont de la Victoire', 'Siegesbrücke', 'Puente de la Victoria'),
        'torre-dell-abbazia': ('Abbey Tower', "Tour de l'Abbaye", 'Abteiturm', 'Torre de la Abadía'),
        'giardini-della-giarina': ('Giarina Gardens', 'Jardins de la Giarina', 'Giarina-Gärten', 'Jardines de la Giarina'),
    },
    'vicenza': {
        'villa-la-rotonda': villa('La Rotonda'), 'piazza-delle-erbe': piazza('delle Erbe'), 'piazza-matteotti': piazza('Matteotti'),
        'palazzo-chiericati-museo-civico': ('Palazzo Chiericati (Civic Museum)', 'Palazzo Chiericati (Musée civique)', 'Palazzo Chiericati (Städtisches Museum)', 'Palazzo Chiericati (Museo Cívico)'),
        'loggia-del-capitaniato': tutte('Loggia del Capitaniato'),
        'parco-querini': parco('Querini'), 'giardini-salvi': giardini('Salvi'),
        'museo-naturalistico-e-archeologico': ('Museum of Natural History and Archaeology of Santa Corona', 'Musée naturaliste et archéologique de Santa Corona', 'Naturkundliches und Archäologisches Museum Santa Corona', 'Museo Naturalístico y Arqueológico de Santa Corona'),
        'museo-diocesano': ('Diocesan Museum', 'Musée diocésain', 'Diözesanmuseum', 'Museo Diocesano'),
        'museo-del-gioiello': ('Jewellery Museum', 'Musée du bijou', 'Schmuckmuseum', 'Museo de la Joya'),
        'museo-del-risorgimento-e-della-resistenza-villa-guiccioli': ('Museum of the Risorgimento and the Resistance – Villa Guiccioli', 'Musée du Risorgimento et de la Résistance – Villa Guiccioli', 'Museum des Risorgimento und der Resistenza – Villa Guiccioli', 'Museo del Risorgimento y de la Resistencia – Villa Guiccioli'),
        'palazzo-cordellina': pal('Cordellina'), 'ponte-furo': ponte('Furo'), 'ponte-pusterla': ponte('Pusterla'),
        'torre-del-tormento': ('Tower of Torment', 'Tour du Tourment', 'Turm der Qual', 'Torre del Tormento'),
        'torre-dei-coxina': tutte('Torre dei Coxina'), 'torre-dei-loschi': tutte('Torre dei Loschi'),
        'loggia-valmarana': tutte('Loggia Valmarana'),
        'palazzo-da-monte-migliorini': pal('da Monte Migliorini'), 'palazzo-capra': pal('Capra'),
        'palazzo-trissino-al-duomo': pal('Trissino al Duomo'), 'palazzo-trissino-al-corso': pal('Trissino al Corso'),
        'palazzo-loschi-zileri-dal-verme': pal('Loschi Zileri dal Verme'), 'palazzo-bonin-schiavetto': pal('Bonin Schiavetto'),
    },
    'treviso': {
        'piazza-indipendenza': piazza('Indipendenza'),
        'palazzo-del-podesta-e-torre-civica': ('Palazzo del Podestà and Civic Tower', 'Palazzo del Podestà et Tour civique', 'Palazzo del Podestà und Stadtturm', 'Palazzo del Podestà y Torre Cívica'),
        'palazzo-bomben': pal('Bomben'),
        'parco-delle-mura': ('Walls Park', 'Parc des Remparts', 'Stadtmauerpark', 'Parque de las Murallas'),
        'museo-luigi-bailo': ('Luigi Bailo Museum', 'Musée Luigi Bailo', 'Museum Luigi Bailo', 'Museo Luigi Bailo'),
        'parco-dello-storga': ('Storga Park', 'Parc de la Storga', 'Storga-Park', 'Parque de la Storga'),
        'porta-altinia': porta('Altinia'), 'palazzo-zuccareda': pal('Zuccareda'), 'ponte-dante': ponte('Dante'),
        'museo-diocesano-di-treviso': ('Diocesan Museum of Treviso', 'Musée diocésain de Trévise', 'Diözesanmuseum Treviso', 'Museo Diocesano de Treviso'),
        'museo-etnografico-case-piavone': ('Ethnographic Museum of Case Piavone', 'Musée ethnographique de Case Piavone', 'Ethnographisches Museum Case Piavone', 'Museo Etnográfico de Case Piavone'),
        'museo-nazionale-collezione-salce': ('Salce Collection National Museum', 'Musée national Collection Salce', 'Nationalmuseum Sammlung Salce', 'Museo Nacional Colección Salce'),
        'ponte-de-pria': tutte('Ponte de Pria'), 'palazzo-giacomelli': pal('Giacomelli'),
    },
    'rovigo': {
        'piazza-vittorio-emanuele-ii': piazza('Vittorio Emanuele II'), 'piazza-giuseppe-garibaldi': piazza('Giuseppe Garibaldi'),
        'piazza-umberto-merlin': ('Piazza Umberto Merlin (former Jewish Ghetto)', 'Piazza Umberto Merlin (ancien ghetto juif)', 'Piazza Umberto Merlin (ehemaliges jüdisches Ghetto)', 'Piazza Umberto Merlin (antiguo gueto judío)'),
        'piazza-tien-an-men': piazza('Tien An Men'),
        'palazzo-roncale': pal('Roncale'), 'teatro-sociale': tutte('Teatro Sociale'),
        'museo-dei-grandi-fiumi': ('Great Rivers Museum', 'Musée des Grands Fleuves', 'Museum der großen Flüsse', 'Museo de los Grandes Ríos'),
        'loggia-dei-nodari': ('Loggia dei Nodari (Town Hall)', 'Loggia dei Nodari (Hôtel de ville)', 'Loggia dei Nodari (Rathaus)', 'Loggia dei Nodari (Ayuntamiento)'),
        'chiesa-santi-francesco-e-giustina': ('Church of Santi Francesco e Giustina', 'Église des Santi Francesco e Giustina', 'Kirche Santi Francesco e Giustina', 'Iglesia de los Santi Francesco e Giustina'),
        'torre-pighin': torre('Pighin'),
        'cimitero-ebraico': ('Jewish Cemetery of Rovigo', 'Cimetière juif de Rovigo', 'Jüdischer Friedhof Rovigo', 'Cementerio judío de Rovigo'),
        'palazzo-silvestri': pal('Silvestri'), 'palazzo-gran-guardia': pal('della Gran Guardia'), 'palazzo-angeli': pal('Angeli'),
        'palazzo-venezze': pal('Venezze'), 'palazzo-manfredini': pal('Manfredini'), 'palazzo-pretorio': pal('Pretorio'),
        'palazzo-poste-telegrafi': tutte('Palazzo delle Poste e Telegrafi'),
        'palazzo-vescovile-vescovado-vecchio': tutte('Palazzo Vescovile (Vescovado Vecchio)'),
        'oratorio-santissima-concezione': ('Oratory of the Santissima Concezione (Chiesetta del Cristo)', 'Oratoire de la Santissima Concezione (Chiesetta del Cristo)', 'Oratorium Santissima Concezione (Chiesetta del Cristo)', 'Oratorio de la Santissima Concezione (Chiesetta del Cristo)'),
        'cimitero-monumentale-rovigo': ('Monumental Cemetery of Rovigo', 'Cimetière monumental de Rovigo', 'Monumentalfriedhof Rovigo', 'Cementerio monumental de Rovigo'),
        'fontana-della-riconoscenza': ('Fountain of Gratitude', 'Fontaine de la Reconnaissance', 'Brunnen der Dankbarkeit', 'Fuente de la Gratitud'),
        'oratorio-beata-vergine-pompei': ('Oratory of the Blessed Virgin of Pompeii', 'Oratoire de la Bienheureuse Vierge de Pompéi', 'Oratorium der Seligen Jungfrau von Pompeji', 'Oratorio de la Beata Virgen de Pompeya'),
    },
    'belluno': {
        'piazza-dei-martiri': piazza('dei Martiri'), 'piazza-duomo': piazza('Duomo'), 'piazza-delle-erbe': piazza('delle Erbe'),
        'battistero-del-duomo': ('Cathedral Baptistery', 'Baptistère de la cathédrale', 'Baptisterium des Doms', 'Baptisterio de la catedral'),
        'palazzo-dei-rettori': pal('dei Rettori'), 'palazzo-rosso': pal('Rosso'),
        'porta-dojona': porta('Dojona'), 'porta-rugo': porta('Rugo'), 'porta-dante': porta('Dante'),
        'ponte-degli-alpini': ('Alpini Bridge', 'Pont des Alpini', 'Alpini-Brücke', 'Puente de los Alpini'),
        'museo-archeologico-palazzo-dei-giuristi': ('Archaeological Museum (Palazzo dei Giuristi)', 'Musée archéologique (Palazzo dei Giuristi)', 'Archäologisches Museum (Palazzo dei Giuristi)', 'Museo Arqueológico (Palazzo dei Giuristi)'),
        'teatro-comunale-dino-buzzati': ('Dino Buzzati Municipal Theatre', 'Théâtre municipal Dino Buzzati', 'Städtisches Theater Dino Buzzati', 'Teatro Municipal Dino Buzzati'),
        'palazzo-nossadani': pal('Nossadani'),
        'loggia-dei-ghibellini': tutte('Loggia dei Ghibellini (Palazzo Costantini)'),
        'fontana-della-motta': ('Motta Fountain', 'Fontaine de la Motta', 'Motta-Brunnen', 'Fuente de la Motta'),
        'ponte-zilli': ('Zilli Bridge (Pontet)', 'Pont Zilli (Pontet)', 'Zilli-Brücke (Pontet)', 'Puente Zilli (Pontet)'),
        'palazzo-persicini-crocecalle': pal('Persicini-Crocecalle'), 'palazzo-trois-malaspina': pal('Trois-Malaspina'),
        'villa-vescovile-del-belvedere': ('Belvedere Episcopal Villa', 'Villa épiscopale du Belvédère', 'Bischöfliche Villa del Belvedere', 'Villa Episcopal del Belvedere'),
        'villa-buzzati-traverso': villa('Buzzati-Traverso'),
    },
}

for citta in sys.argv[1:]:
    d = json.load(open(f'docs/nomi/{citta}.json', encoding='utf-8'))
    da = [(k, v['nome']) for k, v in d.items() if v['tipo'] == 'da decidere']
    mancanti = [k for k, _ in da if k not in M[citta]]
    if mancanti:
        sys.exit(f'{citta}: mancano {mancanti}')
    prop = {k: dict(zip(L, M[citta][k])) for k, _ in da}
    json.dump(prop, open(f'docs/nomi/{citta}_da_decidere.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    r = [f'# {citta.capitalize()}: nomi da decidere (proposta)', '',
         'Regola: si traduce il genere (ponte, giardini, museo…) e si tiene il nome proprio; palazzi e ville di famiglia con Palazzo/Palais/Palacio;',
         'piazze e logge restano in italiano; i nomi di musei e luoghi descrittivi sono tradotti per intero.', '',
         '| id | Italiano | EN | FR | DE | ES |', '|---|---|---|---|---|---|']
    for k, nome in da:
        r.append(f'| {k} | {nome} | ' + ' | '.join(prop[k][l] for l in L) + ' |')
    open(f'docs/nomi/{citta}_da_decidere.md', 'w', encoding='utf-8').write('\n'.join(r) + '\n')
    print(citta, len(da))
