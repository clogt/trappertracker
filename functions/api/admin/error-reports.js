// Get error reports for admin dashboard
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';

export async function onRequestGet({ request, env }) {
    try {
        // Verify admin authentication
        const adminPayload = await verifyAdminToken(request, env);
        if (!adminPayload) {
            return unauthorizedResponse();
        }

        // Get error reports from database
        try {
            const { results } = await env.DB.prepare(`
                SELECT * FROM error_reports
                ORDER BY created_at DESC
                LIMIT 100
            `).all();

            return new Response(JSON.stringify(results), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            // If error_reports table doesn't exist, return empty array
            if (e.message && e.message.includes('no such table')) {
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            throw e;
        }

    } catch (error) {
        console.error('Failed to get error reports:', error);
        return new Response(JSON.stringify({
            error: 'Failed to retrieve error reports',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
