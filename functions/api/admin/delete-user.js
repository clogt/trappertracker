// Delete user
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';

import { csrfMiddleware } from './csrf-middleware.js';

export const onRequestDelete = csrfMiddleware(async ({ request, env }) => {
    try {
        // Verify admin authentication
        const adminPayload = await verifyAdminToken(request, env);
        if (!adminPayload) {
            return unauthorizedResponse();
        }

        const { userId } = await request.json();

        // Input validation
        if (!userId) {
            return new Response(JSON.stringify({ error: 'Missing userId' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate userId format (should be UUID or alphanumeric)
        if (typeof userId !== 'string' || userId.length > 100 || userId.length < 1) {
            return new Response(JSON.stringify({ error: 'Invalid userId format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if user exists before deletion
        const userExists = await env.DB.prepare(
            'SELECT user_id FROM users WHERE user_id = ?'
        ).bind(userId).first();

        if (!userExists) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete user - CASCADE will handle related records if configured
        await env.DB.prepare(`
            DELETE FROM users
            WHERE user_id = ?
        `).bind(userId).run();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to delete user:', error);
        return new Response(JSON.stringify({
            error: 'Failed to delete user',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
