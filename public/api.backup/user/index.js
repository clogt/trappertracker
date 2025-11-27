import { authenticateUser } from "../auth/index.js";

// Get all reports by the authenticated user
export async function handleUserReports(request, env) {
    const authResult = await authenticateUser(request, env);
    if (!authResult.authenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const userId = authResult.userId;

        // Get user's danger zone reports
        const trappers = await env.DB.prepare(
            'SELECT blip_id as id, latitude, longitude, description, report_timestamp as created_at, is_active FROM trapper_blips WHERE reported_by_user_id = ? ORDER BY report_timestamp DESC'
        ).bind(userId).all();

        // Get user's lost pets
        const lostPets = await env.DB.prepare(
            'SELECT pet_id as id, pet_name, species_breed, latitude, longitude, description, owner_contact_email, photo_url, is_found, created_at FROM lost_pets WHERE reported_by_user_id = ? ORDER BY created_at DESC'
        ).bind(userId).all();

        // Get user's found pets
        const foundPets = await env.DB.prepare(
            'SELECT found_pet_id as id, species_breed, latitude, longitude, description, contact_info, photo_url, is_reunited, created_at FROM found_pets WHERE reported_by_user_id = ? ORDER BY created_at DESC'
        ).bind(userId).all();

        // Get user's dangerous animal reports
        const dangerousAnimals = await env.DB.prepare(
            'SELECT danger_id as id, animal_type, latitude, longitude, description, report_timestamp as created_at FROM dangerous_animals WHERE reported_by_user_id = ? ORDER BY report_timestamp DESC'
        ).bind(userId).all();

        return new Response(JSON.stringify({
            dangerZones: trappers.results || [],
            lostPets: lostPets.results || [],
            foundPets: foundPets.results || [],
            dangerousAnimals: dangerousAnimals.results || []
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching user reports:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch reports' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Delete a user's report
export async function handleDeleteReport(request, env) {
    const authResult = await authenticateUser(request, env);
    if (!authResult.authenticated) {
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
        const { reportType, reportId } = await request.json();
        const userId = authResult.userId;

        let deleteStmt;
        let checkStmt;

        // Determine which table to delete from
        switch (reportType) {
            case 'dangerZone':
                checkStmt = env.DB.prepare('SELECT reported_by_user_id FROM trapper_blips WHERE blip_id = ?');
                deleteStmt = env.DB.prepare('DELETE FROM trapper_blips WHERE blip_id = ? AND reported_by_user_id = ?');
                break;
            case 'lostPet':
                checkStmt = env.DB.prepare('SELECT reported_by_user_id FROM lost_pets WHERE pet_id = ?');
                deleteStmt = env.DB.prepare('DELETE FROM lost_pets WHERE pet_id = ? AND reported_by_user_id = ?');
                break;
            case 'foundPet':
                checkStmt = env.DB.prepare('SELECT reported_by_user_id FROM found_pets WHERE found_pet_id = ?');
                deleteStmt = env.DB.prepare('DELETE FROM found_pets WHERE found_pet_id = ? AND reported_by_user_id = ?');
                break;
            case 'dangerousAnimal':
                checkStmt = env.DB.prepare('SELECT reported_by_user_id FROM dangerous_animals WHERE danger_id = ?');
                deleteStmt = env.DB.prepare('DELETE FROM dangerous_animals WHERE danger_id = ? AND reported_by_user_id = ?');
                break;
            default:
                return new Response(JSON.stringify({ error: 'Invalid report type' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
        }

        // Verify ownership
        const report = await checkStmt.bind(reportId).first();
        if (!report || report.reported_by_user_id !== userId) {
            return new Response(JSON.stringify({ error: 'Report not found or unauthorized' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete the report
        await deleteStmt.bind(reportId, userId).run();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error deleting report:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete report' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Update a user's report
export async function handleUpdateReport(request, env) {
    const authResult = await authenticateUser(request, env);
    if (!authResult.authenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (request.method !== 'PUT') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { reportType, reportId, data } = body;
        const userId = authResult.userId;

        let updateStmt;
        let checkStmt;

        // Determine which table to update
        switch (reportType) {
            case 'dangerZone':
                checkStmt = env.DB.prepare('SELECT reported_by_user_id FROM trapper_blips WHERE blip_id = ?');
                updateStmt = env.DB.prepare(
                    'UPDATE trapper_blips SET description = ? WHERE blip_id = ? AND reported_by_user_id = ?'
                );
                await checkStmt.bind(reportId).first().then(async (report) => {
                    if (!report || report.reported_by_user_id !== userId) {
                        throw new Error('Unauthorized');
                    }
                    await updateStmt.bind(data.description, reportId, userId).run();
                });
                break;
            case 'lostPet':
                checkStmt = env.DB.prepare('SELECT reported_by_user_id FROM lost_pets WHERE pet_id = ?');
                updateStmt = env.DB.prepare(
                    'UPDATE lost_pets SET pet_name = ?, species_breed = ?, description = ?, owner_contact_email = ? WHERE pet_id = ? AND reported_by_user_id = ?'
                );
                await checkStmt.bind(reportId).first().then(async (report) => {
                    if (!report || report.reported_by_user_id !== userId) {
                        throw new Error('Unauthorized');
                    }
                    await updateStmt.bind(
                        data.pet_name,
                        data.species_breed,
                        data.description,
                        data.owner_contact_email,
                        reportId,
                        userId
                    ).run();
                });
                break;
            case 'foundPet':
                checkStmt = env.DB.prepare('SELECT reported_by_user_id FROM found_pets WHERE found_pet_id = ?');
                updateStmt = env.DB.prepare(
                    'UPDATE found_pets SET species_breed = ?, description = ?, contact_info = ? WHERE found_pet_id = ? AND reported_by_user_id = ?'
                );
                await checkStmt.bind(reportId).first().then(async (report) => {
                    if (!report || report.reported_by_user_id !== userId) {
                        throw new Error('Unauthorized');
                    }
                    await updateStmt.bind(
                        data.species_breed,
                        data.description,
                        data.contact_info,
                        reportId,
                        userId
                    ).run();
                });
                break;
            case 'dangerousAnimal':
                checkStmt = env.DB.prepare('SELECT reported_by_user_id FROM dangerous_animals WHERE danger_id = ?');
                updateStmt = env.DB.prepare(
                    'UPDATE dangerous_animals SET animal_type = ?, description = ? WHERE danger_id = ? AND reported_by_user_id = ?'
                );
                await checkStmt.bind(reportId).first().then(async (report) => {
                    if (!report || report.reported_by_user_id !== userId) {
                        throw new Error('Unauthorized');
                    }
                    await updateStmt.bind(
                        data.animal_type,
                        data.description,
                        reportId,
                        userId
                    ).run();
                });
                break;
            default:
                return new Response(JSON.stringify({ error: 'Invalid report type' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating report:', error);
        if (error.message === 'Unauthorized') {
            return new Response(JSON.stringify({ error: 'Report not found or unauthorized' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify({ error: 'Failed to update report' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Get user profile info
export async function handleUserProfile(request, env) {
    const authResult = await authenticateUser(request, env);
    if (!authResult.authenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const userId = authResult.userId;
        const user = await env.DB.prepare(
            'SELECT email, role, is_verified, created_at FROM users WHERE user_id = ?'
        ).bind(userId).first();

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify(user), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
