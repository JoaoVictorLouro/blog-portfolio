import { buildTranslationMap } from './build-map.ts';
import { setTranslationMap } from './cache.ts';
import { createAdminSession, fetchPublishedPages, fetchPublishedPosts } from './ghost-client.ts';

export type RefreshConfig = {
  apiBase: string;
  origin: string;
  adminEmail: string;
  adminPassword: string;
};

let refreshInFlight: Promise<void> | null = null;

export async function refreshTranslationMap(config: RefreshConfig): Promise<void> {
  if (!config.adminEmail || !config.adminPassword) {
    throw new Error('GHOST_ADMIN_EMAIL and GHOST_ADMIN_PASSWORD are required');
  }

  const cookie = await createAdminSession(
    config.apiBase,
    config.origin,
    config.adminEmail,
    config.adminPassword,
  );
  const [posts, pages] = await Promise.all([
    fetchPublishedPosts(config.apiBase, config.origin, cookie),
    fetchPublishedPages(config.apiBase, config.origin, cookie),
  ]);
  const map = buildTranslationMap([...posts, ...pages], config.origin);
  setTranslationMap(map);
  console.log(`Updated translation map (${Object.keys(map.groups).length} groups) in memory`);
}

export function refreshTranslationMapSingleFlight(config: RefreshConfig): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = refreshTranslationMap(config).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
