import type { TranslationMap } from './build-map.ts';

let cachedMap: TranslationMap | null = null;

export function getTranslationMap(): TranslationMap | null {
  return cachedMap;
}

export function setTranslationMap(map: TranslationMap): void {
  cachedMap = map;
}

export function isTranslationMapLoaded(): boolean {
  return cachedMap !== null;
}

export function clearTranslationMap(): void {
  cachedMap = null;
}
