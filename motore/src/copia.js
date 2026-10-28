import { testoLocalizzato } from './i18n';

// Testi da copiare negli appunti: scheda di un monumento e ricetta di un piatto.
export function testoLuogo(luogo, lingua) {
  const righe = [luogo.nome];
  if (luogo.sestiere) righe.push(`📍 ${luogo.sestiere}`);
  const descrizione = testoLocalizzato(luogo.descrizione, lingua);
  if (descrizione) righe.push('', descrizione);
  return righe.join('\n');
}

export function testoCibo(c, lingua, t) {
  const r = c.ricetta;
  const righe = [c.nome];
  if (c.portata) righe.push(t(`cur_portata_${c.portata}`).replace(/^\S+\s/, ''));
  const testo = testoLocalizzato(c.testo, lingua);
  if (testo) righe.push('', testo);
  if (r) {
    const porzioni = r.resa ? testoLocalizzato(r.resa, lingua) : typeof r.porzioni === 'number' ? t('cur_persone').replace('{n}', r.porzioni) : r.porzioni;
    const preparazione = testoLocalizzato(r.preparazione, lingua);
    const meta = [porzioni, preparazione ? `${t('cur_tempi')}: ${preparazione}` : null].filter(Boolean).join(' · ');
    righe.push('', `${t('cur_ricetta')}${meta ? ' — ' + meta : ''}`);
    righe.push('', `${t('cur_ingredienti')}:`, ...(testoLocalizzato(r.ingredienti, lingua) || []).map((i) => `• ${i}`));
    righe.push('', `${t('cur_procedimento')}:`, ...(testoLocalizzato(r.passaggi, lingua) || []).map((p, n) => `${n + 1}. ${p}`));
  }
  return righe.join('\n');
}
