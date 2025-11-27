// Get error reports for admin dashboard
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

        // Get error reports from database
        try {
            const { results } = await env.DB.prepare(`
                SELECT * FROM error_reports
                ORDER BY created_at DESC
                LIMIT 100
            `).all();

            return new Response(JSON.stringify(results), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            // If error_reports table doesn't exist, return empty array
            if (e.message && e.message.includes('no such table')) {
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            throw e;
        }

    } catch (error) {
        console.error('Failed to get error reports:', error);
        return new Response(JSON.stringify({
            error: 'Failed to retrieve error reports',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
