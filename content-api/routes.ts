import { getTranslationMap, isTranslationMapLoaded } from './cache.ts';
import type { RefreshConfig } from './refresh.ts';
import { scheduleWebhookRefresh, verifyGhostWebhookSignature } from './webhooks.ts';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export type RouteContext = {
  refreshConfig: RefreshConfig;
  webhookSecret: string;
};

export async function handleRequest(request: Request, context: RouteContext): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === '/health') {
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    const status = isTranslationMapLoaded() ? 200 : 503;
    return Response.json({ ok: isTranslationMapLoaded() }, { status, headers: JSON_HEADERS });
  }

  if (pathname === '/i18n/article-translations.json') {
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    const map = getTranslationMap();
    if (!map) {
      return Response.json(
        { error: 'Translation map not loaded yet' },
        { status: 503, headers: JSON_HEADERS },
      );
    }
    return Response.json(map, { headers: JSON_HEADERS });
  }

  if (pathname === '/webhooks/ghost') {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const body = await request.text();
    const signature = request.headers.get('X-Ghost-Signature') ?? '';

    if (!context.webhookSecret) {
      return Response.json(
        { error: 'Webhook secret not configured' },
        { status: 503, headers: JSON_HEADERS },
      );
    }

    const valid = await verifyGhostWebhookSignature(body, signature, context.webhookSecret);
    if (!valid) {
      return Response.json(
        { error: 'Invalid webhook signature' },
        { status: 401, headers: JSON_HEADERS },
      );
    }

    scheduleWebhookRefresh(context.refreshConfig);
    return Response.json({ ok: true }, { headers: JSON_HEADERS });
  }

  return Response.json({ error: 'Not Found' }, { status: 404, headers: JSON_HEADERS });
}
