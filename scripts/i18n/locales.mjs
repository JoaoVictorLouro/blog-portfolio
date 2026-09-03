/** @typedef {{ code: string, bcp47: string, tagName: string, tagSlug: string, label: string, nativeLabel: string }} Locale */

/** @type {readonly Locale[]} */
export const LOCALES = [
  {
    code: 'en-us',
    bcp47: 'en-US',
    tagName: '#lang-en-us',
    tagSlug: 'hash-lang-en-us',
    label: 'English (US)',
    nativeLabel: 'English',
  },
  {
    code: 'ja-jp',
    bcp47: 'ja-JP',
    tagName: '#lang-ja-jp',
    tagSlug: 'hash-lang-ja-jp',
    label: 'Japanese',
    nativeLabel: '日本語',
  },
  {
    code: 'pt-br',
    bcp47: 'pt-BR',
    tagName: '#lang-pt-br',
    tagSlug: 'hash-lang-pt-br',
    label: 'Brazilian Portuguese',
    nativeLabel: 'Português',
  },
  {
    code: 'es-la',
    bcp47: 'es-419',
    tagName: '#lang-es-la',
    tagSlug: 'hash-lang-es-la',
    label: 'Latin American Spanish',
    nativeLabel: 'Español',
  },
];

export const DEFAULT_LOCALE = 'en-us';

export const TRANSLATION_TAG_PREFIX = 'hash-translation-';

const NON_DEFAULT_LOCALES = LOCALES.filter((locale) => locale.code !== DEFAULT_LOCALE);

/** Ghost collection/{{#get}} filter: default locale includes untagged posts. */
export function articlesFilterForLocale(code) {
  if (code === DEFAULT_LOCALE) {
    return NON_DEFAULT_LOCALES.map((locale) => `tag:-${locale.tagSlug}`).join('+');
  }
  return `tag:${getLocale(code).tagSlug}`;
}

/** @param {string} tagSlug */
export function isLanguageTagSlug(tagSlug) {
  return LOCALES.some((locale) => locale.tagSlug === tagSlug);
}

/** @param {string} code */
export function getLocale(code) {
  const locale = LOCALES.find((item) => item.code === code);
  if (!locale) {
    throw new Error(`Unknown locale code: ${code}`);
  }
  return locale;
}

/** @param {string} tagSlug */
export function localeFromTagSlug(tagSlug) {
  return LOCALES.find((item) => item.tagSlug === tagSlug)?.code ?? null;
}

/** @param {string} tagSlug */
export function translationGroupFromTagSlug(tagSlug) {
  if (!tagSlug.startsWith(TRANSLATION_TAG_PREFIX)) {
    return null;
  }
  return tagSlug.slice(TRANSLATION_TAG_PREFIX.length);
}
