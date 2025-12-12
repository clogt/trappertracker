import { authenticateUser } from "../auth/index.js";

// Simple HTML sanitizer
const sanitizeHTML = (str) => {
    if (!str) return '';
    return str.replace(/[&<>'"/]/g, function (tag) {
        const tagsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#x27;',
            '"': '&quot;',
            '/': '&#x2F;',
        };
        return tagsToReplace[tag] || tag;
    });
};

function calculateTimeStartFromRecency(recencyString) {
    if (!recencyString) return null;

    const now = new Date();
    let timeStart = null;

    const value = parseInt(recencyString.slice(0, -1));
    const unit = recencyString.slice(-1);

    if (isNaN(value)) return null;

    switch (unit) {
        case 'h': // Hours
            timeStart = new Date(now.getTime() - value * 60 * 60 * 1000);
            break;
        case 'd': // Days
            timeStart = new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
            break;
        // Add more units if needed (e.g., 'w' for weeks, 'm' for months)
        default:
            return null;
    }

    return timeStart ? timeStart.toISOString() : null;
}

export async function handleMapDataRequest(request, env) {
    const { searchParams } = new URL(request.url);
    const lat_min = parseFloat(searchParams.get('lat_min'));
    const lat_max = parseFloat(searchParams.get('lat_max'));
    const lon_min = parseFloat(searchParams.get('lon_min'));
    const lon_max = parseFloat(searchParams.get('lon_max'));

    let time_start = searchParams.get('time_start'); // Allow existing time_start
    const time_end = searchParams.get('time_end');

    const recency = searchParams.get('recency');
    if (recency) {
        const calculatedTimeStart = calculateTimeStartFromRecency(recency);
        if (calculatedTimeStart) {
            time_start = calculatedTimeStart; // Override time_start if recency is valid
        }
    }

    // Layer toggles
    const show_trappers = searchParams.get('show_trappers') === 'true';
    const show_lost_pets = searchParams.get('show_lost_pets') === 'true';
    const show_found_pets = searchParams.get('show_found_pets') === 'true';
    const show_dangerous_animals = searchParams.get('show_dangerous_animals') === 'true';

    try {
        const responsePayload = {
            trappers: [],
            lost_pets: [],
            found_pets: [],
            dangerous_animals: []
        };

        const buildQuery = (table, time_column) => {
            // Whitelist valid table and column names to prevent SQL injection
            const validTables = {
                'trapper_blips': 'report_timestamp',
                'lost_pets': 'time_lost',
                'found_pets': 'time_found',
                'dangerous_animals': 'report_timestamp'
            };

            if (!validTables[table] || validTables[table] !== time_column) {
                throw new Error('Invalid table or column name specified for query.');
            }

            let query = `SELECT * FROM ${table} WHERE latitude >= ? AND latitude <= ? AND longitude >= ? AND longitude <= ?`;
            const params = [lat_min, lat_max, lon_min, lon_max];

            if (time_start) {
                query += ` AND ${time_column} >= ?`;
                params.push(time_start);
            }
            if (time_end) {
                query += ` AND ${time_column} <= ?`;
                params.push(time_end);
            }
            return { query, params };
        };

        if (show_trappers) {
            const { query, params } = buildQuery('trapper_blips', 'report_timestamp');
            const stmt = env.DB.prepare(query);
            const { results } = await stmt.bind(...params).all();
            responsePayload.trappers = results;
        }

        if (show_lost_pets) {
            const { query, params } = buildQuery('lost_pets', 'time_lost');
            const stmt = env.DB.prepare(query);
            const { results } = await stmt.bind(...params).all();
            responsePayload.lost_pets = results;
        }

        if (show_found_pets) {
            const { query, params } = buildQuery('found_pets', 'time_found');
            const stmt = env.DB.prepare(query);
            const { results } = await stmt.bind(...params).all();
            responsePayload.found_pets = results;
        }

        if (show_dangerous_animals) {
            const { query, params } = buildQuery('dangerous_animals', 'report_timestamp');
            const stmt = env.DB.prepare(query);
            const { results } = await stmt.bind(...params).all();
            responsePayload.dangerous_animals = results;
        }

        return new Response(JSON.stringify(responsePayload), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function handleReportRequest(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const userId = await authenticateUser(request, env);
    if (!userId) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const reportData = await request.json();

        // --- VALIDATION ---
        const { latitude, longitude } = reportData;
        if (typeof latitude !== 'number' || typeof longitude !== 'number' || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return new Response(JSON.stringify({ error: 'Invalid latitude or longitude.' }), { status: 400 });
        }
        const description = sanitizeHTML(reportData.description) || '';
        if (description.length > 1000) {
            return new Response(JSON.stringify({ error: 'Description is too long.' }), { status: 400 });
        }
        // --- END VALIDATION ---

        const timestamp = new Date().toISOString();

        let reportId;

        if (reportData.report_type === 'dangerZone') {
            const stmt = env.DB.prepare(
                'INSERT INTO trapper_blips (latitude, longitude, report_timestamp, reported_by_user_id, description) VALUES (?, ?, ?, ?, ?) RETURNING blip_id'
            );
            const result = await stmt.bind(latitude, longitude, timestamp, userId, description).first();
            reportId = result?.blip_id;

        } else if (reportData.report_type === 'lostPet') {
            const pet_name = sanitizeHTML(reportData.pet_name);
            const species_breed = sanitizeHTML(reportData.species_breed);
            const photo_url = sanitizeHTML(reportData.photo_url);
            const owner_contact_email = sanitizeHTML(reportData.owner_contact_email);
            const stmt = env.DB.prepare(
                'INSERT INTO lost_pets (latitude, longitude, pet_name, species_breed, photo_url, description, owner_contact_email, time_lost, reported_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING pet_id'
            );
            const result = await stmt.bind(latitude, longitude, pet_name, species_breed, photo_url, description, owner_contact_email, timestamp, userId).first();
            reportId = result?.pet_id;

        } else if (reportData.report_type === 'foundPet') {
            const species_breed = sanitizeHTML(reportData.species_breed);
            const photo_url = sanitizeHTML(reportData.photo_url);
            const contact_info = sanitizeHTML(reportData.contact_info);
            const stmt = env.DB.prepare(
                'INSERT INTO found_pets (latitude, longitude, species_breed, photo_url, description, contact_info, time_found, reported_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING found_pet_id'
            );
            const result = await stmt.bind(latitude, longitude, species_breed, photo_url, description, contact_info, timestamp, userId).first();
            reportId = result?.found_pet_id;

        } else if (reportData.report_type === 'dangerousAnimal') {
            const animal_type = sanitizeHTML(reportData.animal_type);
            const stmt = env.DB.prepare(
                'INSERT INTO dangerous_animals (latitude, longitude, animal_type, description, report_timestamp, reported_by_user_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING danger_id'
            );
            const result = await stmt.bind(latitude, longitude, animal_type, description, timestamp, userId).first();
            reportId = result?.danger_id;

        } else {
            return new Response(JSON.stringify({ error: 'Invalid report_type' }), { status: 400 });
        }

        return new Response(JSON.stringify({
            message: 'Report submitted successfully',
            report_id: reportId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error("Report submission error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}