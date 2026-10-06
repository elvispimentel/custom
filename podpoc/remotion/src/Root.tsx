import React from 'react';
import {AbsoluteFill, Composition} from 'remotion';
import './fonts';
import data from './data/overlays.json';
import {ChromaCtx, Rec, W, H} from './theme';
import {Quote} from './comps/Quote';
import {AuthorCard} from './comps/AuthorCard';
import {ArchiveCard} from './comps/ArchiveCard';
import {Fases} from './diagrams/Fases';
import {BradenMapa} from './diagrams/BradenMapa';
import {Zayn} from './diagrams/Zayn';
import {Tetragrama} from './diagrams/Tetragrama';
import {Helice} from './diagrams/Helice';
import {GenesisHebraico} from './diagrams/GenesisHebraico';

const DIAGRAMS: Record<string, React.FC<any>> = {fases: Fases, 'braden-mapa': BradenMapa, zayn: Zayn, tetragrama: Tetragrama, helice: Helice, 'genesis-hebraico': GenesisHebraico};

const pick = (rec: Rec): React.FC<any> => {
  if (rec.kind === 'quote' || rec.kind === 'invite') return Quote;
  if (rec.kind === 'author') return AuthorCard;
  if (rec.kind === 'archive') return ArchiveCard;
  return DIAGRAMS[rec.id];
};

// um componente por overlay, criado uma vez; com chroma=true desenha fundo verde #00FF00 por baixo
const WRAPPED = new Map<string, React.FC<any>>();
const wrapped = (rec: Rec) => {
  if (!WRAPPED.has(rec.id)) {
    const Comp = pick(rec);
    WRAPPED.set(rec.id, (p: any) => (
      <ChromaCtx.Provider value={!!p.chroma}>
        {p.chroma && <AbsoluteFill style={{background: '#00FF00'}} />}
        <Comp {...p} />
      </ChromaCtx.Provider>
    ));
  }
  return WRAPPED.get(rec.id)!;
};

export const Root: React.FC = () => (
  <>
    {(data as Rec[]).map((rec) => (
      <Composition
        key={rec.id}
        id={rec.id}
        component={wrapped(rec)}
        durationInFrames={rec.frames}
        fps={30}
        width={W}
        height={H}
        defaultProps={{rec, available: [] as string[], chroma: false}}
      />
    ))}
  </>
);
