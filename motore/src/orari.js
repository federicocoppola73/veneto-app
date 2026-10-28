// "Aperto adesso": interpreta gli orari di luoghi.json all'ora di Venezia
// (anche se il telefono del visitatore è impostato su un altro fuso orario).
const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const CHIUDE_A_BREVE = 45; // minuti

// Ora di Venezia: ora legale dall'ultima domenica di marzo all'ultima domenica di ottobre (01:00 UTC)
function ultimaDomenica(anno, mese) {
  const d = new Date(Date.UTC(anno, mese + 1, 0, 1));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.getTime();
}
export function oraVenezia(data = new Date()) {
  const t = data.getTime();
  const anno = data.getUTCFullYear();
  const legale = t >= ultimaDomenica(anno, 2) && t < ultimaDomenica(anno, 9);
  const v = new Date(t + (legale ? 2 : 1) * 3600000); // i campi UTC sono l'ora di Venezia
  return {
    anno: v.getUTCFullYear(),
    giorno: (v.getUTCDay() + 6) % 7, // 0 = lunedì
    mese: v.getUTCMonth() + 1,
    data: v.getUTCDate(),
    minuti: v.getUTCHours() * 60 + v.getUTCMinutes(),
  };
}

function giorniDi(codice) {
  if (codice === 'tutti') return GIORNI.map((_, i) => i);
  const [da, a] = codice.split('-').map((g) => GIORNI.indexOf(g));
  if (a == null || a < 0) return [da];
  const out = [];
  for (let i = da; ; i = (i + 1) % 7) {
    out.push(i);
    if (i === a) break;
  }
  return out;
}

function nelPeriodo(periodo, mese, giorno) {
  if (!periodo) return true;
  const [da, a] = periodo.split('/').map((s) => {
    const [m, g] = s.split('-').map(Number);
    return m * 100 + g;
  });
  const oggi = mese * 100 + giorno;
  return da <= a ? oggi >= da && oggi <= a : oggi >= da || oggi <= a;
}

const minuti = (s) => {
  const [h, m] = s.trim().split(':').map(Number);
  return h * 60 + (m || 0);
};

// Fasce di apertura di un certo giorno: [[inizio, fine], ...] in minuti, 'sempre', oppure null se non si sa
function fasce(luogo, giorno, mese, data) {
  const orari = luogo.orari;
  if (!orari || orari.length === 0) return null;
  if ((luogo.chiuso || []).includes(GIORNI[giorno])) return [];
  const out = [];
  for (const o of orari) {
    if (!giorniDi(o.giorni).includes(giorno) || !nelPeriodo(o.periodo, mese, data)) continue;
    if (o.ore === 'sempre') return 'sempre';
    for (const pezzo of o.ore.split('·')) {
      const [a, b] = pezzo.split(/[–-]/);
      if (a && b) out.push([minuti(a), minuti(b)]);
    }
  }
  return out.sort((x, y) => x[0] - y[0]);
}

/**
 * Stato di apertura di un luogo in un certo momento (di default: adesso).
 * Restituisce null se non ci sono orari, altrimenti:
 *  { tipo: 'sempre' }
 *  { tipo: 'aperto', chiude, tra, breve }        chiude = minuti dalla mezzanotte, tra = minuti mancanti
 *  { tipo: 'chiuso', apre, fraGiorni, giorno }   fraGiorni: 0 oggi, 1 domani, ...; giorno: 'lun'…
 *  { tipo: 'chiuso', stagione: true }            nessuna apertura nei prossimi 7 giorni
 * oggiChiuso: true se oggi non apre affatto
 */
export function statoApertura(luogo, data = new Date()) {
  const ora = oraVenezia(data);
  const oggi = fasce(luogo, ora.giorno, ora.mese, ora.data);
  if (oggi === null) return null;
  if (oggi === 'sempre') return { tipo: 'sempre' };
  for (const [a, b] of oggi) {
    if (ora.minuti >= a && ora.minuti < b) {
      const tra = b - ora.minuti;
      return { tipo: 'aperto', chiude: b, tra, breve: tra <= CHIUDE_A_BREVE };
    }
  }
  const oggiChiuso = oggi.length === 0;
  const dopo = oggi.find(([a]) => a > ora.minuti);
  if (dopo) return { tipo: 'chiuso', apre: dopo[0], fraGiorni: 0, giorno: GIORNI[ora.giorno], oggiChiuso };
  for (let k = 1; k <= 7; k++) {
    const d = new Date(data.getTime() + k * 86400000);
    const o = oraVenezia(d);
    const f = fasce(luogo, o.giorno, o.mese, o.data);
    if (f === 'sempre') return { tipo: 'chiuso', apre: 0, fraGiorni: k, giorno: GIORNI[o.giorno], oggiChiuso };
    if (f && f.length) return { tipo: 'chiuso', apre: f[0][0], fraGiorni: k, giorno: GIORNI[o.giorno], oggiChiuso };
  }
  return { tipo: 'chiuso', stagione: true, oggiChiuso };
}

export const formattaOra = (m) => `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`;

const COLORI = { aperto: '#15803d', breve: '#c2410c', chiuso: '#b91c1c' };
export function coloreApertura(s) {
  if (!s) return '#94a3b8';
  if (s.tipo === 'chiuso') return COLORI.chiuso;
  return s.breve ? COLORI.breve : COLORI.aperto;
}

// Testo completo, per la scheda del luogo
export function testoApertura(s, t, giornoLungo) {
  if (!s) return '';
  if (s.tipo === 'sempre') return t('ap_sempre');
  if (s.tipo === 'aperto') {
    return s.breve
      ? t('ap_chiudeTra').replace('{m}', s.tra).replace('{h}', formattaOra(s.chiude))
      : t('ap_aperto').replace('{h}', formattaOra(s.chiude));
  }
  if (s.stagione) return t('ap_stagione');
  const h = formattaOra(s.apre);
  if (s.fraGiorni === 0) return t('ap_apre').replace('{h}', h);
  if (s.fraGiorni === 1) return t('ap_domani').replace('{h}', h);
  return t('ap_riapre').replace('{g}', giornoLungo(s.giorno, t)).replace('{h}', h);
}

// Testo breve, per gli elenchi
export function testoAperturaBreve(s, t) {
  if (!s || s.tipo === 'sempre') return '';
  if (s.tipo === 'aperto') {
    return s.breve ? t('aps_chiudeTra').replace('{m}', s.tra) : t('aps_aperto').replace('{h}', formattaOra(s.chiude));
  }
  if (s.stagione) return t('aps_stagione');
  if (s.fraGiorni === 0) return t('aps_apre').replace('{h}', formattaOra(s.apre));
  return s.oggiChiuso ? t('aps_chiusoOggi') : t('aps_chiuso');
}
