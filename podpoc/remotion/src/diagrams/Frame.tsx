import React, {useContext} from 'react';
import {AbsoluteFill} from 'remotion';
import {C, ChromaCtx} from '../theme';
import {useFadeOut, useIn} from '../comps/common';

// painel escuro semitransparente: o diagrama cobre o rosto de propósito (corte de referência, 2-6 s)
export const DiagramFrame: React.FC<{children: React.ReactNode}> = ({children}) => {
  const chroma = useContext(ChromaCtx);
  const out = useFadeOut(12);
  const inn = useIn(0, 12);
  return (
    <AbsoluteFill style={{opacity: out * inn}}>
      <AbsoluteFill
        style={{
          background: chroma
            ? 'radial-gradient(ellipse at 50% 40%, #1A3A5C 0%, #1A1A2E 70%)'
            : 'radial-gradient(ellipse at 50% 40%, rgba(26,58,92,0.93) 0%, rgba(26,26,46,0.96) 70%)',
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
