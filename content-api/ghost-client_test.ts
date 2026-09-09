import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';
import { createAdminJwt, decodeJwtPart, parseAdminApiKey } from './ghost-client.ts';

const KEY_ID = '64c3f3a1b2c3d4e5f6071829';
const SECRET_HEX = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
const ADMIN_KEY = `${KEY_ID}:${SECRET_HEX}`;

Deno.test('parseAdminApiKey splits id and hex secret', () => {
  assertEquals(parseAdminApiKey(` ${ADMIN_KEY} \n`), { id: KEY_ID, secretHex: SECRET_HEX });
});

Deno.test('parseAdminApiKey rejects malformed keys', () => {
  assertThrows(() => parseAdminApiKey('nocolon'), Error, 'id:secret');
  assertThrows(() => parseAdminApiKey('id:not-hex'), Error, 'even-length hex');
  assertThrows(() => parseAdminApiKey('id:abc'), Error, 'even-length hex');
});

Deno.test('createAdminJwt uses kid, aud, and a 5-minute expiry', async () => {
  const now = 1_700_000_000;
  const token = await createAdminJwt(ADMIN_KEY, now);
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  assertEquals(Boolean(signaturePart), true);

  const header = decodeJwtPart(headerPart);
  assertEquals(header.alg, 'HS256');
  assertEquals(header.typ, 'JWT');
  assertEquals(header.kid, KEY_ID);

  const payload = decodeJwtPart(payloadPart);
  assertEquals(payload.iat, now);
  assertEquals(payload.exp, now + 300);
  assertEquals(payload.aud, '/admin/');
});

Deno.test('createAdminJwt rejects ttl above 5 minutes', async () => {
  await assertRejects(() => createAdminJwt(ADMIN_KEY, 1, 301), Error, 'JWT ttl');
});
