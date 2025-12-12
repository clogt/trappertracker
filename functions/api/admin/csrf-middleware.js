import { nanoid } from 'nanoid';

// functions/api/admin/csrf-middleware.js

import { nanoid } from 'nanoid';

const CSRF_TOKEN_COOKIE_NAME = 'csrf_token';
const CSRF_TOKEN_HEADER_NAME = 'X-CSRF-Token';

export async function createCsrfToken(env) {
  const token = nanoid();
  const secret = env.JWT_SECRET; // Re-use JWT_SECRET for signing CSRF tokens
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${token}.${signatureHex}`;
}

export async function validateCsrfToken(request, env) {
  const cookie = request.headers.get('Cookie');
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER_NAME);

  if (!cookie || !headerToken) {
    return false;
  }

  const csrfCookie = cookie.split(';').find(c => c.trim().startsWith(`${CSRF_TOKEN_COOKIE_NAME}=`));

  if (!csrfCookie) {
    return false;
  }

  const cookieToken = csrfCookie.split('=')[1];

  if (cookieToken !== headerToken) {
    return false;
  }

  const [token, signatureHex] = cookieToken.split('.');
  const secret = env.JWT_SECRET;
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const expectedSignatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  return expectedSignatureHex === signatureHex;
}

export function csrfMiddleware(handler) {
  return async (request, env) => {
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
      const isValid = await validateCsrfToken(request, env);
      if (!isValid) {
        return new Response('Invalid CSRF token', { status: 403 });
      }
    }
    return handler(request, env);
  };
}
