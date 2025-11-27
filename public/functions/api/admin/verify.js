// Verify admin authentication
export async function onRequestGet({ request }) {
    try {
        // Check for admin_token in cookie or Authorization header
        const cookies = request.headers.get('Cookie') || '';
        const adminToken = cookies.split(';').find(c => c.trim().startsWith('admin_token='));

        if (!adminToken) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Simple verification - token exists and is base64 encoded admin session
        const token = adminToken.split('=')[1];
        try {
            const decoded = atob(token);
            if (decoded.startsWith('admin:')) {
                return new Response(JSON.stringify({
                    authenticated: true,
                    role: 'admin'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (e) {
            // Invalid token format
        }

        return new Response(JSON.stringify({ error: 'Invalid token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Verification failed',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
