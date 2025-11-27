import { authenticateUser } from "./index.js";

// Verify user authentication and return user info
export async function onRequestGet(context) {
    const { request, env } = context;

    try {
        const userId = await authenticateUser(request, env);

        if (!userId) {
            return new Response(JSON.stringify({ authenticated: false }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true'
                }
            });
        }

        // Get user details
        const user = await env.DB.prepare(`
            SELECT user_id, email, role
            FROM users
            WHERE user_id = ?
        `).bind(userId).first();

        if (!user) {
            return new Response(JSON.stringify({ authenticated: false }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true'
                }
            });
        }

        return new Response(JSON.stringify({
            authenticated: true,
            userId: user.user_id,
            email: user.email,
            role: user.role
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            }
        });

    } catch (error) {
        console.error('Verify error:', error);
        return new Response(JSON.stringify({
            authenticated: false,
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
