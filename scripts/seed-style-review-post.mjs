import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

const API_BASE = process.env.GHOST_API_URL ?? 'http://127.0.0.1:2368';
const ORIGIN = process.env.URL ?? 'http://localhost:2368';
const ADMIN_EMAIL = process.env.GHOST_ADMIN_EMAIL?.trim() ?? '';
const ADMIN_PASSWORD = process.env.GHOST_ADMIN_PASSWORD ?? '';
const POST_ID = process.env.STYLE_REVIEW_POST_ID?.trim() ?? '6a836ff98b3d8b0001fcc3fb';
const ARTICLE_COUNT = Number.parseInt(process.env.STYLE_REVIEW_ARTICLE_COUNT ?? '20', 10);

const ACCEPT_VERSION = 'v6.0';
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const BOOKMARK_URL = 'https://ghost.org/docs/';
const FEATURE_IMAGE_FILE = 'style-review-feature.webp';

const POST_TITLE = 'STYLE_REVIEW // UI_SMOKE_TEST';
const POST_EXCERPT =
  'Dev-only styling fixture for neon-protocol — typography, Koenig cards, and prose smoke test.';
const PUBLIC_TAGS = ['Style Review', 'Dev', 'Typography'];
const EXTRA_TAGS = ['Archive', 'Signal', 'Interface', 'Layout', 'Search'];

function fail(message) {
  console.error(message);
  Deno.exit(1);
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

async function uploadImageBytes(cookie, bytes, filename, contentType) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: contentType }), filename);
  form.append('purpose', 'image');
  form.append('ref', filename);

  const response = await fetch(`${API_BASE}/ghost/api/admin/images/upload/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Version': ACCEPT_VERSION,
      Origin: ORIGIN,
      Cookie: cookie,
    },
    body: form,
  });

  const data = await response.json();
  if (!response.ok) {
    fail(`Image upload failed for ${filename} (${response.status}): ${describeError(data)}`);
  }

  const url = data?.images?.[0]?.url;
  if (!url) {
    fail(`Image upload for ${filename} returned no URL`);
  }

  return url;
}

function imageContentType(filename) {
  if (filename.endsWith('.webp')) return 'image/webp';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.gif')) return 'image/gif';
  return 'image/png';
}

async function uploadImage(cookie, filename) {
  const path = join(FIXTURES_DIR, filename);
  const bytes = await Deno.readFile(path);
  return uploadImageBytes(cookie, bytes, filename, imageContentType(filename));
}

async function uploadFile(cookie, filename) {
  const path = join(FIXTURES_DIR, filename);
  const bytes = await Deno.readFile(path);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), filename);
  form.append('ref', filename);

  const response = await fetch(`${API_BASE}/ghost/api/admin/files/upload/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Version': ACCEPT_VERSION,
      Origin: ORIGIN,
      Cookie: cookie,
    },
    body: form,
  });

  const data = await response.json();
  if (!response.ok) {
    fail(`File upload failed for ${filename} (${response.status}): ${describeError(data)}`);
  }

  const file = data?.files?.[0];
  if (!file?.url) {
    fail(`File upload for ${filename} returned no URL`);
  }

  return file;
}

async function fetchOembed(cookie, url, type) {
  const params = new URLSearchParams({ url, type });
  const { response, data } = await request(`/ghost/api/admin/oembed/?${params}`, { cookie });
  if (!response.ok) {
    fail(`Oembed fetch failed for ${url} (${response.status}): ${describeError(data)}`);
  }
  return data;
}

async function ensureTag(cookie, name) {
  const filter = encodeURIComponent(`name:'${name.replace(/'/g, "\\'")}'`);
  const existing = await request(`/ghost/api/admin/tags/?filter=${filter}&limit=1`, { cookie });
  if (!existing.response.ok) {
    fail(
      `Failed to query tag "${name}" (${existing.response.status}): ${describeError(existing.data)}`,
    );
  }

  if (Array.isArray(existing.data?.tags) && existing.data.tags.length > 0) {
    return existing.data.tags[0];
  }

  const created = await request('/ghost/api/admin/tags/', {
    method: 'POST',
    cookie,
    body: { tags: [{ name }] },
  });
  if (!created.response.ok) {
    fail(
      `Failed to create tag "${name}" (${created.response.status}): ${describeError(created.data)}`,
    );
  }

  return created.data?.tags?.[0];
}

function imageCard(src, alt, caption, { wide = false, full = false } = {}) {
  const classes = ['kg-card', 'kg-image-card', 'kg-card-hascaption'];
  if (wide) classes.push('kg-width-wide');
  if (full) classes.push('kg-width-full');

  return `<figure class="${classes.join(' ')}">
  <img src="${src}" class="kg-image" alt="${alt}" loading="lazy">
  <figcaption>${caption}</figcaption>
</figure>`;
}

function galleryCard(sources) {
  const images = sources
    .map(
      ({ src, alt }) =>
        `<div class="kg-gallery-image"><img src="${src}" alt="${alt}" loading="lazy" width="400" height="300"></div>`,
    )
    .join('\n      ');

  return `<figure class="kg-card kg-gallery-card kg-card-hascaption">
  <div class="kg-gallery-container">
    <div class="kg-gallery-row">
      ${images}
    </div>
  </div>
  <figcaption>Gallery card — three-up row with caption</figcaption>
</figure>`;
}

function codeCard() {
  const markup = `<figure class="kg-card kg-code-card">
  <pre><code class="language-typescript">interface StyleReviewSection {
  id: string;
  label: string;
  elements: string[];
}

const sections: StyleReviewSection[] = [
  { id: 'typography', label: '01 // Typography', elements: ['h2-h6', 'lists', 'table'] },
  { id: 'images', label: '03 // Images', elements: ['normal', 'wide', 'full', 'gallery'] },
];</code></pre>
</figure>`;

  return `<!--kg-card-begin: html-->${markup}<!--kg-card-end: html-->`;
}

function fileCard(file) {
  const title = file.title ?? 'style-review-sample.pdf';
  const url = file.url;
  const size = file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : '1 KB';

  const markup = `<figure class="kg-card kg-file-card">
  <a class="kg-file-card-container" href="${url}" download="">
    <div class="kg-file-card-contents">
      <div class="kg-file-card-title">${title}</div>
      <div class="kg-file-card-caption">Sample PDF for file-card styling</div>
      <div class="kg-file-card-metadata">
        <span class="kg-file-card-filename">${title}</span>
        <span class="kg-file-card-filesize">${size}</span>
      </div>
    </div>
    <div class="kg-file-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>
  </a>
</figure>`;

  return `<!--kg-card-begin: html-->${markup}<!--kg-card-end: html-->`;
}

function embedCard(html) {
  return `<figure class="kg-card kg-embed-card">${html}</figure>`;
}

function bookmarkCard(oembed) {
  const url = oembed.url ?? BOOKMARK_URL;
  const title = escapeHtml(oembed.title ?? 'Ghost Docs');
  const description = escapeHtml(oembed.description ?? 'Ghost documentation');
  const author = escapeHtml(oembed.author_name ?? oembed.publisher ?? 'Ghost');
  const icon = oembed.icon ?? '';
  const thumbnail = oembed.thumbnail_url ?? '';

  const thumbnailHtml = thumbnail
    ? `<div class="kg-bookmark-thumbnail"><img src="${thumbnail}" alt=""></div>`
    : '';

  const iconHtml = icon ? `<img class="kg-bookmark-icon" src="${icon}" alt="">` : '';

  return `<figure class="kg-card kg-bookmark-card">
  <a class="kg-bookmark-container" href="${url}">
    <div class="kg-bookmark-content">
      <div class="kg-bookmark-title">${title}</div>
      <div class="kg-bookmark-description">${description}</div>
      <div class="kg-bookmark-metadata">${iconHtml}<span class="kg-bookmark-author">${author}</span></div>
    </div>
    ${thumbnailHtml}
  </a>
</figure>`;
}

function toggleCard() {
  return `<div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
  <div class="kg-toggle-heading">
    <h4 class="kg-toggle-heading-text">Toggle card — expandable section</h4>
    <button class="kg-toggle-card-icon" aria-label="Expand toggle section">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
  </div>
  <div class="kg-toggle-content">
    <p>Hidden content until expanded. Tests accordion spacing and nested prose.</p>
    <ul>
      <li>Toggle nested bullet one</li>
      <li>Toggle nested bullet two</li>
    </ul>
  </div>
</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function substitute(template, values) {
  let html = template;
  for (const [key, value] of Object.entries(values)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

function articleNumber(index) {
  return String(index).padStart(2, '0');
}

function publishedAt(index) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (index - 1));
  date.setUTCHours(12, 0, 0, 0);
  return date.toISOString();
}

function articleDefinition(index) {
  const number = articleNumber(index);
  const extraTag = EXTRA_TAGS[(index - 1) % EXTRA_TAGS.length];

  if (index === 1) {
    return {
      index,
      id: POST_ID,
      slug: undefined,
      title: POST_TITLE,
      excerpt: POST_EXCERPT,
      tagNames: PUBLIC_TAGS,
      publishedAt: publishedAt(index),
    };
  }

  return {
    index,
    id: undefined,
    slug: `style-review-${number}`,
    title: `STYLE_REVIEW // PACKET_${number}`,
    excerpt: `Dev-only styling fixture — packet ${number} — listings, search, and bento grid smoke test.`,
    tagNames: ['Style Review', 'Dev', extraTag],
    publishedAt: publishedAt(index),
  };
}

function articleDefinitions() {
  if (!Number.isFinite(ARTICLE_COUNT) || ARTICLE_COUNT < 1) {
    fail('STYLE_REVIEW_ARTICLE_COUNT must be a positive integer');
  }

  return Array.from({ length: ARTICLE_COUNT }, (_, offset) => articleDefinition(offset + 1));
}

async function buildPostHtml(cookie) {
  console.log('Uploading feature image...');
  const featureImageUrl = await uploadImage(cookie, FEATURE_IMAGE_FILE);

  console.log('Uploading fixture images...');
  const [normalUrl, wideUrl, fullUrl, gallery1Url, gallery2Url, gallery3Url, rawUrl] =
    await Promise.all([
      uploadImage(cookie, 'style-review-hero.png'),
      uploadImage(cookie, 'style-review-wide.png'),
      uploadImage(cookie, 'style-review-full.png'),
      uploadImage(cookie, 'style-review-gallery-1.png'),
      uploadImage(cookie, 'style-review-gallery-2.png'),
      uploadImage(cookie, 'style-review-gallery-3.png'),
      uploadImage(cookie, 'style-review-raw.png'),
    ]);

  console.log('Uploading fixture PDF...');
  const pdfFile = await uploadFile(cookie, 'style-review-sample.pdf');

  console.log('Fetching oembed data...');
  const [youtubeOembed, bookmarkOembed] = await Promise.all([
    fetchOembed(cookie, YOUTUBE_URL, 'embed'),
    fetchOembed(cookie, BOOKMARK_URL, 'bookmark'),
  ]);

  const youtubeHtml =
    youtubeOembed.html ??
    '<iframe width="560" height="315" src="https://www.youtube.com/embed/jNQXAC9IVRw" frameborder="0" allowfullscreen></iframe>';

  const template = await Deno.readTextFile(join(FIXTURES_DIR, 'style-review-post.html'));

  return {
    html: substitute(template, {
      CODE_CARD: codeCard(),
      IMAGE_NORMAL: imageCard(
        normalUrl,
        'Normal width image card',
        'Normal image card with caption',
      ),
      IMAGE_WIDE: imageCard(wideUrl, 'Wide image card', 'Wide breakout image (kg-width-wide)', {
        wide: true,
      }),
      IMAGE_FULL: imageCard(fullUrl, 'Full width image card', 'Full bleed image (kg-width-full)', {
        full: true,
      }),
      IMAGE_GALLERY: galleryCard([
        { src: gallery1Url, alt: 'Gallery image 1' },
        { src: gallery2Url, alt: 'Gallery image 2' },
        { src: gallery3Url, alt: 'Gallery image 3' },
      ]),
      IMAGE_RAW: rawUrl,
      EMBED_YOUTUBE: embedCard(youtubeHtml),
      FILE_CARD: fileCard(pdfFile),
      TOGGLE_CARD: toggleCard(),
      BOOKMARK_CARD: bookmarkCard(bookmarkOembed),
    }),
    featureImage: featureImageUrl,
  };
}

async function findPost(cookie, { id, slug }) {
  if (id) {
    const { response, data } = await request(`/ghost/api/admin/posts/${id}/?formats=html`, {
      cookie,
    });
    if (response.ok && data?.posts?.[0]) {
      return data.posts[0];
    }
    return null;
  }

  if (!slug) {
    return null;
  }

  const filter = encodeURIComponent(`slug:${slug}`);
  const { response, data } = await request(`/ghost/api/admin/posts/?filter=${filter}&limit=1`, {
    cookie,
  });
  if (!response.ok) {
    fail(`Failed to query post slug "${slug}" (${response.status}): ${describeError(data)}`);
  }

  return data?.posts?.[0] ?? null;
}

async function upsertArticle(cookie, definition, html, featureImage, tagsByName) {
  const tags = definition.tagNames.map((name) => {
    const tag = tagsByName.get(name);
    if (!tag) {
      fail(`Missing tag "${name}" for ${definition.title}`);
    }
    return { id: tag.id, name: tag.name };
  });

  const existing = await findPost(cookie, definition);
  if (definition.index === 1 && !existing) {
    fail(
      `Primary style review post ${POST_ID} not found. Create it in Admin or set STYLE_REVIEW_POST_ID.`,
    );
  }

  const payload = {
    title: definition.title,
    custom_excerpt: definition.excerpt,
    feature_image: featureImage,
    feature_image_alt: 'Quinta da Regaleira palace facade in Sintra, Portugal',
    status: 'published',
    published_at: definition.publishedAt,
    tags,
    html,
  };

  if (definition.slug) {
    payload.slug = definition.slug;
  }

  if (existing) {
    const { response, data } = await request(
      `/ghost/api/admin/posts/${existing.id}/?source=html&save_revision=true`,
      {
        method: 'PUT',
        cookie,
        body: {
          posts: [{ id: existing.id, updated_at: existing.updated_at, ...payload }],
        },
      },
    );

    if (!response.ok) {
      fail(`Failed to update "${definition.title}" (${response.status}): ${describeError(data)}`);
    }

    return { post: data?.posts?.[0] ?? existing, created: false };
  }

  const { response, data } = await request(
    '/ghost/api/admin/posts/?source=html&save_revision=true',
    {
      method: 'POST',
      cookie,
      body: { posts: [payload] },
    },
  );

  if (!response.ok) {
    fail(`Failed to create "${definition.title}" (${response.status}): ${describeError(data)}`);
  }

  return { post: data?.posts?.[0], created: true };
}

async function ensureTags(cookie, names) {
  const unique = [...new Set(names)];
  const tags = await Promise.all(unique.map((name) => ensureTag(cookie, name)));
  return new Map(tags.map((tag) => [tag.name, tag]));
}

if (!ADMIN_EMAIL) {
  fail('GHOST_ADMIN_EMAIL is required');
}

if (!ADMIN_PASSWORD) {
  fail('GHOST_ADMIN_PASSWORD is required');
}

console.log(`Seeding ${ARTICLE_COUNT} style review articles...`);
const cookie = await createSession();
const { html, featureImage } = await buildPostHtml(cookie);

const definitions = articleDefinitions();
const allTagNames = [...new Set(definitions.flatMap((definition) => definition.tagNames))];

console.log('Ensuring public tags...');
const tagsByName = await ensureTags(cookie, allTagNames);

let created = 0;
let updated = 0;

for (const definition of definitions) {
  const result = await upsertArticle(cookie, definition, html, featureImage, tagsByName);
  if (result.created) {
    created += 1;
    console.log(
      `Created ${definition.title} -> /articles/${result.post?.slug ?? definition.slug}/`,
    );
  } else {
    updated += 1;
    console.log(
      `Updated ${definition.title} -> /articles/${result.post?.slug ?? definition.slug ?? POST_ID}/`,
    );
  }
}

console.log(`Done: ${created} created, ${updated} updated (${ARTICLE_COUNT} total).`);
console.log(`Articles index: ${ORIGIN.replace(/\/$/, '')}/articles/`);
console.log(`Search test terms: STYLE_REVIEW, PACKET_07, Typography, Signal`);
