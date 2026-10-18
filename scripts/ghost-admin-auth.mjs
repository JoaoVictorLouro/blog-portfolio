const JWT_TTL_SECONDS = 300;

export function parseAdminApiKey(adminApiKey) {
  const trimmed = adminApiKey.trim();
  const colon = trimmed.indexOf(':');
  if (colon <= 0 || colon === trimmed.length - 1) {
    throw new Error('GHOST_ADMIN_API_KEY must be in id:secret form');
  }
  const id = trimmed.slice(0, colon);
  const secretHex = trimmed.slice(colon + 1);
  if (!/^[0-9a-fA-F]+$/.test(secretHex) || secretHex.length % 2 !== 0) {
    throw new Error('GHOST_ADMIN_API_KEY secret must be even-length hex');
  }
  return { id, secretHex };
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(`${padded}${'='.repeat(padLength)}`);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function decodeJwtPart(part) {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(part)));
}

export async function createAdminJwt(
  adminApiKey,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = JWT_TTL_SECONDS,
) {
  if (ttlSeconds < 1 || ttlSeconds > JWT_TTL_SECONDS) {
    throw new Error(`JWT ttl must be between 1 and ${JWT_TTL_SECONDS} seconds`);
  }

  const { id, secretHex } = parseAdminApiKey(adminApiKey);
  const header = { alg: 'HS256', typ: 'JWT', kid: id };
  const payload = {
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
    aud: '/admin/',
  };
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    hexToBytes(secretHex),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export function adminTransportHeaders(origin) {
  const url = new URL(origin);
  if (url.protocol !== 'https:') {
    return {};
  }
  return {
    Host: url.host,
    'X-Forwarded-Proto': 'https',
  };
}
