import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LOCALE, isLanguageTagSlug, LOCALES } from './i18n/locales.mjs';
import { seedDemoArticles } from './i18n/seed-demo-articles.mjs';

const API_BASE = process.env.GHOST_API_URL ?? 'http://127.0.0.1:2368';
const ORIGIN = process.env.URL ?? 'http://localhost:2368';
const ADMIN_EMAIL = process.env.GHOST_ADMIN_EMAIL?.trim() ?? '';
const ADMIN_PASSWORD = process.env.GHOST_ADMIN_PASSWORD ?? '';
const ADMIN_NAME = process.env.GHOST_ADMIN_NAME?.trim() || 'Admin';
const SITE_TITLE = process.env.GHOST_SITE_TITLE?.trim() || 'Kono Gaijin';
const I18N_PUBLIC_DIR =
  process.env.GHOST_I18N_PUBLIC_DIR ?? '/var/lib/ghost/content/themes/neon-protocol/assets/i18n';
const CONTENT_API_WEBHOOK_SECRET = process.env.CONTENT_API_WEBHOOK_SECRET?.trim() ?? '';
const CONTENT_API_WEBHOOK_TARGET_URL =
  process.env.CONTENT_API_WEBHOOK_TARGET_URL?.trim() || 'http://content-api:8080/webhooks/ghost';
const CONTENT_API_INTEGRATION_NAME = 'Neon Protocol Content API';
const CONTENT_API_WEBHOOK_EVENTS = [
  'post.added',
  'post.edited',
  'post.deleted',
  'post.published',
  'page.added',
  'page.edited',
  'page.deleted',
  'page.published',
];

const BRAND_TITLE_HTML = '<ruby>Kono<rt>この</rt> Gaijin<rt>外人</rt></ruby>';
const ACCEPT_VERSION = 'v6.0';
const READY_TIMEOUT_MS = 120_000;
const READY_POLL_MS = 1_000;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setupStatus(body) {
  const setup = body?.setup;
  if (Array.isArray(setup)) {
    return Boolean(setup[0]?.status);
  }
  if (setup && typeof setup === 'object') {
    return Boolean(setup.status);
  }
  return Boolean(body?.status);
}

function sessionCookie(response) {
  const cookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);

  const session = cookies.find((cookie) => cookie.startsWith('ghost-admin-api-session='));
  if (!session) {
    return null;
  }

  return session.split(';')[0];
}

async function request(path, { method = 'GET', cookie, body } = {}) {
  const headers = {
    Accept: 'application/json',
    'Accept-Version': ACCEPT_VERSION,
    Origin: ORIGIN,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
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

  return { response, data };
}

function describeError(data) {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  const errors = data?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return errors
      .map((error) => error.message || error.errorType || JSON.stringify(error))
      .join('; ');
  }

  if (data && typeof data === 'object') {
    return JSON.stringify(data);
  }

  return 'unknown error';
}

async function waitForSetup() {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const { response, data } = await request('/ghost/api/admin/authentication/setup/');
      if (response.ok) {
        return data;
      }
    } catch {
      // Ghost is not accepting connections yet.
    }

    await sleep(READY_POLL_MS);
  }

  fail(`Timed out waiting for Ghost setup API at ${API_BASE}`);
}

async function createOwner() {
  const { response, data } = await request('/ghost/api/admin/authentication/setup/', {
    method: 'POST',
    body: {
      setup: [
        {
          name: ADMIN_NAME,
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          blogTitle: SITE_TITLE,
        },
      ],
    },
  });

  if (!response.ok) {
    fail(`Owner setup failed (${response.status}): ${describeError(data)}`);
  }

  console.log(`Created owner ${ADMIN_EMAIL}`);
}

async function createSession() {
  const { response, data } = await request('/ghost/api/admin/session/', {
    method: 'POST',
    body: {
      username: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });

  if (response.status === 403) {
    fail(
      `Admin login requires device verification. Set security__staffDeviceVerification=false or configure SMTP. ${describeError(data)}`,
    );
  }

  const cookie = sessionCookie(response);
  if (!response.ok || !cookie) {
    fail(`Admin login failed (${response.status}): ${describeError(data)}`);
  }

  return cookie;
}

function settingValue(settings, key) {
  const match = settings.find((item) => item.key === key);
  return match?.value;
}

function parseNav(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getSettings(cookie) {
  const { response, data } = await request('/ghost/api/admin/settings/', { cookie });
  if (!response.ok) {
    fail(`Failed to read settings (${response.status}): ${describeError(data)}`);
  }
  return Array.isArray(data?.settings) ? data.settings : [];
}

async function putSettings(cookie, settings) {
  const { response, data } = await request('/ghost/api/admin/settings/', {
    method: 'PUT',
    cookie,
    body: { settings },
  });
  if (!response.ok) {
    fail(`Failed to update settings (${response.status}): ${describeError(data)}`);
  }
}

async function applyFreeMemberSettings(cookie) {
  await putSettings(cookie, [
    { key: 'members_signup_access', value: 'all' },
    { key: 'portal_plans', value: '["free"]' },
    { key: 'comments_enabled', value: 'all' },
    { key: 'portal_button', value: 'false' },
    { key: 'portal_button_signup_text', value: 'SUBSCRIBE_TO_FEED' },
  ]);
  console.log('Locked members to free newsletter sign-up with native comments (paid plans off)');
}

async function activateTheme(cookie) {
  const { response, data } = await request('/ghost/api/admin/themes/neon-protocol/activate', {
    method: 'PUT',
    cookie,
  });
  if (response.ok) {
    console.log('Activated neon-protocol theme');
    return;
  }
  await putSettings(cookie, [{ key: 'active_theme', value: 'neon-protocol' }]);
  console.log(
    `Activated neon-protocol theme via settings (activate HTTP ${response.status}: ${describeError(data)})`,
  );
}

const ABOUT_PAGES = {
  'en-us': {
    title: 'System Architect',
    excerpt: 'STATUS: ONLINE // LOCATION: UNDEFINED',
    html: '<p>Initializing bio sequence... Digital nomad navigating the sprawling networks of the modern metropolis. Specializing in high-fidelity interface design and atmospheric user experiences.</p><p>My operational directive is bridging the gap between raw data streams and intuitive visual narratives. I exist where the neon bleeds into the shadows, crafting systems that are both robust and evocative.</p>',
  },
  'ja-jp': {
    title: 'システムアーキテクト',
    excerpt: 'ステータス: オンライン // 位置: 未定義',
    html: '<p>バイオシーケンスを初期化中... 現代の大都市の広がるネットワークを航行するデジタルノマド。高忠実度のインターフェース設計と雰囲気のあるユーザー体験を専門としています。</p><p>生のデータストリームと直感的なビジュアルナラティブの間のギャップを埋めることが私の運用指令です。</p>',
  },
  'pt-br': {
    title: 'Arquiteto de Sistemas',
    excerpt: 'STATUS: ONLINE // LOCAL: INDEFINIDO',
    html: '<p>Inicializando sequência de bio... Nômade digital navegando pelas redes extensas da metrópole moderna. Especializado em design de interface de alta fidelidade e experiências atmosféricas.</p><p>Minha diretiva operacional é conectar fluxos de dados brutos a narrativas visuais intuitivas.</p>',
  },
  'es-la': {
    title: 'Arquitecto de Sistemas',
    excerpt: 'ESTADO: EN LÍNEA // UBICACIÓN: INDEFINIDA',
    html: '<p>Inicializando secuencia de bio... Nómada digital navegando las extensas redes de la metrópolis moderna. Especializado en diseño de interfaces de alta fidelidad y experiencias atmosféricas.</p><p>Mi directiva operativa es conectar flujos de datos en bruto con narrativas visuales intuitivas.</p>',
  },
};

async function ensureInternalTag(cookie, { name, slug, description }) {
  const { response, data } = await request(`/ghost/api/admin/tags/?filter=slug:${slug}&limit=1`, {
    cookie,
  });
  if (!response.ok) {
    fail(`Failed to query tag ${slug} (${response.status}): ${describeError(data)}`);
  }
  if (Array.isArray(data?.tags) && data.tags.length > 0) {
    return data.tags[0];
  }

  const created = await request('/ghost/api/admin/tags/', {
    method: 'POST',
    cookie,
    body: {
      tags: [{ name, slug, description }],
    },
  });
  if (!created.response.ok) {
    fail(
      `Failed to create tag ${name} (${created.response.status}): ${describeError(created.data)}`,
    );
  }
  console.log(`Created internal tag ${name}`);
  return created.data?.tags?.[0] ?? null;
}

async function ensureLanguageTags(cookie) {
  for (const locale of LOCALES) {
    await ensureInternalTag(cookie, {
      name: locale.tagName,
      slug: locale.tagSlug,
      description: `Internal tag for ${locale.label} content`,
    });
  }
}

async function ensureAboutPages(cookie) {
  for (const locale of LOCALES) {
    const slug = `about-${locale.code}`;
    const template = `custom-about-${locale.code}`;
    const copy = ABOUT_PAGES[locale.code];
    const { response, data } = await request(
      `/ghost/api/admin/pages/?filter=slug:${slug}&limit=1`,
      { cookie },
    );
    if (!response.ok) {
      fail(`Failed to query page ${slug} (${response.status}): ${describeError(data)}`);
    }

    const langTag = await ensureInternalTag(cookie, {
      name: locale.tagName,
      slug: locale.tagSlug,
      description: `Internal tag for ${locale.label} content`,
    });

    if (Array.isArray(data?.pages) && data.pages.length > 0) {
      const page = data.pages[0];
      const needsUpdate =
        page.custom_template !== template ||
        !Array.isArray(page.tags) ||
        !page.tags.some((tag) => tag.slug === locale.tagSlug);
      if (needsUpdate) {
        const updated = await request(`/ghost/api/admin/pages/${page.id}/?source=html`, {
          method: 'PUT',
          cookie,
          body: {
            pages: [
              {
                id: page.id,
                updated_at: page.updated_at,
                custom_template: template,
                tags: [{ id: langTag.id }],
              },
            ],
          },
        });
        if (!updated.response.ok) {
          fail(
            `Failed to update About page ${slug} (${updated.response.status}): ${describeError(updated.data)}`,
          );
        }
        console.log(`Updated About page ${slug}`);
      }
      continue;
    }

    const created = await request('/ghost/api/admin/pages/?source=html', {
      method: 'POST',
      cookie,
      body: {
        pages: [
          {
            title: copy.title,
            slug,
            status: 'published',
            custom_template: template,
            custom_excerpt: copy.excerpt,
            html: copy.html,
            tags: [{ id: langTag.id }],
          },
        ],
      },
    });
    if (!created.response.ok) {
      fail(
        `Failed to create About page ${slug} (${created.response.status}): ${describeError(created.data)}`,
      );
    }
    console.log(`Created About page at /${locale.code}/about/`);
  }
}

async function ensureNewsletters(cookie) {
  const { response, data } = await request('/ghost/api/admin/newsletters/?limit=100', { cookie });
  if (!response.ok) {
    fail(`Failed to query newsletters (${response.status}): ${describeError(data)}`);
  }

  const existing = Array.isArray(data?.newsletters) ? data.newsletters : [];
  const map = {};

  for (const locale of LOCALES) {
    const name = `Newsletter ${locale.code.toUpperCase()}`;
    let newsletter = existing.find((item) => item.name === name);
    if (!newsletter) {
      const created = await request('/ghost/api/admin/newsletters/', {
        method: 'POST',
        cookie,
        body: {
          newsletters: [
            {
              name,
              description: `${locale.label} newsletter feed`,
              status: 'active',
            },
          ],
        },
      });
      if (!created.response.ok) {
        fail(
          `Failed to create newsletter ${name} (${created.response.status}): ${describeError(created.data)}`,
        );
      }
      newsletter = created.data?.newsletters?.[0];
      console.log(`Created newsletter ${name}`);
    }
    map[locale.code] = newsletter.id;
  }

  mkdirSync(I18N_PUBLIC_DIR, { recursive: true });
  writeFileSync(
    join(I18N_PUBLIC_DIR, 'np-newsletters.json'),
    `${JSON.stringify({ updated_at: new Date().toISOString(), newsletters: map }, null, 2)}\n`,
  );
  console.log(`Wrote newsletter map to ${join(I18N_PUBLIC_DIR, 'np-newsletters.json')}`);
  return map;
}

async function findContentApiIntegration(cookie) {
  const { response, data } = await request(
    '/ghost/api/admin/integrations/?include=webhooks&limit=all',
    { cookie },
  );
  if (!response.ok) {
    fail(`Failed to query integrations (${response.status}): ${describeError(data)}`);
  }

  const integrations = Array.isArray(data?.integrations) ? data.integrations : [];
  return integrations.find((item) => item.name === CONTENT_API_INTEGRATION_NAME) ?? null;
}

async function ensureContentApiWebhooks(cookie) {
  if (!CONTENT_API_WEBHOOK_SECRET) {
    fail('CONTENT_API_WEBHOOK_SECRET is required');
  }

  const targetUrl = CONTENT_API_WEBHOOK_TARGET_URL;
  let integration = await findContentApiIntegration(cookie);

  if (!integration) {
    const created = await request('/ghost/api/admin/integrations/', {
      method: 'POST',
      cookie,
      body: {
        integrations: [
          {
            name: CONTENT_API_INTEGRATION_NAME,
            description: 'Webhook integration for the Neon Protocol content API',
          },
        ],
      },
    });
    if (!created.response.ok) {
      fail(
        `Failed to create content API integration (${created.response.status}): ${describeError(created.data)}`,
      );
    }
    console.log(`Created integration ${CONTENT_API_INTEGRATION_NAME}`);
    integration = await findContentApiIntegration(cookie);
  }

  if (!integration?.id) {
    fail('Content API integration is missing an id');
  }

  const existingByEvent = new Map(
    (Array.isArray(integration.webhooks) ? integration.webhooks : []).map((webhook) => [
      webhook.event,
      webhook,
    ]),
  );

  let createdCount = 0;
  let updatedCount = 0;

  for (const event of CONTENT_API_WEBHOOK_EVENTS) {
    const name = `Content API ${event}`;
    const existing = existingByEvent.get(event);

    if (!existing) {
      const created = await request('/ghost/api/admin/webhooks/', {
        method: 'POST',
        cookie,
        body: {
          webhooks: [
            {
              event,
              target_url: targetUrl,
              secret: CONTENT_API_WEBHOOK_SECRET,
              integration_id: integration.id,
              name,
            },
          ],
        },
      });
      if (!created.response.ok) {
        fail(
          `Failed to create webhook ${event} (${created.response.status}): ${describeError(created.data)}`,
        );
      }
      createdCount += 1;
      console.log(`Registered webhook ${event} -> ${targetUrl}`);
      continue;
    }

    const updated = await request(`/ghost/api/admin/webhooks/${existing.id}/`, {
      method: 'PUT',
      cookie,
      body: {
        webhooks: [
          {
            id: existing.id,
            event,
            target_url: targetUrl,
            secret: CONTENT_API_WEBHOOK_SECRET,
            name,
          },
        ],
      },
    });
    if (!updated.response.ok) {
      fail(
        `Failed to update webhook ${event} (${updated.response.status}): ${describeError(updated.data)}`,
      );
    }
    updatedCount += 1;
  }

  console.log(
    `Content API webhooks ready (${CONTENT_API_WEBHOOK_EVENTS.length} events; +${createdCount} created, ~${updatedCount} synced) -> ${targetUrl}`,
  );
}

async function ensureDefaultLanguageOnPosts(cookie) {
  const defaultLocale = LOCALES.find((locale) => locale.code === DEFAULT_LOCALE);
  if (!defaultLocale) {
    return;
  }

  const defaultTag = await ensureInternalTag(cookie, {
    name: defaultLocale.tagName,
    slug: defaultLocale.tagSlug,
    description: `Internal tag for ${defaultLocale.label} content`,
  });

  let page = 1;
  let pages = 1;
  let updatedCount = 0;

  while (page <= pages) {
    const { response, data } = await request(
      `/ghost/api/admin/posts/?filter=status:[published,draft]&include=tags&limit=100&page=${page}`,
      { cookie },
    );
    if (!response.ok) {
      fail(`Failed to query posts (${response.status}): ${describeError(data)}`);
    }

    const posts = Array.isArray(data?.posts) ? data.posts : [];
    pages = Number(data?.meta?.pagination?.pages ?? 1);

    for (const post of posts) {
      const tags = Array.isArray(post.tags) ? post.tags : [];
      const hasLanguageTag = tags.some((tag) => isLanguageTagSlug(tag.slug));
      if (hasLanguageTag) {
        continue;
      }

      const updated = await request(`/ghost/api/admin/posts/${post.id}/`, {
        method: 'PUT',
        cookie,
        body: {
          posts: [
            {
              id: post.id,
              updated_at: post.updated_at,
              tags: [...tags.map((tag) => ({ id: tag.id })), { id: defaultTag.id }],
            },
          ],
        },
      });
      if (!updated.response.ok) {
        fail(
          `Failed to tag post ${post.slug} with ${defaultLocale.tagName} (${updated.response.status}): ${describeError(updated.data)}`,
        );
      }
      updatedCount += 1;
    }

    page += 1;
  }

  if (updatedCount > 0) {
    console.log(`Tagged ${updatedCount} post(s) with ${defaultLocale.tagName}`);
  }
}

function navMatches(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    return false;
  }
  return expected.every((item, index) => {
    const got = actual[index] ?? {};
    return (
      String(got.label ?? '').toUpperCase() === item.label && String(got.url ?? '') === item.url
    );
  });
}

async function seedSiteTitle(cookie) {
  const settings = await getSettings(cookie);
  const current = settingValue(settings, 'title');
  if (current === SITE_TITLE) {
    return;
  }

  await putSettings(cookie, [{ key: 'title', value: SITE_TITLE }]);
  console.log(`Set site title to ${SITE_TITLE}`);
}

async function seedBrandTitleHtml(cookie) {
  const { response, data } = await request('/ghost/api/admin/custom_theme_settings/', { cookie });
  if (!response.ok) {
    fail(`Failed to read custom theme settings (${response.status}): ${describeError(data)}`);
  }

  const settings = Array.isArray(data?.custom_theme_settings) ? data.custom_theme_settings : [];
  const brand = settings.find((item) => item.key === 'brand_title_html');
  if (!brand) {
    console.log('brand_title_html custom setting not present yet; skipping (activate theme first)');
    return;
  }

  if (brand.value === BRAND_TITLE_HTML) {
    return;
  }

  const updated = await request('/ghost/api/admin/custom_theme_settings/', {
    method: 'PUT',
    cookie,
    body: {
      custom_theme_settings: settings.map((item) =>
        item.key === 'brand_title_html' ? { ...item, value: BRAND_TITLE_HTML } : item,
      ),
    },
  });
  if (!updated.response.ok) {
    fail(
      `Failed to set brand_title_html (${updated.response.status}): ${describeError(updated.data)}`,
    );
  }
  console.log('Seeded brand_title_html with ruby/furigana markup');
}

async function seedNavigation(cookie) {
  const settings = await getSettings(cookie);
  const navigation = parseNav(settingValue(settings, 'navigation'));
  const secondary = parseNav(settingValue(settings, 'secondary_navigation'));
  const expectedNav = [
    { label: 'HOME', url: `/${DEFAULT_LOCALE}/` },
    { label: 'ARTICLES', url: `/${DEFAULT_LOCALE}/articles/` },
    { label: 'PORTFOLIO', url: `/${DEFAULT_LOCALE}/portfolio/` },
    { label: 'ABOUT', url: `/${DEFAULT_LOCALE}/about/` },
  ];
  const expectedSecondary = [
    { label: 'SYSTEM_STATUS', url: `/${DEFAULT_LOCALE}/articles/` },
    { label: 'ENCRYPTION_LOG', url: `/${DEFAULT_LOCALE}/articles/rss/` },
    { label: 'DATA_MAP', url: `/${DEFAULT_LOCALE}/portfolio/` },
  ];
  if (navMatches(navigation, expectedNav) && navMatches(secondary, expectedSecondary)) {
    return;
  }

  await putSettings(cookie, [
    {
      key: 'navigation',
      value: expectedNav,
    },
    {
      key: 'secondary_navigation',
      value: expectedSecondary,
    },
  ]);
  console.log('Seeded HOME / ARTICLES / PORTFOLIO / ABOUT navigation');
}

if (!ADMIN_EMAIL) {
  fail('GHOST_ADMIN_EMAIL is required');
}

if (!ADMIN_PASSWORD) {
  fail('GHOST_ADMIN_PASSWORD is required');
}

if (ADMIN_PASSWORD.length < 10) {
  fail('GHOST_ADMIN_PASSWORD must be at least 10 characters');
}

const setup = await waitForSetup();

if (setupStatus(setup)) {
  console.log('Ghost is already set up; skipping owner creation');
} else {
  await createOwner();
}

const cookie = await createSession();
await applyFreeMemberSettings(cookie);
await activateTheme(cookie);
await seedSiteTitle(cookie);
await seedBrandTitleHtml(cookie);
await ensureLanguageTags(cookie);
await ensureDefaultLanguageOnPosts(cookie);
await ensureAboutPages(cookie);
const newsletterMap = await ensureNewsletters(cookie);
await seedDemoArticles(request, describeError, fail, ensureInternalTag, cookie, newsletterMap);
await ensureContentApiWebhooks(cookie);
await seedNavigation(cookie);
console.log('Bootstrap complete');
