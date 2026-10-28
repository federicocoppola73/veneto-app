// Trasforma orari e biglietti di luoghi.json in testo nella lingua scelta.
const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

// 'lun-sab' -> 'Lun–Sab', 'dom' -> 'Dom', 'tutti' -> 'Tutti i giorni'
export function formattaGiorni(codice, t) {
  if (codice === 'tutti') return t('g_tutti');
  const nomi = t('giorni').split(',');
  return codice
    .split('-')
    .map((g) => nomi[GIORNI.indexOf(g)] || g)
    .join('–');
}

// 'mar' -> 'martedì'
export function giornoLungo(codice, t) {
  const nomi = t('giorniLunghi').split(',');
  return nomi[GIORNI.indexOf(codice)] || codice;
}

// '04-01/10-31' -> '1/4 – 31/10'
export function formattaPeriodo(periodo) {
  if (!periodo) return '';
  const data = (s) => {
    const [m, g] = s.split('-').map(Number);
    return `${g}/${m}`;
  };
  const [da, a] = periodo.split('/');
  return `${data(da)} – ${data(a)}`;
}

export function formattaOre(ore, t) {
  return ore === 'sempre' ? t('sempre') : ore;
}

export function formattaEuro(valore, t) {
  const testo = Number.isInteger(valore) ? String(valore) : valore.toFixed(2).replace('.', t('decimale'));
  return `€ ${testo}`;
}

// Testo principale del biglietto (senza la nota)
export function formattaBiglietto(b, t) {
  if (!b) return '';
  if (b.gratuito) return t('gratuito');
  const parti = [];
  if (b.intero != null) parti.push(formattaEuro(b.intero, t));
  if (b.ridotto != null) parti.push(`${t('ridotto')} ${formattaEuro(b.ridotto, t)}`);
  return parti.join(' · ');
}
