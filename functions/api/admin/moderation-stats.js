// Moderation statistics and analytics
import { verifyAdminAuth } from './auth-helper.js';

/**
 * GET /api/admin/moderation-stats
 * Returns comprehensive statistics for the moderation dashboard
 */
export async function onRequestGet({ request, env }) {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Overall status counts
        const statusStats = await env.DB.prepare(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN flag_count > 0 THEN 1 ELSE 0 END) as flagged,
                SUM(CASE WHEN spam_score > 50 THEN 1 ELSE 0 END) as suspected_spam
            FROM trapper_blips
        `).first();

        // Time-based statistics (today, this week, this month)
        const timeStats = await env.DB.prepare(`
            SELECT
                SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as reports_today,
                SUM(CASE WHEN DATE(created_at) >= DATE('now', '-7 days') THEN 1 ELSE 0 END) as reports_this_week,
                SUM(CASE WHEN DATE(created_at) >= DATE('now', '-30 days') THEN 1 ELSE 0 END) as reports_this_month,
                SUM(CASE WHEN approval_status = 'approved' AND DATE(approved_at) = DATE('now') THEN 1 ELSE 0 END) as approved_today,
                SUM(CASE WHEN approval_status = 'approved' AND DATE(approved_at) >= DATE('now', '-7 days') THEN 1 ELSE 0 END) as approved_this_week,
                SUM(CASE WHEN approval_status = 'approved' AND DATE(approved_at) >= DATE('now', '-30 days') THEN 1 ELSE 0 END) as approved_this_month,
                SUM(CASE WHEN approval_status = 'rejected' AND DATE(reviewed_at) = DATE('now') THEN 1 ELSE 0 END) as rejected_today,
                SUM(CASE WHEN approval_status = 'rejected' AND DATE(reviewed_at) >= DATE('now', '-7 days') THEN 1 ELSE 0 END) as rejected_this_week,
                SUM(CASE WHEN approval_status = 'rejected' AND DATE(reviewed_at) >= DATE('now', '-30 days') THEN 1 ELSE 0 END) as rejected_this_month
            FROM trapper_blips
        `).first();

        // Average review time (in minutes)
        const reviewTimeStats = await env.DB.prepare(`
            SELECT
                AVG(CASE
                    WHEN approval_status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL
                    THEN CAST((julianday(reviewed_at) - julianday(created_at)) * 24 * 60 AS INTEGER)
                    ELSE NULL
                END) as avg_review_time_minutes,
                MIN(CASE
                    WHEN approval_status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL
                    THEN CAST((julianday(reviewed_at) - julianday(created_at)) * 24 * 60 AS INTEGER)
                    ELSE NULL
                END) as min_review_time_minutes,
                MAX(CASE
                    WHEN approval_status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL
                    THEN CAST((julianday(reviewed_at) - julianday(created_at)) * 24 * 60 AS INTEGER)
                    ELSE NULL
                END) as max_review_time_minutes
            FROM trapper_blips
            WHERE reviewed_at >= datetime('now', '-30 days')
        `).first();

        // Source breakdown
        const sourceStats = await env.DB.prepare(`
            SELECT
                source_type,
                COUNT(*) as count,
                SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM trapper_blips
            WHERE source_type IS NOT NULL
            GROUP BY source_type
        `).all();

        // Top submitters (by volume)
        const topSubmitters = await env.DB.prepare(`
            SELECT
                u.user_id,
                u.email,
                COUNT(*) as total_submissions,
                SUM(CASE WHEN tb.approval_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN tb.approval_status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN tb.approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                ROUND(
                    CAST(SUM(CASE WHEN tb.approval_status = 'approved' THEN 1 ELSE 0 END) AS FLOAT) /
                    NULLIF(COUNT(*), 0) * 100,
                    1
                ) as approval_rate
            FROM trapper_blips tb
            LEFT JOIN users u ON tb.reported_by_user_id = u.user_id
            WHERE tb.created_at >= datetime('now', '-30 days')
            GROUP BY u.user_id, u.email
            ORDER BY total_submissions DESC
            LIMIT 10
        `).all();

        // Rejection reasons breakdown
        const rejectionReasons = await env.DB.prepare(`
            SELECT
                rejection_reason,
                COUNT(*) as count
            FROM trapper_blips
            WHERE approval_status = 'rejected'
                AND rejection_reason IS NOT NULL
                AND reviewed_at >= datetime('now', '-30 days')
            GROUP BY rejection_reason
            ORDER BY count DESC
            LIMIT 10
        `).all();

        // Geographic distribution (by general area - rounded coords)
        const geographicDistribution = await env.DB.prepare(`
            SELECT
                ROUND(latitude, 1) as lat_area,
                ROUND(longitude, 1) as lon_area,
                COUNT(*) as report_count,
                SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending_count
            FROM trapper_blips
            WHERE created_at >= datetime('now', '-30 days')
            GROUP BY lat_area, lon_area
            HAVING report_count > 1
            ORDER BY report_count DESC
            LIMIT 20
        `).all();

        // Pending reports age distribution
        const pendingAgeDistribution = await env.DB.prepare(`
            SELECT
                SUM(CASE WHEN CAST((julianday('now') - julianday(created_at)) * 24 AS INTEGER) < 1 THEN 1 ELSE 0 END) as under_1_hour,
                SUM(CASE WHEN CAST((julianday('now') - julianday(created_at)) * 24 AS INTEGER) BETWEEN 1 AND 24 THEN 1 ELSE 0 END) as between_1_24_hours,
                SUM(CASE WHEN CAST((julianday('now') - julianday(created_at)) AS INTEGER) BETWEEN 1 AND 7 THEN 1 ELSE 0 END) as between_1_7_days,
                SUM(CASE WHEN CAST((julianday('now') - julianday(created_at)) AS INTEGER) > 7 THEN 1 ELSE 0 END) as over_7_days
            FROM trapper_blips
            WHERE approval_status = 'pending'
        `).first();

        // Admin activity (who's been reviewing)
        const adminActivity = await env.DB.prepare(`
            SELECT
                u.email as admin_email,
                COUNT(*) as reviews_count,
                SUM(CASE WHEN tb.approval_status = 'approved' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN tb.approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
                MAX(tb.reviewed_at) as last_review
            FROM trapper_blips tb
            LEFT JOIN users u ON tb.approved_by_admin_id = u.user_id
            WHERE tb.reviewed_at >= datetime('now', '-30 days')
                AND tb.approved_by_admin_id IS NOT NULL
            GROUP BY u.email
            ORDER BY reviews_count DESC
        `).all();

        // Spam detection insights
        const spamInsights = await env.DB.prepare(`
            SELECT
                SUM(CASE WHEN spam_score >= 75 THEN 1 ELSE 0 END) as high_spam_score,
                SUM(CASE WHEN spam_score BETWEEN 50 AND 74 THEN 1 ELSE 0 END) as medium_spam_score,
                SUM(CASE WHEN spam_score BETWEEN 25 AND 49 THEN 1 ELSE 0 END) as low_spam_score,
                SUM(CASE WHEN spam_score < 25 THEN 1 ELSE 0 END) as minimal_spam_score
            FROM trapper_blips
            WHERE approval_status = 'pending'
        `).first();

        return new Response(JSON.stringify({
            statusStats,
            timeStats,
            reviewTimeStats: {
                ...reviewTimeStats,
                avg_review_time_hours: reviewTimeStats.avg_review_time_minutes
                    ? (reviewTimeStats.avg_review_time_minutes / 60).toFixed(1)
                    : null
            },
            sourceStats: sourceStats.results || [],
            topSubmitters: topSubmitters.results || [],
            rejectionReasons: rejectionReasons.results || [],
            geographicDistribution: geographicDistribution.results || [],
            pendingAgeDistribution,
            adminActivity: adminActivity.results || [],
            spamInsights,
            generatedAt: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching moderation stats:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch moderation statistics',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
