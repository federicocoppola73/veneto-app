#!/usr/bin/env python3
"""Orari urbani Dolomitibus di Belluno, servizio invernale 2026/2027.

Genera pacchetti/belluno/dati/autobus.json e orari_autobus.json.
Uso: python3 strumenti/orari_dolomitibus_belluno.py pacchetti/belluno

Fonte: PDF delle linee su dolomitibus.it (campo "pdf" di ogni linea), letti una seconda volta
e riportati fermata per fermata. Gli orari sono memorizzati per fermata e direzione: l'allineamento
alle colonne dei PDF non serve. Le fermate senza coordinate in servizi.json (frazioni) sono omesse.
Coordinate: servizi.json, da OpenStreetMap (© OpenStreetMap contributors, ODbL).
"""
import json, os, sys
from collections import defaultdict
from datetime import date, timedelta

VALIDITA = ('20260910', '20270608')
PDF = 'https://dolomitibus.it/files/orari/invernali/'

# nome della fermata nei PDF -> id in servizi.json (fermata OSM più vicina con lo stesso nome)
MAPPA = {
    'Via Dante': 'autobus-33', 'Piazza Vittorio Emanuele': 'autobus-36',
    'P. Duomo / P. Vitt. Emanuele': 'autobus-38', 'Ospedale': 'autobus-8',
    'Baldenich': 'autobus-45', 'Bivio Baldenich': 'autobus-45',
    'Cavarzano Piazza': 'autobus-66', 'Cavarzano via Rudio': 'autobus-70',
    'Cavarzano Via Rudio': 'autobus-70', 'Cavarzano Monumento': 'autobus-3',
    'Sopracroda Capolinea': 'autobus-95', 'Cusighe': 'autobus-19',
    'Nogarè Centro': 'autobus-54', 'Bivio Nogarè': 'autobus-60',
    'Mussoi': 'autobus-32', 'Vezzano': 'autobus-107',
    'Borgo Piave Distr. AGIP': 'autobus-25', 'Castion': 'autobus-87',
}

def T(s):
    return s.split()

LINEE = [
  dict(num='951', nome='Blu', colore='#1F5FBF', pdf='Linea951_S26_v0.pdf', dir=[
    ('Bes → Sala', [
      ('Bes', T('07:15 13:33')), ('Canzan', T('07:17 13:35')),
      ('Salce Case Popolari', T('06:50 07:20 07:55 12:35 13:00 13:37 14:00 15:00')),
      ('Salce Bettin', T('06:53 07:23 07:58 12:38 13:03 13:40 14:03 15:03')),
      ('Mier', T('07:26')),
      ('Via Dante', T('06:10 07:00 08:05 12:20 12:45 13:15 13:47 14:10 15:10')),
      ('Piazza Vittorio Emanuele', T('06:13 07:03 08:08 12:23 12:48 13:18 14:13')),
      ('Bivio Baldenich', T('06:16 07:06 08:11 12:26 12:51 13:21 14:16')),
      ('Nogarè Centro', T('06:20 07:10 08:15 12:30 12:55 13:25 14:20')),
      ('Cusighe', T('06:25 07:15 08:20 12:35 13:00 13:30 14:25')),
      ('Sala', T('07:18 08:23 13:33 14:28'))]),
    ('Sala → Bes', [
      ('Sala', T('07:20 08:25 13:34 14:28')),
      ('Cusighe', T('06:25 07:22 08:27 12:36 13:04 13:35 14:29')),
      ('Nogarè Centro', T('06:28 07:26 08:31 12:39 13:07 13:39 14:33')),
      ('Bivio Baldenich', T('06:32 07:30 08:35 12:43 13:11 13:43 14:37')),
      ('Piazza Vittorio Emanuele', T('06:36 07:40 08:39 12:47 13:15 13:47 14:41')),
      ('Via Dante', T('06:39 07:43 08:42 12:24 12:50 13:18 13:50 14:47')),
      ('Salce Bettin', T('06:46 07:04 07:50 12:30 12:57 13:24 13:57 14:54')),
      ('Salce Case Popolari', T('06:49 07:53 12:34 13:00 13:28 14:00 14:57')),
      ('Canzan', T('07:09 13:30')), ('Bes', T('07:11 13:33'))])]),

  dict(num='952', nome='Rossa', colore='#D62828', pdf='Linea952_S26_v1.pdf', dir=[
    ('Mier → Fiammoi', [
      ('Mier', T('06:50 07:26 07:50 08:30 09:00 09:30 10:00 11:00 11:30 12:00 12:30 13:00 13:30 14:00 14:30 15:00 17:00 18:00 19:00')),
      ('Ospedale', T('06:55 07:55 08:35 09:05 09:35 10:05 11:05 11:35 12:05 12:35 13:05 13:35 14:05 14:35 15:05 17:05 18:05 19:05')),
      ('Via Dante', T('06:04 07:00 07:40 08:00 08:10 08:40 09:10 09:40 10:10 10:40 11:10 11:40 12:10 12:40 13:10 13:40 14:10 14:40 15:10 16:10 17:10 18:10 19:10 19:48')),
      ('Piazza Vittorio Emanuele', T('06:07 07:03 07:15 07:43 08:13 08:43 09:13 10:13 10:43 11:13 12:13 12:43 13:13 13:43 14:13 14:43 16:13 17:13 18:13 19:13 19:51')),
      ('Baldenich', T('06:10 07:06 07:17 07:46 08:16 08:46 09:16 10:16 10:46 11:16 12:16 12:46 13:16 13:46 14:16 14:46 16:16 17:16 18:16 19:16 19:54')),
      ('Cavarzano Piazza', T('06:12 07:08 07:48 08:18 08:48 09:18 10:18 10:48 11:18 12:18 12:48 13:18 13:48 14:18 14:48 16:18 17:18 18:18 19:18 19:56')),
      ('Cavarzano via Rudio', T('06:14 07:10 07:50 08:20 08:50 09:20 10:20 10:50 11:20 12:20 12:50 13:20 13:50 14:20 14:50 16:20 17:20 18:20 19:20 19:58')),
      ('Cusighe', T('06:18 07:14 07:54 08:24 08:54 09:24 10:24 10:54 11:24 12:24 12:54 13:24 13:54 14:24 14:54 16:24 17:24 18:24 19:24 20:02')),
      ('Sargnano Case Popolari', T('07:25 10:28 11:28 12:28 16:28 17:28 18:28')),
      ('Fiammoi', T('06:22 07:18 07:58 08:28 08:58 09:28 10:30 10:58 11:30 12:30 12:58 13:28 13:58 14:28 14:58 16:30 17:30 18:30 19:28 20:06'))]),
    ('Fiammoi → Mier', [
      ('Fiammoi', T('06:22 07:18 08:02 08:30 09:02 09:30 10:32 11:02 11:32 12:32 13:02 13:32 14:00 14:32 15:00 16:32 17:32 18:32 19:28 20:06')),
      ('Sargnano Case Popolari', T('07:25 08:32 09:32 14:02 15:02')),
      ('Cusighe', T('06:26 07:22 07:29 08:06 08:36 09:06 09:36 10:36 11:06 11:36 12:36 13:06 13:36 14:06 14:36 15:06 16:36 17:36 18:36 19:32 20:10')),
      ('Cavarzano via Rudio', T('06:30 07:26 08:10 08:40 09:10 09:40 10:40 11:10 11:40 12:40 13:10 13:40 14:10 14:40 15:10 16:40 17:40 18:40 19:36 20:14')),
      ('Cavarzano Piazza', T('06:31 07:27 07:32 08:11 08:41 09:11 09:41 10:41 11:11 11:41 12:41 13:11 13:41 14:11 14:41 15:11 16:41 17:41 18:41 19:37 20:15')),
      ('Baldenich', T('06:34 07:30 07:34 08:14 08:44 09:14 09:44 10:44 11:14 11:44 12:44 13:14 13:44 14:14 14:44 15:14 16:44 17:44 18:44 19:40 20:18')),
      ('Piazza Vittorio Emanuele', T('06:37 07:33 07:37 08:17 08:47 09:17 09:47 10:47 11:17 11:47 12:47 13:17 13:47 14:17 14:47 15:17 16:47 17:47 18:47 19:43 20:21')),
      ('Via Dante', T('06:40 07:40 07:40 08:20 08:50 09:20 09:50 10:50 11:20 11:50 11:50 12:20 12:50 12:50 13:20 13:50 14:20 14:50 15:20 16:50 17:50 18:50 19:46 20:24')),
      ('Ospedale', T('06:45 07:45 08:25 08:55 09:25 09:55 10:55 11:25 11:55 12:25 12:55 13:25 13:55 14:25 14:55 16:55 17:55 18:55')),
      ('Mier', T('06:50 07:50 08:30 09:00 09:30 10:00 11:00 11:30 12:00 12:30 13:00 13:30 14:00 14:30 15:00 17:00 18:00 19:00'))])]),

  dict(num='953', nome='Bianca', colore='#FFFFFF', pdf='Linea953_S26_v0.pdf', dir=[
    ('Via Dante → Sopracroda', [
      ('Via Dante', T('07:05 13:15')), ('Piazza Vittorio Emanuele', T('07:08 13:18')),
      ('Baldenich', T('07:11 13:21')), ('Via Tilman', T('07:15 13:25')),
      ('Cavarzano Monumento', T('07:16 13:26')), ('Sopracroda Capolinea', T('07:22 13:32'))]),
    ('Sopracroda → Via Dante', [
      ('Sopracroda Capolinea', T('07:22 13:32')), ('Cavarzano via Rudio', T('07:28 13:38')),
      ('Baldenich', T('07:31 13:41')), ('Piazza Vittorio Emanuele', T('07:35 13:45')),
      ('Via Dante', T('07:38 13:48'))])]),

  dict(num='954', nome='Verde', colore='#2E8B57', pdf='Linea954_S26_v0.pdf', dir=[
    ('Bes → Safforze', [
      ('Bes', T('06:06 06:42 07:11 07:20 08:11 08:41 09:11 10:11 11:11 11:41 12:11 12:41 13:11 13:41 14:11 14:41 15:11 16:11 17:11 17:41 18:41 19:11')),
      ('Chiesurazza', T('06:11 06:47 07:16 07:25 08:16 08:46 09:16 10:16 11:16 11:46 12:16 12:46 13:16 13:46 14:16 14:46 15:16 16:16 17:16 17:46 18:46 19:16')),
      ('Mussoi', T('06:17 06:53 07:22 07:31 08:22 08:51 09:22 10:22 11:22 11:52 12:22 12:52 13:22 13:52 14:22 14:52 15:22 16:22 17:22 17:52 18:52 19:22')),
      ('Via Dante', T('06:21 06:57 07:26 07:35 07:56 08:26 08:56 09:26 10:26 11:26 11:56 12:26 12:56 13:26 13:56 14:26 14:56 15:26 15:56 16:26 16:56 17:26 17:56 18:56 19:26')),
      ('Piazza Vittorio Emanuele', T('06:26 07:02 07:31 08:01 08:31 09:31 10:31 11:31 12:01 12:31 13:01 13:31 14:01 14:31 15:01 16:01 16:31 17:01 17:31 18:01 19:01 19:31')),
      ('Baldenich', T('06:29 07:05 07:34 08:04 08:34 09:34 10:34 11:34 12:04 12:34 13:04 13:34 14:04 14:34 15:04 16:04 16:34 17:04 17:34 18:04 19:04 19:34')),
      ('Bivio Nogarè', T('06:33 07:09 07:38 08:08 08:38 09:38 10:38 11:38 12:08 12:38 13:08 13:38 14:08 14:38 15:08 16:08 16:38 17:08 17:38 18:08 19:08 19:38')),
      ('Veneggia', T('06:35 07:11 07:40 08:10 08:40 09:40 10:40 11:40 12:10 12:40 13:10 13:40 14:10 14:40 15:10 16:10 16:40 17:10 17:40 18:10 19:10 19:40')),
      ('Safforze', T('06:42 07:18 07:47 08:17 08:47 09:47 10:47 11:47 12:17 12:47 13:17 13:47 14:17 14:47 15:17 16:17 16:47 17:17 17:47 18:17 19:17 19:47'))]),
    ('Safforze → Bes', [
      ('Safforze', T('06:42 07:18 07:58 08:28 08:58 09:58 10:58 11:58 12:28 12:58 13:28 13:58 14:28 14:58 15:28 16:28 16:58 17:28 17:58 18:28 19:28 19:58')),
      ('Veneggia', T('06:48 07:24 08:04 08:34 09:04 10:04 11:04 12:04 12:34 13:04 13:34 14:04 14:34 15:04 15:34 16:34 17:04 17:34 18:04 18:34 19:34 20:04')),
      ('Bivio Nogarè', T('06:49 07:25 08:05 08:35 09:05 10:05 11:05 12:05 12:35 13:05 13:35 14:05 14:35 15:05 15:35 16:35 17:05 17:35 18:05 18:35 19:35 20:05')),
      ('Baldenich', T('06:54 07:30 08:10 08:40 09:10 10:10 11:10 12:10 12:40 13:10 13:40 14:10 14:40 15:10 15:40 16:40 17:10 17:40 18:10 18:40 19:40 20:10')),
      ('Piazza Vittorio Emanuele', T('06:59 07:35 08:15 08:45 09:15 10:15 10:45 11:15 11:45 12:15 12:45 13:15 13:45 14:15 14:45 15:15 15:45 16:45 17:15 17:45 18:15 18:45 19:45 20:15')),
      ('Via Dante', T('06:26 07:04 07:40 08:20 08:50 09:20 09:50 10:20 10:50 11:20 11:50 12:20 12:50 13:20 13:50 14:20 14:50 15:20 15:50 16:50 17:20 17:50 18:20 18:50 19:50 20:20')),
      ('Mussoi', T('06:30 07:08 07:44 08:24 08:54 09:54 10:54 11:24 11:54 12:24 12:54 13:24 13:54 14:24 14:54 15:54 16:54 17:24 18:24 18:54 19:54')),
      ('Chiesurazza', T('06:38 07:16 07:52 08:32 09:02 10:02 11:02 11:32 12:02 12:32 13:02 13:32 14:02 14:32 15:02 16:02 17:02 17:32 18:32 19:02 20:02')),
      ('Bes', T('06:42 07:20 07:56 08:36 09:06 10:06 11:06 11:36 12:06 12:36 13:06 13:36 14:06 14:36 15:06 16:06 17:06 17:36 18:36 19:06 20:06'))])]),

  dict(num='955', nome='Arancio', colore='#F28C28', pdf='Linea955_S26_v0.pdf', dir=[
    ('Piazza Vittorio Emanuele → Orzes', [
      ('Piazza Vittorio Emanuele', T('06:35 07:47 12:50')),
      ('Via Dante', T('06:38 07:50 12:53 13:30')), ('Mussoi', T('06:41 07:53 12:56 13:33')),
      ('Antole', T('06:45 07:57 13:00 13:37')), ('Casoni Bivio', T('06:47 07:59 13:02 13:39')),
      ('Vignole', T('06:51 08:03 13:06 13:43')), ('Casere', T('06:53 08:05 13:08 13:45')),
      ('Orzes', T('06:56 08:08 13:11 13:48'))]),
    ('Orzes → Piazza Vittorio Emanuele', [
      ('Orzes', T('06:56 08:08 13:11 13:48')), ('Casoni Bivio', T('06:57 08:09 13:12 13:49')),
      ('Antole', T('07:00 08:12 13:15 13:52')), ('Mussoi', T('07:05 08:17 13:20 13:57')),
      ('Via Dante', T('07:12 08:24 13:27 14:04')), ('Piazza Vittorio Emanuele', T('07:15 08:27 14:07'))])]),

  dict(num='956', nome='Lilla', colore='#B57EDC', pdf='Linea956_S26_v0.pdf', dir=[
    ('Libano → Sagrogna', [
      ('Libano Campo Sportivo', T('06:14 07:04 08:04 12:44 13:09 13:37 14:28 15:07 16:51 17:51 18:42')),
      ('Giazzoi', T('06:15 07:05 08:05 12:45 13:10 13:38 14:29 15:08 16:52 17:52 18:43')),
      ('Tisoi', T('06:17 07:07 08:07 12:47 13:12 13:40 14:31 15:10 16:54 17:54 18:45')),
      ('Bolzano', T('06:20 07:10 08:10 12:50 13:15 13:43 14:34 15:13 16:57 17:57 18:48')),
      ('Vezzano', T('06:23 07:13 08:13 12:53 13:18 13:46 14:37 15:16 17:00 18:00 18:51')),
      ('Mussoi', T('06:26 07:16 08:16 12:56 13:21 13:49 14:40 15:19 17:03 18:03 18:54')),
      ('Via Dante', T('06:30 07:20 07:50 08:20 13:00 13:25 13:53 14:44 15:23 17:07 18:07 18:58')),
      ('Piazza Vittorio Emanuele', T('06:33 07:23 07:53 08:23 13:03 13:56 14:47 17:10 18:10')),
      ("L'Anta", T('06:38 07:28 13:08 14:01 17:15 18:15')),
      ('Via Meassa', T('08:00 08:30 14:54')), ('Levego Nuova', T('08:01 08:31 14:55')),
      ('Sagrogna Zona Artigianale', T('08:03 08:33 14:57'))]),
    ('Sagrogna → Libano', [
      ('Levego', T('08:06 08:36 15:00')), ('Sagrogna Zona Artigianale', T('08:03 08:33 14:57')),
      ("L'Anta", T('06:38 07:28 08:10 08:40 13:08 14:01 15:04 17:15 18:15')),
      ('Piazza Vittorio Emanuele', T('06:43 07:40 08:15 08:45 12:20 12:48 13:15 14:06 15:09 16:20 17:20 18:20')),
      ('Via Dante', T('06:00 06:46 07:43 08:18 08:48 12:23 12:50 13:18 14:09 14:48 15:12 16:23 17:23 18:23')),
      ('Mussoi', T('06:02 06:49 07:46 12:26 12:53 13:21 14:12 14:51 16:26 17:26 18:26')),
      ('Vezzano', T('06:04 06:52 07:49 12:29 12:56 13:24 14:15 14:54 16:29 17:29 18:29')),
      ('Bolzano', T('06:07 06:57 07:54 12:34 13:01 13:29 14:20 14:59 16:34 17:34 18:34')),
      ('Tisoi', T('06:10 07:00 07:57 12:37 13:04 13:32 14:23 15:02 16:37 17:37 18:37')),
      ('Giazzoi', T('06:12 07:02 07:59 12:39 13:06 13:34 14:25 15:04 16:39 17:39 18:39')),
      ('Libano Campo Sportivo', T('06:14 07:04 08:02 12:42 13:09 13:37 14:28 15:07 16:42 17:42 18:42'))])]),

  dict(num='957', nome='Gialla', colore='#F2C500', pdf='Linea957_S26_v3.pdf', dir=[
    ('Via Dante → Cirvoi', [
      ('Via Dante', T('05:45 06:38 06:38 07:08 07:25 07:41 08:29 09:16 10:16 11:16 12:16 13:16 13:16 13:20 14:16 15:16 16:16 17:16 18:16 19:16')),
      ('P. Duomo / P. Vitt. Emanuele', T('06:42 07:12 07:29 07:45 08:33 09:20 10:20 11:20 12:20 13:20 14:20 15:20 16:20 17:20 18:20 19:20')),
      ('Borgo Piave Distr. AGIP', T('06:47 07:17 07:34 07:50 08:38 09:25 10:25 11:25 12:25 13:25 14:25 15:25 16:25 17:25 18:25 19:25')),
      ('Castion', T('05:57 06:50 06:52 07:22 07:39 07:55 08:43 09:30 10:30 11:30 12:30 13:28 13:30 14:30 15:30 16:30 17:30 18:30 19:30')),
      ('Inc. via Bepi del Capo', T('06:51 07:23 07:40 09:31 11:31 13:29 14:31 16:31')),
      ('Caleipo Bivio', T('06:01 06:55 07:58 08:46 10:33 12:33 13:33 15:33 17:33 18:33 19:33')),
      ('Sossai', T('13:32')),
      ('Faverga', T('06:03 06:57 08:00 08:48 10:35 12:35 13:35 15:35 17:35 18:35 19:35')),
      ('Cirvoi', T('06:06 07:00 08:03 08:51 10:38 12:38 13:38 15:38 17:38 18:38 19:38'))]),
    ('Cirvoi → Via Dante', [
      ('Cirvoi', T('06:06 07:03 08:06 08:54 10:41 12:41 13:41 15:41 17:41 18:41 19:41')),
      ('Faverga', T('06:07 07:04 08:07 08:55 10:42 12:42 13:42 15:42 17:42 18:42 19:42')),
      ('Sossai', T('07:10')),
      ('Caleipo Bivio', T('06:09 07:06 08:09 08:57 10:44 12:44 13:44 15:44 17:44 18:44 19:44')),
      ('Castion', T('06:14 06:54 07:11 07:26 07:43 08:14 09:02 09:34 10:49 11:34 12:49 13:33 13:49 14:34 15:49 16:34 17:49 18:49 19:49')),
      ('Borgo Piave Distr. AGIP', T('06:19 06:59 07:16 07:31 07:48 08:19 09:07 09:39 10:54 11:39 12:54 13:38 13:54 14:39 15:54 16:39 17:54 18:54 19:54')),
      ('P. Duomo / P. Vitt. Emanuele', T('06:24 07:03 07:21 07:35 07:52 08:24 09:12 09:44 10:59 11:44 12:59 13:42 13:59 14:44 15:59 16:44 17:59 18:59 19:59')),
      ('Via Dante', T('06:27 07:07 07:24 07:20 07:39 07:56 08:27 09:15 09:47 11:02 11:47 13:02 13:46 14:02 14:47 16:02 16:47 18:02 19:02 20:02'))])]),

  dict(num='959', nome='Celeste', colore='#5BC0EB', pdf='Linea959_S26_v0.pdf', dir=[
    ('Via Dante → Madeago', [
      ('Via Dante', T('06:05 06:46 07:30 12:20 13:15')),
      ('P. Duomo / P. Vitt. Emanuele', T('06:09 06:49 07:34 12:24 13:19')),
      ('Borgo Piave Distr. AGIP', T('06:14 06:54 07:40 12:30 13:25')),
      ('Visome', T('06:19 06:59 07:46 12:36 13:31')), ('Castoi', T('06:21 07:01 07:50 12:40 13:35')),
      ('Cet', T('06:23 07:03 07:52 12:42 13:37')), ('Madeago', T('06:25 07:05 07:55 12:45 13:40'))]),
    ('Madeago → Via Dante', [
      ('Madeago', T('06:25 07:05 07:55 12:45 13:40')), ('Cet', T('06:26 07:07 07:57 12:46 13:41')),
      ('Castoi', T('06:28 07:09 07:59 12:48 13:43')), ('Visome', T('06:31 07:14 08:04 12:51 13:46')),
      ('Borgo Piave Distr. AGIP', T('06:37 07:22 08:12 12:57 13:52')),
      ('P. Duomo / P. Vitt. Emanuele', T('06:41 07:26 08:16 13:01 13:56')),
      ('Via Dante', T('06:45 07:30 08:20 13:05 14:00'))]),
  ]),
]

# Servizio a chiamata Trillo: testo mostrato come avviso (fonte: dolomitibus.it, pagina Trillo).
AVVISI = {
  'trillo': {
    'titolo': {'it': 'Servizio a chiamata Trillo', 'en': 'Trillo on-demand service', 'fr': 'Service à la demande Trillo',
               'de': 'Trillo Bedarfsverkehr', 'es': 'Servicio a demanda Trillo'},
    'testo': {
      'it': "Si prenota con l'app Trillo Dolomiti Bus (fino a 7 giorni e fino a 30 minuti prima della partenza) oppure al call center 0437 941 237 (lun–sab 8:00–20:00). Inverno, lun–sab: 9:00–12:00 e 15:30–20:30. Biglietto urbano 2,00 €.",
      'en': "Book with the Trillo Dolomiti Bus app (up to 7 days and up to 30 minutes before departure) or call 0437 941 237 (Mon–Sat 8:00–20:00). Winter, Mon–Sat: 9:00–12:00 and 15:30–20:30. Urban fare €2.00.",
      'fr': "Réservation via l'app Trillo Dolomiti Bus (jusqu'à 7 jours et jusqu'à 30 minutes avant le départ) ou au 0437 941 237 (lun–sam 8h–20h). Hiver, lun–sam : 9h–12h et 15h30–20h30. Tarif urbain 2,00 €.",
      'de': "Buchung über die App Trillo Dolomiti Bus (bis 7 Tage und bis 30 Minuten vor Abfahrt) oder unter 0437 941 237 (Mo–Sa 8:00–20:00). Winter, Mo–Sa: 9:00–12:00 und 15:30–20:30. Stadttarif 2,00 €.",
      'es': "Se reserva con la app Trillo Dolomiti Bus (hasta 7 días y hasta 30 minutos antes de la salida) o en el 0437 941 237 (lun–sáb 8:00–20:00). Invierno, lun–sáb: 9:00–12:00 y 15:30–20:30. Tarifa urbana 2,00 €.",
    }}}

def minuti(h):
    hh, mm = h.split(':')
    return int(hh) * 60 + int(mm)

def b36(n):
    s = ''
    while True:
        n, r = divmod(n, 36)
        s = '0123456789abcdefghijklmnopqrstuvwxyz'[r] + s
        if not n:
            return s

# Periodi senza scuola: i PDF valgono solo per il servizio "feriale scolastico", quindi in questi
# giorni non c'è un orario pubblicato (la voce servizio 0 viene disattivata).
PERIODI_NON_SCOLASTICI = [('20261207', '20261207'), ('20261224', '20270105'), ('20270208', '20270210'),
                          ('20270325', '20270330'), ('20270429', '20270430')]

def main(pacchetto):
    servizi = json.load(open(os.path.join(pacchetto, 'dati', 'servizi.json'), encoding='utf-8'))['servizi']
    osm = {x['id']: x for x in servizi if x['tipo'] == 'autobus'}
    fermate_out, fermata_linee = {}, defaultdict(list)
    linee_out = []
    orari_out = defaultdict(lambda: defaultdict(lambda: defaultdict(set)))
    saltate = defaultdict(set)
    for L in LINEE:
        lid = 'AUT-' + L['num']
        direzioni = []
        for d, (titolo, righe) in enumerate(L['dir']):
            seq = []
            for nome, orari in righe:
                fid = MAPPA.get(nome)
                if fid is None:
                    saltate[L['num']].add(nome)
                    continue
                if fid not in seq:
                    seq.append(fid)
                o = osm[fid]
                fermate_out.setdefault(fid, {'nome': o['nome'], 'lat': o['lat'], 'lon': o['lon'], 'linee': []})
                if lid not in fermate_out[fid]['linee']:
                    fermate_out[fid]['linee'].append(lid)
                    fermata_linee[fid].append(lid)
                for ora in orari:
                    orari_out[fid][lid][str(d)].add(minuti(ora))
            direzioni.append({'direzione': d, 'circolare': False, 'fermate': seq, 'titolo': titolo})
        linee_out.append({'id': lid, 'etichetta': L['num'] + ' ' + L['nome'], 'mezzo': 'autobus', 'colore': L['colore'],
                          'testo': '#FFFFFF' if L['colore'] in ('#1F5FBF', '#D62828', '#2E8B57', '#B57EDC') else '#1A1A1A',
                          'notturna': False, 'gestore': 'Dolomitibus', 'pdf': PDF + L['pdf'], 'direzioni': direzioni})

    servizi_out = [{'giorni': '1111110', 'da': VALIDITA[0], 'a': VALIDITA[1]}] + \
                  [{'giorni': '0000000', 'da': VALIDITA[0], 'a': VALIDITA[1]} for _ in range(4)]
    date_out = {}
    for ini, fin in PERIODI_NON_SCOLASTICI:
        d0 = date(int(ini[:4]), int(ini[4:6]), int(ini[6:]))
        d1 = date(int(fin[:4]), int(fin[4:6]), int(fin[6:]))
        while d0 <= d1:
            date_out[d0.strftime('%Y%m%d')] = {'piu': [], 'meno': [0]}
            d0 += timedelta(days=1)

    orari_json = {}
    for fid, per in orari_out.items():
        orari_json[fid] = {}
        for lid, dirs in per.items():
            orari_json[fid][lid] = {}
            for d, valori in sorted(dirs.items()):
                orari_json[fid][lid][d] = [[[0], ','.join(b36(m) for m in sorted(valori))]]

    nota_orari = ('Belluno: orari urbani Dolomitibus, servizio invernale feriale scolastico, lun–sab, '
                  'dal 10/09/2026 all\'08/06/2027 (PDF di dolomitibus.it, link in "pdf"). '
                  'Non ci sono orari pubblicati per i periodi non scolastici. Da verificare: linea 957 con validità '
                  'dal 28/09/2026 su una pagina del sito; alcune corse marcate "fv" (solo feriali) non sono distinte; '
                  'alcuni orari dei PDF sono fuori sequenza o duplicati. Fermate frazione senza coordinate omesse.')
    json.dump({'_nota': nota_orari, 'validita': list(VALIDITA), 'servizi': servizi_out, 'date': date_out,
               'capolinea': [], 'orari': orari_json, 'avvisi': AVVISI},
              open(os.path.join(pacchetto, 'dati', 'orari_autobus.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({'_nota': nota_orari + ' Coordinate © OpenStreetMap contributors (ODbL).', 'validita': list(VALIDITA),
               'linee': linee_out, 'fermate': fermate_out, 'fermataLinee': fermata_linee},
              open(os.path.join(pacchetto, 'dati', 'autobus.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for l in linee_out:
        print(l['etichetta'], [(x['titolo'], len(x['fermate'])) for x in l['direzioni']])
    for k, v in sorted(saltate.items()):
        print('linea', k, 'fermate senza coordinate:', sorted(v))
    print(len(fermate_out), 'fermate urbane')

if __name__ == '__main__':
    main(sys.argv[1])
