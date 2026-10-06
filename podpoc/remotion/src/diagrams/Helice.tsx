import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, SANS, SERIF, Props} from '../theme';
import {DiagramFrame} from './Frame';

// recriação ilustrativa (desenho próprio): dupla hélice com pares A-T e C-G
const PAIRS = [
  ['A', 'T', C.goldText, C.blueSoft],
  ['C', 'G', C.lilacSoft, C.paper],
];

export const Helice: React.FC<Props> = () => {
  const f = useCurrentFrame();
  const reveal = interpolate(f, [4, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const x0 = 150;
  const x1 = 1770;
  const cy = 400;
  const amp = 200;
  const per = 540;
  const ph = f * 0.045;
  const yA = (x: number) => cy + amp * Math.sin(((x - x0) / per) * 2 * Math.PI + ph);
  const yB = (x: number) => cy - amp * Math.sin(((x - x0) / per) * 2 * Math.PI + ph);
  const pts = (fn: (x: number) => number) =>
    Array.from({length: 163}, (_, i) => {
      const x = x0 + (i * (x1 - x0)) / 162;
      return `${x},${fn(x)}`;
    }).join(' ');
  const rungs = Array.from({length: 30}, (_, i) => x0 + 30 + i * 54);
  return (
    <DiagramFrame>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <clipPath id="rv">
          <rect x={0} y={0} width={x0 + (x1 - x0) * reveal} height={1080} />
        </clipPath>
        <g clipPath="url(#rv)">
          {rungs.map((x, i) => {
            const [a, b, ca, cb] = PAIRS[i % 2];
            const ya = yA(x);
            const yb = yB(x);
            const mid = (ya + yb) / 2;
            const depth = Math.cos(((x - x0) / per) * 2 * Math.PI + ph);
            return (
              <g key={i} opacity={0.55 + 0.45 * Math.abs(depth)}>
                <line x1={x} y1={ya} x2={x} y2={mid} stroke={ca} strokeWidth={7} />
                <line x1={x} y1={mid} x2={x} y2={yb} stroke={cb} strokeWidth={7} />
                <circle cx={x} cy={ya} r={9} fill={ca} />
                <circle cx={x} cy={yb} r={9} fill={cb} />
              </g>
            );
          })}
          <polyline points={pts(yA)} fill="none" stroke={C.goldText} strokeWidth={8} strokeLinecap="round" />
          <polyline points={pts(yB)} fill="none" stroke={C.paper} strokeWidth={8} strokeLinecap="round" strokeOpacity={0.85} />
        </g>
        <g opacity={interpolate(f, [30, 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}>
          {[
            ['A', C.goldText, 330],
            ['C', C.lilacSoft, 650],
            ['T', C.blueSoft, 970],
            ['G', C.paper, 1290],
          ].map(([l, col, x]) => (
            <text key={l as string} x={x as number} y={900} fontFamily={SERIF} fontSize={150} fill={col as string}>{l}</text>
          ))}
          {[
            ['adenina', 430], ['citosina', 750], ['timina', 1070], ['guanina', 1390],
          ].map(([l, x]) => (
            <text key={l as string} x={x as number} y={890} fontFamily={SANS} fontSize={52} fill={C.paper}>{l}</text>
          ))}
        </g>
      </svg>
    </DiagramFrame>
  );
};
