const ACCEPT_VERSION = 'v6.0';

/**
 * @param {string} apiBase
 * @param {string} origin
 * @param {string} email
 * @param {string} password
 */
export async function createAdminSession(apiBase, origin, email, password) {
  const response = await fetch(`${apiBase}/ghost/api/admin/session/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Version': ACCEPT_VERSION,
      Origin: origin,
    },
    body: JSON.stringify({ username: email, password }),
  });

  const cookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);
  const session = cookies.find((cookie) => cookie.startsWith('ghost-admin-api-session='));
  if (!response.ok || !session) {
    const text = await response.text();
    throw new Error(`Admin login failed (${response.status}): ${text}`);
  }
  return session.split(';')[0];
}

/**
 * @param {string} apiBase
 * @param {string} origin
 * @param {string} cookie
 * @param {string} path
 */
async function adminRequest(apiBase, origin, cookie, path) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Version': ACCEPT_VERSION,
      Origin: origin,
      Cookie: cookie,
    },
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    throw new Error(`Admin request failed (${response.status}) ${path}: ${text}`);
  }
  return data;
}

/**
 * @param {string} apiBase
 * @param {string} origin
 * @param {string} cookie
 */
export async function fetchPublishedPosts(apiBase, origin, cookie) {
  /** @type {Array<{ id: string, title: string, slug: string, url?: string, tags?: Array<{ slug: string }> }>} */
  const posts = [];
  let page = 1;
  let pages = 1;

  while (page <= pages) {
    const data = await adminRequest(
      apiBase,
      origin,
      cookie,
      `/ghost/api/admin/posts/?filter=status:published&include=tags&limit=100&page=${page}`,
    );
    const batch = Array.isArray(data?.posts) ? data.posts : [];
    posts.push(...batch);
    pages = Number(data?.meta?.pagination?.pages ?? 1);
    page += 1;
  }

  return posts;
}
