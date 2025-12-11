import * as jose from 'jose';

/**
 * Logout Endpoint
 * Revokes the user's JWT token by adding it to the blacklist
 * and clears the session cookie
 */

function getJwtSecret(env) {
    if (!env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable not set.");
    }
    return new TextEncoder().encode(env.JWT_SECRET);
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // Get the JWT token from cookie
        const cookieHeader = request.headers.get('Cookie');
        if (!cookieHeader) {
            return new Response(JSON.stringify({ error: 'No active session' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const cookies = cookieHeader.split(';').map(c => c.trim());
        const sessionCookie = cookies.find(cookie => cookie.startsWith('session='));

        if (!sessionCookie) {
            return new Response(JSON.stringify({ error: 'No active session' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const jwt = sessionCookie.substring('session='.length);

        // Verify the token is valid before blacklisting
        try {
            const JWT_SECRET = getJwtSecret(env);
            const { payload } = await jose.jwtVerify(jwt, JWT_SECRET);

            // Add token to blacklist with expiration matching token expiration
            if (env.SESSION_BLACKLIST) {
                const expirationTime = payload.exp; // Unix timestamp
                const currentTime = Math.floor(Date.now() / 1000);
                const ttl = expirationTime - currentTime;

                if (ttl > 0) {
                    // Store in KV with TTL matching token expiration
                    await env.SESSION_BLACKLIST.put(
                        `token:${jwt}`,
                        JSON.stringify({
                            userId: payload.userId,
                            revokedAt: new Date().toISOString(),
                            reason: 'user_logout'
                        }),
                        { expirationTtl: ttl }
                    );
                }
            }
        } catch (e) {
            // Token is already invalid, just clear the cookie
            console.log("Token already invalid, clearing cookie:", e.message);
        }

        // Clear the session cookie
        const response = new Response(JSON.stringify({ message: 'Logged out successfully' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

        response.headers.set('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
        return response;

    } catch (error) {
        console.error("Logout error:", error);
        return new Response(JSON.stringify({ error: 'Logout failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
