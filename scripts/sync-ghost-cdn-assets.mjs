#!/usr/bin/env -S deno run -A

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = new URL('../', import.meta.url);
const MANIFEST_PATH = new URL('./ghost-cdn-manifest.json', import.meta.url);
const OUT_DIR = new URL('../content/themes/neon-protocol/assets/', import.meta.url);

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const manifest = JSON.parse(await Deno.readTextFile(MANIFEST_PATH));

await Deno.mkdir(OUT_DIR, { recursive: true });

for (const [key, entry] of Object.entries(manifest)) {
  const response = await fetch(entry.cdn, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${key} (${response.status}): ${entry.cdn}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const outFile = new URL(entry.local, OUT_DIR);
  const outPath = fileURLToPath(outFile);
  await Deno.mkdir(dirname(outPath), { recursive: true });
  await Deno.writeFile(outPath, bytes);

  const resolved = response.url;
  console.log(`Wrote ${outFile.pathname} (${bytes.byteLength} bytes) from ${resolved}`);
}
