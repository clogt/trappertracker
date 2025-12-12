// Bulk actions for reports (approve, reject, delete multiple)
import { verifyAdminAuth } from '../auth-helper.js';

/**
 * POST /api/admin/reports/bulk-action
 * Perform bulk actions on multiple reports
 * Body: { action: 'approve'|'reject'|'delete', reportIds: [1,2,3], reason?: string, notes?: string }
 */
export async function onRequestPost({ request, env }) {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { action, reportIds, reason, notes } = await request.json();

        // Validate input
        if (!action || !Array.isArray(reportIds) || reportIds.length === 0) {
            return new Response(JSON.stringify({
                error: 'Invalid request. action and reportIds array are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!['approve', 'reject', 'delete'].includes(action)) {
            return new Response(JSON.stringify({
                error: 'Invalid action. Must be approve, reject, or delete'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (action === 'reject' && !reason) {
            return new Response(JSON.stringify({
                error: 'Rejection reason is required for bulk reject'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Limit bulk actions to prevent abuse
        if (reportIds.length > 100) {
            return new Response(JSON.stringify({
                error: 'Bulk action limited to 100 reports at a time'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const results = {
            success: [],
            failed: [],
            total: reportIds.length
        };

        // Process each report
        for (const reportId of reportIds) {
            try {
                // Verify report exists
                const report = await env.DB.prepare(`
                    SELECT blip_id, description, reported_by_user_id, approval_status
                    FROM trapper_blips
                    WHERE blip_id = ?
                `).bind(reportId).first();

                if (!report) {
                    results.failed.push({ reportId, error: 'Report not found' });
                    continue;
                }

                // Perform the action
                switch (action) {
                    case 'approve':
                        await env.DB.prepare(`
                            UPDATE trapper_blips
                            SET
                                approval_status = 'approved',
                                approved_by_admin_id = ?,
                                approved_at = CURRENT_TIMESTAMP,
                                reviewed_at = CURRENT_TIMESTAMP,
                                admin_notes = ?
                            WHERE blip_id = ?
                        `).bind(adminAuth.userId, notes || 'Bulk approved', reportId).run();

                        // Update user reputation
                        await env.DB.prepare(`
                            INSERT INTO user_reputation (user_id, approved_submissions)
                            VALUES (?, 1)
                            ON CONFLICT(user_id) DO UPDATE SET
                                approved_submissions = approved_submissions + 1,
                                total_submissions = total_submissions + 1,
                                last_calculated = CURRENT_TIMESTAMP
                        `).bind(report.reported_by_user_id).run();
                        break;

                    case 'reject':
                        await env.DB.prepare(`
                            UPDATE trapper_blips
                            SET
                                approval_status = 'rejected',
                                approved_by_admin_id = ?,
                                reviewed_at = CURRENT_TIMESTAMP,
                                rejection_reason = ?,
                                admin_notes = ?
                            WHERE blip_id = ?
                        `).bind(adminAuth.userId, reason, `Bulk rejected: ${reason}`, reportId).run();

                        // Update user reputation
                        await env.DB.prepare(`
                            INSERT INTO user_reputation (user_id, rejected_submissions)
                            VALUES (?, 1)
                            ON CONFLICT(user_id) DO UPDATE SET
                                rejected_submissions = rejected_submissions + 1,
                                total_submissions = total_submissions + 1,
                                last_calculated = CURRENT_TIMESTAMP
                        `).bind(report.reported_by_user_id).run();
                        break;

                    case 'delete':
                        await env.DB.prepare(`
                            DELETE FROM trapper_blips WHERE blip_id = ?
                        `).bind(reportId).run();
                        break;
                }

                // Log each action
                await env.DB.prepare(`
                    INSERT INTO admin_audit_log (
                        admin_user_id,
                        action_type,
                        target_type,
                        target_id,
                        action_details,
                        ip_address,
                        user_agent
                    ) VALUES (?, ?, 'trapper_blip', ?, ?, ?, ?)
                `).bind(
                    adminAuth.userId,
                    `report_bulk_${action}`,
                    reportId,
                    JSON.stringify({
                        action,
                        reason: reason || notes,
                        description_preview: report.description?.substring(0, 50),
                        previous_status: report.approval_status
                    }),
                    request.headers.get('CF-Connecting-IP') || 'unknown',
                    request.headers.get('User-Agent') || 'unknown'
                ).run();

                results.success.push(reportId);

            } catch (error) {
                console.error(`Failed to ${action} report ${reportId}:`, error);
                results.failed.push({
                    reportId,
                    error: error.message
                });
            }
        }

        // Log the bulk action summary
        await env.DB.prepare(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action_type,
                target_type,
                target_id,
                action_details,
                ip_address,
                user_agent
            ) VALUES (?, 'bulk_action_summary', 'trapper_blip', 'bulk', ?, ?, ?)
        `).bind(
            adminAuth.userId,
            JSON.stringify({
                action,
                total: results.total,
                successful: results.success.length,
                failed: results.failed.length,
                reason: reason || notes
            }),
            request.headers.get('CF-Connecting-IP') || 'unknown',
            request.headers.get('User-Agent') || 'unknown'
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: `Bulk ${action} completed`,
            results
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error performing bulk action:', error);
        return new Response(JSON.stringify({
            error: 'Failed to perform bulk action',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
