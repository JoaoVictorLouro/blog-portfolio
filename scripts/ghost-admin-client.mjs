import { createAdminJwt, adminTransportHeaders } from './ghost-admin-auth.mjs';
import {
  extractAdminSessionCookie,
  logGhostHttp,
  setCookieNames,
} from './ghost-session-cookie.mjs';

const ACCEPT_VERSION = 'v6.0';

function throwIfAdminRedirect(response) {
  if (response.status !== 301 && response.status !== 302) {
    return;
  }
  const location = response.headers.get('location') ?? 'unknown location';
  throw new Error(`Admin request redirected (${response.status}) to ${location}`);
}

export async function createAdminSession(apiBase, origin, email, password) {
  const sessionPath = '/ghost/api/admin/session/';
  const started = Date.now();
  const response = await fetch(`${apiBase}${sessionPath}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Version': ACCEPT_VERSION,
      Origin: origin,
      ...adminTransportHeaders(origin),
    },
    body: JSON.stringify({ username: email, password }),
  });
  const durationMs = Date.now() - started;
  logGhostHttp({
    method: 'POST',
    path: sessionPath,
    status: response.status,
    durationMs,
    headers: response.headers,
    extra: `sessionCookie=${extractAdminSessionCookie(response.headers) ? 'yes' : 'no'}`,
  });
  throwIfAdminRedirect(response);
  const session = extractAdminSessionCookie(response.headers);
  const text = await response.text();
  if (response.status === 403) {
    throw new Error(
      `Admin login requires device verification. Set security__staffDeviceVerification=false, configure SMTP, or set GHOST_ADMIN_API_KEY. ${text}`,
    );
  }
  if (response.ok && !session) {
    const names = setCookieNames(response.headers);
    throw new Error(
      `Admin login succeeded (${response.status}) but no session Set-Cookie (names: ${names.join(',') || 'none'})`,
    );
  }
  if (!response.ok || !session) {
    throw new Error(`Admin login failed (${response.status}): ${text}`);
  }
  return session;
}

async function adminAuthHeaders(origin, auth) {
  const headers = {
    Accept: 'application/json',
    'Accept-Version': ACCEPT_VERSION,
    Origin: origin,
    ...adminTransportHeaders(origin),
  };
  if (auth.kind === 'jwt') {
    headers.Authorization = `Ghost ${await createAdminJwt(auth.adminApiKey)}`;
  } else {
    headers.Cookie = auth.cookie;
  }
  return headers;
}

async function adminRequest(apiBase, origin, auth, path) {
  const started = Date.now();
  const response = await fetch(`${apiBase}${path}`, {
    redirect: 'manual',
    headers: await adminAuthHeaders(origin, auth),
  });
  logGhostHttp({
    method: 'GET',
    path,
    status: response.status,
    durationMs: Date.now() - started,
    headers: response.headers,
  });
  throwIfAdminRedirect(response);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    throw new Error(`Admin request failed (${response.status}) ${path}: ${text}`);
  }
  return data ?? {};
}

async function fetchPublishedResource(apiBase, origin, auth, resource) {
  const items = [];
  let page = 1;
  let pages = 1;

  while (page <= pages) {
    const data = await adminRequest(
      apiBase,
      origin,
      auth,
      `/ghost/api/admin/${resource}/?filter=status:published&include=tags&limit=100&page=${page}`,
    );
    const batch = Array.isArray(data?.[resource]) ? data[resource] : [];
    items.push(...batch);
    pages = Number(data?.meta?.pagination?.pages ?? 1);
    page += 1;
  }

  return items;
}

export async function fetchPublishedPosts(apiBase, origin, auth) {
  return fetchPublishedResource(apiBase, origin, auth, 'posts');
}

export async function fetchPublishedPages(apiBase, origin, auth) {
  return fetchPublishedResource(apiBase, origin, auth, 'pages');
}
