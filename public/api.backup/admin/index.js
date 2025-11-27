import { authenticateUser } from "../auth/index.js";

// Verify admin authentication
async function verifyAdmin(request, env) {
    const authResult = await authenticateUser(request, env);
    if (!authResult.authenticated) {
        return { isAdmin: false, error: 'Not authenticated' };
    }

    // Check if user is admin
    const stmt = env.DB.prepare('SELECT role FROM users WHERE user_id = ?');
    const result = await stmt.bind(authResult.userId).first();

    if (!result || result.role !== 'admin') {
        return { isAdmin: false, error: 'Not authorized' };
    }

    return { isAdmin: true, userId: authResult.userId };
}

// Admin verification endpoint
export async function handleAdminVerify(request, env) {
    const adminCheck = await verifyAdmin(request, env);

    if (!adminCheck.isAdmin) {
        return new Response(JSON.stringify({ error: adminCheck.error }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Get dashboard stats
export async function handleAdminStats(request, env) {
    const adminCheck = await verifyAdmin(request, env);
    if (!adminCheck.isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Get total users
        const usersCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();

        // Get total reports (all types)
        const trappersCount = await env.DB.prepare('SELECT COUNT(*) as count FROM trapper_blips').first();
        const lostPetsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM lost_pets').first();
        const foundPetsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM found_pets').first();
        const dangerousCount = await env.DB.prepare('SELECT COUNT(*) as count FROM dangerous_animals').first();

        // Get error reports count
        const errorsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM error_reports').first();

        // Get active blips
        const activeBlipsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM trapper_blips WHERE is_active = 1').first();

        const totalReports =
            (trappersCount?.count || 0) +
            (lostPetsCount?.count || 0) +
            (foundPetsCount?.count || 0) +
            (dangerousCount?.count || 0);

        return new Response(JSON.stringify({
            totalUsers: usersCount?.count || 0,
            totalReports: totalReports,
            totalErrors: errorsCount?.count || 0,
            activeBlips: activeBlipsCount?.count || 0
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Get error reports
export async function handleAdminErrorReports(request, env) {
    const adminCheck = await verifyAdmin(request, env);
    if (!adminCheck.isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const stmt = env.DB.prepare('SELECT * FROM error_reports ORDER BY created_at DESC LIMIT 100');
        const result = await stmt.all();

        return new Response(JSON.stringify(result.results || []), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching error reports:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch error reports' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Get all users
export async function handleAdminUsers(request, env) {
    const adminCheck = await verifyAdmin(request, env);
    if (!adminCheck.isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const stmt = env.DB.prepare('SELECT user_id, email, role, is_verified, created_at FROM users ORDER BY created_at DESC');
        const result = await stmt.all();

        return new Response(JSON.stringify(result.results || []), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Get all reports
export async function handleAdminAllReports(request, env) {
    const adminCheck = await verifyAdmin(request, env);
    if (!adminCheck.isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const trappers = await env.DB.prepare('SELECT * FROM trapper_blips ORDER BY report_timestamp DESC').all();
        const lostPets = await env.DB.prepare('SELECT * FROM lost_pets ORDER BY created_at DESC').all();
        const foundPets = await env.DB.prepare('SELECT * FROM found_pets ORDER BY created_at DESC').all();
        const dangerousAnimals = await env.DB.prepare('SELECT * FROM dangerous_animals ORDER BY report_timestamp DESC').all();

        return new Response(JSON.stringify({
            trappers: trappers.results || [],
            lost_pets: lostPets.results || [],
            found_pets: foundPets.results || [],
            dangerous_animals: dangerousAnimals.results || []
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching all reports:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch reports' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Update user role
export async function handleUpdateUserRole(request, env) {
    const adminCheck = await verifyAdmin(request, env);
    if (!adminCheck.isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { userId, role } = await request.json();

        // Validate role
        const validRoles = ['user', 'enforcement', 'admin'];
        if (!validRoles.includes(role)) {
            return new Response(JSON.stringify({ error: 'Invalid role' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update user role
        const stmt = env.DB.prepare('UPDATE users SET role = ? WHERE user_id = ?');
        await stmt.bind(role, userId).run();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        return new Response(JSON.stringify({ error: 'Failed to update role' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Delete user
export async function handleDeleteUser(request, env) {
    const adminCheck = await verifyAdmin(request, env);
    if (!adminCheck.isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (request.method !== 'DELETE') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { userId } = await request.json();

        if (!userId) {
            return new Response(JSON.stringify({ error: 'User ID required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete user and all associated reports
        await env.DB.prepare('DELETE FROM trapper_blips WHERE user_id = ?').bind(userId).run();
        await env.DB.prepare('DELETE FROM lost_pets WHERE user_id = ?').bind(userId).run();
        await env.DB.prepare('DELETE FROM found_pets WHERE user_id = ?').bind(userId).run();
        await env.DB.prepare('DELETE FROM dangerous_animals WHERE user_id = ?').bind(userId).run();
        await env.DB.prepare('DELETE FROM users WHERE user_id = ?').bind(userId).run();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete user' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
