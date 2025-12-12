// Reject a report
import { verifyAdminAuth } from '../../auth-helper.js';

/**
 * PUT /api/admin/reports/:id/reject
 * Reject a report and hide it from the public map
 */
export async function onRequestPut({ request, env, params }) {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const reportId = params.id;
        const body = await request.json();
        const { reason } = body;

        if (!reason) {
            return new Response(JSON.stringify({
                error: 'Rejection reason is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if report exists
        const existingReport = await env.DB.prepare(`
            SELECT blip_id, approval_status, description, reported_by_user_id
            FROM trapper_blips
            WHERE blip_id = ?
        `).bind(reportId).first();

        if (!existingReport) {
            return new Response(JSON.stringify({ error: 'Report not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update report to rejected status
        const updateStmt = env.DB.prepare(`
            UPDATE trapper_blips
            SET
                approval_status = 'rejected',
                approved_by_admin_id = ?,
                reviewed_at = CURRENT_TIMESTAMP,
                rejection_reason = ?,
                admin_notes = ?
            WHERE blip_id = ?
        `).bind(adminAuth.userId, reason, `Rejected: ${reason}`, reportId);

        await updateStmt.run();

        // Update user reputation (increase rejected count)
        await env.DB.prepare(`
            INSERT INTO user_reputation (user_id, rejected_submissions)
            VALUES (?, 1)
            ON CONFLICT(user_id) DO UPDATE SET
                rejected_submissions = rejected_submissions + 1,
                total_submissions = total_submissions + 1,
                last_calculated = CURRENT_TIMESTAMP
        `).bind(existingReport.reported_by_user_id).run();

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
            ) VALUES (?, 'report_reject', 'trapper_blip', ?, ?, ?, ?)
        `).bind(
            adminAuth.userId,
            reportId,
            JSON.stringify({
                reason,
                previous_status: existingReport.approval_status,
                description_preview: existingReport.description?.substring(0, 100),
                user_id: existingReport.reported_by_user_id
            }),
            request.headers.get('CF-Connecting-IP') || 'unknown',
            request.headers.get('User-Agent') || 'unknown'
        );

        await auditStmt.run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Report rejected successfully',
            reportId: parseInt(reportId),
            reason
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error rejecting report:', error);
        return new Response(JSON.stringify({
            error: 'Failed to reject report',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
