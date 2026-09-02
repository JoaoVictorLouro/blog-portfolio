import { handleRequest } from './routes.ts';
import { refreshTranslationMapSingleFlight } from './refresh.ts';

const API_BASE = Deno.env.get('GHOST_API_URL') ?? 'http://127.0.0.1:2368';
const ORIGIN = Deno.env.get('URL') ?? 'http://localhost:2368';
const ADMIN_EMAIL = Deno.env.get('GHOST_ADMIN_EMAIL')?.trim() ?? '';
const ADMIN_PASSWORD = Deno.env.get('GHOST_ADMIN_PASSWORD') ?? '';
const WEBHOOK_SECRET = Deno.env.get('CONTENT_API_WEBHOOK_SECRET') ?? '';
const PORT = Number(Deno.env.get('CONTENT_API_PORT') ?? '8080');
const REFRESH_MS = Number(Deno.env.get('I18N_REFRESH_MS') ?? '3600000');

const refreshConfig = {
  apiBase: API_BASE,
  origin: ORIGIN,
  adminEmail: ADMIN_EMAIL,
  adminPassword: ADMIN_PASSWORD,
};

const routeContext = {
  refreshConfig,
  webhookSecret: WEBHOOK_SECRET,
};

async function startRefreshLoop() {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, REFRESH_MS));
    try {
      await refreshTranslationMapSingleFlight(refreshConfig);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
  }
}

if (import.meta.main) {
  if (Deno.args.includes('--once')) {
    try {
      await refreshTranslationMapSingleFlight(refreshConfig);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      Deno.exit(1);
    }
    Deno.exit(0);
  }

  try {
    await refreshTranslationMapSingleFlight(refreshConfig);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }

  startRefreshLoop();

  Deno.serve({ port: PORT, hostname: '0.0.0.0' }, (request) =>
    handleRequest(request, routeContext),
  );
  console.log(`Content API listening on http://0.0.0.0:${PORT}`);
}
