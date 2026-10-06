import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, HEBREW, SANS, Props} from '../theme';
import {useIn} from '../comps/common';
import {DiagramFrame} from './Frame';

// Gênesis 1:1, primeiras quatro palavras, em tipografia própria (texto bíblico, fonte SIL OFL).
// Bereshit ganha o destaque dourado; hebraico lê-se da direita para a esquerda.
const W4 = [
  {he: 'בְּרֵאשִׁית', tr: 'Bereshit'},
  {he: 'בָּרָא', tr: 'Bará'},
  {he: 'אֱלֹהִים', tr: 'Elohim'},
  {he: 'אֵת', tr: 'Et'},
];

const Word: React.FC<{i: number}> = ({i}) => {
  const p = useIn(6 + i * 10, 22);
  const hot = i === 0;
  return (
    <div style={{textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 36}px)`, minWidth: 330}}>
      <div style={{fontFamily: HEBREW, fontWeight: 500, fontSize: 170, lineHeight: 1.15, color: hot ? C.goldText : C.paper}}>{W4[i].he}</div>
      <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 56, color: hot ? C.goldText : C.paper, opacity: hot ? 1 : 0.9}}>{W4[i].tr}</div>
    </div>
  );
};

export const GenesisHebraico: React.FC<Props> = () => (
  <DiagramFrame>
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{display: 'flex', flexDirection: 'row-reverse', gap: 50, direction: 'ltr'}}>
        {W4.map((_, i) => (
          <Word key={i} i={i} />
        ))}
      </div>
    </AbsoluteFill>
  </DiagramFrame>
);
