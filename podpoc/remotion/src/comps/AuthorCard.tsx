import React from 'react';
import {AbsoluteFill, Img, useCurrentFrame} from 'remotion';
import {Props} from '../theme';
import {Duotone, findImage, useFadeOut, useIn} from './common';
import {LowerThird} from './LowerThird';

// foto (duotone) à esquerda, capa em português à direita, lower third embaixo.
// Se a imagem ainda não existe em assets/img, o painel some e sobra o lower third.
export const AuthorCard: React.FC<Props> = ({rec, available}) => {
  const out = useFadeOut(12);
  const photo = findImage(available, rec.photo);
  const cover = findImage(available, rec.cover);
  const a = useIn(6, 20);
  const b = useIn(12, 20);
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: out}}>
        {photo && (
          <div style={{position: 'absolute', left: 96, top: 130, clipPath: `inset(0 ${(1 - a) * 100}% 0 0)`}}>
            <Duotone src={photo} width={380} height={500} fit="contain" />
          </div>
        )}
        {cover && (
          <div
            style={{
              position: 'absolute',
              right: 96,
              top: 130,
              width: 340,
              height: 500,
              boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
              opacity: b,
              transform: `translateY(${(1 - b) * 30}px) scale(${1 + f * 0.0006})`,
              overflow: 'hidden',
            }}
          >
            <Img src={cover} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </div>
        )}
      </AbsoluteFill>
      <LowerThird rec={rec} />
    </AbsoluteFill>
  );
};
