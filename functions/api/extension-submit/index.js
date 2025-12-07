import { onRequestPost, onRequestOptions } from '../extension-submit.js';

export async function handleExtensionSubmit(request, env) {
    if (request.method === 'OPTIONS') {
        return await onRequestOptions();
    } else if (request.method === 'POST') {
        return await onRequestPost({ request, env });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}
