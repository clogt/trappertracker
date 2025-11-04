import { getStaticContent } from './static_content_handler';

export default {
    /**
     * @param {Request} request
     * @param {Env} env
     * @param {ExecutionContext} ctx
     */
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- 1. API Routing Logic ---
        // All API calls should be handled here
        if (url.pathname.startsWith('/api/')) {
            // Your API logic to handle D1, R2, etc., goes here.
            // (e.g., /api/pets, /api/upload)
            
            // Temporary placeholder for testing:
            if (url.pathname === '/api/test') {
                // Now you can test your D1 database here if you want!
                // const { results } = await env.DB.prepare('SELECT * FROM my_table').all();
                return new Response('API Worker is ready for full functionality!', { status: 200 });
            }

            // Return 404 for any unmatched /api route
            return new Response('API Endpoint Not Found', { status: 404 });
        }

        // --- 2. Static Asset (Website) Serving Logic ---
        // All non-API requests are served from the 'dist' folder.
        return getStaticContent(request, env, ctx);
    },
};
