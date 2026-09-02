import { assertEquals } from 'jsr:@std/assert@1';
import {
  parseGhostSignature,
  resetWebhookDebounceForTests,
  verifyGhostWebhookSignature,
} from './webhooks.ts';

Deno.test('parseGhostSignature extracts sha256 and timestamp', () => {
  assertEquals(parseGhostSignature('t=1234567890, sha256=abc123'), {
    sha256: 'abc123',
    t: '1234567890',
  });
  assertEquals(parseGhostSignature('invalid'), null);
});

Deno.test('verifyGhostWebhookSignature validates HMAC', async () => {
  const secret = 'test-secret';
  const body = '{"post":{"current":{}}}';
  const timestamp = '1700000000';
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
    new TextEncoder().encode(`${body}${timestamp}`),
  );
  const sha256 = Array.from(new Uint8Array(signed))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  const valid = await verifyGhostWebhookSignature(body, `t=${timestamp}, sha256=${sha256}`, secret);
  assertEquals(valid, true);

  const invalid = await verifyGhostWebhookSignature(
    body,
    `t=${timestamp}, sha256=deadbeef`,
    secret,
  );
  assertEquals(invalid, false);
});

Deno.test({
  name: 'resetWebhookDebounceForTests clears pending timer',
  fn() {
    resetWebhookDebounceForTests();
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
