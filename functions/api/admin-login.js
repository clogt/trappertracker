// Simple admin login - hardcoded credentials
// Username: admin
// Password: admin (change via dashboard after first login)

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin'; // TODO: Store hashed in environment variable

export async function onRequestPost({ request, env }) {
    try {
        const { username, password } = await request.json();

        // Simple credential check
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            // Create a simple admin session token
            const token = btoa(`admin:${Date.now()}`);

            return new Response(JSON.stringify({
                success: true,
                role: 'admin',
                token: token
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Set-Cookie': `admin_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
                }
            });
        } else {
            return new Response(JSON.stringify({
                error: 'Invalid credentials'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Login failed',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
