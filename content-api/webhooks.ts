import type { RefreshConfig } from './refresh.ts';
import { refreshTranslationMapSingleFlight } from './refresh.ts';

const WEBHOOK_DEBOUNCE_MS = 5000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }

  return diff === 0;
}

export function parseGhostSignature(header: string): { sha256: string; t: string } | null {
  const parts = header.split(',').map((part) => part.trim());
  const parsed: Record<string, string> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) {
      parsed[key] = value;
    }
  }

  if (!parsed.sha256 || !parsed.t) {
    return null;
  }

  return { sha256: parsed.sha256, t: parsed.t };
}

export async function verifyGhostWebhookSignature(
  body: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  if (!secret) {
    return false;
  }

  const parsed = parseGhostSignature(signatureHeader);
  if (!parsed) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${body}${parsed.t}`),
  );
  const expected = Array.from(new Uint8Array(signed))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  const expectedBytes = new TextEncoder().encode(expected);
  const receivedBytes = new TextEncoder().encode(parsed.sha256);

  if (expectedBytes.length !== receivedBytes.length) {
    return false;
  }

  return timingSafeEqual(expectedBytes, receivedBytes);
}

export function scheduleWebhookRefresh(config: RefreshConfig): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    refreshTranslationMapSingleFlight(config).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
    });
  }, WEBHOOK_DEBOUNCE_MS);
}

export function resetWebhookDebounceForTests(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
