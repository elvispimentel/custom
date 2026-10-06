import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import data from './data/overlays.json';
import {Rec, W, H} from './theme';
import {Quote} from './comps/Quote';
import {AuthorCard} from './comps/AuthorCard';
import {ArchiveCard} from './comps/ArchiveCard';
import {Fases} from './diagrams/Fases';
import {BradenMapa} from './diagrams/BradenMapa';
import {Zayn} from './diagrams/Zayn';
import {Tetragrama} from './diagrams/Tetragrama';
import {Helice} from './diagrams/Helice';

const DIAGRAMS: Record<string, React.FC<any>> = {fases: Fases, 'braden-mapa': BradenMapa, zayn: Zayn, tetragrama: Tetragrama, helice: Helice};

const pick = (rec: Rec): React.FC<any> => {
  if (rec.kind === 'quote' || rec.kind === 'invite') return Quote;
  if (rec.kind === 'author') return AuthorCard;
  if (rec.kind === 'archive') return ArchiveCard;
  return DIAGRAMS[rec.id];
};

export const Root: React.FC = () => (
  <>
    {(data as Rec[]).map((rec) => (
      <Composition
        key={rec.id}
        id={rec.id}
        component={pick(rec)}
        durationInFrames={rec.frames}
        fps={30}
        width={W}
        height={H}
        defaultProps={{rec, available: [] as string[]}}
      />
    ))}
  </>
);
