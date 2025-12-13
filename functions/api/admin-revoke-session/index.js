import { verifyAdminToken } from '../admin/auth-helper.js';

import { csrfMiddleware } from '../admin/csrf-middleware.js';

/**
 * Admin Endpoint: Force Revoke User Session
 * Allows administrators to forcefully revoke all sessions for a specific user
 * Use case: Compromised account, security incident, user ban
 */

export const onRequestPost = csrfMiddleware(async (context) => {
    const { request, env } = context;

    // Authenticate admin
    const adminUser = await verifyAdminToken(request, env);
    if (!adminUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { userId, reason } = await request.json();

        if (!userId) {
            return new Response(JSON.stringify({ error: 'userId is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify user exists
        const user = await env.DB.prepare(
            'SELECT user_id, email FROM users WHERE user_id = ?'
        ).bind(userId).first();

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!env.SESSION_BLACKLIST) {
            return new Response(JSON.stringify({ error: 'Session revocation not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Add user to global revocation list
        // All future authentication attempts will check this list
        await env.SESSION_BLACKLIST.put(
            `user_revoked:${userId}`,
            JSON.stringify({
                userId: userId,
                email: user.email,
                revokedAt: new Date().toISOString(),
                revokedBy: adminUser.username || adminUser.userId,
                reason: reason || 'admin_revocation'
            }),
            { expirationTtl: 28800 } // 8 hours - forces user to re-login
        );

        console.log(`Admin ${adminUser.username || adminUser.userId} revoked sessions for user ${user.email} (${userId})`);

        return new Response(JSON.stringify({
            message: 'All sessions revoked for user',
            userId: userId,
            email: user.email,
            expiresIn: '8 hours'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Session revocation error:", error);
        return new Response(JSON.stringify({ error: 'Failed to revoke session' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
