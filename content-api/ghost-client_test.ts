import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';
import {
  adminTransportHeaders,
  createAdminJwt,
  createAdminSession,
  decodeJwtPart,
  fetchPublishedPosts,
  parseAdminApiKey,
} from './ghost-client.ts';

const KEY_ID = '64c3f3a1b2c3d4e5f6071829';
const SECRET_HEX = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
const ADMIN_KEY = `${KEY_ID}:${SECRET_HEX}`;

Deno.test('parseAdminApiKey splits id and hex secret', () => {
  assertEquals(parseAdminApiKey(` ${ADMIN_KEY} \n`), { id: KEY_ID, secretHex: SECRET_HEX });
});

Deno.test('parseAdminApiKey rejects malformed keys', () => {
  assertThrows(() => parseAdminApiKey('nocolon'), Error, 'id:secret');
  assertThrows(() => parseAdminApiKey('id:not-hex'), Error, 'even-length hex');
  assertThrows(() => parseAdminApiKey('id:abc'), Error, 'even-length hex');
});

Deno.test('createAdminJwt uses kid, aud, and a 5-minute expiry', async () => {
  const now = 1_700_000_000;
  const token = await createAdminJwt(ADMIN_KEY, now);
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  assertEquals(Boolean(signaturePart), true);

  const header = decodeJwtPart(headerPart);
  assertEquals(header.alg, 'HS256');
  assertEquals(header.typ, 'JWT');
  assertEquals(header.kid, KEY_ID);

  const payload = decodeJwtPart(payloadPart);
  assertEquals(payload.iat, now);
  assertEquals(payload.exp, now + 300);
  assertEquals(payload.aud, '/admin/');
});

Deno.test('createAdminJwt rejects ttl above 5 minutes', async () => {
  await assertRejects(() => createAdminJwt(ADMIN_KEY, 1, 301), Error, 'JWT ttl');
});

Deno.test('adminTransportHeaders forwards https host and proto', () => {
  assertEquals(adminTransportHeaders('https://site.example'), {
    Host: 'site.example',
    'X-Forwarded-Proto': 'https',
  });
  assertEquals(adminTransportHeaders('https://site.example:8443/'), {
    Host: 'site.example:8443',
    'X-Forwarded-Proto': 'https',
  });
  assertEquals(adminTransportHeaders('http://localhost:2368'), {});
});

function stubFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>,
): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = (input, init) => Promise.resolve(handler(input, init));
  return () => {
    globalThis.fetch = original;
  };
}

Deno.test('admin requests send https transport headers and do not follow redirects', async () => {
  let init: RequestInit | undefined;
  const restore = stubFetch((_input, requestInit) => {
    init = requestInit;
    return new Response(JSON.stringify({ posts: [], meta: { pagination: { pages: 1 } } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  try {
    await fetchPublishedPosts('http://ghost:2368', 'https://site.example', {
      kind: 'jwt',
      adminApiKey: ADMIN_KEY,
    });
  } finally {
    restore();
  }

  const headers = init?.headers as Record<string, string>;
  assertEquals(init?.redirect, 'manual');
  assertEquals(headers.Host, 'site.example');
  assertEquals(headers['X-Forwarded-Proto'], 'https');
  assertEquals(headers.Origin, 'https://site.example');
  assertEquals(headers.Authorization?.startsWith('Ghost '), true);
});

Deno.test('admin requests omit transport headers for http origins', async () => {
  let init: RequestInit | undefined;
  const restore = stubFetch((_input, requestInit) => {
    init = requestInit;
    return new Response(JSON.stringify({ posts: [], meta: { pagination: { pages: 1 } } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  try {
    await fetchPublishedPosts('http://ghost:2368', 'http://localhost:2368', {
      kind: 'session',
      cookie: 'ghost-admin-api-session=abc',
    });
  } finally {
    restore();
  }

  const headers = init?.headers as Record<string, string>;
  assertEquals(headers.Host, undefined);
  assertEquals(headers['X-Forwarded-Proto'], undefined);
  assertEquals(headers.Cookie, 'ghost-admin-api-session=abc');
});

Deno.test('fetchPublishedPosts rejects admin redirects', async () => {
  const restore = stubFetch(
    () =>
      new Response(null, {
        status: 301,
        headers: { location: 'https://site.example/ghost/api/admin/posts/' },
      }),
  );
  try {
    await assertRejects(
      () =>
        fetchPublishedPosts('http://ghost:2368', 'https://site.example', {
          kind: 'jwt',
          adminApiKey: ADMIN_KEY,
        }),
      Error,
      'Admin request redirected (301) to https://site.example/ghost/api/admin/posts/',
    );
  } finally {
    restore();
  }
});

Deno.test('createAdminSession rejects admin redirects', async () => {
  const restore = stubFetch(
    () =>
      new Response(null, {
        status: 302,
        headers: { location: 'https://site.example/ghost/api/admin/session/' },
      }),
  );
  try {
    await assertRejects(
      () =>
        createAdminSession(
          'http://ghost:2368',
          'https://site.example',
          'owner@example.com',
          'secret',
        ),
      Error,
      'Admin request redirected (302) to https://site.example/ghost/api/admin/session/',
    );
  } finally {
    restore();
  }
});
