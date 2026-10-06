import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, SANS, SERIF, Rec} from '../theme';
import {useFadeOut, useIn} from './common';

// entra em 0,4 s (12 quadros), fica, sai com fade
export const LowerThird: React.FC<{rec: Rec; left?: number; bottom?: number}> = ({rec, left = 96, bottom = 110}) => {
  const f = useCurrentFrame();
  const inn = useIn(0, 12);
  const out = useFadeOut(12);
  const bar = interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  const sub = [rec.work, rec.year].filter(Boolean).join(' · ');
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div
        style={{
          position: 'absolute',
          left,
          bottom,
          display: 'flex',
          background: 'linear-gradient(90deg, rgba(26,26,46,0.88), rgba(26,26,46,0.72))',
          opacity: inn,
          transform: `translateX(${(1 - inn) * -36}px)`,
        }}
      >
        <div style={{width: 6, background: C.gold, transformOrigin: 'top', transform: `scaleY(${bar})`}} />
        <div style={{padding: '24px 48px 26px 36px'}}>
          <div style={{fontFamily: SERIF, fontSize: 64, lineHeight: 1.05, color: C.paper}}>{rec.name}</div>
          {sub && <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 40, marginTop: 10, color: C.goldText}}>{sub}</div>}
        </div>
      </div>
    </AbsoluteFill>
  );
};
