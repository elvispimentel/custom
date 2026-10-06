import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/frank-ruhl-libre/hebrew-500.css';
import {continueRender, delayRender} from 'remotion';

const handle = delayRender('fontes');
Promise.all([
  document.fonts.load('68px "Instrument Serif"', 'Aáç'),
  document.fonts.load('36px Inter', 'Aáç'),
  document.fonts.load('500 36px Inter', 'Aáç'),
  document.fonts.load('500 150px "Frank Ruhl Libre"', 'יהוה'),
])
  .catch(() => undefined)
  .finally(() => continueRender(handle));
