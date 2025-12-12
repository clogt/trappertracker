// Approve a report
import { verifyAdminAuth } from '../../auth-helper.js';

import { csrfMiddleware } from '../../csrf-middleware.js';

/**
 * PUT /api/admin/reports/:id/approve
 * Approve a report and make it visible on the public map
 */
export const onRequestPut = csrfMiddleware(async ({ request, env, params }) => {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const reportId = params.id;
        const body = await request.json().catch(() => ({}));
        const { notes } = body;

        // Check if report exists
        const existingReport = await env.DB.prepare(`
            SELECT blip_id, approval_status, description
            FROM trapper_blips
            WHERE blip_id = ?
        `).bind(reportId).first();

        if (!existingReport) {
            return new Response(JSON.stringify({ error: 'Report not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update report to approved status
        const updateStmt = env.DB.prepare(`
            UPDATE trapper_blips
            SET
                approval_status = 'approved',
                approved_by_admin_id = ?,
                approved_at = CURRENT_TIMESTAMP,
                reviewed_at = CURRENT_TIMESTAMP,
                admin_notes = ?
            WHERE blip_id = ?
        `).bind(adminAuth.userId, notes || 'Approved by admin', reportId);

        await updateStmt.run();

        // Log the admin action
        const auditStmt = env.DB.prepare(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action_type,
                target_type,
                target_id,
                action_details,
                ip_address,
                user_agent
            ) VALUES (?, 'report_approve', 'trapper_blip', ?, ?, ?, ?)
        `).bind(
            adminAuth.userId,
            reportId,
            JSON.stringify({
                notes,
                previous_status: existingReport.approval_status,
                description_preview: existingReport.description?.substring(0, 100)
            }),
            request.headers.get('CF-Connecting-IP') || 'unknown',
            request.headers.get('User-Agent') || 'unknown'
        );

        await auditStmt.run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Report approved successfully',
            reportId: parseInt(reportId)
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error approving report:', error);
        return new Response(JSON.stringify({
            error: 'Failed to approve report',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
