// Verify admin authentication with JWT
import * as jose from 'jose';

function getJwtSecret(env) {
    if (!env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable not set");
    }
    return new TextEncoder().encode(env.JWT_SECRET);
}

export async function onRequestGet({ request, env }) {
    try {
        // Check for admin_token in cookie
        const cookies = request.headers.get('Cookie') || '';
        const adminTokenCookie = cookies.split(';').find(c => c.trim().startsWith('admin_token='));

        if (!adminTokenCookie) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = adminTokenCookie.split('=')[1];

        if (!token) {
            return new Response(JSON.stringify({ error: 'Invalid token format' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        try {
            // Verify JWT token
            const JWT_SECRET = getJwtSecret(env);
            const { payload } = await jose.jwtVerify(token, JWT_SECRET);

            // Check if token has admin role
            if (payload.role !== 'admin') {
                return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({
                authenticated: true,
                role: 'admin',
                username: payload.username
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (e) {
            // Invalid or expired token
            return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Verification error:', error);
        return new Response(JSON.stringify({
            error: 'Verification failed'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
