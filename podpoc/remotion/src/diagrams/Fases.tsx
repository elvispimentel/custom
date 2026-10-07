import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, SANS, SERIF, Props} from '../theme';
import {useIn} from '../comps/common';
import {DiagramFrame} from './Frame';

const COLS = [
  {word: 'Bereshit', verb: 'viu', name: 'Chokmah'},
  {word: 'Bará', verb: 'contou', name: 'Binah'},
  {word: 'Elohim', verb: 'preparou', name: 'Zeir Anpin'},
  {word: 'Et', verb: 'investigou', name: 'Malkuth'},
];

const Col: React.FC<{i: number; at: number; x: number}> = ({i, at, x}) => {
  const p = useIn(at, 22);
  const c = COLS[i];
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 60,
        width: 390,
        height: 340,
        opacity: p,
        transform: `translateY(${(1 - p) * 40}px)`,
        background: 'rgba(26,58,92,0.55)',
        border: `2px solid ${C.gold}`,
        padding: '34px 28px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 52, color: C.goldText}}>{c.word}</div>
      <div style={{fontFamily: SERIF, fontSize: 80, lineHeight: 1, color: C.paper}}>{c.name}</div>
      <div style={{fontFamily: SANS, fontSize: 52, color: C.paper, opacity: 0.9}}>{c.verb}</div>
    </div>
  );
};

export const Fases: React.FC<Props> = ({rec}) => {
  const f = useCurrentFrame();
  const step = (rec.frames - 70) / 4;
  const xs = [100, 100 + 440, 100 + 880, 100 + 1320];
  return (
    <DiagramFrame>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {[0, 1, 2].map((k) => {
          const at = 20 + (k + 1) * step;
          const p = interpolate(f, [at, at + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const x1 = xs[k] + 390 + 6;
          const x2 = xs[k + 1] - 6;
          return (
            <g key={k} opacity={p}>
              <line x1={x1} y1={230} x2={x1 + (x2 - x1) * p} y2={230} stroke={C.goldText} strokeWidth={4} />
              <path d={`M${x2 - 14} 216 L${x2} 230 L${x2 - 14} 244`} fill="none" stroke={C.goldText} strokeWidth={4} />
            </g>
          );
        })}
      </svg>
      {COLS.map((_, i) => (
        <Col key={i} i={i} at={20 + i * step} x={xs[i]} />
      ))}
    </DiagramFrame>
  );
};
