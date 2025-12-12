// Get, update, or delete a single report
import { verifyAdminAuth } from '../../auth-helper.js';

/**
 * GET /api/admin/reports/:id
 * Get full details of a single report including edit history
 */
export async function onRequestGet({ request, env, params }) {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const reportId = params.id;

        // Get report details with user info
        const report = await env.DB.prepare(`
            SELECT
                tb.*,
                u.email as user_email,
                u.account_status as user_status,
                u.created_at as user_created_at,
                admin_user.email as reviewed_by_email,
                editor.email as edited_by_email
            FROM trapper_blips tb
            LEFT JOIN users u ON tb.reported_by_user_id = u.user_id
            LEFT JOIN users admin_user ON tb.approved_by_admin_id = admin_user.user_id
            LEFT JOIN users editor ON tb.edited_by_admin_id = editor.user_id
            WHERE tb.blip_id = ?
        `).bind(reportId).first();

        if (!report) {
            return new Response(JSON.stringify({ error: 'Report not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get edit history
        const editHistory = await env.DB.prepare(`
            SELECT
                rh.*,
                u.email as changed_by_email
            FROM report_history rh
            LEFT JOIN users u ON rh.changed_by_user_id = u.user_id
            WHERE rh.report_id = ?
            ORDER BY rh.created_at DESC
        `).bind(reportId).all();

        // Get flags for this report
        const flags = await env.DB.prepare(`
            SELECT
                rf.*,
                u.email as flagged_by_email
            FROM report_flags rf
            LEFT JOIN users u ON rf.flagged_by_user_id = u.user_id
            WHERE rf.report_id = ?
            ORDER BY rf.created_at DESC
        `).bind(reportId).all();

        // Find similar/duplicate reports (within 100m and similar description)
        const similarReports = await env.DB.prepare(`
            SELECT
                blip_id,
                description,
                latitude,
                longitude,
                created_at,
                approval_status,
                (
                    (latitude - ?) * (latitude - ?) +
                    (longitude - ?) * (longitude - ?)
                ) as distance_squared
            FROM trapper_blips
            WHERE
                blip_id != ?
                AND ABS(latitude - ?) < 0.001
                AND ABS(longitude - ?) < 0.001
            ORDER BY distance_squared
            LIMIT 5
        `).bind(
            report.latitude, report.latitude,
            report.longitude, report.longitude,
            reportId,
            report.latitude,
            report.longitude
        ).all();

        return new Response(JSON.stringify({
            report: {
                ...report,
                user_age_days: report.user_created_at
                    ? Math.floor((Date.now() - new Date(report.user_created_at).getTime()) / (1000 * 60 * 60 * 24))
                    : null
            },
            editHistory: editHistory.results || [],
            flags: flags.results || [],
            similarReports: similarReports.results || []
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching report details:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch report details',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * PUT /api/admin/reports/:id
 * Edit a report's fields
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
        const updates = await request.json();

        // Validate updates
        const allowedFields = ['latitude', 'longitude', 'description', 'report_timestamp', 'source_url', 'admin_notes'];
        const validUpdates = {};
        const changedFields = [];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                validUpdates[field] = updates[field];
                changedFields.push(field);
            }
        }

        if (changedFields.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get current report state for history
        const currentReport = await env.DB.prepare(`
            SELECT * FROM trapper_blips WHERE blip_id = ?
        `).bind(reportId).first();

        if (!currentReport) {
            return new Response(JSON.stringify({ error: 'Report not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Build dynamic UPDATE query
        const setClause = changedFields.map(f => `${f} = ?`).join(', ');
        const values = changedFields.map(f => validUpdates[f]);

        const updateQuery = `
            UPDATE trapper_blips
            SET
                ${setClause},
                edited_by_admin_id = ?,
                edited_at = CURRENT_TIMESTAMP
            WHERE blip_id = ?
        `;

        await env.DB.prepare(updateQuery).bind(...values, adminAuth.userId, reportId).run();

        // Log each field change in report_history
        for (const field of changedFields) {
            await env.DB.prepare(`
                INSERT INTO report_history (
                    report_id,
                    changed_by_user_id,
                    change_type,
                    field_changed,
                    old_value,
                    new_value,
                    change_reason
                ) VALUES (?, ?, 'edited', ?, ?, ?, ?)
            `).bind(
                reportId,
                adminAuth.userId,
                field,
                String(currentReport[field] || ''),
                String(validUpdates[field]),
                updates.change_reason || 'Admin edit'
            ).run();
        }

        // Log the admin action
        await env.DB.prepare(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action_type,
                target_type,
                target_id,
                action_details,
                ip_address,
                user_agent
            ) VALUES (?, 'report_edit', 'trapper_blip', ?, ?, ?, ?)
        `).bind(
            adminAuth.userId,
            reportId,
            JSON.stringify({
                fields_changed: changedFields,
                reason: updates.change_reason
            }),
            request.headers.get('CF-Connecting-IP') || 'unknown',
            request.headers.get('User-Agent') || 'unknown'
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Report updated successfully',
            reportId: parseInt(reportId),
            fieldsChanged: changedFields
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error updating report:', error);
        return new Response(JSON.stringify({
            error: 'Failed to update report',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * DELETE /api/admin/reports/:id
 * Permanently delete a report
 */
export async function onRequestDelete({ request, env, params }) {
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
        const { reason } = body;

        // Get report info before deletion for audit log
        const report = await env.DB.prepare(`
            SELECT blip_id, description, reported_by_user_id
            FROM trapper_blips
            WHERE blip_id = ?
        `).bind(reportId).first();

        if (!report) {
            return new Response(JSON.stringify({ error: 'Report not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete the report
        await env.DB.prepare(`
            DELETE FROM trapper_blips WHERE blip_id = ?
        `).bind(reportId).run();

        // Log the deletion in audit log
        await env.DB.prepare(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action_type,
                target_type,
                target_id,
                action_details,
                ip_address,
                user_agent
            ) VALUES (?, 'report_delete', 'trapper_blip', ?, ?, ?, ?)
        `).bind(
            adminAuth.userId,
            reportId,
            JSON.stringify({
                reason: reason || 'No reason provided',
                description_preview: report.description?.substring(0, 100),
                user_id: report.reported_by_user_id
            }),
            request.headers.get('CF-Connecting-IP') || 'unknown',
            request.headers.get('User-Agent') || 'unknown'
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Report deleted successfully',
            reportId: parseInt(reportId)
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error deleting report:', error);
        return new Response(JSON.stringify({
            error: 'Failed to delete report',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
