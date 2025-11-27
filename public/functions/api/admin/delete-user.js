// Delete user
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

        const { userId } = await request.json();

        if (!userId) {
            return new Response(JSON.stringify({ error: 'Missing userId' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete user
        await env.DB.prepare(`
            DELETE FROM users
            WHERE user_id = ?
        `).bind(userId).run();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to delete user:', error);
        return new Response(JSON.stringify({
            error: 'Failed to delete user',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
