const ACCEPT_VERSION = 'v6.0';
const JWT_TTL_SECONDS = 300;

export type GhostContent = {
  id: string;
  title: string;
  slug: string;
  url?: string;
  tags?: Array<{ slug: string }>;
};

export function parseAdminApiKey(adminApiKey: string): { id: string; secretHex: string } {
  const trimmed = adminApiKey.trim();
  const colon = trimmed.indexOf(':');
  if (colon <= 0 || colon === trimmed.length - 1) {
    throw new Error('GHOST_ADMIN_API_KEY must be in id:secret form');
  }
  const id = trimmed.slice(0, colon);
  const secretHex = trimmed.slice(colon + 1);
  if (!/^[0-9a-fA-F]+$/.test(secretHex) || secretHex.length % 2 !== 0) {
    throw new Error('GHOST_ADMIN_API_KEY secret must be even-length hex');
  }
  return { id, secretHex };
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(`${padded}${'='.repeat(padLength)}`);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function decodeJwtPart(part: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(part))) as Record<string, unknown>;
}

export async function createAdminJwt(
  adminApiKey: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = JWT_TTL_SECONDS,
): Promise<string> {
  if (ttlSeconds < 1 || ttlSeconds > JWT_TTL_SECONDS) {
    throw new Error(`JWT ttl must be between 1 and ${JWT_TTL_SECONDS} seconds`);
  }

  const { id, secretHex } = parseAdminApiKey(adminApiKey);
  const header = { alg: 'HS256', typ: 'JWT', kid: id };
  const payload = {
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
    aud: '/admin/',
  };
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    hexToBytes(secretHex),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export type AdminAuth = { kind: 'jwt'; adminApiKey: string } | { kind: 'session'; cookie: string };

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
  const text = await response.text();
  if (response.status === 403) {
    throw new Error(
      `Admin login requires device verification. Set security__staffDeviceVerification=false, configure SMTP, or set GHOST_ADMIN_API_KEY. ${text}`,
    );
  }
  if (!response.ok || !session) {
    throw new Error(`Admin login failed (${response.status}): ${text}`);
  }
  return session.split(';')[0];
}

async function adminAuthHeaders(origin: string, auth: AdminAuth): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Version': ACCEPT_VERSION,
    Origin: origin,
  };
  if (auth.kind === 'jwt') {
    headers.Authorization = `Ghost ${await createAdminJwt(auth.adminApiKey)}`;
  } else {
    headers.Cookie = auth.cookie;
  }
  return headers;
}

async function adminRequest(
  apiBase: string,
  origin: string,
  auth: AdminAuth,
  path: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: await adminAuthHeaders(origin, auth),
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
  auth: AdminAuth,
  resource: 'posts' | 'pages',
): Promise<GhostContent[]> {
  const items: GhostContent[] = [];
  let page = 1;
  let pages = 1;

  while (page <= pages) {
    const data = await adminRequest(
      apiBase,
      origin,
      auth,
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
  auth: AdminAuth,
): Promise<GhostContent[]> {
  return fetchPublishedResource(apiBase, origin, auth, 'posts');
}

export async function fetchPublishedPages(
  apiBase: string,
  origin: string,
  auth: AdminAuth,
): Promise<GhostContent[]> {
  return fetchPublishedResource(apiBase, origin, auth, 'pages');
}
