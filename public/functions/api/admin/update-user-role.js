// Update user role
export async function onRequestPost({ request, env }) {
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

        const { userId, role } = await request.json();

        if (!userId || !role) {
            return new Response(JSON.stringify({ error: 'Missing userId or role' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate role
        const validRoles = ['user', 'enforcement', 'admin'];
        if (!validRoles.includes(role)) {
            return new Response(JSON.stringify({ error: 'Invalid role' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update user role
        await env.DB.prepare(`
            UPDATE users
            SET role = ?
            WHERE user_id = ?
        `).bind(role, userId).run();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to update user role:', error);
        return new Response(JSON.stringify({
            error: 'Failed to update user role',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
