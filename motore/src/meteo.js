// Meteo in tempo reale da Open-Meteo (gratuito, senza chiave; dati con licenza CC BY 4.0).

const VENEZIA = { latitudine: 45.4372, longitudine: 12.3326 };

const URL_METEO =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${VENEZIA.latitudine}&longitude=${VENEZIA.longitudine}` +
  '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=Europe%2FRome';

export async function leggiMeteo() {
  const risposta = await fetch(URL_METEO);
  if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
  const meteo = await risposta.json();
  const c = meteo.current || {};
  const d = meteo.daily || {};
  return {
    ora: c.time, // ora locale, es. "2026-10-15T13:45"
    temperatura: c.temperature_2m,
    percepita: c.apparent_temperature,
    codice: c.weather_code,
    giorno: c.is_day === 1,
    vento: c.wind_speed_10m,
    direzioneVento: c.wind_direction_10m,
    massima: d.temperature_2m_max?.[0],
    minima: d.temperature_2m_min?.[0],
    pioggia: d.precipitation_probability_max?.[0],
  };
}

// Codici meteo WMO raggruppati: icona + chiave del testo tradotto
export function descriviTempo(codice, giorno = true) {
  if (codice === 0) return { icona: giorno ? '☀️' : '🌙', chiave: 'm_sereno' };
  if (codice === 1) return { icona: giorno ? '🌤️' : '🌙', chiave: 'm_pocoNuvoloso' };
  if (codice === 2) return { icona: '⛅', chiave: 'm_parzNuvoloso' };
  if (codice === 3) return { icona: '☁️', chiave: 'm_coperto' };
  if (codice === 45 || codice === 48) return { icona: '🌫️', chiave: 'm_nebbia' };
  if (codice >= 51 && codice <= 57) return { icona: '🌦️', chiave: 'm_pioviggine' };
  if ((codice >= 61 && codice <= 67) || (codice >= 80 && codice <= 82)) return { icona: '🌧️', chiave: 'm_pioggia' };
  if ((codice >= 71 && codice <= 77) || codice === 85 || codice === 86) return { icona: '🌨️', chiave: 'm_neve' };
  if (codice >= 95) return { icona: '⛈️', chiave: 'm_temporale' };
  return { icona: '🌡️', chiave: 'm_sconosciuto' };
}

// Punto cardinale (0-7) da gradi: 0=N, 1=NE, 2=E ... 7=NO
export function settoreVento(gradi) {
  return Math.round((((gradi % 360) + 360) % 360) / 45) % 8;
}
