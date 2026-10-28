import React from 'react';
import { View } from 'react-native';

// Icona "copia": due fogli sovrapposti, disegnati con elementi nativi su una griglia 24×24.
export default function IconaCopia({ colore = '#0f3d5e', misura = 22 }) {
  const k = misura / 24;
  const foglio = (x, y, sfondo) => ({
    position: 'absolute',
    left: x * k,
    top: y * k,
    width: 12 * k,
    height: 14 * k,
    borderRadius: 2.5 * k,
    borderWidth: Math.max(1.5, 1.8 * k),
    borderColor: colore,
    backgroundColor: sfondo,
  });
  return (
    <View style={{ width: misura, height: misura }}>
      <View style={foglio(8, 2, 'transparent')} />
      <View style={foglio(4, 7, '#fff')} />
    </View>
  );
}
