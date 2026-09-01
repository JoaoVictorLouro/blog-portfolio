import { DEFAULT_LOCALE, localeFromTagSlug, translationGroupFromTagSlug } from './locales.mjs';

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function absoluteUrl(siteUrl, path) {
  const base = siteUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

function postPath(post) {
  const raw = post.url ?? `/${DEFAULT_LOCALE}/articles/${post.slug}/`;
  if (isAbsoluteUrl(raw)) {
    try {
      return new URL(raw).pathname;
    } catch {
      return raw.startsWith('/') ? raw : `/${raw}`;
    }
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function postAbsoluteUrl(post, siteUrl) {
  return absoluteUrl(siteUrl, postPath(post));
}

function localeForPost(post) {
  for (const tag of post.tags ?? []) {
    const locale = localeFromTagSlug(tag.slug);
    if (locale) {
      return locale;
    }
  }
  return null;
}

function translationGroupForPost(post) {
  for (const tag of post.tags ?? []) {
    const group = translationGroupFromTagSlug(tag.slug);
    if (group) {
      return group;
    }
  }
  return null;
}

export function buildTranslationMap(posts, siteUrl) {
  const groups = {};
  const byUrl = {};

  for (const post of posts) {
    const groupId = translationGroupForPost(post);
    const locale = localeForPost(post);
    if (!groupId || !locale) {
      continue;
    }

    const url = postAbsoluteUrl(post, siteUrl);
    const path = postPath(post);

    if (!groups[groupId]) {
      groups[groupId] = {};
    }
    groups[groupId][locale] = {
      url: path,
      title: post.title,
    };
    byUrl[url] = groupId;
  }

  return {
    updated_at: new Date().toISOString(),
    by_url: byUrl,
    groups,
  };
}
