import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {getImageDimensions} from '@remotion/media-utils';
import {C, ChromaCtx, SMOOTH} from '../theme';

export const useFadeOut = (frames = 12) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return interpolate(f, [durationInFrames - frames, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

export const useIn = (delay = 0, duration = 16) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: f - delay, fps, config: SMOOTH, durationInFrames: duration});
};

// acha o arquivo em assets/img pelo id (jpg, jpeg, png, webp)
export const findImage = (available: string[], id?: string) => {
  if (!id) return null;
  const hit = available.find((a) => a.startsWith(id + '.'));
  return hit ? staticFile(`img/${hit}`) : null;
};

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

// grain 3-6% + vinheta leve. Só dentro de painéis de imagem, nunca no quadro todo (o fundo é transparente).
export const FilmLook: React.FC<{grain?: number}> = ({grain = 0.07}) => {
  const f = useCurrentFrame();
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: GRAIN,
          backgroundPosition: `${(f * 37) % 220}px ${(f * 91) % 220}px`,
          opacity: grain,
          mixBlendMode: 'overlay',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)',
        }}
      />
    </>
  );
};

const useImageSize = (src: string) => {
  const [dims, setDims] = useState<{width: number; height: number} | null>(null);
  const [handle] = useState(() => delayRender('dimensões da imagem'));
  useEffect(() => {
    getImageDimensions(src)
      .then(setDims)
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [src, handle]);
  return dims;
};

// duotone azul/ouro + Ken Burns + parallax leve
export const Duotone: React.FC<{
  src: string;
  width: number;
  height: number;
  fit?: 'cover' | 'contain';
  drift?: number;
}> = ({src, width, height, fit = 'cover', drift = 1}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const dims = useImageSize(src);
  const scale = interpolate(f, [0, durationInFrames], [1.0, fit === 'cover' ? 1.1 : 1.06]);
  const tx = interpolate(f, [0, durationInFrames], [-10 * drift, 10 * drift]);
  const look = 'grayscale(1) contrast(1.12) brightness(1.02)';
  const layers = (
    <>
      <div style={{position: 'absolute', inset: 0, background: C.goldText, mixBlendMode: 'multiply'}} />
      <div style={{position: 'absolute', inset: 0, background: C.blue, mixBlendMode: 'lighten'}} />
      <FilmLook />
    </>
  );
  if (fit === 'contain') {
    // o duotone e o grain acompanham o tamanho real da imagem, sem barras coloridas ao redor
    const k = dims ? Math.min(width / dims.width, height / dims.height) * 0.94 : 0;
    const w = dims ? dims.width * k : width;
    const h = dims ? dims.height * k : height;
    return (
      <div style={{width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
        <div style={{position: 'relative', width: w, height: h, transform: `translateX(${tx}px) scale(${scale})`}}>
          <Img src={src} style={{width: w, height: h, display: 'block', filter: look}} />
          {layers}
        </div>
      </div>
    );
  }
  return (
    <div style={{position: 'relative', width, height, overflow: 'hidden', background: C.ink}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${tx}px) scale(${scale})`}}>
        <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 18%', filter: look}} />
      </div>
      {layers}
    </div>
  );
};

export const Plate: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const chroma = React.useContext(ChromaCtx);
  return (
  <div
    style={{
      background: chroma ? 'linear-gradient(90deg, #1F1F33, #2A2B3D)' : 'linear-gradient(90deg, rgba(26,26,46,0.86), rgba(26,26,46,0.70))',
      borderLeft: `6px solid ${C.gold}`,
      padding: '30px 52px 34px 44px',
      ...style,
    }}
  >
    {children}
  </div>
  );
};
