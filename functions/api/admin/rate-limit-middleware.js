// functions/api/admin/rate-limit-middleware.js

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

const ipRequestCounts = new Map();

export function rateLimitMiddleware(handler) {
  return async (context) => {
    const { request, env } = context;
    const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

    if (!ipRequestCounts.has(ip)) {
      ipRequestCounts.set(ip, {
        count: 0,
        startTime: Date.now(),
      });
    }

    const ipData = ipRequestCounts.get(ip);

    if (Date.now() - ipData.startTime > RATE_LIMIT_WINDOW) {
      ipData.count = 0;
      ipData.startTime = Date.now();
    }

    ipData.count++;

    if (ipData.count > MAX_REQUESTS_PER_WINDOW) {
      return new Response('Too many requests', { status: 429 });
    }

    return handler(context);
  };
}
