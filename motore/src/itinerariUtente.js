// Itinerari creati dall'utente: restano salvati sul telefono (AsyncStorage).
// Percorsi e lunghezze si calcolano sul telefono, sulla rete pedonale del centro storico (src/rete.js),
// e vengono salvati già pronti, nello stesso formato degli itinerari ufficiali (itinerari.json).
import { useCallback, useEffect, useRef, useState } from 'react';
import { camminoVersoLuogo, metriVersoLuogo, nodoDelLuogo, percorsiDa } from './rete';
import { distanzaMetri } from './distanza';

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  AsyncStorage = null;
}
const CHIAVE = 'itinerariUtente';
const PARTENZE_FISSE = ['piazzale-roma', 'stazione']; // come negli itinerari ufficiali
const FATTORE_LINEA = 1.3; // luoghi non raggiungibili a piedi (isole): linea d'aria +30%

const arrotonda = (v) => Math.round(v * 1e5) / 1e5;

// Distanze a piedi da un luogo, calcolate una volta sola per ogni luogo di partenza
function percorsiDalLuogo(id, cache) {
  if (cache.has(id)) return cache.get(id);
  const nodo = nodoDelLuogo(id);
  const p = nodo != null ? percorsiDa(nodo) : null;
  cache.set(id, p);
  return p;
}

// Metri a piedi tra due luoghi (o linea d'aria +30% se non si arriva a piedi, per esempio su un'isola)
function metriTra(daId, aId, luoghiPerId, cache) {
  if (daId === aId) return 0;
  const m = metriVersoLuogo(percorsiDalLuogo(daId, cache), aId);
  if (m != null) return m;
  const a = luoghiPerId[daId];
  const b = luoghiPerId[aId];
  if (!a || !b) return 0;
  return distanzaMetri(a.latitudine, a.longitudine, b.latitudine, b.longitudine) * FATTORE_LINEA;
}

// Tratto tra due luoghi: { metri, percorso: [[lat, lon], ...] }
function trattoTra(daId, aId, luoghiPerId, cache) {
  const a = luoghiPerId[daId];
  const b = luoghiPerId[aId];
  const p = percorsiDalLuogo(daId, cache);
  const m = daId === aId ? 0 : metriVersoLuogo(p, aId);
  if (m != null && daId !== aId) {
    const cammino = camminoVersoLuogo(p, aId) || [];
    return { metri: Math.round(m), percorso: cammino.map(([la, lo]) => [arrotonda(la), arrotonda(lo)]) };
  }
  if (!a || !b) return { metri: 0, percorso: [] };
  return {
    metri: Math.round(metriTra(daId, aId, luoghiPerId, cache)),
    percorso: [
      [a.latitudine, a.longitudine],
      [b.latitudine, b.longitudine],
    ],
  };
}

// Lunghezza in metri del giro tra le tappe (senza il tratto dalla partenza)
export function metriTappe(tappe, luoghiPerId) {
  const cache = new Map();
  let metri = 0;
  for (let i = 0; i + 1 < tappe.length; i++) metri += metriTra(tappe[i], tappe[i + 1], luoghiPerId, cache);
  return Math.round(metri);
}

/**
 * Itinerario completo nel formato degli itinerari ufficiali:
 * { id, titolo, tappe, metri, tratti: [{ metri, percorso }], partenze: { 'piazzale-roma': {...}, stazione: {...} },
 *   nautico: false, utente: true }
 */
export function calcolaItinerario({ id, titolo, tappe }, luoghiPerId, cache = new Map()) {
  const tratti = [];
  let metri = 0;
  for (let i = 0; i + 1 < tappe.length; i++) {
    const tr = trattoTra(tappe[i], tappe[i + 1], luoghiPerId, cache);
    tratti.push(tr);
    metri += tr.metri;
  }
  const partenze = {};
  if (tappe.length) for (const p of PARTENZE_FISSE) partenze[p] = trattoTra(p, tappe[0], luoghiPerId, cache);
  return { id, titolo, tappe, metri, tratti, partenze, nautico: false, utente: true };
}

/**
 * Tappe in fila per il giro a piedi più breve: si prova a partire da ogni tappa andando sempre alla più vicina,
 * poi si migliora il giro invertendo pezzi di percorso finché conviene (metodo "2-opt").
 */
export function ordinaTappe(tappe, luoghiPerId) {
  const n = tappe.length;
  if (n < 3) return tappe;
  const cache = new Map();
  const D = tappe.map((a) => tappe.map((b) => metriTra(a, b, luoghiPerId, cache)));
  const costo = (o) => {
    let c = 0;
    for (let k = 0; k + 1 < o.length; k++) c += D[o[k]][o[k + 1]];
    return c;
  };
  let migliore = null;
  let costoMin = Infinity;
  for (let s = 0; s < n; s++) {
    const usati = new Set([s]);
    const ordine = [s];
    while (ordine.length < n) {
      const u = ordine[ordine.length - 1];
      let scelto = -1;
      let min = Infinity;
      for (let j = 0; j < n; j++) {
        if (!usati.has(j) && D[u][j] < min) {
          min = D[u][j];
          scelto = j;
        }
      }
      ordine.push(scelto);
      usati.add(scelto);
    }
    const c = costo(ordine);
    if (c < costoMin) {
      costoMin = c;
      migliore = ordine;
    }
  }
  let migliorato = true;
  while (migliorato) {
    migliorato = false;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const nuovo = [...migliore.slice(0, i), ...migliore.slice(i, k + 1).reverse(), ...migliore.slice(k + 1)];
        const c = costo(nuovo);
        if (c + 0.5 < costoMin) {
          costoMin = c;
          migliore = nuovo;
          migliorato = true;
        }
      }
    }
  }
  return migliore.map((i) => tappe[i]);
}

export function useItinerariUtente(luoghiPerId) {
  const [itinerari, setItinerari] = useState([]);
  const rifItinerari = useRef(itinerari); // copia sempre aggiornata, per l'importazione
  rifItinerari.current = itinerari;

  const salva = useCallback((lista) => {
    if (AsyncStorage) AsyncStorage.setItem(CHIAVE, JSON.stringify(lista)).catch(() => {});
    return lista;
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const s = AsyncStorage ? await AsyncStorage.getItem(CHIAVE) : null;
        const salvati = s ? JSON.parse(s) : [];
        if (!vivo || !Array.isArray(salvati)) return;
        // se nel frattempo un luogo è stato tolto dall'app, l'itinerario si ricalcola senza quella tappa
        const validi = salvati
          .filter((it) => it && it.id && Array.isArray(it.tappe))
          .map((it) =>
            it.tappe.every((id) => luoghiPerId[id])
              ? it
              : calcolaItinerario({ ...it, tappe: it.tappe.filter((id) => luoghiPerId[id]) }, luoghiPerId)
          );
        setItinerari((attuali) => [...validi.filter((v) => !attuali.some((a) => a.id === v.id)), ...attuali]);
      } catch {}
    })();
    return () => {
      vivo = false;
    };
  }, [luoghiPerId]);

  // crea (senza id) o aggiorna (con id) un itinerario; restituisce l'id
  const salvaItinerario = useCallback(
    ({ id, titolo, tappe }) => {
      const it = calcolaItinerario({ id: id || `utente-${Date.now()}`, titolo: titolo.trim(), tappe }, luoghiPerId);
      setItinerari((l) => salva(l.some((x) => x.id === it.id) ? l.map((x) => (x.id === it.id ? it : x)) : [...l, it]));
      return it.id;
    },
    [luoghiPerId, salva]
  );

  const eliminaItinerario = useCallback(
    (id) => setItinerari((l) => salva(l.filter((x) => x.id !== id))),
    [salva]
  );

  // aggiunge gli itinerari ricevuti con un link ([{ titolo, tappe }]); salta i luoghi sconosciuti (app più vecchia)
  // e gli itinerari già presenti (stesso nome e stesse tappe). Restituisce quanti ne ha aggiunti.
  const importaItinerari = useCallback(
    (ricevuti) => {
      const attuali = rifItinerari.current;
      const nuovi = [];
      const base = Date.now();
      for (const [i, r] of ricevuti.entries()) {
        const tappe = r.tappe.filter((id) => luoghiPerId[id]);
        if (!r.titolo || tappe.length < 2) continue;
        const doppio = [...attuali, ...nuovi].some((x) => x.titolo === r.titolo && x.tappe.join() === tappe.join());
        if (!doppio) nuovi.push(calcolaItinerario({ id: `utente-${base + i}`, titolo: r.titolo, tappe }, luoghiPerId));
      }
      if (nuovi.length) setItinerari((l) => salva([...l, ...nuovi]));
      return nuovi.length;
    },
    [luoghiPerId, salva]
  );

  return { itinerariUtente: itinerari, salvaItinerario, eliminaItinerario, importaItinerari };
}
