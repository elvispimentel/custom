import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, HEBREW, SANS, SERIF, Props} from '../theme';
import {useIn} from '../comps/common';
import {DiagramFrame} from './Frame';

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
const X0 = 120;
const STEP = 440;
const CW = 380;

const Cell: React.FC<{x: number; y: number; at: number; big: string; small: string; font: string; color?: string}> = ({x, y, at, big, small, font, color = C.paper}) => {
  const p = useIn(at, 20);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: CW,
        height: 230,
        textAlign: 'center',
        opacity: p,
        transform: `translateY(${(1 - p) * 28}px)`,
        background: 'rgba(26,58,92,0.5)',
        borderTop: `2px solid ${C.gold}`,
      }}
    >
      <div style={{fontFamily: font, fontWeight: 500, fontSize: 130, lineHeight: 1.1, color}}>{big}</div>
      <div style={{fontFamily: SANS, fontSize: 52, color: C.paper, opacity: 0.92}}>{small}</div>
    </div>
  );
};

export const BradenMapa: React.FC<Props> = ({rec}) => {
  const f = useCurrentFrame();
  const total = rec.frames;
  const s = (total - 80) / 3; // fase 1: elementos, 2: letras, 3: bases
  return (
    <DiagramFrame>
      {EL.map((e, i) => (
        <Cell key={'e' + i} x={X0 + i * STEP} y={90} at={14 + i * 6} big={e.sym} small={e.name} font={SERIF} color={C.goldText} />
      ))}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {EL.map((_, i) => {
          const at = 14 + s + i * 6;
          const p = interpolate(f, [at, at + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const x = X0 + i * STEP + CW / 2;
          return (
            <g key={i} opacity={p}>
              <line x1={x} y1={330} x2={x} y2={330 + 66 * p} stroke={C.goldText} strokeWidth={4} />
              <path d={`M${x - 12} 386 L${x} 400 L${x + 12} 386`} fill="none" stroke={C.goldText} strokeWidth={4} />
            </g>
          );
        })}
        {(() => {
          const at = 14 + 2 * s;
          const p = interpolate(f, [at, at + 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const xa = X0 + CW / 2;
          const xb = X0 + 3 * STEP + CW / 2;
          return (
            <g opacity={p}>
              <line x1={xa} y1={705} x2={xa + (xb - xa) * p} y2={705} stroke={C.goldText} strokeWidth={4} />
              <line x1={(xa + xb) / 2} y1={705} x2={(xa + xb) / 2} y2={745} stroke={C.goldText} strokeWidth={4} />
              <line x1={xa} y1={705} x2={xa} y2={685} stroke={C.goldText} strokeWidth={4} />
              <line x1={xb} y1={705} x2={xb} y2={685} stroke={C.goldText} strokeWidth={4} />
            </g>
          );
        })()}
      </svg>
      {EL.map((e, i) => (
        <Cell key={'h' + i} x={X0 + i * STEP} y={405} at={14 + s + i * 6} big={e.he} small={e.letter} font={HEBREW} />
      ))}
      {BASES.map((b, i) => (
        <Cell key={'b' + i} x={X0 + i * STEP} y={760} at={14 + 2 * s + i * 6} big={b.sym} small={b.name} font={SERIF} color={C.goldText} />
      ))}
    </DiagramFrame>
  );
};
