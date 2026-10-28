// Foto delle curiosità: quella del luogo collegato (luogo_id), come nella scheda del luogo;
// se non c'è un luogo collegato, quella con lo stesso id della curiosità.
import IMMAGINI from './immagini';

export function fotoCuriosita(c) {
  return (c.luogo_id && IMMAGINI[c.luogo_id]) || IMMAGINI[c.id] || null;
}
