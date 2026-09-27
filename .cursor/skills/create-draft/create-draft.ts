import { basename, extname, isAbsolute, join, normalize, sep } from 'node:path';
import { createAdminJwt, parseAdminApiKey } from '../../../content-api/ghost-client.ts';

const ACCEPT_VERSION = 'v6.0';
const LOCALE_CODES = ['en-us', 'ja-jp', 'pt-br', 'es-la'] as const;

type LocaleCode = (typeof LOCALE_CODES)[number];

const LOCALE_SUFFIX: Record<LocaleCode, string> = {
  'en-us': '',
  'ja-jp': '-ja',
  'pt-br': '-pt',
  'es-la': '-es',
};

const IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

const MEDIA_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
};

type Manifest = {
  title: string;
  slug: string;
  locale: LocaleCode;
  customExcerpt: string;
  metaDescription: string;
  html: string;
  featureImage?: string;
  featureImageAlt?: string;
  publicTags: string[];
  update: boolean;
};

type GhostPost = {
  id: string;
  slug: string;
  status: string;
  updated_at: string;
  html?: string;
};

type UploadKind = 'image' | 'media';

function charLength(value: string): number {
  return [...value].length;
}

function isLocaleCode(value: string): value is LocaleCode {
  return (LOCALE_CODES as readonly string[]).includes(value);
}

function readRequiredString(source: Record<string, unknown>, field: string): string {
  const value = source[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function slugifyTag(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) {
    throw new Error(`cannot slugify tag "${name}"`);
  }
  return slug;
}

function baseSlug(slug: string, locale: LocaleCode): string {
  const suffix = LOCALE_SUFFIX[locale];
  if (!suffix) {
    return slug;
  }
  if (!slug.endsWith(suffix)) {
    throw new Error(`slug for ${locale} must end with ${suffix}`);
  }
  const base = slug.slice(0, -suffix.length);
  if (!base) {
    throw new Error('slug base is empty');
  }
  return base;
}

function loadSkillsEnv(path: string): { ghostUrl: string; contentApiKey: string } {
  const text = Deno.readTextFileSync(path);
  const values = new Map<string, string>();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed
      .slice(0, eq)
      .trim()
      .replace(/^export\s+/, '');
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }

  const ghostUrl = values.get('GHOST_URL')?.replace(/\/+$/, '') ?? '';
  const contentApiKey = values.get('CONTENT_API_KEY') ?? '';
  if (!ghostUrl) {
    throw new Error('skills.env is missing GHOST_URL');
  }
  if (!contentApiKey) {
    throw new Error('skills.env is missing CONTENT_API_KEY');
  }
  return { ghostUrl, contentApiKey };
}

function assertContentApiKey(contentApiKey: string): void {
  try {
    parseAdminApiKey(contentApiKey);
  } catch {
    throw new Error('CONTENT_API_KEY must be id:secret with an even-length hex secret');
  }
}

function repoRoot(): string {
  try {
    Deno.statSync(join(Deno.cwd(), 'skills.env'));
    return Deno.cwd();
  } catch {
    return normalize(join(import.meta.dirname ?? Deno.cwd(), '..', '..', '..'));
  }
}

function readManifest(path: string): Manifest {
  const raw = JSON.parse(Deno.readTextFileSync(path)) as Record<string, unknown>;
  if (raw.status !== undefined && raw.status !== 'draft') {
    throw new Error('status must be draft');
  }

  const locale = readRequiredString(raw, 'locale');
  if (!isLocaleCode(locale)) {
    throw new Error('locale must be en-us, ja-jp, pt-br, or es-la');
  }

  const slug = readRequiredString(raw, 'slug');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('slug must be lowercase and hyphenated');
  }
  baseSlug(slug, locale);

  const customExcerpt = readRequiredString(raw, 'custom_excerpt');
  if (charLength(customExcerpt) > 300) {
    throw new Error('custom_excerpt must be 300 characters or fewer');
  }
  const metaDescription = readRequiredString(raw, 'meta_description');
  if (charLength(metaDescription) > 160) {
    throw new Error('meta_description must be 160 characters or fewer');
  }

  const publicTags = raw.public_tags;
  if (!Array.isArray(publicTags) || publicTags.length < 1 || publicTags.length > 3) {
    throw new Error('public_tags must contain 1 to 3 names');
  }
  const names: string[] = [];
  const seen = new Set<string>();
  for (const entry of publicTags) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      throw new Error('public_tags must be non-empty strings');
    }
    const name = entry.trim();
    if (name.startsWith('#')) {
      throw new Error('public_tags must not start with #');
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`duplicate public tag "${name}"`);
    }
    seen.add(key);
    names.push(name);
  }

  let featureImage: string | undefined;
  let featureImageAlt: string | undefined;
  if (raw.feature_image !== undefined || raw.feature_image_alt !== undefined) {
    featureImage = readRequiredString(raw, 'feature_image');
    featureImageAlt = readRequiredString(raw, 'feature_image_alt');
  }

  const update = raw.update === undefined ? false : raw.update;
  if (typeof update !== 'boolean') {
    throw new Error('update must be a boolean');
  }

  return {
    title: readRequiredString(raw, 'title'),
    slug,
    locale,
    customExcerpt,
    metaDescription,
    html: readRequiredString(raw, 'html'),
    featureImage,
    featureImageAlt,
    publicTags: names,
    update,
  };
}

function resolveInsideRepo(root: string, filePath: string): string {
  const resolved = isAbsolute(filePath) ? filePath : join(root, filePath);
  const normalized = normalize(resolved);
  const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
  if (normalized !== root && !normalized.startsWith(rootPrefix)) {
    throw new Error(`path escapes repo: ${filePath}`);
  }
  return normalized;
}

function ghostErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object' || !('errors' in data)) {
    return 'request failed';
  }
  const errors = (data as { errors?: Array<{ message?: string }> }).errors;
  if (!Array.isArray(errors)) {
    return 'request failed';
  }
  const messages = errors
    .map((error) => error.message)
    .filter((message): message is string => typeof message === 'string' && message.length > 0);
  return messages.length > 0 ? messages.join('; ') : 'request failed';
}

async function adminFetch(
  origin: string,
  apiKey: string,
  path: string,
  init: { method?: string; json?: unknown; body?: BodyInit } = {},
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Version': ACCEPT_VERSION,
    Origin: origin,
    Authorization: `Ghost ${await createAdminJwt(apiKey)}`,
  };
  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  } else {
    body = init.body;
  }

  const response = await fetch(`${origin}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body,
  });
  const text = await response.text();
  if (!text) {
    return { status: response.status, data: null };
  }
  try {
    return { status: response.status, data: JSON.parse(text) as unknown };
  } catch {
    return { status: response.status, data: null };
  }
}

function asPost(value: unknown): GhostPost {
  if (!value || typeof value !== 'object') {
    throw new Error('post response was incomplete');
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.slug !== 'string' ||
    typeof record.status !== 'string' ||
    typeof record.updated_at !== 'string'
  ) {
    throw new Error('post response was incomplete');
  }
  return {
    id: record.id,
    slug: record.slug,
    status: record.status,
    updated_at: record.updated_at,
    html: typeof record.html === 'string' ? record.html : undefined,
  };
}

function postsFrom(data: unknown): GhostPost[] {
  if (!data || typeof data !== 'object' || !('posts' in data)) {
    return [];
  }
  const posts = (data as { posts?: unknown }).posts;
  if (!Array.isArray(posts)) {
    return [];
  }
  return posts.map((post) => asPost(post));
}

async function findPostBySlug(
  origin: string,
  apiKey: string,
  slug: string,
): Promise<GhostPost | null> {
  const filter = encodeURIComponent(`slug:${slug}`);
  const { status, data } = await adminFetch(
    origin,
    apiKey,
    `/ghost/api/admin/posts/?filter=${filter}&formats=html&limit=1`,
  );
  if (status < 200 || status >= 300) {
    throw new Error(`post lookup failed (${status}): ${ghostErrorMessage(data)}`);
  }
  return postsFrom(data)[0] ?? null;
}

async function getPost(origin: string, apiKey: string, id: string): Promise<GhostPost> {
  const { status, data } = await adminFetch(
    origin,
    apiKey,
    `/ghost/api/admin/posts/${id}/?formats=html`,
  );
  if (status < 200 || status >= 300) {
    throw new Error(`post read failed (${status}): ${ghostErrorMessage(data)}`);
  }
  const post = postsFrom(data)[0];
  if (!post) {
    throw new Error('post read returned no post');
  }
  return post;
}

function tagIdFrom(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('tags' in data)) {
    return null;
  }
  const tags = (data as { tags?: Array<{ id?: string }> }).tags;
  const id = tags?.[0]?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

async function ensureTag(
  origin: string,
  apiKey: string,
  name: string,
  slug: string,
  description: string,
): Promise<string> {
  const filter = encodeURIComponent(`slug:${slug}`);
  const existing = await adminFetch(
    origin,
    apiKey,
    `/ghost/api/admin/tags/?filter=${filter}&limit=1`,
  );
  if (existing.status < 200 || existing.status >= 300) {
    throw new Error(
      `tag lookup failed for ${slug} (${existing.status}): ${ghostErrorMessage(existing.data)}`,
    );
  }
  const existingId = tagIdFrom(existing.data);
  if (existingId) {
    return existingId;
  }

  const created = await adminFetch(origin, apiKey, '/ghost/api/admin/tags/', {
    method: 'POST',
    json: { tags: [{ name, slug, description }] },
  });
  if (created.status < 200 || created.status >= 300) {
    throw new Error(
      `tag create failed for ${slug} (${created.status}): ${ghostErrorMessage(created.data)}`,
    );
  }
  const createdId = tagIdFrom(created.data);
  if (!createdId) {
    throw new Error(`tag create for ${slug} returned no id`);
  }
  return createdId;
}

function classifyFile(filePath: string): { kind: UploadKind; contentType: string } {
  const ext = extname(filePath).toLowerCase();
  const imageType = IMAGE_TYPES[ext];
  if (imageType) {
    return { kind: 'image', contentType: imageType };
  }
  const mediaType = MEDIA_TYPES[ext];
  if (mediaType) {
    return { kind: 'media', contentType: mediaType };
  }
  throw new Error(`unsupported media type: ${ext || basename(filePath)}`);
}

function urlFromUpload(data: unknown, key: 'images' | 'media'): string | null {
  if (!data || typeof data !== 'object' || !(key in data)) {
    return null;
  }
  const rows = (data as Record<string, Array<{ url?: string }>>)[key];
  const url = rows?.[0]?.url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

async function uploadFile(origin: string, apiKey: string, filePath: string): Promise<string> {
  const { kind, contentType } = classifyFile(filePath);
  const bytes = await Deno.readFile(filePath);
  const filename = basename(filePath);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: contentType }), filename);
  form.append('ref', filename);
  if (kind === 'image') {
    form.append('purpose', 'image');
  }

  const endpoint =
    kind === 'image' ? '/ghost/api/admin/images/upload/' : '/ghost/api/admin/media/upload/';
  const { status, data } = await adminFetch(origin, apiKey, endpoint, {
    method: 'POST',
    body: form,
  });
  if (status < 200 || status >= 300) {
    throw new Error(`upload failed for ${filename} (${status}): ${ghostErrorMessage(data)}`);
  }
  const url = urlFromUpload(data, kind === 'image' ? 'images' : 'media');
  if (!url) {
    throw new Error(`upload for ${filename} returned no URL`);
  }
  return url;
}

async function replaceAssets(
  origin: string,
  apiKey: string,
  root: string,
  html: string,
): Promise<{ html: string; uploaded: number }> {
  const cache = new Map<string, string>();
  const pattern = /\{\{asset:([^}]+)\}\}/g;
  let result = '';
  let last = 0;
  let uploaded = 0;

  for (const match of html.matchAll(pattern)) {
    const index = match.index ?? 0;
    const tokenPath = match[1]?.trim() ?? '';
    if (!tokenPath) {
      throw new Error('empty asset placeholder');
    }
    const filePath = resolveInsideRepo(root, tokenPath);
    let url = cache.get(filePath);
    if (!url) {
      try {
        Deno.statSync(filePath);
      } catch {
        throw new Error(`asset not found: ${tokenPath}`);
      }
      url = await uploadFile(origin, apiKey, filePath);
      cache.set(filePath, url);
      uploaded += 1;
    }
    result += html.slice(last, index);
    result += url;
    last = index + match[0].length;
  }

  result += html.slice(last);
  if (result.includes('{{asset:')) {
    throw new Error('unresolved asset placeholder');
  }
  return { html: result, uploaded };
}

function wrapBareVideos(html: string): string {
  const pattern = /<video\b[^>]*>[\s\S]*?<\/video>/gi;
  let result = '';
  let last = 0;
  for (const match of html.matchAll(pattern)) {
    const index = match.index ?? 0;
    const prior = html.slice(0, index);
    const begin = prior.lastIndexOf('<!--kg-card-begin:');
    const end = prior.lastIndexOf('<!--kg-card-end:');
    const insideCard = begin !== -1 && begin > end;
    result += html.slice(last, index);
    result += insideCard
      ? match[0]
      : `<!--kg-card-begin: html-->\n${match[0]}\n<!--kg-card-end: html-->`;
    last = index + match[0].length;
  }
  result += html.slice(last);
  return result;
}

function editorUrl(origin: string, id: string): string {
  return `${origin}/ghost/#/editor/post/${id}`;
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function main(): Promise<void> {
  const manifestPath = Deno.args[0];
  if (!manifestPath) {
    throw new Error('usage: create-draft.ts manifest.json');
  }

  const root = repoRoot();
  const { ghostUrl, contentApiKey } = loadSkillsEnv(join(root, 'skills.env'));
  assertContentApiKey(contentApiKey);
  const manifest = readManifest(manifestPath);

  const existing = await findPostBySlug(ghostUrl, contentApiKey, manifest.slug);
  if (existing && !manifest.update) {
    printJson({
      error: 'slug_exists',
      id: existing.id,
      slug: existing.slug,
      status: existing.status,
      editorUrl: editorUrl(ghostUrl, existing.id),
    });
    Deno.exit(1);
  }
  if (existing && existing.status !== 'draft') {
    printJson({
      error: 'refusing_to_update_non_draft',
      id: existing.id,
      slug: existing.slug,
      status: existing.status,
      editorUrl: editorUrl(ghostUrl, existing.id),
    });
    Deno.exit(1);
  }

  const replaced = await replaceAssets(ghostUrl, contentApiKey, root, manifest.html);
  const html = wrapBareVideos(replaced.html);

  let featureImageUrl: string | undefined;
  if (manifest.featureImage) {
    const featurePath = resolveInsideRepo(root, manifest.featureImage);
    try {
      Deno.statSync(featurePath);
    } catch {
      throw new Error(`feature_image not found: ${manifest.featureImage}`);
    }
    const { kind } = classifyFile(featurePath);
    if (kind !== 'image') {
      throw new Error('feature_image must be an image');
    }
    featureImageUrl = await uploadFile(ghostUrl, contentApiKey, featurePath);
  }

  const translationBase = baseSlug(manifest.slug, manifest.locale);
  const locale = {
    name: `#lang-${manifest.locale}`,
    slug: `hash-lang-${manifest.locale}`,
  };
  const tagIds = [
    await ensureTag(
      ghostUrl,
      contentApiKey,
      locale.name,
      locale.slug,
      `Language ${manifest.locale}`,
    ),
    await ensureTag(
      ghostUrl,
      contentApiKey,
      `#translation-${translationBase}`,
      `hash-translation-${translationBase}`,
      `Translation group ${translationBase}`,
    ),
  ];
  for (const name of manifest.publicTags) {
    const slug = slugifyTag(name);
    tagIds.push(await ensureTag(ghostUrl, contentApiKey, name, slug, name));
  }

  const postFields = {
    title: manifest.title,
    slug: manifest.slug,
    html,
    custom_excerpt: manifest.customExcerpt,
    meta_description: manifest.metaDescription,
    status: 'draft' as const,
    tags: tagIds.map((id) => ({ id })),
    ...(featureImageUrl
      ? { feature_image: featureImageUrl, feature_image_alt: manifest.featureImageAlt }
      : {}),
  };

  const written = existing
    ? await adminFetch(
        ghostUrl,
        contentApiKey,
        `/ghost/api/admin/posts/${existing.id}/?source=html`,
        {
          method: 'PUT',
          json: {
            posts: [{ id: existing.id, updated_at: existing.updated_at, ...postFields }],
          },
        },
      )
    : await adminFetch(ghostUrl, contentApiKey, '/ghost/api/admin/posts/?source=html', {
        method: 'POST',
        json: { posts: [postFields] },
      });

  if (written.status < 200 || written.status >= 300) {
    throw new Error(`post save failed (${written.status}): ${ghostErrorMessage(written.data)}`);
  }
  const saved = postsFrom(written.data)[0];
  if (!saved) {
    throw new Error('post save returned no post');
  }

  const confirmed = await getPost(ghostUrl, contentApiKey, saved.id);
  if (confirmed.status !== 'draft') {
    throw new Error(`refusing success: post status is ${confirmed.status}`);
  }

  printJson({
    id: confirmed.id,
    slug: confirmed.slug || manifest.slug,
    status: 'draft',
    locale: manifest.locale,
    editorUrl: editorUrl(ghostUrl, confirmed.id),
    publicPath: `/${manifest.locale}/articles/${confirmed.slug || manifest.slug}/`,
    featureImage: Boolean(featureImageUrl),
    uploadedAssets: replaced.uploaded,
    published: false,
  });
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'create draft failed';
    console.error(message);
    Deno.exit(1);
  }
}
