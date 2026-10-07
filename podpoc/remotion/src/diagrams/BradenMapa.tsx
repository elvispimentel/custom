import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, HEBREW, SANS, SERIF, Props} from '../theme';
import {useIn} from '../comps/common';
import {DiagramFrame} from './Frame';

// Coluna esquerda da tela (x < 1180): quatro linhas elemento -> letra, e as quatro bases à direita.
const EL = [
  {sym: 'H', name: 'Hidrogênio', he: 'י', letter: 'Yod'},
  {sym: 'N', name: 'Nitrogênio', he: 'ה', letter: 'Heh'},
  {sym: 'O', name: 'Oxigênio', he: 'ו', letter: 'Vav'},
  {sym: 'C', name: 'Carbono', he: 'ה', letter: 'Heh'},
];
const BASES = [
  {sym: 'A', name: 'adenina'},
  {sym: 'C', name: 'citosina'},
  {sym: 'T', name: 'timina'},
  {sym: 'G', name: 'guanina'},
];
const ROW_Y = [60, 290, 520, 750];
const ROW_H = 200;
const X_EL = 60;
const X_HE = 440;
const CELL_W = 300;
const X_BR = 770; // colchete
const X_BASES = 830;

const Cell: React.FC<{x: number; y: number; at: number; big: string; small: string; font: string; size: number; color?: string}> = ({x, y, at, big, small, font, size, color = C.paper}) => {
  const p = useIn(at, 20);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: CELL_W,
        height: ROW_H,
        textAlign: 'center',
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px)`,
        background: 'rgba(26,58,92,0.5)',
        borderTop: `2px solid ${C.gold}`,
        paddingTop: 10,
        boxSizing: 'border-box',
      }}
    >
      <div style={{fontFamily: font, fontWeight: 500, fontSize: size, lineHeight: 1.1, color}}>{big}</div>
      <div style={{fontFamily: SANS, fontSize: 48, color: C.paper, opacity: 0.92}}>{small}</div>
    </div>
  );
};

export const BradenMapa: React.FC<Props> = ({rec}) => {
  const f = useCurrentFrame();
  const s = (rec.frames - 80) / 3; // fase 1: elementos, 2: letras, 3: bases
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const bracket = interpolate(f, [14 + 2 * s, 14 + 2 * s + 20], [0, 1], clamp);
  const yTop = ROW_Y[0] + ROW_H / 2;
  const yBot = ROW_Y[3] + ROW_H / 2;
  const yMid = (yTop + yBot) / 2;
  return (
    <DiagramFrame>
      {EL.map((e, i) => (
        <Cell key={'e' + i} x={X_EL} y={ROW_Y[i]} at={14 + i * 6} big={e.sym} small={e.name} font={SERIF} size={84} color={C.goldText} />
      ))}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {EL.map((_, i) => {
          const at = 14 + s + i * 6;
          const p = interpolate(f, [at, at + 16], [0, 1], clamp);
          const y = ROW_Y[i] + ROW_H / 2;
          const x1 = X_EL + CELL_W + 8;
          const x2 = X_HE - 8;
          return (
            <g key={i} opacity={p}>
              <line x1={x1} y1={y} x2={x1 + (x2 - x1) * p} y2={y} stroke={C.goldText} strokeWidth={4} />
              <path d={`M${x2 - 14} ${y - 12} L${x2} ${y} L${x2 - 14} ${y + 12}`} fill="none" stroke={C.goldText} strokeWidth={4} />
            </g>
          );
        })}
        <g opacity={bracket} fill="none" stroke={C.goldText} strokeWidth={4}>
          <path d={`M${X_BR - 14} ${yTop} H${X_BR} V${yBot} H${X_BR - 14}`} />
          <line x1={X_BR} y1={yMid} x2={X_BR + 40} y2={yMid} />
        </g>
      </svg>
      {EL.map((e, i) => (
        <Cell key={'h' + i} x={X_HE} y={ROW_Y[i]} at={14 + s + i * 6} big={e.he} small={e.letter} font={HEBREW} size={100} />
      ))}
      <div style={{position: 'absolute', left: X_BASES, top: yMid - 170, width: 330}}>
        {BASES.map((b, i) => {
          const p = useIn(14 + 2 * s + i * 6, 20);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 20, height: 85, opacity: p, transform: `translateX(${(1 - p) * 24}px)`}}>
              <span style={{fontFamily: SERIF, fontSize: 72, color: C.goldText, width: 64}}>{b.sym}</span>
              <span style={{fontFamily: SANS, fontSize: 48, color: C.paper}}>{b.name}</span>
            </div>
          );
        })}
      </div>
    </DiagramFrame>
  );
};
