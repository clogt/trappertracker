export async function handleMapDataRequest(request, env) {
    const { searchParams } = new URL(request.url);
    const recency = searchParams.get('recency') || 'all';
    const showPets = searchParams.get('show_pets') === 'true';
    const lat_min = parseFloat(searchParams.get('lat_min'));
    const lat_max = parseFloat(searchParams.get('lat_max'));
    const lon_min = parseFloat(searchParams.get('lon_min'));
    const lon_max = parseFloat(searchParams.get('lon_max'));

    try {
        const trapper_blips_stmt = env.DB.prepare(
            'SELECT * FROM trapper_blips WHERE latitude >= ? AND latitude <= ? AND longitude >= ? AND longitude <= ?'
        );
        const trapper_blips = await trapper_blips_stmt.bind(lat_min, lat_max, lon_min, lon_max).all();

        let pets = { results: [] };
        if (showPets) {
            const pets_stmt = env.DB.prepare(
                'SELECT * FROM lost_pets WHERE latitude >= ? AND latitude <= ? AND longitude >= ? AND longitude <= ?'
            );
            pets = await pets_stmt.bind(lat_min, lat_max, lon_min, lon_max).all();
        }

        return new Response(JSON.stringify({ trappers: trapper_blips.results, pets: pets.results }), {
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

    try {
        const reportData = await request.json();

        if (reportData.report_type === 'dangerZone') {
            const { latitude, longitude, description } = reportData;
            const stmt = env.DB.prepare(
                'INSERT INTO trapper_blips (latitude, longitude, report_timestamp, reported_by_user_id) VALUES (?, ?, ?, ?)'
            );
            // NOTE: reported_by_user_id is hardcoded to 1 for now
            await stmt.bind(latitude, longitude, new Date().toISOString(), 1).run();
        } else if (reportData.report_type === 'lostPet') {
            const { latitude, longitude, pet_name, contact_info } = reportData;
            const stmt = env.DB.prepare(
                'INSERT INTO lost_pets (latitude, longitude, pet_name, owner_contact_email, time_lost, reported_by_user_id) VALUES (?, ?, ?, ?, ?, ?)'
            );
            // NOTE: reported_by_user_id is hardcoded to 1 for now
            await stmt.bind(latitude, longitude, pet_name, contact_info, new Date().toISOString(), 1).run();
        }

        return new Response('Report submitted successfully', { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
