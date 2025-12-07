// Admin authentication middleware
// Uses HTTP Basic Auth with default credentials: admin/admin

export async function onRequest(context) {
  const { request, env } = context;

  // Get Authorization header
  const authorization = request.headers.get('Authorization');

  if (!authorization) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Access"',
        'Content-Type': 'text/plain'
      }
    });
  }

  // Parse Basic Auth credentials
  const [scheme, encoded] = authorization.split(' ');

  if (!encoded || scheme !== 'Basic') {
    return new Response('Invalid authentication', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Access"',
        'Content-Type': 'text/plain'
      }
    });
  }

  const credentials = atob(encoded);
  const [username, password] = credentials.split(':');

  // Check credentials (default: admin/admin)
  // In production, this should check against encrypted credentials in D1
  const validUsername = env.ADMIN_USERNAME || 'admin';
  const validPassword = env.ADMIN_PASSWORD;

  // Fail secure - if password not set, deny access
  if (!validPassword) {
    return new Response('Server configuration error', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }

  if (username !== validUsername || password !== validPassword) {
    return new Response('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Access"',
        'Content-Type': 'text/plain'
      }
    });
  }

  // Authentication successful, continue to admin pages
  return await context.next();
}
