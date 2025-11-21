// API endpoint to fetch all reports for the map
export async function onRequestGet({ env }) {
    try {
        // Fetch all danger zones from trapper_blips
        const stmt = env.DB.prepare('SELECT * FROM trapper_blips ORDER BY report_timestamp DESC');
        const { results } = await stmt.all();

        // Add report_type field for consistency with frontend
        const reports = results.map(report => ({
            ...report,
            report_type: 'Danger Zone'
        }));

        return new Response(JSON.stringify(reports), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
