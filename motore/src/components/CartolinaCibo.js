import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { testoLocalizzato } from '../i18n';
import { fotoCibo } from '../immaginiCibi';
import { ICONE_PORTATA } from '../curiosita';
import { breveDescrizione, ALTEZZA_CARTOLINA, LARGHEZZA_CARTOLINA } from './Cartolina';
import { immagine } from '../risorse';

const LOGO = immagine('icon.png');
const NOME_APP = 'Venezia: Monumenti & altro';

// Cartolina 9:16 di un piatto, da condividere come immagine (stessa grafica di quella dei luoghi).
const CartolinaCibo = forwardRef(function CartolinaCibo({ cibo: c, lingua, t, testo: messaggioUtente = '' }, ref) {
  const foto = fotoCibo(c);
  const testo = breveDescrizione(testoLocalizzato(c.testo, lingua), 300);
  const credito = c.foto ? `${t('cart_foto')} ${c.foto.autore} · ${c.foto.licenza}` : '';

  return (
    <View ref={ref} collapsable={false} style={styles.carta}>
      <View style={styles.fotoBox}>
        {foto ? (
          <Image source={foto} style={styles.foto} resizeMode="cover" />
        ) : (
          <View style={[styles.foto, styles.segnaposto]}>
            <Text style={styles.iconaGrande}>{ICONE_PORTATA[c.portata] || '🍽'}</Text>
          </View>
        )}
      </View>

      <View style={styles.corpo}>
        {c.portata ? <Text style={styles.portata}>{t(`cur_portata_${c.portata}`)}</Text> : null}
        <Text style={styles.nome} numberOfLines={2}>{c.nome}</Text>
        {testo ? <Text style={styles.testo}>{testo}</Text> : null}
        {messaggioUtente.trim() ? <Text style={styles.messaggio} numberOfLines={3}>“{messaggioUtente.trim()}”</Text> : null}
      </View>

      {credito ? <Text style={styles.credito} numberOfLines={1}>{credito}</Text> : null}

      <View style={styles.piede}>
        <Image source={LOGO} style={styles.logo} />
        <View style={styles.piedeTesto}>
          <Text style={styles.invito} numberOfLines={2}>{t('cart_invito')}</Text>
          <Text style={styles.app}>{NOME_APP}</Text>
          <Text style={styles.link} numberOfLines={1}>{t('cart_scarica')}</Text>
        </View>
      </View>
    </View>
  );
});

export default CartolinaCibo;

const styles = StyleSheet.create({
  carta: { width: LARGHEZZA_CARTOLINA, height: ALTEZZA_CARTOLINA, backgroundColor: '#fbf7f0', overflow: 'hidden' },
  fotoBox: { height: 320 },
  foto: { width: '100%', height: '100%' },
  segnaposto: { backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  iconaGrande: { fontSize: 96 },
  corpo: { flex: 1, paddingHorizontal: 22, paddingTop: 14 },
  portata: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '700', color: '#166534', backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  nome: { fontSize: 26, fontWeight: '800', color: '#0f3d5e', marginTop: 8 },
  testo: { fontSize: 14, lineHeight: 19, color: '#334155', marginTop: 8 },
  messaggio: { fontSize: 16, fontStyle: 'italic', color: '#9a3412', marginTop: 12 },
  credito: { fontSize: 9, color: '#64748b', paddingHorizontal: 22, paddingBottom: 4 },
  piede: { height: 76, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0f3d5e', paddingHorizontal: 20 },
  logo: { width: 44, height: 44, borderRadius: 10 },
  piedeTesto: { flex: 1 },
  invito: { color: '#fff', fontSize: 13, fontWeight: '700' },
  app: { color: '#bae6fd', fontSize: 12, marginTop: 2 },
  link: { color: '#e0f2fe', fontSize: 9, marginTop: 2 },
});
