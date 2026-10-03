#!/usr/bin/env -S deno run -A

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const outputPath = join(root, 'content/themes/neon-protocol/assets/geo/countries-lines.json');

const SOURCES = [
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_coastline.geojson',
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_boundary_lines_land.geojson',
];

function collectLines(geometry) {
  if (!geometry) {
    return [];
  }
  if (geometry.type === 'LineString') {
    return [geometry.coordinates];
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates;
  }
  if (geometry.type === 'GeometryCollection') {
    return geometry.geometries.flatMap((child) => collectLines(child));
  }
  return [];
}

function roundCoordinate(value) {
  return Number(value.toFixed(1));
}

function roundLine(line) {
  const points = [];
  for (const pair of line) {
    const point = [roundCoordinate(pair[0]), roundCoordinate(pair[1])];
    const previous = points.at(-1);
    if (previous && previous[0] === point[0] && previous[1] === point[1]) {
      continue;
    }
    points.push(point);
  }
  return points;
}

const lines = [];
for (const url of SOURCES) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  const geojson = await response.json();
  for (const feature of geojson.features) {
    for (const line of collectLines(feature.geometry)) {
      const rounded = roundLine(line);
      if (rounded.length >= 2) {
        lines.push(rounded);
      }
    }
  }
}

await Deno.writeTextFile(outputPath, JSON.stringify(lines));
console.log(
  `Wrote ${lines.length} lines (${lines.reduce((sum, line) => sum + line.length, 0)} points)`,
);
