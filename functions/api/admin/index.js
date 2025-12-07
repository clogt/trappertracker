// Admin API handlers
import { onRequestGet as verifyHandler } from './verify.js';
import { onRequestGet as statsHandler } from './stats.js';
import { onRequestGet as errorReportsHandler } from './error-reports.js';
import { onRequestGet as usersHandler } from './users.js';
import { onRequestGet as allReportsHandler } from './all-reports.js';
import { onRequestPost as updateUserRoleHandler } from './update-user-role.js';
import { onRequestDelete as deleteUserHandler } from './delete-user.js';

export async function handleAdminRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
        // Route to appropriate handler
        if (path === '/api/admin/verify' && method === 'GET') {
            return await verifyHandler({ request, env });
        } else if (path === '/api/admin/stats' && method === 'GET') {
            return await statsHandler({ request, env });
        } else if (path === '/api/admin/error-reports' && method === 'GET') {
            return await errorReportsHandler({ request, env });
        } else if (path === '/api/admin/users' && method === 'GET') {
            return await usersHandler({ request, env });
        } else if (path === '/api/admin/all-reports' && method === 'GET') {
            return await allReportsHandler({ request, env });
        } else if (path === '/api/admin/update-user-role' && method === 'POST') {
            return await updateUserRoleHandler({ request, env });
        } else if (path === '/api/admin/delete-user' && (method === 'DELETE' || method === 'POST')) {
            return await deleteUserHandler({ request, env });
        }

        // No matching route
        return new Response(JSON.stringify({ error: 'Admin endpoint not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Admin request failed',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
