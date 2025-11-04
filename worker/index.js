import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
    /**
     * @param {Request} request
     * @param {Env} env
     * @param {ExecutionContext} ctx
     */
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- 1. API Routing Logic ---
        // All requests starting with '/api' are handled by the Worker code.
        if (url.pathname.startsWith('/api/')) {
            // NOTE: You will need to add your specific API handler code here.
            // For now, let's return a simple placeholder response.
            
            // Example of a basic route handler:
            if (url.pathname === '/api/test') {
                return new Response('API Test Successful', { status: 200 });
            }

            // If the API route doesn't match, return 404
            return new Response('API Endpoint Not Found', { status: 404 });
        }

        // --- 2. Static Asset (Website) Serving Logic ---
        // All other requests are assumed to be for the static site content (HTML, CSS, JS).
        try {
            // Attempt to serve the requested file directly (e.g., /styles.css or /about)
            return await getAssetFromKV({ request, waitUntil: ctx.waitUntil });

        } catch (e) {
            // If the exact file is not found, assume it's a Single Page Application (SPA) route.
            // We force the response to serve the root index.html.
            try {
                // Fetch the fallback index.html asset
                const response = await getAssetFromKV({
                    request,
                    waitUntil: ctx.waitUntil,
                }, {
                    mapRequestToAsset: (req) => new Request(new URL('/index.html', req.url)),
                });

                // Set a short cache control for static assets
                response.headers.set('Cache-Control', 'max-age=600');
                return response;

            } catch (e) {
                // If even the fallback index.html fails, return a final 404
                return new Response('Static Website Not Found (Check dist folder)', {
                    status: 404
                });
            }
        }
    },
};
