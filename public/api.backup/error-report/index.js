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

export async function handleErrorReportRequest(request, env) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { description, user_agent, page_url } = body;

        if (!description || description.trim() === '') {
            return new Response(JSON.stringify({ error: 'Description is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Sanitize inputs
        const sanitizedDescription = sanitizeHTML(description);
        const sanitizedUserAgent = user_agent ? sanitizeHTML(user_agent) : null;
        const sanitizedPageUrl = page_url ? sanitizeHTML(page_url) : null;

        // Insert error report into database
        const stmt = env.DB.prepare(
            'INSERT INTO error_reports (description, user_agent, page_url) VALUES (?, ?, ?)'
        );

        await stmt.bind(
            sanitizedDescription,
            sanitizedUserAgent,
            sanitizedPageUrl
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Error report submitted successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error submitting error report:', error);
        return new Response(JSON.stringify({
            error: 'Failed to submit error report',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
