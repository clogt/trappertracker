// worker/index.js (The Serverless API)

// Helper function for geocoding and applying the privacy offset
async function geocodeAndOffset(address, type) {
    // 1. Call external Geocoding API (e.g., Mapbox, Google) using GEOCODING_API_KEY from wrangler.toml
    const geocodeUrl = `${GEOCODING_API_URL}${encodeURIComponent(address)}.json?access_token=${GEOCODING_API_KEY}`;
    // ... fetch geocode data ...
    const { lat, lon } = result; 

    if (type === 'trapper') {
        // 2. Apply the CRITICAL Privacy Offset (random 5-10 meter shift)
        const offsetLat = lat + (Math.random() - 0.5) * 0.0001;
        const offsetLon = lon + (Math.random() - 0.5) * 0.0001;
        return { lat: offsetLat, lon: offsetLon }; // Return OFFSET coordinates
    }
    
    // Lost Pet submission uses exact location
    return { lat, lon };
}


async function handleMapData(request, env) {
    const { searchParams } = new URL(request.url);
    const showPets = searchParams.get('show_pets') === 'true';
    const recency = searchParams.get('recency');
    const timeStart = searchParams.get('time_start');
    const timeEnd = searchParams.get('time_end');
    
    // Example: Time-based SQL filter logic
    let whereClause = `report_timestamp >= datetime('now', '-${recency} days')`;
    if (timeStart && timeEnd) {
        whereClause = `report_timestamp BETWEEN '${timeStart}' AND '${timeEnd}'`;
    } else if (recency === 'all') {
        whereClause = '1=1'; 
    }
    
    // 1. Fetch Trapper Blips (Primary)
    const trappers = await env.DB.prepare(`
        SELECT latitude, longitude, report_timestamp FROM trapper_blips WHERE ${whereClause}
    `).all();

    // 2. Fetch Lost Pets (Secondary, if toggled)
    let pets = [];
    if (showPets) {
         // Apply same time-based filter to pets
        pets = await env.DB.prepare(`
            SELECT pet_name, latitude, longitude, time_lost, photo_url, owner_contact_email 
            FROM lost_pets WHERE time_lost BETWEEN '${timeStart || '1970-01-01'}' AND '${timeEnd || '9999-12-31'}'
        `).all();
    }

    return new Response(JSON.stringify({ trappers: trappers.results, pets: pets.results }), {
        headers: { 'Content-Type': 'application/json' },
    });
}
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 1. Check for API Routes first
        if (url.pathname.startsWith('/api')) {
            // Your API logic (e.g., D1 database, R2 bucket operations) goes here.
            // ...
            // return new Response("API Response", { status: 200 });
            // ...
        }

        // 2. If it's not an API request, serve the static assets
        try {
            // This attempts to find and serve the file from the 'dist' folder
            // that was deployed with your worker (as configured by [site] in wrangler.toml)
            return await getAssetFromKV({ request, waitUntil: ctx.waitUntil });
        } catch (e) {
            // If the file is not found (404), serve index.html (SPA fallback)
            let pathname = url.pathname;
            if (!pathname.includes('.')) {
                // If the path has no file extension, assume it's a deep link and serve index.html
                pathname = '/index.html';
            }
            try {
                // Fetch the fallback asset, assuming your front-end is a Single Page App (SPA)
                let response = await getAssetFromKV({
                    request,
                    waitUntil: ctx.waitUntil,
                }, {
                    mapRequestToAsset: (req) => new Request(new URL(pathname, req.url)),
                });
                
                // Set cache control for static assets
                response.headers.set('Cache-Control', 'max-age=600'); 
                return response;

            } catch (e) {
                // If even the fallback fails, return a proper 404
                return new Response('Static File Not Found', {
                    status: 404
                });
            }
        }
    },
};

// Main Worker Handler (Router)
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // API Endpoint for Map Data
        if (url.pathname === '/api/mapdata') {
            return handleMapData(request, env);
        }

        // Submission Endpoint for Trapper Blips
        if (url.pathname === '/api/submit/trapper' && request.method === 'POST') {
             // 1. Auth check (requires user session check via DB/KV)
             // 2. Get address from POST body
             // 3. Call geocodeAndOffset('address', 'trapper')
             // 4. Insert final data into D1 trapper_blips table
             // ...
             return new Response('Trapper blip submitted successfully.', { status: 200 });
        }
        
        // ... (Other endpoints for Login, Register, Lost Pet submission) ...

        return new Response('Endpoint not found', { status: 404 });
    }
}
