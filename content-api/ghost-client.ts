const ACCEPT_VERSION = 'v6.0';

export type GhostContent = {
  id: string;
  title: string;
  slug: string;
  url?: string;
  tags?: Array<{ slug: string }>;
};

export async function createAdminSession(
  apiBase: string,
  origin: string,
  email: string,
  password: string,
): Promise<string> {
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
  const session = cookies.find(
    (entry): entry is string =>
      typeof entry === 'string' && entry.startsWith('ghost-admin-api-session='),
  );
  if (!response.ok || !session) {
    const text = await response.text();
    throw new Error(`Admin login failed (${response.status}): ${text}`);
  }
  return session.split(';')[0];
}

async function adminRequest(
  apiBase: string,
  origin: string,
  cookie: string,
  path: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Version': ACCEPT_VERSION,
      Origin: origin,
      Cookie: cookie,
    },
  });
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    throw new Error(`Admin request failed (${response.status}) ${path}: ${text}`);
  }
  return data ?? {};
}

async function fetchPublishedResource(
  apiBase: string,
  origin: string,
  cookie: string,
  resource: 'posts' | 'pages',
): Promise<GhostContent[]> {
  const items: GhostContent[] = [];
  let page = 1;
  let pages = 1;

  while (page <= pages) {
    const data = await adminRequest(
      apiBase,
      origin,
      cookie,
      `/ghost/api/admin/${resource}/?filter=status:published&include=tags&limit=100&page=${page}`,
    );
    const batch = Array.isArray(data?.[resource]) ? (data[resource] as GhostContent[]) : [];
    items.push(...batch);
    const pagination = data?.meta as { pagination?: { pages?: number } } | undefined;
    pages = Number(pagination?.pagination?.pages ?? 1);
    page += 1;
  }

  return items;
}

export async function fetchPublishedPosts(
  apiBase: string,
  origin: string,
  cookie: string,
): Promise<GhostContent[]> {
  return fetchPublishedResource(apiBase, origin, cookie, 'posts');
}

export async function fetchPublishedPages(
  apiBase: string,
  origin: string,
  cookie: string,
): Promise<GhostContent[]> {
  return fetchPublishedResource(apiBase, origin, cookie, 'pages');
}
