// Scheda di una città nella schermata iniziale.
// Stati:
// - non acquistata: badge "Versione gratuita", Visita (con i MB della prova se non è ancora scaricata) + Acquista
// - acquistata e scaricata: badge "Acquistata", Apri + cestino; con un aggiornamento anche Aggiorna (e badge "Novità")
// - acquistata ma non sul telefono (cancellata, o comprata mentre c'era la prova): badge "Acquistata" + Scarica
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  IconaAggiorna,
  IconaCarrello,
  IconaCestino,
  IconaFreccia,
  IconaOcchio,
  IconaScarica,
  IconaSpunta,
} from './IconeHome';

export const VERDE = '#17483a';
const CREMA_SCHEDA = '#fbf9f3';
const BORDO = '#e7e1d3';
const TESTO = '#1c2b26';
const GRIGIO = '#5b6b64';

export default function SchedaCitta({
  citta,
  motto,
  copertina,
  coloreSfondo,
  t,
  acquistata,
  completaInstallata,
  provaInstallata,
  aggiornabile,
  impegnata,
  percentuale,
  prezzo,
  onVisita,
  onAcquista,
  onApri,
  onAggiorna,
  onCancella,
  onScarica,
}) {
  const disponibile = !!citta.pacchetto;
  return (
    <View style={styles.scheda}>
      <View style={[styles.immagine, { backgroundColor: coloreSfondo }]}>
        {copertina ? <Image source={copertina} style={styles.copertina} /> : null}
        {disponibile &&
          (acquistata ? (
            <View style={[styles.badge, styles.badgeAcquistata]}>
              <IconaSpunta />
              <Text style={styles.badgeAcquistataTesto}>{t.acquistata}</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeGratuita]}>
              <Text style={styles.badgeGratuitaTesto}>{t.versioneGratuita}</Text>
            </View>
          ))}
        {acquistata && completaInstallata && aggiornabile ? (
          <View style={styles.novita}>
            <Text style={styles.novitaTesto}>{t.novita}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.corpo}>
        <Text style={styles.nome} numberOfLines={1}>{citta.nome}</Text>
        <Text style={styles.motto} numberOfLines={2}>{motto}</Text>

        <View style={styles.pulsanti}>
          {!disponibile ? (
            <Text style={styles.nonDisponibile}>{t.nonAncora}</Text>
          ) : impegnata ? (
            <View style={styles.attesa}>
              {percentuale != null ? (
                <Text style={styles.percentuale}>{percentuale}%</Text>
              ) : (
                <ActivityIndicator color={VERDE} />
              )}
            </View>
          ) : !acquistata ? (
            <>
              <Pressable
                onPress={onVisita}
                style={({ pressed }) => [styles.pulsante, styles.chiaro, pressed && styles.premuto]}
                accessibilityRole="button"
              >
                <IconaOcchio colore={VERDE} />
                <Text style={styles.testoChiaro}>{t.visita}</Text>
                {!provaInstallata && citta.dimensione_prova_mb ? (
                  <Text style={styles.mb}>· {Math.ceil(citta.dimensione_prova_mb)} MB</Text>
                ) : null}
              </Pressable>
              <Pressable
                onPress={onAcquista}
                style={({ pressed }) => [styles.pulsante, styles.scuro, pressed && styles.premuto]}
                accessibilityRole="button"
              >
                <IconaCarrello colore="#fff" />
                <Text style={styles.testoScuro} numberOfLines={1}>
                  {prezzo ? `${t.acquista} ${prezzo}` : t.acquista}
                </Text>
              </Pressable>
            </>
          ) : completaInstallata ? (
            <>
              <View style={styles.riga}>
                <Pressable
                  onPress={onApri}
                  style={({ pressed }) => [styles.pulsante, styles.scuro, { flex: 1 }, pressed && styles.premuto]}
                  accessibilityRole="button"
                >
                  <Text style={styles.testoScuro}>{t.apri}</Text>
                  <IconaFreccia colore="#fff" />
                </Pressable>
                <Pressable
                  onPress={onCancella}
                  style={({ pressed }) => [styles.pulsante, styles.cestino, pressed && styles.premuto]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.cancella} ${citta.nome}`}
                  hitSlop={4}
                >
                  <IconaCestino colore={GRIGIO} />
                </Pressable>
              </View>
              {aggiornabile ? (
                <Pressable
                  onPress={onAggiorna}
                  style={({ pressed }) => [styles.pulsante, styles.chiaro, pressed && styles.premuto]}
                  accessibilityRole="button"
                >
                  <IconaAggiorna colore={VERDE} />
                  <Text style={styles.testoChiaro}>{t.aggiorna}</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <Pressable
              onPress={onScarica}
              style={({ pressed }) => [styles.pulsante, styles.scuro, pressed && styles.premuto]}
              accessibilityRole="button"
            >
              <IconaScarica colore="#fff" />
              <Text style={styles.testoScuro} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {t.scarica}
                {citta.dimensione_mb ? <Text style={styles.mbChiaro}> · {Math.ceil(citta.dimensione_mb)} MB</Text> : null}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scheda: {
    flex: 1,
    backgroundColor: CREMA_SCHEDA,
    borderWidth: 1,
    borderColor: BORDO,
    borderRadius: 16,
    overflow: 'hidden',
  },
  immagine: { height: 108, overflow: 'hidden' },
  copertina: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    left: 8,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 4,
  },
  badgeAcquistata: { backgroundColor: VERDE, paddingLeft: 5, paddingRight: 9 },
  badgeAcquistataTesto: { color: '#fff', fontSize: 11, fontWeight: '700' },
  badgeGratuita: { backgroundColor: 'rgba(251,249,243,0.95)', paddingHorizontal: 9 },
  badgeGratuitaTesto: { color: VERDE, fontSize: 11, fontWeight: '700' },
  novita: { position: 'absolute', right: 8, top: 8, backgroundColor: '#f3c86a', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  novitaTesto: { color: '#3d2b00', fontSize: 10.5, fontWeight: '800' },
  corpo: { flex: 1, padding: 10, paddingBottom: 12 },
  nome: { color: TESTO, fontSize: 17, fontWeight: '700' },
  motto: { color: GRIGIO, fontSize: 12.5, lineHeight: 16, marginTop: 2, minHeight: 32 },
  pulsanti: { marginTop: 'auto', paddingTop: 10, gap: 8 },
  riga: { flexDirection: 'row', gap: 8 },
  pulsante: {
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  chiaro: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: VERDE },
  scuro: { backgroundColor: VERDE },
  cestino: { width: 44, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d6cfbf', paddingHorizontal: 0 },
  premuto: { opacity: 0.75 },
  testoChiaro: { color: VERDE, fontSize: 14, fontWeight: '700' },
  testoScuro: { color: '#fff', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  mb: { color: GRIGIO, fontSize: 11.5, fontWeight: '500' },
  mbChiaro: { color: '#d7e6df', fontSize: 11.5, fontWeight: '500' },
  nonDisponibile: { color: '#94a3b8', fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: 12 },
  attesa: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  percentuale: { color: VERDE, fontSize: 16, fontWeight: '800' },
});
