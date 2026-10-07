import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, ELVIS, HEBREW, SANS, Props} from '../theme';
import {useIn} from '../comps/common';
import {DiagramFrame} from './Frame';

const L = [
  {he: 'י', name: 'Yod'},
  {he: 'ה', name: 'Heh'},
  {he: 'ו', name: 'Vav'},
  {he: 'ה', name: 'Heh'},
];

const Letter: React.FC<{i: number}> = ({i}) => {
  const p = useIn(8 + i * 14, 22);
  return (
    <div style={{width: 250, textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 40}px)`}}>
      <div style={{fontFamily: HEBREW, fontWeight: 500, fontSize: 190, lineHeight: 1.05, color: C.goldText}}>{L[i].he}</div>
      <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 56, color: C.paper}}>{L[i].name}</div>
    </div>
  );
};

// hebraico lê-se da direita para a esquerda: Yod fica à direita
export const Tetragrama: React.FC<Props> = () => (
  <DiagramFrame>
    <AbsoluteFill style={{width: ELVIS.x, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{display: 'flex', flexDirection: 'row-reverse', gap: 20, direction: 'ltr'}}>
        {L.map((_, i) => (
          <Letter key={i} i={i} />
        ))}
      </div>
    </AbsoluteFill>
  </DiagramFrame>
);
