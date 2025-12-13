// Admin Moderation Queue - List and filter reports for moderation
import { verifyAdminAuth } from './auth-helper.js';

/**
 * GET /api/admin/moderation-queue
 * Returns all reports with filtering, sorting, and pagination
 * Query params:
 *   - status: pending|approved|rejected|all (default: pending)
 *   - type: trapper_blips|lost_pets|found_pets|dangerous_animals|all (default: all)
 *   - source: manual|extension|all (default: all)
 *   - sort: date|spam_score|flags (default: date)
 *   - order: asc|desc (default: desc)
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 20, max: 100)
 *   - search: search term for description
 *   - flagged: true|false (filter for flagged reports)
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
        const url = new URL(request.url);
        const params = {
            status: url.searchParams.get('status') || 'pending',
            type: url.searchParams.get('type') || 'all',
            source: url.searchParams.get('source') || 'all',
            sort: url.searchParams.get('sort') || 'date',
            order: url.searchParams.get('order') || 'desc',
            page: parseInt(url.searchParams.get('page') || '1'),
            limit: Math.min(parseInt(url.searchParams.get('limit') || '20'), 100),
            search: url.searchParams.get('search') || '',
            flagged: url.searchParams.get('flagged') === 'true'
        };

        // Build the WHERE clause based on filters
        let whereClauses = [];
        let whereParams = [];

        // Status filter
        if (params.status !== 'all') {
            whereClauses.push('approval_status = ?');
            whereParams.push(params.status);
        }

        // Source filter
        if (params.source !== 'all') {
            whereClauses.push('source_type = ?');
            whereParams.push(params.source);
        }

        // Search filter
        if (params.search) {
            whereClauses.push('description LIKE ?');
            whereParams.push(`%${params.search}%`);
        }

        // Flagged filter
        if (params.flagged) {
            whereClauses.push('flag_count > 0');
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Build ORDER BY clause
        let orderByClause;
        switch (params.sort) {
            case 'spam_score':
                orderByClause = `ORDER BY tb.spam_score ${params.order}, tb.created_at ${params.order}`;
                break;
            case 'flags':
                orderByClause = `ORDER BY tb.flag_count ${params.order}, tb.created_at ${params.order}`;
                break;
            case 'date':
            default:
                orderByClause = `ORDER BY tb.created_at ${params.order}`;
        }

        // Calculate pagination
        const offset = (params.page - 1) * params.limit;

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM trapper_blips
            ${whereClause}
        `;
        const countStmt = env.DB.prepare(countQuery).bind(...whereParams);
        const { total } = await countStmt.first();

        // Get paginated reports with user info
        const reportsQuery = `
            SELECT
                tb.blip_id,
                tb.latitude,
                tb.longitude,
                tb.description,
                tb.report_timestamp,
                tb.created_at,
                tb.approval_status,
                tb.admin_notes,
                tb.reviewed_at,
                tb.approved_by_admin_id,
                tb.rejection_reason,
                tb.source_url,
                tb.source_type,
                tb.flag_count,
                tb.spam_score,
                tb.reported_by_user_id,
                u.email as user_email,
                u.account_status as user_status,
                u.created_at as user_created_at,
                admin_user.email as reviewed_by_email
            FROM trapper_blips tb
            LEFT JOIN users u ON tb.reported_by_user_id = u.user_id
            LEFT JOIN users admin_user ON tb.approved_by_admin_id = admin_user.user_id
            ${whereClause}
            ${orderByClause}
            LIMIT ? OFFSET ?
        `;

        const reportsStmt = env.DB.prepare(reportsQuery).bind(...whereParams, params.limit, offset);
        const { results: reports } = await reportsStmt.all();

        // Calculate metadata for each report
        const enrichedReports = reports.map(report => ({
            ...report,
            user_age_days: report.user_created_at
                ? Math.floor((Date.now() - new Date(report.user_created_at).getTime()) / (1000 * 60 * 60 * 24))
                : null,
            is_new_user: report.user_created_at
                ? Math.floor((Date.now() - new Date(report.user_created_at).getTime()) / (1000 * 60 * 60 * 24)) < 7
                : false,
            pending_duration_hours: report.approval_status === 'pending' && report.created_at
                ? Math.floor((Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60))
                : null
        }));

        // Get summary statistics
        const statsQuery = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN flag_count > 0 THEN 1 ELSE 0 END) as flagged,
                SUM(CASE WHEN spam_score > 50 THEN 1 ELSE 0 END) as suspected_spam
            FROM trapper_blips
        `;
        const stats = await env.DB.prepare(statsQuery).first();

        return new Response(JSON.stringify({
            reports: enrichedReports,
            pagination: {
                page: params.page,
                limit: params.limit,
                total: total,
                pages: Math.ceil(total / params.limit)
            },
            filters: params,
            stats
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching moderation queue:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch moderation queue',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
