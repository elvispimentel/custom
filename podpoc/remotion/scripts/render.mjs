// Renderiza todos os overlays com canal alfa.
//   node scripts/render.mjs                 -> WebM VP9 com alfa + pôster PNG (leve, vai no git)
//   node scripts/render.mjs --prores        -> MOV ProRes 4444 com alfa (grande, fica fora do git)
//   node scripts/render.mjs --only braden   -> um overlay só
//   node scripts/render.mjs --posters-only  -> só os PNG
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const ep = process.env.EP || 'ep02';
const outDir = process.env.OUT_DIR || path.resolve(root, '..', 'episodios', ep, 'render');
const assetsDir = process.env.ASSETS_DIR || path.resolve(root, '..', 'assets');
const imgDir = path.join(assetsDir, 'img');
const args = process.argv.slice(2);
const prores = args.includes('--prores');
const postersOnly = args.includes('--posters-only');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

const data = JSON.parse(fs.readFileSync(path.join(root, 'src/data/overlays.json'), 'utf8'));
const available = fs.existsSync(imgDir) ? fs.readdirSync(imgDir) : [];
fs.mkdirSync(outDir, {recursive: true});
fs.mkdirSync(imgDir, {recursive: true});

const candidates = [
  process.env.BROWSER_EXECUTABLE,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);
const browserExecutable = candidates.find((p) => fs.existsSync(p)) ?? null;

const needsImages = (rec) => {
  const ids = rec.kind === 'archive' ? rec.images : [];
  return ids.filter((i) => !available.some((a) => a.startsWith(i + '.')));
};

const posterFrame = (rec) => {
  if (rec.reveal_s != null) return Math.min(rec.frames - 1, Math.round(rec.reveal_s * 30 + 34));
  if (rec.kind === 'diagram') return rec.frames - 26;
  return Math.min(rec.frames - 1, 60);
};

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: assetsDir});
const common = {serveUrl, ...(browserExecutable ? {browserExecutable} : {}), logLevel: 'warn'};
const status = [];

for (const rec of data) {
  if (only && !only.split(',').includes(rec.id)) continue;
  const missing = needsImages(rec);
  if (missing.length) {
    status.push({id: rec.id, ok: false, why: `imagem ausente: ${missing.join(', ')}`});
    console.log(`SKIP ${rec.id}: faltam ${missing.join(', ')}`);
    continue;
  }
  const inputProps = {rec, available};
  const comp = await selectComposition({...common, id: rec.id, inputProps});
  await renderStill({...common, composition: comp, inputProps, frame: posterFrame(rec), imageFormat: 'png', output: path.join(outDir, `${rec.id}.png`)});
  if (!postersOnly) {
    const base = {...common, composition: comp, inputProps, imageFormat: 'png', concurrency: 2};
    if (prores) {
      await renderMedia({...base, codec: 'prores', proResProfile: '4444', pixelFormat: 'yuva444p10le', outputLocation: path.join(outDir, `${rec.id}.mov`)});
    } else {
      await renderMedia({...base, codec: 'vp9', pixelFormat: 'yuva420p', outputLocation: path.join(outDir, `${rec.id}.webm`)});
    }
  }
  status.push({id: rec.id, ok: true});
  console.log(`ok   ${rec.id}`);
}
fs.writeFileSync(path.join(outDir, prores ? 'status-prores.json' : 'status.json'), JSON.stringify(status, null, 1));
