import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { nomeCitta } from '../citta';
import { inviaSegnalazione, MAX_FOTO_BYTE, segnalazioniAttive, TIPI_APP, TIPI_SEGNALAZIONE } from '../segnalazioni';

const BLU = '#0f3d5e';

const IconaBandiera = ({ colore = '#334155' }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Svg>
);

const IconaSpunta = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

const IconaFoto = ({ colore = BLU }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
    <Path d="M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
  </Svg>
);

// Pulsante "Segnala un problema" in fondo alla scheda del luogo.
// Si mostra solo se l'indirizzo delle segnalazioni è impostato (motore/src/segnalazioni.js).
export default function SegnalaProblema({ luogo, lingua, t }) {
  const [aperta, setAperta] = useState(false);
  if (!segnalazioniAttive() || !luogo) return null;
  return (
    <>
      <View style={styles.contenitorePulsante}>
        <Pressable
          onPress={() => setAperta(true)}
          style={({ pressed }) => [styles.pulsante, pressed && { backgroundColor: '#f1f5f9' }]}
          accessibilityRole="button"
          testID="segnala-problema"
        >
          <IconaBandiera />
          <Text style={styles.testoPulsante}>{t('seg_pulsante')}</Text>
        </Pressable>
      </View>
      {aperta && <FinestraSegnalazione ambito="luogo" luogo={luogo} lingua={lingua} t={t} onChiudi={() => setAperta(false)} />}
    </>
  );
}

// Pulsante "Segnala un problema dell'app" (schermata Info e home): stessa finestra, con email e foto facoltative.
// citta: nome della città aperta, se c'è
export function SegnalaApp({ lingua, t, citta = '', stile }) {
  const [aperta, setAperta] = useState(false);
  if (!segnalazioniAttive()) return null;
  return (
    <>
      <Pressable
        onPress={() => setAperta(true)}
        style={({ pressed }) => [styles.pulsante, stile, pressed && { backgroundColor: '#f1f5f9' }]}
        accessibilityRole="button"
        testID="segnala-app"
      >
        <IconaBandiera />
        <Text style={styles.testoPulsante}>{t('sapp_pulsante')}</Text>
      </Pressable>
      {aperta && <FinestraSegnalazione ambito="app" citta={citta} lingua={lingua} t={t} onChiudi={() => setAperta(false)} />}
    </>
  );
}

// ambito: 'luogo' (scheda di un luogo) | 'app' (problemi dell'app, con email e foto facoltative)
function FinestraSegnalazione({ ambito, luogo, citta: cittaApp, lingua, t, onChiudi }) {
  const insets = useSafeAreaInsets();
  const app = ambito === 'app';
  const [tipo, setTipo] = useState(null);
  const [descrizione, setDescrizione] = useState('');
  const [email, setEmail] = useState('');
  const [foto, setFoto] = useState(null); // { uri, base64, mime }
  const [avvisoFoto, setAvvisoFoto] = useState('');
  const [stato, setStato] = useState('modulo'); // modulo | invio | inviata | in_attesa | limite
  const citta = app ? cittaApp : nomeCitta();
  const tipi = app ? TIPI_APP : TIPI_SEGNALAZIONE;
  const prefisso = app ? 'sapp_' : 'seg_';
  const emailValida = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function scegliFoto() {
    setAvvisoFoto('');
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
      const a = r.assets?.[0];
      if (r.canceled || !a?.base64) return;
      // dimensione reale della foto: 3 byte ogni 4 caratteri base64
      if ((a.base64.length * 3) / 4 > MAX_FOTO_BYTE) {
        setAvvisoFoto(t('sapp_fotoGrande'));
        return;
      }
      setFoto({ uri: a.uri, base64: a.base64, mime: a.mimeType || 'image/jpeg' });
    } catch {
      setAvvisoFoto(t('sapp_fotoErrore'));
    }
  }

  async function invia() {
    if (!tipo || !emailValida || stato === 'invio') return;
    setStato('invio');
    const esito = await inviaSegnalazione({
      ambito,
      luogo,
      citta,
      tipo,
      descrizione,
      lingua,
      email: app ? email.trim() : '',
      foto: app && foto ? { base64: foto.base64, mime: foto.mime } : null,
    }).catch(() => 'in_attesa');
    setStato(esito);
  }

  const finito = stato === 'inviata' || stato === 'in_attesa' || stato === 'limite';
  const pronto = !!tipo && emailValida;
  const sottotitolo = app
    ? t('sapp_sottotitolo')
    : t('seg_scheda').replace('{luogo}', luogo.nome).replace('{citta}', citta);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onChiudi}>
      <KeyboardAvoidingView style={styles.sfondo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel={t('chiudi')} />
        <View style={[styles.foglio, { paddingBottom: 18 + insets.bottom }]} accessibilityViewIsModal>
          <View style={styles.maniglia} />
          {finito ? (
            <View style={styles.esito}>
              {stato !== 'limite' && (
                <View style={styles.cerchioOk}>
                  <IconaSpunta />
                </View>
              )}
              <Text style={styles.esitoTitolo}>{stato === 'limite' ? t(`${prefisso}pulsante`) : t('seg_grazie_titolo')}</Text>
              <Text style={styles.esitoTesto}>
                {stato === 'limite'
                  ? t('seg_limite')
                  : stato === 'in_attesa'
                    ? t('seg_attesa')
                    : app
                      ? t(email.trim() ? 'sapp_grazieEmail' : 'sapp_grazie')
                      : t('seg_grazie')}
              </Text>
              <Pressable onPress={onChiudi} style={[styles.invia, styles.inviaAttivo, { alignSelf: 'stretch' }]} accessibilityRole="button">
                <Text style={styles.testoInvia}>{t('chiudi')}</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.testa}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.titolo}>{t(`${prefisso}pulsante`)}</Text>
                  <Text style={styles.sottotitolo}>{sottotitolo}</Text>
                </View>
                <Pressable onPress={onChiudi} hitSlop={10} style={styles.chiudi} accessibilityLabel={t('chiudi')}>
                  <Text style={styles.testoChiudi}>✕</Text>
                </Pressable>
              </View>

              <View style={styles.voci} accessibilityRole="radiogroup" accessibilityLabel={t('seg_tipo')}>
                {tipi.map((id) => {
                  const scelta = tipo === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setTipo(id)}
                      style={[styles.voce, scelta && styles.voceScelta]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: scelta }}
                      testID={`${prefisso}${id}`}
                    >
                      <View style={[styles.pallino, scelta && { borderColor: BLU }]}>
                        {scelta && <View style={styles.punto} />}
                      </View>
                      <Text style={[styles.testoVoce, scelta && styles.testoVoceScelta]}>{t(`${prefisso}${id}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.etichetta}>{t('seg_descrizione')}</Text>
              <TextInput
                value={descrizione}
                onChangeText={setDescrizione}
                placeholder={t(app ? 'sapp_segnaposto' : 'seg_segnaposto')}
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={1000}
                style={styles.campo}
                accessibilityLabel={t('seg_descrizione')}
              />

              {app && (
                <>
                  <Text style={styles.etichetta}>{t('sapp_foto')}</Text>
                  {foto ? (
                    <View style={styles.rigaFoto}>
                      <Image source={{ uri: foto.uri }} style={styles.anteprimaFoto} />
                      <Pressable onPress={() => setFoto(null)} style={styles.togliFoto} accessibilityRole="button">
                        <Text style={styles.testoTogliFoto}>{t('sapp_togliFoto')}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={scegliFoto} style={styles.aggiungiFoto} accessibilityRole="button">
                      <IconaFoto />
                      <Text style={styles.testoAggiungiFoto}>{t('sapp_aggiungiFoto')}</Text>
                    </Pressable>
                  )}
                  {avvisoFoto ? <Text style={styles.avviso}>{avvisoFoto}</Text> : null}

                  <Text style={styles.etichetta}>{t('sapp_email')}</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="nome@esempio.it"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={120}
                    style={[styles.campo, styles.campoRiga, !emailValida && { borderColor: '#dc2626' }]}
                    accessibilityLabel={t('sapp_email')}
                  />
                  <Text style={[styles.notaCampo, !emailValida && { color: '#dc2626' }]}>
                    {emailValida ? t('sapp_emailNota') : t('sapp_emailNonValida')}
                  </Text>
                </>
              )}

              <Pressable
                onPress={invia}
                disabled={!pronto || stato === 'invio'}
                style={[styles.invia, pronto ? styles.inviaAttivo : styles.inviaSpento]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !pronto }}
                testID="segnala-invia"
              >
                {stato === 'invio' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.testoInvia, !pronto && { color: '#64748b' }]}>{t('seg_invia')}</Text>
                )}
              </Pressable>
              <Text style={styles.nota}>{t(app ? 'sapp_nota' : 'seg_nota')}</Text>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenitorePulsante: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0', alignItems: 'center' },
  pulsante: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  testoPulsante: { fontSize: 14, fontWeight: '600', color: '#334155', flexShrink: 1 },
  sfondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  foglio: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10, maxHeight: '92%' },
  maniglia: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 12 },
  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titolo: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  sottotitolo: { fontSize: 13, color: '#64748b', marginTop: 3 },
  chiudi: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  testoChiudi: { fontSize: 15, fontWeight: '700', color: '#475569' },
  voci: { marginTop: 14, gap: 8 },
  voce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  voceScelta: { borderColor: BLU, backgroundColor: '#eef4f9' },
  pallino: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  punto: { width: 10, height: 10, borderRadius: 5, backgroundColor: BLU },
  testoVoce: { flex: 1, fontSize: 15, color: '#334155', fontWeight: '500' },
  testoVoceScelta: { color: BLU, fontWeight: '700' },
  etichetta: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 16 },
  campo: {
    marginTop: 6,
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  campoRiga: { minHeight: 46, textAlignVertical: 'center' },
  notaCampo: { fontSize: 11.5, color: '#64748b', marginTop: 4, lineHeight: 16 },
  aggiungiFoto: {
    marginTop: 6,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testoAggiungiFoto: { fontSize: 14, fontWeight: '700', color: BLU },
  rigaFoto: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 12 },
  anteprimaFoto: { width: 64, height: 96, borderRadius: 8, backgroundColor: '#f1f5f9' },
  togliFoto: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: '#cbd5e1', justifyContent: 'center' },
  testoTogliFoto: { fontSize: 13.5, fontWeight: '600', color: '#334155' },
  avviso: { fontSize: 12, color: '#b45309', marginTop: 4 },
  invia: { marginTop: 14, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  inviaAttivo: { backgroundColor: BLU },
  inviaSpento: { backgroundColor: '#e2e8f0' },
  testoInvia: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  nota: { fontSize: 11.5, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 16 },
  esito: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  cerchioOk: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  esitoTitolo: { fontSize: 19, fontWeight: '800', color: '#0f172a', marginTop: 14, textAlign: 'center' },
  esitoTesto: { fontSize: 14.5, lineHeight: 21, color: '#475569', marginTop: 8, textAlign: 'center' },
});
