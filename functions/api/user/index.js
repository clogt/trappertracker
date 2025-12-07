import { authenticateUser } from "../auth/index.js";
import * as bcrypt from "bcrypt-ts";

/**
 * Main handler for user-related requests
 * Routes to appropriate handler based on method and path
 */
export async function handleUserRequest(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const pathParts = url.pathname.split('/').filter(p => p);

    // Authenticate user for all requests
    const userId = await authenticateUser(request, env);
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // GET /api/user/profile - Get user profile
        if (method === 'GET' && pathParts.length === 3 && pathParts[2] === 'profile') {
            return await getUserProfile(userId, env);
        }

        // POST /api/user/change-password - Change user password
        if (method === 'POST' && pathParts.length === 3 && pathParts[2] === 'change-password') {
            return await changeUserPassword(userId, request, env);
        }

        // No matching route
        return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('User API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Get user profile information
 */
async function getUserProfile(userId, env) {
    try {
        const stmt = env.DB.prepare(`
            SELECT user_id, email, role, is_verified, created_at
            FROM users
            WHERE user_id = ?
        `).bind(userId);

        const result = await stmt.first();

        if (!result) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            userId: result.user_id,
            email: result.email,
            role: result.role,
            isVerified: result.is_verified === 1,
            createdAt: result.created_at
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Change user password
 */
async function changeUserPassword(userId, request, env) {
    try {
        const { currentPassword, newPassword } = await request.json();

        // Validate input
        if (!currentPassword || !newPassword) {
            return new Response(JSON.stringify({ error: 'Current and new passwords are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate new password length
        if (newPassword.length < 8) {
            return new Response(JSON.stringify({ error: 'New password must be at least 8 characters' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get current password hash from database
        const userStmt = env.DB.prepare(`
            SELECT password_hash
            FROM users
            WHERE user_id = ?
        `).bind(userId);

        const user = await userStmt.first();

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValidPassword) {
            return new Response(JSON.stringify({ error: 'Current password is incorrect' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password in database
        const updateStmt = env.DB.prepare(`
            UPDATE users
            SET password_hash = ?
            WHERE user_id = ?
        `).bind(newPasswordHash, userId);

        await updateStmt.run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Password changed successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Change password error:', error);
        return new Response(JSON.stringify({ error: 'Failed to change password' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
