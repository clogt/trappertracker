// API endpoint to change admin password
// Admin credentials are stored in Cloudflare env variables

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return new Response('Password must be at least 8 characters', { status: 400 });
    }

    // In a production environment, you would update the ADMIN_PASSWORD environment variable
    // For now, return a message instructing to update via Cloudflare dashboard
    return new Response(JSON.stringify({
      message: 'To change admin password, update ADMIN_PASSWORD environment variable in Cloudflare Pages dashboard',
      instructions: 'Settings > Environment variables > Production > Add variable: ADMIN_PASSWORD'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Change admin password error:', error);
    return new Response('Server error', { status: 500 });
  }
}
