import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import IconaCopia from './IconaCopia';

// Pulsante che copia negli appunti il testo indicato; per un attimo mostra ✓ come conferma.
export default function PulsanteCopia({ testo, t, style, hitSlop = 10 }) {
  const [fatto, setFatto] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copia = async () => {
    try {
      await Clipboard.setStringAsync(testo);
      setFatto(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFatto(false), 1500);
    } catch (e) {
      // se gli appunti non sono disponibili non si mostra nulla
    }
  };

  return (
    <Pressable
      onPress={copia}
      hitSlop={hitSlop}
      style={({ pressed }) => [style, pressed && { transform: [{ scale: 0.9 }] }]}
      accessibilityRole="button"
      accessibilityLabel={fatto ? t('copia_fatto') : t('copia')}
    >
      {fatto ? <Text style={{ color: '#15803d', fontSize: 20, fontWeight: '800' }}>✓</Text> : <IconaCopia />}
    </Pressable>
  );
}
