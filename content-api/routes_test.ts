import { assertEquals } from 'jsr:@std/assert@1';
import { clearTranslationMap, setTranslationMap } from './cache.ts';
import { handleRequest } from './routes.ts';
import { clearYouTubeVideos, setYouTubeVideos } from './youtube-cache.ts';

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

Deno.test('GET /youtube/videos.json returns 503 when cache empty', async () => {
  clearYouTubeVideos();
  const response = await handleRequest(new Request('http://localhost/youtube/videos.json'), {
    refreshConfig,
    webhookSecret: 'secret',
  });
  assertEquals(response.status, 503);
});

Deno.test('GET /youtube/videos.json returns cached payload', async () => {
  setYouTubeVideos({
    updated_at: '2026-01-01T00:00:00.000Z',
    channel: {
      id: 'UCV3h2_srSVaiEmjrZ8v7Qsw',
      title: 'Vaan Ch.',
      url: 'https://www.youtube.com/channel/UCV3h2_srSVaiEmjrZ8v7Qsw',
    },
    videos: [
      {
        id: 'AAA111',
        title: 'Sample',
        url: 'https://www.youtube.com/watch?v=AAA111',
        thumbnail_url: 'https://i.ytimg.com/vi/AAA111/hqdefault.jpg',
        published_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  });

  const response = await handleRequest(new Request('http://localhost/youtube/videos.json'), {
    refreshConfig,
    webhookSecret: 'secret',
  });
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.videos.length, 1);
  assertEquals(body.videos[0].id, 'AAA111');
  clearYouTubeVideos();
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
