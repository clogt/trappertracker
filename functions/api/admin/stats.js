// Get admin dashboard statistics
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';

export async function onRequestGet({ request, env }) {
    try {
        // Verify admin authentication
        const adminPayload = await verifyAdminToken(request, env);
        if (!adminPayload) {
            return unauthorizedResponse();
        }

        // Get statistics from database
        const stats = {
            totalUsers: 0,
            totalReports: 0,
            totalErrors: 0,
            activeBlips: 0
        };

        // Count total users
        const usersResult = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
        stats.totalUsers = usersResult?.count || 0;

        // Count total reports (danger zones)
        const reportsResult = await env.DB.prepare('SELECT COUNT(*) as count FROM trapper_blips').first();
        stats.totalReports = reportsResult?.count || 0;

        // Count error reports (if error_reports table exists)
        try {
            const errorsResult = await env.DB.prepare('SELECT COUNT(*) as count FROM error_reports').first();
            stats.totalErrors = errorsResult?.count || 0;
        } catch (e) {
            // Table might not exist yet
            stats.totalErrors = 0;
        }

        // Count active blips (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const activeResult = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM trapper_blips WHERE report_timestamp > ?'
        ).bind(thirtyDaysAgo).first();
        stats.activeBlips = activeResult?.count || 0;

        return new Response(JSON.stringify(stats), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to get stats:', error);
        return new Response(JSON.stringify({
            error: 'Failed to retrieve statistics',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
