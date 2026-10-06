import React from 'react';

// Paleta e movimento do canal (CLAUDE.md). Nada de cor fora daqui.
export const C = {
  blue: '#1A3A5C',
  gold: '#B8860B',
  goldText: '#E0B84F', // ouro para texto sobre fundo escuro
  lilac: '#5C4A8A',
  ink: '#1A1A2E',
  paper: '#F2EEE4',
  blueSoft: '#7FA6D6', // tint do azul para dados sobre fundo escuro
  lilacSoft: '#A99BD6',
};

export const SERIF = '"Instrument Serif", "Times New Roman", serif';
export const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
export const HEBREW = '"Frank Ruhl Libre", "Times New Roman", serif';

// spring amortecido: sem ricochete
export const SMOOTH = {damping: 200, stiffness: 100, mass: 1};

export const W = 1920;
export const H = 1080;

export type Rec = {
  id: string;
  kind: 'quote' | 'invite' | 'author' | 'diagram' | 'archive';
  start_s: number;
  dur_s: number;
  frames: number;
  text?: string;
  reveal_s?: number;
  name?: string;
  work?: string;
  year?: string;
  photo?: string;
  cover?: string;
  images?: string[];
  caption?: string;
};

export type Props = {rec: Rec; available: string[]};

// true quando renderizamos o MP4 em fundo verde para chroma key (CapCut): sem transparência parcial nas placas
export const ChromaCtx = React.createContext(false);
