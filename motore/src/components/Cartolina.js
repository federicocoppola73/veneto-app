import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import IMMAGINI from '../immagini';
import { CATEGORIE, coloreCategoria } from '../categorie';
import { testoLocalizzato } from '../i18n';
import { immagine } from '../risorse';

// Cartolina 9:16 da condividere come immagine (catturata con react-native-view-shot).
// Dimensioni logiche 360×640; l'immagine salvata è 1080×1920 px (3×).
export const LARGHEZZA_CARTOLINA = 360;
export const ALTEZZA_CARTOLINA = 640;
// formato "feed" (4:5), entra intero nel feed di Instagram; "storie" è il 9:16 delle Storie
export const ALTEZZA_FEED = 450;
export const altezzaCartolina = (formato) => (formato === 'feed' ? ALTEZZA_FEED : ALTEZZA_CARTOLINA);
const NOME_APP = 'Venezia: Monumenti & altro';
const LOGO = immagine('icon.png');

// Prima frase (o prime parole) della descrizione, senza tagliare a metà una parola.
export function breveDescrizione(testo, max = 360) {
  if (!testo) return '';
  if (testo.length <= max) return testo;
  const taglio = testo.slice(0, max);
  const fine = Math.max(taglio.lastIndexOf('. '), taglio.lastIndexOf('; '));
  return fine > 80 ? taglio.slice(0, fine + 1) : taglio.replace(/\s+\S*$/, '') + '…';
}

// ref va al contenitore della cartolina, che viene catturato come immagine.
const Cartolina = forwardRef(function Cartolina({ luogo, lingua, testo, t, fotoPropria, formato = 'storie' }, ref) {
  const categoria = CATEGORIE.find((c) => c.id === luogo.categoria);
  const altezza = altezzaCartolina(formato);
  const altezzaFoto = formato === 'feed' ? 180 : 290;
  // formato 4:5 (450 px): meno testo e caratteri più piccoli, altrimenti si sovrappone al piede
  const compatto = formato === 'feed';
  const descrizione = breveDescrizione(testoLocalizzato(luogo.descrizione, lingua), compatto ? 200 : 360);
  // foto scelta dall'utente (se c'è) al posto di quella del luogo
  const foto = fotoPropria ? { uri: fotoPropria } : IMMAGINI[luogo.id];
  const autore = luogo.immagine?.autore;
  const credito = fotoPropria ? '' : autore
    ? `${t('cart_foto')} ${autore}${luogo.immagine?.licenza ? ' · ' + luogo.immagine.licenza : ''}`
    : '';
  const messaggio = (testo || '').trim();

  return (
    <View ref={ref} collapsable={false} style={[styles.carta, { height: altezza }]}>
      <View style={[styles.fotoBox, { height: altezzaFoto }]}>
        {foto ? (
          <Image source={foto} style={styles.foto} resizeMode="cover" />
        ) : (
          <View style={[styles.foto, { backgroundColor: coloreCategoria(luogo.categoria) }]} />
        )}
      </View>

      <View style={styles.corpo}>
        <Text style={[styles.nome, compatto && styles.nomeCompatto]} numberOfLines={2}>{luogo.nome}</Text>
        {luogo.sestiere ? <Text style={styles.sestiere}>{luogo.sestiere}</Text> : null}
        {descrizione ? (
          <Text
            style={[styles.descrizione, compatto && styles.descrizioneCompatta]}
            numberOfLines={compatto ? (messaggio ? 2 : 4) : messaggio ? 6 : 9}
          >
            {descrizione}
          </Text>
        ) : null}
        {messaggio ? (
          <Text style={[styles.messaggio, compatto && styles.messaggioCompatto]} numberOfLines={compatto ? 2 : 3}>
            “{messaggio}”
          </Text>
        ) : null}
      </View>

      {credito ? <Text style={styles.credito} numberOfLines={1}>{credito}</Text> : null}

      <View style={styles.piede}>
        <Image source={LOGO} style={styles.logo} />
        <View style={styles.piedeTesto}>
          <Text style={styles.invito} numberOfLines={2}>{t('cart_invito')}</Text>
          <Text style={styles.app}>{NOME_APP}</Text>
          <Text style={styles.link} numberOfLines={1}>{t('cart_scarica')}</Text>
        </View>
        {categoria ? <Text style={styles.icona}>{categoria.icona}</Text> : null}
      </View>
    </View>
  );
});

export default Cartolina;

const styles = StyleSheet.create({
  carta: {
    width: LARGHEZZA_CARTOLINA,
    height: ALTEZZA_CARTOLINA,
    backgroundColor: '#fbf7f0',
    overflow: 'hidden',
  },
  fotoBox: { height: 290 },
  foto: { width: '100%', height: '100%' },
  corpo: { flex: 1, paddingHorizontal: 22, paddingTop: 16 },
  nome: { fontSize: 26, fontWeight: '800', color: '#0f3d5e' },
  sestiere: { fontSize: 13, color: '#64748b', marginTop: 2 },
  descrizione: { fontSize: 14, lineHeight: 19, color: '#334155', marginTop: 10 },
  messaggio: { fontSize: 16, fontStyle: 'italic', color: '#9a3412', marginTop: 12 },
  nomeCompatto: { fontSize: 21 },
  descrizioneCompatta: { fontSize: 12.5, lineHeight: 16, marginTop: 6 },
  messaggioCompatto: { fontSize: 13, marginTop: 6 },
  credito: { fontSize: 9, color: '#64748b', paddingHorizontal: 22, paddingBottom: 4 },
  piede: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f3d5e',
    paddingHorizontal: 20,
  },
  logo: { width: 44, height: 44, borderRadius: 10 },
  piedeTesto: { flex: 1 },
  invito: { color: '#fff', fontSize: 13, fontWeight: '700' },
  app: { color: '#bae6fd', fontSize: 12, marginTop: 2 },
  link: { color: '#e0f2fe', fontSize: 9, marginTop: 2 },
  icona: { color: '#fff', fontSize: 20 },
});
