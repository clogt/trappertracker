// Admin endpoint to delete reports from various tables
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';

/**
 * DELETE /api/admin/delete-report
 * Deletes a report from the appropriate table based on report type
 * Requires: reportType, reportId in request body
 * Returns: Success/failure message
 */
export async function onRequestDelete({ request, env }) {
    try {
        // Verify admin authentication
        const adminPayload = await verifyAdminToken(request, env);
        if (!adminPayload) {
            return unauthorizedResponse();
        }

        // Parse request body
        const { reportType, reportId } = await request.json();

        // Input validation
        if (!reportType || !reportId) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: reportType and reportId'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate reportId is numeric
        const numericReportId = parseInt(reportId, 10);
        if (isNaN(numericReportId) || numericReportId <= 0) {
            return new Response(JSON.stringify({
                error: 'Invalid reportId: must be a positive integer'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Map report types to table names and ID column names
        const reportTypeMapping = {
            'Danger Zone': { table: 'trapper_blips', idColumn: 'blip_id' },
            'Lost Pet': { table: 'lost_pets', idColumn: 'pet_id' },
            'Found Pet': { table: 'found_pets', idColumn: 'found_pet_id' },
            'Dangerous Animal': { table: 'dangerous_animals', idColumn: 'danger_id' }
        };

        // Validate report type
        if (!reportTypeMapping[reportType]) {
            return new Response(JSON.stringify({
                error: 'Invalid report type. Must be: Danger Zone, Lost Pet, Found Pet, or Dangerous Animal'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { table, idColumn } = reportTypeMapping[reportType];

        // First, verify the report exists before attempting deletion
        const checkQuery = `SELECT ${idColumn} FROM ${table} WHERE ${idColumn} = ?`;
        const checkResult = await env.DB.prepare(checkQuery)
            .bind(numericReportId)
            .first();

        if (!checkResult) {
            return new Response(JSON.stringify({
                error: `Report not found: ${reportType} with ID ${numericReportId}`
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete the report using parameterized query
        const deleteQuery = `DELETE FROM ${table} WHERE ${idColumn} = ?`;
        const result = await env.DB.prepare(deleteQuery)
            .bind(numericReportId)
            .run();

        // Verify deletion was successful
        if (!result.success) {
            throw new Error('Database deletion failed');
        }

        // Log the admin action
        const clientIP = request.headers.get('CF-Connecting-IP') ||
                       request.headers.get('X-Forwarded-For') ||
                       'unknown';
        console.log(`Admin ${adminPayload.username} deleted ${reportType} report #${numericReportId} from IP: ${clientIP} at ${new Date().toISOString()}`);

        return new Response(JSON.stringify({
            success: true,
            message: `Successfully deleted ${reportType} report #${numericReportId}`,
            deletedReport: {
                type: reportType,
                id: numericReportId,
                table: table
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete report error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to delete report',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
