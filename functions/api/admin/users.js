// Get all users for admin dashboard
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';

export async function onRequestGet({ request, env }) {
    try {
        // Verify admin authentication
        const adminPayload = await verifyAdminToken(request, env);
        if (!adminPayload) {
            return unauthorizedResponse();
        }

        // Get all users from database
        const { results } = await env.DB.prepare(`
            SELECT user_id, email, role, is_verified, created_at
            FROM users
            ORDER BY created_at DESC
        `).all();

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to get users:', error);
        return new Response(JSON.stringify({
            error: 'Failed to retrieve users',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
