const API_BASE = process.env.GHOST_API_URL ?? 'http://127.0.0.1:2368';
const ORIGIN = process.env.URL ?? 'http://localhost:2368';
const ADMIN_EMAIL = process.env.GHOST_ADMIN_EMAIL?.trim() ?? '';
const ADMIN_PASSWORD = process.env.GHOST_ADMIN_PASSWORD ?? '';
const ADMIN_NAME = process.env.GHOST_ADMIN_NAME?.trim() || 'Admin';
const SITE_TITLE = process.env.GHOST_SITE_TITLE?.trim() || 'Kono Gaijin';

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

async function ensurePortfolioTag(cookie) {
  const { response, data } = await request(
    '/ghost/api/admin/tags/?filter=slug:hash-portfolio&limit=1',
    {
      cookie,
    },
  );
  if (!response.ok) {
    fail(`Failed to query tags (${response.status}): ${describeError(data)}`);
  }
  if (Array.isArray(data?.tags) && data.tags.length > 0) {
    return;
  }

  const created = await request('/ghost/api/admin/tags/', {
    method: 'POST',
    cookie,
    body: {
      tags: [
        {
          name: '#portfolio',
          slug: 'hash-portfolio',
          description: 'Internal tag for the archive / portfolio collection',
        },
      ],
    },
  });
  if (!created.response.ok) {
    fail(
      `Failed to create #portfolio tag (${created.response.status}): ${describeError(created.data)}`,
    );
  }
  console.log('Created internal tag #portfolio');
}

async function ensureAboutPage(cookie) {
  const { response, data } = await request('/ghost/api/admin/pages/?filter=slug:about&limit=1', {
    cookie,
  });
  if (!response.ok) {
    fail(`Failed to query pages (${response.status}): ${describeError(data)}`);
  }
  if (Array.isArray(data?.pages) && data.pages.length > 0) {
    const page = data.pages[0];
    if (page.custom_template !== 'custom-about') {
      const updated = await request(`/ghost/api/admin/pages/${page.id}/`, {
        method: 'PUT',
        cookie,
        body: {
          pages: [{ id: page.id, updated_at: page.updated_at, custom_template: 'custom-about' }],
        },
      });
      if (!updated.response.ok) {
        fail(
          `Failed to set About page template (${updated.response.status}): ${describeError(updated.data)}`,
        );
      }
      console.log('Set About page template to custom-about');
    }
    return;
  }

  const created = await request('/ghost/api/admin/pages/?source=html', {
    method: 'POST',
    cookie,
    body: {
      pages: [
        {
          title: 'System Architect',
          slug: 'about',
          status: 'published',
          custom_template: 'custom-about',
          custom_excerpt: 'STATUS: ONLINE // LOCATION: UNDEFINED',
          html: '<p>Initializing bio sequence... Digital nomad navigating the sprawling networks of the modern metropolis. Specializing in high-fidelity interface design and atmospheric user experiences.</p><p>My operational directive is bridging the gap between raw data streams and intuitive visual narratives. I exist where the neon bleeds into the shadows, crafting systems that are both robust and evocative.</p>',
        },
      ],
    },
  });
  if (!created.response.ok) {
    fail(
      `Failed to create About page (${created.response.status}): ${describeError(created.data)}`,
    );
  }
  console.log('Created About page at /about/');
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
    { label: 'HOME', url: '/' },
    { label: 'ARTICLES', url: '/articles/' },
    { label: 'PORTFOLIO', url: '/portfolio/' },
    { label: 'ABOUT', url: '/about/' },
  ];
  const expectedSecondary = [
    { label: 'SYSTEM_STATUS', url: '/articles/' },
    { label: 'ENCRYPTION_LOG', url: '/rss/' },
    { label: 'DATA_MAP', url: '/portfolio/' },
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
await ensurePortfolioTag(cookie);
await ensureAboutPage(cookie);
await seedNavigation(cookie);
console.log('Bootstrap complete');
