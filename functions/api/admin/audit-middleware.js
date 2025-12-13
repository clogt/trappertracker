// functions/api/admin/audit-middleware.js

import { verifyAdminAuth } from './auth-helper.js';

export function auditMiddleware(action) {
  return (handler) => async (context) => {
    const { request, env } = context;
    const adminAuth = await verifyAdminAuth(request, env);

    if (adminAuth.authenticated) {
      const { userId, username } = adminAuth;
      const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      // Get the target of the action from the request parameters
      const url = new URL(request.url);
      const targetId = url.pathname.split('/').pop();

      const details = {
        method: request.method,
        url: request.url,
        body: request.method !== 'GET' ? await request.clone().text() : null,
      };

      await env.DB.prepare(
        'INSERT INTO admin_audit_log (admin_user_id, action_type, target_type, target_id, action_details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(userId, action, 'api', targetId, JSON.stringify(details), ip, userAgent)
        .run();
    }

    return handler(context);
  };
}
