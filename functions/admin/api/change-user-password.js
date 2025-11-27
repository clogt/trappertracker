// API endpoint to change user password (admin only)
import * as bcrypt from "bcrypt-ts";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return new Response('Email and new password required', { status: 400 });
    }

    if (newPassword.length < 8) {
      return new Response('Password must be at least 8 characters', { status: 400 });
    }

    // Check if user exists
    const user = await env.DB.prepare(
      'SELECT user_id FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await env.DB.prepare(
      'UPDATE users SET password_hash = ? WHERE email = ?'
    ).bind(hashedPassword, email).run();

    return new Response(JSON.stringify({
      message: `Password updated successfully for ${email}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Change user password error:', error);
    return new Response('Server error', { status: 500 });
  }
}
