// Gera os ícones PNG do PWA a partir de um SVG (uso: node scripts/icons.mjs).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { writeFileSync } from "node:fs";

const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f3a33"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
    <path d="M96 140a44 44 0 0 1 44-44h168a44 44 0 0 1 44 44v104a44 44 0 0 1-44 44h-92l-64 52v-52h-12a44 44 0 0 1-44-44z" fill="#f6f1e8"/>
    <path d="M232 236h140a44 44 0 0 1 44 44v84a44 44 0 0 1-44 44h-12v48l-58-48h-70a44 44 0 0 1-44-44v-40" fill="#e07a4f"/>
    <circle cx="170" cy="192" r="14" fill="#1f3a33"/><circle cx="224" cy="192" r="14" fill="#1f3a33"/><circle cx="278" cy="192" r="14" fill="#1f3a33"/>
  </g>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad] of [["icon-192", 192, 24], ["icon-512", 512, 24], ["icon-512-maskable", 512, 70], ["apple-touch-icon", 180, 24]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg(pad)}`);
  writeFileSync(`public/icons/${name}.png`, await page.screenshot({ type: "png" }));
}
await browser.close();
