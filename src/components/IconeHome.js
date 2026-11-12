// Icone della schermata iniziale (contorno, disegnate su griglia 24×24)
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const base = (misura, colore, spessore = 1.8) => ({
  width: misura,
  height: misura,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: colore,
  strokeWidth: spessore,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const IconaMonumenti = ({ misura = 28, colore }) => (
  <Svg {...base(misura, colore, 1.7)}>
    <Path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18" />
  </Svg>
);

export const IconaPassi = ({ misura = 28, colore }) => (
  <Svg {...base(misura, colore, 1.7)}>
    <Path d="M7 4c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM5 16.5h4v1.5a2 2 0 0 1-4 0zM17 8c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM15 20.5h4" />
  </Svg>
);

export const IconaLente = ({ misura = 28, colore }) => (
  <Svg {...base(misura, colore, 1.7)}>
    <Circle cx={10.5} cy={10.5} r={6.5} />
    <Path d="M15.5 15.5L21 21" />
  </Svg>
);

export const IconaPosate = ({ misura = 28, colore }) => (
  <Svg {...base(misura, colore, 1.7)}>
    <Path d="M6 3v7a2 2 0 0 0 2 2v9M10 3v7a2 2 0 0 1-2 2M8 3v6M17 21V3c-2.5 1-3.5 4-3.5 7.5 0 1.5 1 2.5 3.5 2.5" />
  </Svg>
);

export const IconaCalendario = ({ misura = 28, colore }) => (
  <Svg {...base(misura, colore, 1.7)}>
    <Rect x={3.5} y={5} width={17} height={15.5} rx={2} />
    <Path d="M3.5 10h17M8 3v4M16 3v4M8 14h1M12 14h1M16 14h1M8 17h1M12 17h1" />
  </Svg>
);

export const IconaNuvola = ({ misura = 36, colore }) => (
  <Svg {...base(misura, colore, 1.6)}>
    <Path d="M7 17.5H6a4 4 0 0 1-.5-7.97A6 6 0 0 1 17.3 8.1 4.5 4.5 0 0 1 18 17.5h-1M12 11v9M9 17l3 3 3-3" />
  </Svg>
);

export const IconaGlobo = ({ misura = 16, colore }) => (
  <Svg {...base(misura, colore, 1.8)}>
    <Circle cx={12} cy={12} r={9} />
    <Path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
  </Svg>
);

export const IconaGiu = ({ misura = 12, colore }) => (
  <Svg {...base(misura, colore, 2.4)}>
    <Path d="M6 9l6 6 6-6" />
  </Svg>
);

export const IconaOcchio = ({ misura = 16, colore }) => (
  <Svg {...base(misura, colore, 2)}>
    <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <Circle cx={12} cy={12} r={3} />
  </Svg>
);

export const IconaCarrello = ({ misura = 17, colore }) => (
  <Svg {...base(misura, colore, 2)}>
    <Path d="M2.5 3.5h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.3a1.5 1.5 0 0 0 1.5-1.1L21 8H6.5" />
    <Circle cx={10} cy={20} r={1.4} />
    <Circle cx={17.5} cy={20} r={1.4} />
  </Svg>
);

export const IconaFreccia = ({ misura = 16, colore }) => (
  <Svg {...base(misura, colore, 2.2)}>
    <Path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const IconaAggiorna = ({ misura = 16, colore }) => (
  <Svg {...base(misura, colore, 2.1)}>
    <Path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5" />
  </Svg>
);

export const IconaCestino = ({ misura = 18, colore }) => (
  <Svg {...base(misura, colore, 1.9)}>
    <Path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </Svg>
);

export const IconaScarica = ({ misura = 16, colore }) => (
  <Svg {...base(misura, colore, 2.1)}>
    <Path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Svg>
);

export const IconaSpunta = ({ misura = 14 }) => (
  <Svg width={misura} height={misura} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={11} fill="#4caf72" />
    <Path d="M7 12.5l3.2 3L17 9" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
