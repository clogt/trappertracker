import { authenticateUser } from "./auth/index.js";

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Cookie',
            'Access-Control-Allow-Credentials': 'true'
        }
    });
}

// Handle GET requests to fetch user's submissions
export async function onRequestGet(context) {
    const { request, env } = context;

    try {
        // Authenticate the user
        const userId = await authenticateUser(request, env);
        if (!userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true'
                }
            });
        }

        // Fetch all danger zones submitted by this user
        const stmt = env.DB.prepare(`
            SELECT *
            FROM trapper_blips
            WHERE reported_by_user_id = ?
            ORDER BY report_timestamp DESC
            LIMIT 100
        `);

        const { results } = await stmt.bind(userId).all();

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            }
        });

    } catch (error) {
        console.error('Error fetching user submissions:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
