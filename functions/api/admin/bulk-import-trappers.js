/**
 * Bulk Import Trapper Locations
 * Admin-only endpoint for importing geocoded trapper data
 */

export async function onRequestPost({ request, env }) {
    try {
        // Verify admin authentication
        const cookieHeader = request.headers.get('Cookie');
        if (!cookieHeader || !cookieHeader.includes('admin_token=')) {
            return new Response(JSON.stringify({ error: 'Admin authentication required' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const requestData = await request.json();
        const { locations, submitted_by_user_id } = requestData;

        if (!Array.isArray(locations) || locations.length === 0) {
            return new Response(JSON.stringify({ error: 'No locations provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const results = {
            total: locations.length,
            success: 0,
            failed: 0,
            errors: []
        };

        // Insert each location
        for (const loc of locations) {
            try {
                // Validate required fields
                if (!loc.latitude || !loc.longitude || !loc.description) {
                    results.failed++;
                    results.errors.push({
                        location: loc,
                        error: 'Missing required fields (latitude, longitude, description)'
                    });
                    continue;
                }

                // Insert into trapper_blips table
                await env.DB.prepare(`
                    INSERT INTO trapper_blips (
                        reported_by_user_id,
                        latitude,
                        longitude,
                        report_timestamp,
                        description,
                        is_active
                    ) VALUES (?, ?, ?, datetime('now'), ?, 1)
                `).bind(
                    submitted_by_user_id || 'admin-import',
                    loc.latitude,
                    loc.longitude,
                    loc.description
                ).run();

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({
                    location: loc,
                    error: err.message
                });
            }
        }

        // Log admin action
        try {
            await env.DB.prepare(`
                INSERT INTO admin_audit_log (
                    admin_id,
                    action_type,
                    target_type,
                    action_details,
                    timestamp
                ) VALUES (?, ?, ?, ?, datetime('now'))
            `).bind(
                submitted_by_user_id || 'admin',
                'BULK_IMPORT',
                'trapper_blips',
                JSON.stringify({
                    total: results.total,
                    success: results.success,
                    failed: results.failed
                })
            ).run();
        } catch (logErr) {
            console.error('Failed to log admin action:', logErr);
        }

        return new Response(JSON.stringify({
            message: 'Bulk import completed',
            results: results
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
