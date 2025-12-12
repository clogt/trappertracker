// functions/api/admin/ip-block.js

import { verifyAdminAuth } from './auth-helper.js';
import { csrfMiddleware } from './csrf-middleware.js';

async function addBlockedIp(request, env) {
  const { ip, reason } = await request.json();

  if (!ip) {
    return new Response('IP address is required', { status: 400 });
  }

  await env.DB.prepare('INSERT INTO blocked_ips (ip_address, reason) VALUES (?, ?)')
    .bind(ip, reason)
    .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function removeBlockedIp(request, env) {
  const { ip } = await request.json();

  if (!ip) {
    return new Response('IP address is required', { status: 400 });
  }

  await env.DB.prepare('DELETE FROM blocked_ips WHERE ip_address = ?')
    .bind(ip)
    .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestPost = csrfMiddleware(async ({ request, env }) => {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    return addBlockedIp(request, env);
});

export const onRequestDelete = csrfMiddleware(async ({ request, env }) => {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    return removeBlockedIp(request, env);
});
