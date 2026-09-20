#!/usr/bin/env -S deno run -A

import { dirname, join } from 'node:path';
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

const PRISM_VERSION = '1.29.0';
const PRISM_TARBALL = `https://registry.npmjs.org/prismjs/-/prismjs-${PRISM_VERSION}.tgz`;
const PRISM_PARTS = [
  'components/prism-core.min.js',
  'components/prism-markup.min.js',
  'components/prism-css.min.js',
  'components/prism-clike.min.js',
  'components/prism-javascript.min.js',
  'components/prism-markup-templating.min.js',
  'components/prism-typescript.min.js',
  'components/prism-json.min.js',
  'components/prism-bash.min.js',
  'components/prism-yaml.min.js',
  'components/prism-markdown.min.js',
  'components/prism-docker.min.js',
  'components/prism-nginx.min.js',
  'components/prism-handlebars.min.js',
  'components/prism-sql.min.js',
  'components/prism-python.min.js',
  'components/prism-go.min.js',
  'components/prism-rust.min.js',
  'components/prism-diff.min.js',
  'components/prism-graphql.min.js',
  'components/prism-toml.min.js',
  'components/prism-mermaid.min.js',
];

const prismTarballResponse = await fetch(PRISM_TARBALL, {
  headers: { 'User-Agent': USER_AGENT },
});
if (!prismTarballResponse.ok) {
  throw new Error(
    `Failed to download prismjs@${PRISM_VERSION} (${prismTarballResponse.status}): ${PRISM_TARBALL}`,
  );
}

const prismTmp = await Deno.makeTempDir({ prefix: 'prismjs-' });
try {
  const prismTgz = join(prismTmp, 'prismjs.tgz');
  await Deno.writeFile(prismTgz, new Uint8Array(await prismTarballResponse.arrayBuffer()));

  const extract = new Deno.Command('tar', {
    args: ['-xzf', prismTgz, '-C', prismTmp],
  });
  const extractResult = await extract.output();
  if (!extractResult.success) {
    const err = new TextDecoder().decode(extractResult.stderr);
    throw new Error(`Failed to extract prismjs tarball: ${err || extractResult.code}`);
  }

  const prismPackageDir = join(prismTmp, 'package');
  const prismChunks = [
    `/* PrismJS ${PRISM_VERSION} MIT https://prismjs.com — installed at image build from npm prismjs */\n`,
  ];
  for (const part of PRISM_PARTS) {
    const partPath = join(prismPackageDir, part);
    prismChunks.push(await Deno.readTextFile(partPath), '\n');
  }

  const prismOutFile = new URL('js/vendor/prism.min.js', OUT_DIR);
  const prismOutPath = fileURLToPath(prismOutFile);
  await Deno.mkdir(dirname(prismOutPath), { recursive: true });
  await Deno.writeTextFile(prismOutPath, prismChunks.join(''));
  console.log(
    `Wrote ${prismOutFile.pathname} (${(await Deno.stat(prismOutPath)).size} bytes) from prismjs@${PRISM_VERSION}`,
  );
} finally {
  await Deno.remove(prismTmp, { recursive: true });
}

const MERMAID_VERSION = '10.9.4';
const MERMAID_TARBALL = `https://registry.npmjs.org/mermaid/-/mermaid-${MERMAID_VERSION}.tgz`;
const mermaidTarballResponse = await fetch(MERMAID_TARBALL, {
  headers: { 'User-Agent': USER_AGENT },
});
if (!mermaidTarballResponse.ok) {
  throw new Error(
    `Failed to download mermaid@${MERMAID_VERSION} (${mermaidTarballResponse.status}): ${MERMAID_TARBALL}`,
  );
}

const mermaidTmp = await Deno.makeTempDir({ prefix: 'mermaid-' });
try {
  const mermaidTgz = join(mermaidTmp, 'mermaid.tgz');
  await Deno.writeFile(mermaidTgz, new Uint8Array(await mermaidTarballResponse.arrayBuffer()));

  const extract = new Deno.Command('tar', {
    args: ['-xzf', mermaidTgz, '-C', mermaidTmp],
  });
  const extractResult = await extract.output();
  if (!extractResult.success) {
    const err = new TextDecoder().decode(extractResult.stderr);
    throw new Error(`Failed to extract mermaid tarball: ${err || extractResult.code}`);
  }

  const mermaidSrc = join(mermaidTmp, 'package', 'dist', 'mermaid.min.js');
  const mermaidOutFile = new URL('js/vendor/mermaid.min.js', OUT_DIR);
  const mermaidOutPath = fileURLToPath(mermaidOutFile);
  await Deno.mkdir(dirname(mermaidOutPath), { recursive: true });
  await Deno.copyFile(mermaidSrc, mermaidOutPath);
  console.log(
    `Wrote ${mermaidOutFile.pathname} (${(await Deno.stat(mermaidOutPath)).size} bytes) from mermaid@${MERMAID_VERSION}`,
  );
} finally {
  await Deno.remove(mermaidTmp, { recursive: true });
}
