import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, SERIF, SMOOTH, Props} from '../theme';
import {Plate, useFadeOut, useIn} from './common';
import {spring} from 'remotion';

const Icon: React.FC<{id: string}> = ({id}) => {
  const common = {width: 84, height: 84, viewBox: '0 0 24 24', fill: 'none', stroke: C.goldText, strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  if (id === 'convite-1')
    return (
      <svg {...common}>
        <path d="M7 11v9H4v-9h3zM7 11l4-8c1.5 0 2.5 1 2.2 2.6L12.8 9H19a2 2 0 0 1 2 2.3l-1 6.4A2.5 2.5 0 0 1 17.5 20H7" />
      </svg>
    );
  if (id === 'convite-2')
    return (
      <svg {...common}>
        <path d="M4 5h16v11H9l-5 4V5z" />
      </svg>
    );
  if (id === 'cta-acesso')
    return (
      <svg {...common}>
        <path d="M12 4v14M6 12l6 6 6-6" />
      </svg>
    );
  return null;
};

export const Quote: React.FC<Props> = ({rec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = (rec.text ?? '').split(' ');
  const per = (rec.reveal_s ?? 2) / words.length;
  const out = useFadeOut(12);
  const plateIn = useIn(0, 16);
  const hasIcon = rec.kind === 'invite';
  return (
    <AbsoluteFill style={{opacity: out}}>
      <Plate
        style={{
          position: 'absolute',
          left: 140,
          bottom: 110,
          maxWidth: 1600,
          display: 'flex',
          alignItems: 'center',
          gap: 36,
          opacity: plateIn,
          transform: `translateY(${(1 - plateIn) * 24}px)`,
        }}
      >
        {hasIcon && <Icon id={rec.id} />}
        <div style={{fontFamily: SERIF, fontSize: 72, lineHeight: 1.12, color: C.paper}}>
          {words.map((w, i) => {
            const p = spring({frame: frame - (8 + i * per * fps), fps, config: SMOOTH, durationInFrames: 14});
            return (
              <span
                key={i}
                style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.14em', marginRight: '0.26em'}}
              >
                <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 108}%)`, opacity: p}}>{w}</span>
              </span>
            );
          })}
        </div>
      </Plate>
    </AbsoluteFill>
  );
};
