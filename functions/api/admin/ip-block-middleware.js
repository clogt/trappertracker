// functions/api/admin/ip-block-middleware.js

export function ipBlockMiddleware(handler) {
  return async (context) => {
    const { request, env } = context;
    const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

    const blockedIp = await env.DB.prepare('SELECT ip_address FROM blocked_ips WHERE ip_address = ?').bind(ip).first();

    if (blockedIp) {
      return new Response('Forbidden', { status: 403 });
    }

    return handler(context);
  };
}
