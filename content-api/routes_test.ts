import { assertEquals } from 'jsr:@std/assert@1';
import { clearTranslationMap, setTranslationMap } from './cache.ts';
import { handleRequest } from './routes.ts';

const refreshConfig = {
  apiBase: 'http://ghost:2368',
  origin: 'http://localhost:2368',
  adminEmail: 'admin@example.com',
  adminPassword: 'password',
};

Deno.test('GET /health returns 503 when map not loaded', async () => {
  clearTranslationMap();
  const response = await handleRequest(new Request('http://localhost/health'), {
    refreshConfig,
    webhookSecret: 'secret',
  });
  assertEquals(response.status, 503);
});

Deno.test('GET /i18n/article-translations.json returns cached map', async () => {
  setTranslationMap({
    updated_at: '2026-01-01T00:00:00.000Z',
    by_url: {},
    groups: {},
  });
  const response = await handleRequest(
    new Request('http://localhost/i18n/article-translations.json'),
    {
      refreshConfig,
      webhookSecret: 'secret',
    },
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.updated_at, '2026-01-01T00:00:00.000Z');
  clearTranslationMap();
});

Deno.test('POST /webhooks/ghost rejects missing signature', async () => {
  const response = await handleRequest(
    new Request('http://localhost/webhooks/ghost', { method: 'POST', body: '{}' }),
    { refreshConfig, webhookSecret: 'secret' },
  );
  assertEquals(response.status, 401);
});

Deno.test('unknown route returns 404', async () => {
  const response = await handleRequest(new Request('http://localhost/unknown'), {
    refreshConfig,
    webhookSecret: 'secret',
  });
  assertEquals(response.status, 404);
});
