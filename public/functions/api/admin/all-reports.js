// Get all reports for admin dashboard
export async function onRequestGet({ request, env }) {
    try {
        // Verify admin authentication
        const cookies = request.headers.get('Cookie') || '';
        const adminToken = cookies.split(';').find(c => c.trim().startsWith('admin_token='));

        if (!adminToken) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get all reports from database
        const { results } = await env.DB.prepare(`
            SELECT
                blip_id,
                report_type,
                latitude,
                longitude,
                description,
                street_address,
                report_timestamp,
                reported_by_user_id,
                source
            FROM trapper_blips
            ORDER BY report_timestamp DESC
            LIMIT 200
        `).all();

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to get reports:', error);
        return new Response(JSON.stringify({
            error: 'Failed to retrieve reports',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
