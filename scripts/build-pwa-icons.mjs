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
// Favicon uses the tight crop in icon.svg; PWA/home-screen icons need more padding
// so launchers and maskable safe zones do not clip the glyph.
const PWA_VIEWBOX = '-3 -3 30 30';

const FAVICON_OUTPUTS = [
  { name: 'icon-16.png', size: 16 },
  { name: 'icon-32.png', size: 32 },
];

const PWA_OUTPUTS = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

function parseViewBox(svg) {
  const match = svg.match(/<svg[^>]*\sviewBox="([^"]+)"/);
  if (!match) {
    throw new Error('icon.svg is missing a viewBox attribute');
  }
  return match[1];
}

function extractSvgInner(svg) {
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

function renderSvg(inner, size, { maskable = false, viewBox } = {}) {
  let source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
  if (maskable) {
    const innerSize = Math.round(size * MASKABLE_SCALE);
    const offset = Math.round((size - innerSize) / 2);
    source = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${MASKABLE_BG}"/>
      <svg x="${offset}" y="${offset}" width="${innerSize}" height="${innerSize}" viewBox="${viewBox}">
        ${inner}
      </svg>
    </svg>`;
  }

  const resvg = new Resvg(source, {
    fitTo: { mode: 'width', value: size },
  });
  return resvg.render().asPng();
}

const svg = await Deno.readTextFile(svgPath);
const faviconViewBox = parseViewBox(svg);
const svgInner = extractSvgInner(svg);

for (const { name, size } of FAVICON_OUTPUTS) {
  const png = renderSvg(svgInner, size, { viewBox: faviconViewBox });
  await Deno.writeFile(join(imagesDir, name), png);
  console.log(`Wrote ${name} (${size}x${size}, favicon viewBox)`);
}

for (const { name, size } of PWA_OUTPUTS) {
  const png = renderSvg(svgInner, size, { viewBox: PWA_VIEWBOX });
  await Deno.writeFile(join(imagesDir, name), png);
  console.log(`Wrote ${name} (${size}x${size}, PWA viewBox)`);
}

const maskablePng = renderSvg(svgInner, 512, { maskable: true, viewBox: PWA_VIEWBOX });
await Deno.writeFile(join(imagesDir, 'icon-512-maskable.png'), maskablePng);
console.log('Wrote icon-512-maskable.png (512x512)');
