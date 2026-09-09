const SESSION_PAIR = /((?:__Host-|__Secure-)?ghost-admin-api-session=[^;,]*)/i;

export function collectSetCookieHeaders(headers) {
  if (headers && typeof headers.getSetCookie === 'function') {
    const list = headers.getSetCookie();
    if (Array.isArray(list) && list.length > 0) {
      return list.filter((entry) => typeof entry === 'string' && entry.length > 0);
    }
  }

  const fromGet = headers && typeof headers.get === 'function' ? headers.get('set-cookie') : null;
  if (typeof fromGet === 'string' && fromGet.trim()) {
    return [fromGet];
  }

  if (headers && typeof headers.raw === 'function') {
    const raw = headers.raw();
    const setCookie = raw?.['set-cookie'] ?? raw?.['Set-Cookie'];
    if (Array.isArray(setCookie) && setCookie.length > 0) {
      return setCookie.filter(Boolean);
    }
    if (typeof setCookie === 'string' && setCookie) {
      return [setCookie];
    }
  }

  return [];
}

export function setCookieNames(headersOrCookies) {
  const cookies = Array.isArray(headersOrCookies)
    ? headersOrCookies
    : collectSetCookieHeaders(headersOrCookies);
  return cookies
    .map((cookie) => {
      const pair = String(cookie).split(';')[0];
      const eq = pair.indexOf('=');
      return (eq === -1 ? pair : pair.slice(0, eq)).trim();
    })
    .filter(Boolean);
}

export function extractAdminSessionCookie(headers) {
  for (const cookie of collectSetCookieHeaders(headers)) {
    const match = String(cookie).match(SESSION_PAIR);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

export function logGhostHttp({ method, path, status, durationMs, headers, extra = '' }) {
  const pathForLog = String(path).split('?')[0];
  const names = setCookieNames(headers ?? []);
  const cookiePart = names.length ? names.join(',') : '-';
  const extraPart = extra ? ` ${extra}` : '';
  console.log(
    `Ghost ${method} ${pathForLog} -> ${status} ${durationMs}ms set-cookie=[${cookiePart}]${extraPart}`,
  );
}
