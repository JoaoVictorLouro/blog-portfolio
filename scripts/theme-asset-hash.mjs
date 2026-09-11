import { join } from 'node:path';

export function hexRevision(digest) {
  return [...new Uint8Array(digest)]
    .slice(0, 4)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function fileRevision(path) {
  const data = await Deno.readFile(path);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return hexRevision(digest);
}

export async function aggregateRevision(entries) {
  const payload = entries
    .map((entry) => `${entry.url}:${entry.revision}`)
    .sort()
    .join('\n');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return hexRevision(digest);
}

export function themeAssetPath(root, relative) {
  return join(root, 'content/themes/neon-protocol/assets', relative);
}

export async function collectFiles(dir, predicate) {
  const out = [];
  for await (const entry of Deno.readDir(dir)) {
    const path = join(dir, entry.name);
    if (entry.isDirectory) {
      out.push(...(await collectFiles(path, predicate)));
      continue;
    }
    if (entry.isFile && predicate(path, entry.name)) {
      out.push(path);
    }
  }
  return out;
}
