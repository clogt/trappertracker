// This file relies on the '__STATIC_CONTENT' binding, which is automatically 
// created by Wrangler when the [site] configuration is used.

// Fallback to serving index.html for all non-API routes (SPA routing)
async function serveAsset(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.slice(1) || 'index.html'; // Remove leading slash, default to index.html
    
    // Check if a specific file exists. If not, Cloudflare Pages will auto-fallback to index.html 
    // for you in most cases, but we explicitly try the full path first.
    try {
        return env.__STATIC_CONTENT.fetch(pathname, request);
    } catch (e) {
        // If the path isn't found, fall back to index.html for Single Page Application (SPA) routing
        return env.__STATIC_CONTENT.fetch('index.html', request);
    }
}

/**
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} ctx
 */
export async function getStaticContent(request, env, ctx) {
    return serveAsset(request, env);
}
