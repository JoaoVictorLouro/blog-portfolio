import { buildTranslationMap } from './build-map.ts';
import { setTranslationMap } from './cache.ts';
import {
  createAdminSession,
  fetchPublishedPages,
  fetchPublishedPosts,
  type AdminAuth,
} from './ghost-client.ts';

export type RefreshConfig = {
  apiBase: string;
  origin: string;
  adminApiKey?: string;
  adminEmail?: string;
  adminPassword?: string;
};

let refreshInFlight: Promise<void> | null = null;

async function resolveAdminAuth(config: RefreshConfig): Promise<AdminAuth> {
  const adminApiKey = config.adminApiKey?.trim() ?? '';
  if (adminApiKey) {
    return { kind: 'jwt', adminApiKey };
  }

  const adminEmail = config.adminEmail?.trim() ?? '';
  const adminPassword = config.adminPassword ?? '';
  if (adminEmail && adminPassword) {
    const cookie = await createAdminSession(
      config.apiBase,
      config.origin,
      adminEmail,
      adminPassword,
    );
    return { kind: 'session', cookie };
  }

  throw new Error('GHOST_ADMIN_API_KEY or GHOST_ADMIN_EMAIL and GHOST_ADMIN_PASSWORD are required');
}

export async function refreshTranslationMap(config: RefreshConfig): Promise<void> {
  const auth = await resolveAdminAuth(config);
  const [posts, pages] = await Promise.all([
    fetchPublishedPosts(config.apiBase, config.origin, auth),
    fetchPublishedPages(config.apiBase, config.origin, auth),
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
