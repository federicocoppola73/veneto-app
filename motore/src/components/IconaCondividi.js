import React from 'react';
import { View } from 'react-native';

// Icona "condividi" disegnata con elementi nativi (tre pallini collegati):
// nitida a qualsiasi dimensione e senza librerie aggiuntive. Disegno su una griglia 24×24.
export default function IconaCondividi({ colore = '#0f3d5e', misura = 26 }) {
  const k = misura / 24;
  const pallino = (x, y) => ({
    position: 'absolute',
    left: (x - 3) * k,
    top: (y - 3) * k,
    width: 6 * k,
    height: 6 * k,
    borderRadius: 3 * k,
    backgroundColor: colore,
  });
  const linea = (x1, y1, x2, y2) => {
    const lunghezza = Math.hypot(x2 - x1, y2 - y1);
    const angolo = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    return {
      position: 'absolute',
      width: lunghezza * k,
      height: 2 * k,
      left: (mx - lunghezza / 2) * k,
      top: (my - 1) * k,
      backgroundColor: colore,
      transform: [{ rotate: `${angolo}deg` }],
    };
  };
  return (
    <View style={{ width: misura, height: misura }}>
      <View style={linea(6, 12, 18, 5)} />
      <View style={linea(6, 12, 18, 19)} />
      <View style={pallino(6, 12)} />
      <View style={pallino(18, 5)} />
      <View style={pallino(18, 19)} />
    </View>
  );
}
