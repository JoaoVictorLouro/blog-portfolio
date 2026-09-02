#!/usr/bin/env -S deno run -A

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from 'npm:@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const imagesDir = join(root, 'content/themes/neon-protocol/assets/images');
const svgPath = join(imagesDir, 'icon.svg');

const MASKABLE_BG = '#121315';
const MASKABLE_SCALE = 0.8;

const OUTPUTS = [
  { name: 'icon-16.png', size: 16 },
  { name: 'icon-32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

function renderSvg(svg, size, { maskable = false } = {}) {
  let source = svg;
  if (maskable) {
    const inner = Math.round(size * MASKABLE_SCALE);
    const offset = Math.round((size - inner) / 2);
    source = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${MASKABLE_BG}"/>
      <svg x="${offset}" y="${offset}" width="${inner}" height="${inner}" viewBox="-3 -3 30 30">
        ${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}
      </svg>
    </svg>`;
  }

  const resvg = new Resvg(source, {
    fitTo: { mode: 'width', value: size },
  });
  return resvg.render().asPng();
}

const svg = await Deno.readTextFile(svgPath);

for (const { name, size } of OUTPUTS) {
  const png = renderSvg(svg, size);
  await Deno.writeFile(join(imagesDir, name), png);
  console.log(`Wrote ${name} (${size}x${size})`);
}

const maskablePng = renderSvg(svg, 512, { maskable: true });
await Deno.writeFile(join(imagesDir, 'icon-512-maskable.png'), maskablePng);
console.log('Wrote icon-512-maskable.png (512x512)');
