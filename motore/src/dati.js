// Dati JSON della città attiva (luoghi, mappa, orari, curiosità…). Sono caricati dal pacchetto
// all'apertura della città; ogni lettura prende il valore corrente.
const CACHE = {};
export function impostaDati(nome, valore) {
  CACHE[nome] = valore;
}
export function datiProxy(nome) {
  return new Proxy(
    {},
    {
      get: (_, chiave) => (CACHE[nome] ? CACHE[nome][chiave] : undefined),
      has: (_, chiave) => !!CACHE[nome] && chiave in CACHE[nome],
      ownKeys: () => (CACHE[nome] ? Reflect.ownKeys(CACHE[nome]) : []),
      getOwnPropertyDescriptor: (_, chiave) =>
        CACHE[nome] && chiave in CACHE[nome]
          ? { enumerable: true, configurable: true, value: CACHE[nome][chiave] }
          : undefined,
    }
  );
}
