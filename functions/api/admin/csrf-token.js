// functions/api/admin/csrf-token.js

import { createCsrfToken } from './csrf-middleware.js';
import { verifyAdminAuth } from './auth-helper.js';

export async function onRequest(context) {
  const { request, env } = context;

  const adminAuth = await verifyAdminAuth(request, env);
  if (!adminAuth.authenticated) {
    return new Response(JSON.stringify({ error: adminAuth.error }), {
      status: adminAuth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = await createCsrfToken(env);
  const cookie = `csrf_token=${token}; Path=/; HttpOnly; SameSite=Strict; Secure`;

  return new Response(JSON.stringify({ token }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
}
