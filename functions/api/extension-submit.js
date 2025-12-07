import { authenticateUser } from "./auth/index.js";

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

// Get allowed CORS origin based on request
function getAllowedOrigin(request) {
    const origin = request.headers.get('Origin');

    // Allow requests from:
    // 1. trappertracker.com domains (production)
    // 2. trappertracker.pages.dev (staging)
    // 3. Browser extension origins (chrome-extension://, moz-extension://)
    const allowedOrigins = [
        'https://trappertracker.com',
        'https://www.trappertracker.com',
        'https://trappertracker.pages.dev'
    ];

    // Check if origin is in allowed list
    if (origin && allowedOrigins.includes(origin)) {
        return origin;
    }

    // Allow browser extensions (they have chrome-extension:// or moz-extension:// protocols)
    if (origin && (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://'))) {
        return origin;
    }

    // Default to trappertracker.com if no origin or not allowed
    return 'https://trappertracker.com';
}

// Get CORS headers
function getCorsHeaders(request) {
    return {
        'Access-Control-Allow-Origin': getAllowedOrigin(request),
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cookie'
    };
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions(context) {
    return new Response(null, {
        headers: getCorsHeaders(context.request)
    });
}

// Handle POST requests from the browser extension
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // Authenticate the user
        const userId = await authenticateUser(request, env);
        if (!userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized. Please log in to TrapperTracker.' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    ...getCorsHeaders(request)
                }
            });
        }

        // Parse request body
        const submissionData = await request.json();

        // Validate required fields
        const { description, sourceURL, dateReported, latitude, longitude } = submissionData;

        if (!description || !sourceURL || !dateReported) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: description, sourceURL, dateReported'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Sanitize inputs
        const cleanDescription = sanitizeHTML(description).substring(0, 1000);
        const cleanSourceURL = sanitizeHTML(sourceURL).substring(0, 500);

        // Validate coordinates if provided
        let finalLat = latitude;
        let finalLng = longitude;

        if (latitude !== null && longitude !== null) {
            if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
                latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
                return new Response(JSON.stringify({
                    error: 'Invalid latitude or longitude coordinates'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // If coordinates not provided, create a pending submission
        if (finalLat === null || finalLng === null) {
            // Store in pending_submissions table for user to complete later
            const stmt = env.DB.prepare(`
                INSERT INTO pending_submissions
                (user_id, description, source_url, date_reported, created_at)
                VALUES (?, ?, ?, ?, ?)
            `);

            const timestamp = new Date().toISOString();
            await stmt.bind(
                userId,
                cleanDescription,
                cleanSourceURL,
                dateReported,
                timestamp
            ).run();

            return new Response(JSON.stringify({
                success: true,
                status: 'pending',
                message: 'Submission queued. Please add location on TrapperTracker.com'
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...getCorsHeaders(request)
                }
            });
        }

        // Create danger zone with coordinates
        const stmt = env.DB.prepare(`
            INSERT INTO trapper_blips
            (latitude, longitude, report_timestamp, reported_by_user_id, description, source_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const timestamp = new Date().toISOString();
        await stmt.bind(
            finalLat,
            finalLng,
            timestamp,
            userId,
            cleanDescription,
            cleanSourceURL
        ).run();

        return new Response(JSON.stringify({
            success: true,
            status: 'completed',
            message: 'Danger zone submitted successfully'
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...getCorsHeaders(request)
            }
        });

    } catch (error) {
        console.error('Extension submission error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
