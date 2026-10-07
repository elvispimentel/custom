import React from 'react';
import {AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, ELVIS, SANS, Props} from '../theme';
import {Duotone, FilmLook, findImage, useFadeOut, useIn} from './common';

// corte de arquivo: imagem real duotone com parallax (fundo desfocado + primeiro plano), legenda embaixo
export const ArchiveCard: React.FC<Props> = ({rec, available}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const out = useFadeOut(10);
  const inn = useIn(0, 14);
  const srcs = (rec.images ?? []).map((i) => findImage(available, i)).filter(Boolean) as string[];
  const bgShift = interpolate(f, [0, durationInFrames], [-24, 24]);
  const n = srcs.length || 1;
  const w = n === 1 ? 1020 : 500;
  return (
    <AbsoluteFill style={{background: C.ink, opacity: out}}>
      {srcs[0] && (
        <Img
          src={srcs[0]}
          style={{
            position: 'absolute',
            inset: -80,
            width: 2080,
            height: 1240,
            objectFit: 'cover',
            filter: 'grayscale(1) blur(36px) brightness(0.45)',
            transform: `translateX(${bgShift}px)`,
            opacity: 0.55,
          }}
        />
      )}
      <AbsoluteFill style={{width: ELVIS.x, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 40, paddingBottom: 90, opacity: inn}}>
        {srcs.map((s) => (
          <div key={s} style={{transform: `translateY(${(1 - inn) * 26}px)`}}>
            <Duotone src={s} width={w} height={760} fit="contain" drift={2} />
          </div>
        ))}
      </AbsoluteFill>
      {rec.caption && (
        <div
          style={{
            position: 'absolute',
            left: 96,
            bottom: 70,
            padding: '16px 32px 18px 28px',
            borderLeft: `6px solid ${C.gold}`,
            background: '#1F1F33',
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: 40,
            color: C.paper,
          }}
        >
          {rec.caption}
        </div>
      )}
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <FilmLook grain={0.05} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
