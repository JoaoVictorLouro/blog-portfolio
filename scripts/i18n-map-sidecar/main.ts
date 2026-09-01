import { buildTranslationMap } from './build-map.ts';
import { createAdminSession, fetchPublishedPosts } from './ghost-client.ts';

const API_BASE = Deno.env.get('GHOST_API_URL') ?? 'http://127.0.0.1:2368';
const ORIGIN = Deno.env.get('URL') ?? 'http://localhost:2368';
const ADMIN_EMAIL = Deno.env.get('GHOST_ADMIN_EMAIL')?.trim() ?? '';
const ADMIN_PASSWORD = Deno.env.get('GHOST_ADMIN_PASSWORD') ?? '';
const OUTPUT_PATH =
  Deno.env.get('GHOST_I18N_OUTPUT') ??
  '/var/lib/ghost/content/themes/neon-protocol/assets/i18n/np-article-translations.json';
const POLL_MS = Number(Deno.env.get('I18N_MAP_POLL_MS') ?? '60000');

async function writeMapAtomically(payload: unknown) {
  const dir = OUTPUT_PATH.replace(/\/[^/]+$/, '');
  await Deno.mkdir(dir, { recursive: true });
  const tempPath = `${OUTPUT_PATH}.tmp`;
  await Deno.writeTextFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`);
  await Deno.rename(tempPath, OUTPUT_PATH);
}

async function refreshMap() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('GHOST_ADMIN_EMAIL and GHOST_ADMIN_PASSWORD are required');
  }

  const cookie = await createAdminSession(API_BASE, ORIGIN, ADMIN_EMAIL, ADMIN_PASSWORD);
  const posts = await fetchPublishedPosts(API_BASE, ORIGIN, cookie);
  const map = buildTranslationMap(posts, ORIGIN);
  await writeMapAtomically(map);
  console.log(
    `Updated translation map (${Object.keys(map.groups).length} groups) at ${OUTPUT_PATH}`,
  );
}

async function runOnce() {
  try {
    await refreshMap();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}

async function runLoop() {
  while (true) {
    try {
      await refreshMap();
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

if (import.meta.main) {
  if (Deno.args.includes('--once')) {
    await runOnce();
  } else {
    await runLoop();
  }
}
