// Get all users for admin dashboard
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

        // Get all users from database
        const { results } = await env.DB.prepare(`
            SELECT user_id, email, role, created_at
            FROM users
            ORDER BY created_at DESC
        `).all();

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to get users:', error);
        return new Response(JSON.stringify({
            error: 'Failed to retrieve users',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
