import { authenticateUser } from "../auth/index.js";

// Simple HTML sanitizer
const sanitizeHTML = (str) => {
    if (!str) return '';
    return str.replace(/[&<>'"/]/g, function (tag) {
        const tagsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#x27;',
            '"': '&quot;',
            '/': '&#x2F;',
        };
        return tagsToReplace[tag] || tag;
    });
};

/**
 * Main handler for pending submissions requests
 * Routes to appropriate handler based on method and path
 */
export async function handlePendingSubmissionsRequest(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const pathParts = url.pathname.split('/').filter(p => p);

    // Authenticate user for all requests
    const userId = await authenticateUser(request, env);
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // GET /api/pending-submissions - List all pending submissions for user
        if (method === 'GET' && pathParts.length === 2) {
            return await getPendingSubmissions(userId, env);
        }

        // POST /api/pending-submissions/:id/complete - Complete a pending submission
        if (method === 'POST' && pathParts.length === 4 && pathParts[3] === 'complete') {
            const submissionId = parseInt(pathParts[2]);
            return await completeSubmission(submissionId, userId, request, env);
        }

        // DELETE /api/pending-submissions/:id - Delete a pending submission
        if (method === 'DELETE' && pathParts.length === 3) {
            const submissionId = parseInt(pathParts[2]);
            return await deleteSubmission(submissionId, userId, env);
        }

        // No matching route
        return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Pending submissions error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * GET /api/pending-submissions
 * Returns all pending submissions for the authenticated user
 */
async function getPendingSubmissions(userId, env) {
    try {
        const stmt = env.DB.prepare(`
            SELECT submission_id, description, source_url, date_reported, created_at
            FROM pending_submissions
            WHERE user_id = ? AND completed = 0
            ORDER BY created_at DESC
        `);

        const { results } = await stmt.bind(userId).all();

        return new Response(JSON.stringify({ submissions: results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get pending submissions error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch pending submissions' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * POST /api/pending-submissions/:id/complete
 * Completes a pending submission by adding coordinates and creating a danger zone
 */
async function completeSubmission(submissionId, userId, request, env) {
    try {
        // Get request body
        const body = await request.json();
        const { latitude, longitude } = body;

        // Validate coordinates
        if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
            latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return new Response(JSON.stringify({ error: 'Invalid latitude or longitude coordinates' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get the pending submission and verify ownership
        const getStmt = env.DB.prepare(`
            SELECT submission_id, user_id, description, source_url, date_reported
            FROM pending_submissions
            WHERE submission_id = ? AND user_id = ? AND completed = 0
        `);

        const pendingSubmission = await getStmt.bind(submissionId, userId).first();

        if (!pendingSubmission) {
            return new Response(JSON.stringify({ error: 'Pending submission not found or already completed' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Insert into trapper_blips table with source_url
        const timestamp = new Date().toISOString();
        const insertStmt = env.DB.prepare(`
            INSERT INTO trapper_blips
            (latitude, longitude, report_timestamp, reported_by_user_id, description, source_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        await insertStmt.bind(
            latitude,
            longitude,
            timestamp,
            userId,
            pendingSubmission.description,
            pendingSubmission.source_url
        ).run();

        // Mark pending submission as completed
        const updateStmt = env.DB.prepare(`
            UPDATE pending_submissions
            SET completed = 1
            WHERE submission_id = ?
        `);

        await updateStmt.bind(submissionId).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Submission completed successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Complete submission error:', error);
        return new Response(JSON.stringify({ error: 'Failed to complete submission' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * DELETE /api/pending-submissions/:id
 * Deletes a pending submission
 */
async function deleteSubmission(submissionId, userId, env) {
    try {
        // Verify ownership before deleting
        const getStmt = env.DB.prepare(`
            SELECT submission_id
            FROM pending_submissions
            WHERE submission_id = ? AND user_id = ?
        `);

        const pendingSubmission = await getStmt.bind(submissionId, userId).first();

        if (!pendingSubmission) {
            return new Response(JSON.stringify({ error: 'Pending submission not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete the submission
        const deleteStmt = env.DB.prepare(`
            DELETE FROM pending_submissions
            WHERE submission_id = ? AND user_id = ?
        `);

        await deleteStmt.bind(submissionId, userId).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Pending submission deleted successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete submission error:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete submission' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
