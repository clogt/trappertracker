// Get all reports for admin dashboard
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';

export async function onRequestGet({ request, env }) {
    try {
        // Verify admin authentication
        const adminPayload = await verifyAdminToken(request, env);
        if (!adminPayload) {
            return unauthorizedResponse();
        }

        // Get all reports from different tables
        const trappers = await env.DB.prepare(`
            SELECT blip_id, latitude, longitude, description, report_timestamp, created_at
            FROM trapper_blips
            ORDER BY report_timestamp DESC
            LIMIT 50
        `).all();

        const lostPets = await env.DB.prepare(`
            SELECT pet_id, pet_name, latitude, longitude, description, time_lost, created_at
            FROM lost_pets
            ORDER BY created_at DESC
            LIMIT 50
        `).all();

        const foundPets = await env.DB.prepare(`
            SELECT found_pet_id, species_breed, latitude, longitude, description, time_found, created_at
            FROM found_pets
            ORDER BY created_at DESC
            LIMIT 50
        `).all();

        const dangerousAnimals = await env.DB.prepare(`
            SELECT danger_id, animal_type, latitude, longitude, description, report_timestamp, created_at
            FROM dangerous_animals
            ORDER BY report_timestamp DESC
            LIMIT 50
        `).all();

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
        console.error('Failed to get reports:', error);
        return new Response(JSON.stringify({
            error: 'Failed to retrieve reports',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
