// Link alla pagina Wikipedia di un luogo, nella lingua dell'app; se manca, italiano o inglese.
// luoghi.json: "wikipedia": { "it": "Titolo", "en": "Title", ... }
export function linkWikipedia(wiki, lingua) {
  if (!wiki) return null;
  const lang = [lingua, 'it', 'en'].find((l) => wiki[l]);
  if (!lang) return null;
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(wiki[lang].replace(/ /g, '_'))}`;
}
