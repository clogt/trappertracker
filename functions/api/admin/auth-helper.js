// Shared admin authentication helper
import * as jose from 'jose';

function getJwtSecret(env) {
    if (!env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable not set");
    }
    return new TextEncoder().encode(env.JWT_SECRET);
}

/**
 * Verify admin token from request
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @returns {Promise<Object|null>} Admin payload if valid, null if invalid
 */
export async function verifyAdminToken(request, env) {
    try {
        // Extract admin_token from cookies
        const cookies = request.headers.get('Cookie') || '';
        const adminTokenCookie = cookies.split(';').find(c => c.trim().startsWith('admin_token='));

        if (!adminTokenCookie) {
            return null;
        }

        const token = adminTokenCookie.split('=')[1];
        if (!token) {
            return null;
        }

        // Verify JWT
        const JWT_SECRET = getJwtSecret(env);
        const { payload } = await jose.jwtVerify(token, JWT_SECRET);

        // Verify admin role
        if (payload.role !== 'admin') {
            return null;
        }

        return payload;
    } catch (error) {
        console.error('Admin token verification failed:', error.message);
        return null;
    }
}

/**
 * Create an unauthorized response
 * @returns {Response}
 */
export function unauthorizedResponse() {
    return new Response(JSON.stringify({ error: 'Unauthorized. Admin authentication required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
    });
}
