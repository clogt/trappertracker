// Admin endpoint for managing ALL pending submissions across all users
import { verifyAdminAuth } from './auth-helper.js';

/**
 * GET /api/admin/pending-submissions
 * Returns all pending submissions with user info and flag counts
 */
export async function onRequestGet({ request, env }) {
    // Verify admin authentication
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Get all pending submissions with user info and flag counts
        const stmt = env.DB.prepare(`
            SELECT
                ps.submission_id,
                ps.user_id,
                ps.description,
                ps.source_url,
                ps.date_reported,
                ps.status,
                ps.submitted_at,
                ps.reviewed_by_admin_id,
                ps.reviewed_at,
                ps.review_notes,
                u.email as user_email,
                u.account_status as user_status,
                u.created_at as user_created_at,
                COUNT(DISTINCT rf.flag_id) as flag_count
            FROM pending_submissions ps
            LEFT JOIN users u ON ps.user_id = u.user_id
            LEFT JOIN report_flags rf ON CAST(ps.submission_id AS TEXT) = CAST(rf.report_id AS TEXT)
            GROUP BY ps.submission_id
            ORDER BY
                CASE ps.status
                    WHEN 'pending' THEN 1
                    WHEN 'approved' THEN 2
                    WHEN 'rejected' THEN 3
                END,
                ps.submitted_at DESC
        `);

        const { results } = await stmt.all();

        // Calculate additional metadata
        const submissions = results.map(sub => ({
            ...sub,
            flag_count: sub.flag_count || 0,
            user_age_days: Math.floor((Date.now() - new Date(sub.user_created_at).getTime()) / (1000 * 60 * 60 * 24)),
            is_new_user: Math.floor((Date.now() - new Date(sub.user_created_at).getTime()) / (1000 * 60 * 60 * 24)) < 7
        }));

        // Get summary stats
        const stats = {
            total: submissions.length,
            pending: submissions.filter(s => s.status === 'pending').length,
            approved: submissions.filter(s => s.status === 'approved').length,
            rejected: submissions.filter(s => s.status === 'rejected').length,
            flagged: submissions.filter(s => s.flag_count > 0).length
        };

        return new Response(JSON.stringify({
            submissions,
            stats
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching pending submissions:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch pending submissions' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * POST /api/admin/pending-submissions/approve
 * Approve a pending submission and create a danger zone report
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
        const { submission_id, latitude, longitude, notes } = await request.json();

        if (!submission_id || !latitude || !longitude) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get the pending submission
        const submissionStmt = env.DB.prepare(`
            SELECT * FROM pending_submissions WHERE submission_id = ?
        `).bind(submission_id);

        const submission = await submissionStmt.first();

        if (!submission) {
            return new Response(JSON.stringify({ error: 'Submission not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create the danger zone report
        const createReportStmt = env.DB.prepare(`
            INSERT INTO trapper_blips (
                reported_by_user_id,
                latitude,
                longitude,
                description,
                source_url,
                report_timestamp,
                approval_status,
                approved_by_admin_id,
                approved_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP)
        `).bind(
            submission.user_id,
            latitude,
            longitude,
            submission.description,
            submission.source_url,
            submission.date_reported,
            adminAuth.userId
        );

        await createReportStmt.run();

        // Update pending submission status
        const updateStmt = env.DB.prepare(`
            UPDATE pending_submissions
            SET
                status = 'approved',
                reviewed_by_admin_id = ?,
                reviewed_at = CURRENT_TIMESTAMP,
                review_notes = ?
            WHERE submission_id = ?
        `).bind(adminAuth.userId, notes || 'Approved by admin', submission_id);

        await updateStmt.run();

        // Log the admin action
        const auditStmt = env.DB.prepare(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action_type,
                target_type,
                target_id,
                action_details,
                ip_address
            ) VALUES (?, 'pending_submission_approve', 'pending_submission', ?, ?, ?)
        `).bind(
            adminAuth.userId,
            submission_id,
            JSON.stringify({ latitude, longitude, notes }),
            request.headers.get('CF-Connecting-IP') || 'unknown'
        );

        await auditStmt.run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Submission approved and danger zone created'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error approving submission:', error);
        return new Response(JSON.stringify({ error: 'Failed to approve submission' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * DELETE /api/admin/pending-submissions/:id
 * Reject a pending submission
 */
export async function onRequestDelete({ request, env }) {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(p => p);
        const submission_id = pathParts[pathParts.length - 1];

        const { reason } = await request.json().catch(() => ({ reason: 'Rejected by admin' }));

        // Update pending submission status
        const updateStmt = env.DB.prepare(`
            UPDATE pending_submissions
            SET
                status = 'rejected',
                reviewed_by_admin_id = ?,
                reviewed_at = CURRENT_TIMESTAMP,
                review_notes = ?
            WHERE submission_id = ?
        `).bind(adminAuth.userId, reason, submission_id);

        const result = await updateStmt.run();

        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ error: 'Submission not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Log the admin action
        const auditStmt = env.DB.prepare(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action_type,
                target_type,
                target_id,
                action_details,
                ip_address
            ) VALUES (?, 'pending_submission_reject', 'pending_submission', ?, ?, ?)
        `).bind(
            adminAuth.userId,
            submission_id,
            JSON.stringify({ reason }),
            request.headers.get('CF-Connecting-IP') || 'unknown'
        );

        await auditStmt.run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Submission rejected'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error rejecting submission:', error);
        return new Response(JSON.stringify({ error: 'Failed to reject submission' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
