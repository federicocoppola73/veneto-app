// Nome dei luoghi nella lingua scelta.
// In luoghi.json "nome" è il nome italiano e il campo facoltativo "nomi" ({ en, fr, de, es }) ha le versioni tradotte.
// Dopo il caricamento ogni luogo ha "nome" come proprietà che dà il nome nella lingua corrente (se manca, l'italiano)
// e "nomeIt" con il nome italiano (per la ricerca, che trova il luogo in qualsiasi lingua).
let corrente = 'it';

// va chiamata a ogni cambio di lingua (App.js la chiama a ogni render, costa pochissimo)
export function impostaLinguaNomi(lingua) {
  corrente = lingua || 'it';
}

export function localizzaLuoghi(dati) {
  const elenco = Array.isArray(dati) ? dati : dati?.luoghi;
  if (!Array.isArray(elenco)) return dati;
  for (const l of elenco) {
    if (!l || typeof l.nome !== 'string' || l.nomeIt) continue;
    const it = l.nome;
    Object.defineProperty(l, 'nomeIt', { value: it, enumerable: false, configurable: true });
    if (l.nomi) {
      Object.defineProperty(l, 'nome', {
        get: () => l.nomi[corrente] || it,
        set: () => {},
        enumerable: true,
        configurable: true,
      });
    }
  }
  return dati;
}

// tutti i nomi di un luogo (per la ricerca)
export const nomiDelLuogo = (l) => [l.nome, l.nomeIt, ...(l.nomi ? Object.values(l.nomi) : [])].filter(Boolean);
