import { DEFAULT_LOCALE, LOCALES, TRANSLATION_TAG_PREFIX } from '../i18n/locales.mjs';
import { buildTranslationMap as buildMapCore } from '../i18n/build-translation-map.mjs';

export type GhostTag = { slug: string };

export type GhostPost = {
  id: string;
  title: string;
  slug: string;
  url?: string;
  tags?: GhostTag[];
};

export type TranslationEntry = {
  url: string;
  title: string;
};

export type TranslationMap = {
  updated_at: string;
  by_url: Record<string, string>;
  groups: Record<string, Record<string, TranslationEntry>>;
};

export function buildTranslationMap(posts: GhostPost[], siteUrl: string): TranslationMap {
  return buildMapCore(posts, siteUrl) as TranslationMap;
}

export { DEFAULT_LOCALE, LOCALES, TRANSLATION_TAG_PREFIX };
