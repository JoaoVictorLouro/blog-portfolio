import { assertEquals } from 'jsr:@std/assert@1';
import {
  collectSetCookieHeaders,
  extractAdminSessionCookie,
  setCookieNames,
} from './ghost-session-cookie.mjs';

Deno.test('extractAdminSessionCookie reads prefixed cookie names', () => {
  const headers = {
    getSetCookie: () => ['__Host-ghost-admin-api-session=abc123; Path=/ghost; Secure; HttpOnly'],
  };
  assertEquals(extractAdminSessionCookie(headers), '__Host-ghost-admin-api-session=abc123');
});

Deno.test(
  'extractAdminSessionCookie falls back to get(set-cookie) when getSetCookie is empty',
  () => {
    const headers = {
      getSetCookie: () => [],
      get: (name: string) =>
        name === 'set-cookie' ? 'ghost-admin-api-session=xyz; Path=/ghost; HttpOnly' : null,
    };
    assertEquals(collectSetCookieHeaders(headers), [
      'ghost-admin-api-session=xyz; Path=/ghost; HttpOnly',
    ]);
    assertEquals(extractAdminSessionCookie(headers), 'ghost-admin-api-session=xyz');
  },
);

Deno.test('extractAdminSessionCookie finds the session pair in a comma-joined header', () => {
  const headers = {
    get: (name: string) =>
      name === 'set-cookie'
        ? 'other=1; Path=/, ghost-admin-api-session=tok; Path=/ghost, extra=2'
        : null,
  };
  assertEquals(extractAdminSessionCookie(headers), 'ghost-admin-api-session=tok');
  assertEquals(setCookieNames(headers), ['other']);
});

Deno.test('setCookieNames never includes cookie values', () => {
  const headers = {
    getSetCookie: () => ['ghost-admin-api-session=secret-value; Path=/ghost'],
  };
  assertEquals(setCookieNames(headers), ['ghost-admin-api-session']);
});
