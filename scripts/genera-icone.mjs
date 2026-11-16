// Genera le icone PNG della PWA a partire da public/favicon.svg
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));
const uscite = [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];
for (const [nome, dim] of uscite) {
  // sfondo pieno: iOS non gestisce bene la trasparenza nelle icone
  await sharp(svg).resize(dim, dim).flatten({ background: '#0f1115' }).png()
    .toFile(new URL(`../public/${nome}`, import.meta.url).pathname);
  console.log('creata', nome);
}
