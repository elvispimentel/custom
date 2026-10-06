import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, HEBREW, SANS, SERIF, Props} from '../theme';
import {DiagramFrame} from './Frame';

// Árvore da Vida (leitura clássica, Binah à esquerda de quem olha). Só Binah, Tiferet e o caminho de Zayn ganham destaque.
const N: Record<string, [number, number]> = {
  kether: [960, 120],
  chokmah: [1210, 250],
  binah: [710, 250],
  chesed: [1210, 470],
  gevurah: [710, 470],
  tiferet: [960, 560],
  netzach: [1210, 760],
  hod: [710, 760],
  yesod: [960, 850],
  malkuth: [960, 990],
};
const EDGES: [string, string][] = [
  ['kether', 'chokmah'], ['kether', 'binah'], ['kether', 'tiferet'], ['chokmah', 'binah'], ['chokmah', 'tiferet'],
  ['chokmah', 'chesed'], ['binah', 'gevurah'], ['chesed', 'gevurah'], ['chesed', 'tiferet'], ['gevurah', 'tiferet'],
  ['chesed', 'netzach'], ['gevurah', 'hod'], ['tiferet', 'netzach'], ['tiferet', 'hod'], ['tiferet', 'yesod'],
  ['netzach', 'hod'], ['netzach', 'yesod'], ['hod', 'yesod'], ['yesod', 'malkuth'], ['netzach', 'malkuth'], ['hod', 'malkuth'],
];

export const Zayn: React.FC<Props> = ({rec}) => {
  const f = useCurrentFrame();
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const tree = interpolate(f, [4, 30], [0, 1], clamp);
  const draw = interpolate(f, [34, rec.frames - 40], [0, 1], clamp);
  const [bx, by] = N.binah;
  const [tx, ty] = N.tiferet;
  const len = Math.hypot(tx - bx, ty - by);
  const lit = (k: string) => (k === 'binah' ? 1 : k === 'tiferet' ? interpolate(draw, [0.85, 1], [0, 1], clamp) : 0);
  const glow = 0.6 + 0.4 * Math.sin(f / 5);
  return (
    <DiagramFrame>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <filter id="gl" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <g opacity={tree}>
          {EDGES.map(([a, b], i) => (
            <line key={i} x1={N[a][0]} y1={N[a][1]} x2={N[b][0]} y2={N[b][1]} stroke={C.blueSoft} strokeOpacity={0.4} strokeWidth={3} />
          ))}
          {Object.entries(N).map(([k, [x, y]]) => (
            <circle key={k} cx={x} cy={y} r={44} fill={C.ink} stroke={C.blueSoft} strokeOpacity={0.65} strokeWidth={3} />
          ))}
        </g>
        {/* caminho de Zayn: chama dourada de Binah até Tiferet */}
        <line x1={bx} y1={by} x2={bx + (tx - bx) * draw} y2={by + (ty - by) * draw} stroke={C.goldText} strokeWidth={22} strokeOpacity={0.55 * glow} filter="url(#gl)" />
        <line x1={bx} y1={by} x2={bx + (tx - bx) * draw} y2={by + (ty - by) * draw} stroke={C.goldText} strokeWidth={7} strokeDasharray={`${len}`} />
        {['binah', 'tiferet'].map((k) => (
          <circle key={k} cx={N[k][0]} cy={N[k][1]} r={44} fill={C.gold} fillOpacity={0.35 * lit(k)} stroke={C.goldText} strokeWidth={5} strokeOpacity={lit(k)} />
        ))}
        <g opacity={interpolate(f, [30, 50], [0, 1], clamp)}>
          <text x={bx - 70} y={by + 20} textAnchor="end" fontFamily={SERIF} fontSize={84} fill={C.paper}>Binah</text>
          <text x={tx + 74} y={ty + 78} textAnchor="start" fontFamily={SERIF} fontSize={84} fill={C.paper}>Tiferet</text>
        </g>
        <g opacity={interpolate(f, [50, 70], [0, 1], clamp)}>
          <text x={(bx + tx) / 2 + 150} y={(by + ty) / 2 - 6} textAnchor="start" fontFamily={HEBREW} fontSize={110} fill={C.goldText}>ז</text>
          <text x={(bx + tx) / 2 + 150} y={(by + ty) / 2 + 52} textAnchor="start" fontFamily={SANS} fontWeight={500} fontSize={52} fill={C.goldText}>Zayn</text>
        </g>
      </svg>
    </DiagramFrame>
  );
};
