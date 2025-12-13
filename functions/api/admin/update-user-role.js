// Update user role
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';

import { csrfMiddleware } from './csrf-middleware.js';

export const onRequestPost = csrfMiddleware(async ({ request, env }) => {
    try {
        // Verify admin authentication
        const adminPayload = await verifyAdminToken(request, env);
        if (!adminPayload) {
            return unauthorizedResponse();
        }

        const { userId, role } = await request.json();

        // Input validation
        if (!userId || !role) {
            return new Response(JSON.stringify({ error: 'Missing userId or role' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate userId format
        if (typeof userId !== 'string' || userId.length > 100 || userId.length < 1) {
            return new Response(JSON.stringify({ error: 'Invalid userId format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate role with whitelist
        const validRoles = ['user', 'enforcement', 'admin'];
        if (!validRoles.includes(role)) {
            return new Response(JSON.stringify({ error: 'Invalid role. Must be: user, enforcement, or admin' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if user exists before update
        const userExists = await env.DB.prepare(
            'SELECT user_id FROM users WHERE user_id = ?'
        ).bind(userId).first();

        if (!userExists) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update user role using parameterized query (prevents SQL injection)
        await env.DB.prepare(`
            UPDATE users
            SET role = ?
            WHERE user_id = ?
        `).bind(role, userId).run();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to update user role:', error);
        return new Response(JSON.stringify({
            error: 'Failed to update user role',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
