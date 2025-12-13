// Admin password change endpoint with bcrypt hashing
import * as bcrypt from "bcrypt-ts";
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';

import { csrfMiddleware } from './csrf-middleware.js';

import { rateLimitMiddleware } from './rate-limit-middleware.js';

import { auditMiddleware } from './audit-middleware.js';

/**
 * POST /api/admin/change-password
 * Changes admin password after verifying current password
 * Requires: currentPassword, newPassword in request body
 * Returns: Success message (Note: Admin must manually update ADMIN_PASSWORD_HASH env var)
 */
export const onRequestPost = auditMiddleware('change_password')(rateLimitMiddleware(csrfMiddleware(async ({ request, env }) => {
    try {
        // Verify admin authentication
        const adminPayload = await verifyAdminToken(request, env);
        if (!adminPayload) {
            return unauthorizedResponse();
        }

        // Parse request body
        const { currentPassword, newPassword } = await request.json();

        // Input validation
        if (!currentPassword || !newPassword) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: currentPassword and newPassword'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate new password length (minimum 12 characters)
        if (newPassword.length < 12) {
            return new Response(JSON.stringify({
                error: 'New password must be at least 12 characters long'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate password lengths to prevent abuse
        if (currentPassword.length > 200 || newPassword.length > 200) {
            return new Response(JSON.stringify({
                error: 'Password length exceeds maximum allowed'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get current admin password hash from environment
        const currentPasswordHash = env.ADMIN_PASSWORD_HASH;

        if (!currentPasswordHash) {
            console.error('ADMIN_PASSWORD_HASH environment variable not set');
            return new Response(JSON.stringify({
                error: 'Server configuration error'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);

        if (!isCurrentPasswordValid) {
            return new Response(JSON.stringify({
                error: 'Current password is incorrect'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate new password hash using bcrypt with cost factor 10
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Return the new hash for manual environment variable update
        // Security Note: In production, this should ideally update the environment variable automatically
        // or be stored in a secure database. For now, admin must manually update ADMIN_PASSWORD_HASH.
        return new Response(JSON.stringify({
            success: true,
            message: 'Password hash generated successfully',
            newPasswordHash: newPasswordHash,
            instructions: 'IMPORTANT: Update your ADMIN_PASSWORD_HASH environment variable with the provided hash. Your current session will remain valid, but you must use the new password for future logins.'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Password change error:', error);
        return new Response(JSON.stringify({
            error: 'Password change failed',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
})));
