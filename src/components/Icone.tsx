// Icone SVG minimali (stile linea, 24x24)
import type { ReactNode } from 'react';

const Svg = ({ children, size = 24 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const IconaSchede = () => (
  <Svg><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" /></Svg>
);
export const IconaCalendario = () => (
  <Svg><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>
);
export const IconaGrafico = () => (
  <Svg><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 6-7" /></Svg>
);
export const IconaDieta = () => (
  <Svg><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Svg>
);
export const IconaPiu = () => <Svg><path d="M12 5v14M5 12h14" /></Svg>;
export const IconaIndietro = () => <Svg><path d="M15 18l-6-6 6-6" /></Svg>;
export const IconaAvanti = () => <Svg><path d="M9 18l6-6-6-6" /></Svg>;
export const IconaMatita = () => <Svg size={20}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>;
export const IconaCestino = () => <Svg size={20}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></Svg>;
export const IconaSu = () => <Svg size={20}><path d="M18 15l-6-6-6 6" /></Svg>;
export const IconaGiu = () => <Svg size={20}><path d="M6 9l6 6 6-6" /></Svg>;
export const IconaCopia = () => <Svg size={20}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Svg>;
export const IconaStella = ({ piena }: { piena?: boolean }) => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill={piena ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
  </svg>
);
export const IconaImpostazioni = () => (
  <Svg><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>
);
export const IconaCondividi = () => <Svg size={22}><path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></Svg>;
