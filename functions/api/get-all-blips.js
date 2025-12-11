/**
 * Get All Blips Endpoint
 * Returns all danger zone reports (alias for reports endpoint)
 * Used by map and monitoring systems
 */

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const stmt = env.DB.prepare('SELECT * FROM trapper_blips ORDER BY report_timestamp DESC');
    const { results } = await stmt.all();
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
    console.error('Error fetching blips:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
