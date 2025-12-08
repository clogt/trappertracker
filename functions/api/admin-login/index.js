// Admin login with JWT and environment variable credentials
import * as bcrypt from "bcrypt-ts";
import * as jose from 'jose';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// In-memory store for failed login attempts (in production, use KV store)
const failedAttempts = new Map();

function getJwtSecret(env) {
    if (!env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable not set");
    }
    return new TextEncoder().encode(env.JWT_SECRET);
}

export async function onRequestPost({ request, env }) {
    try {
        const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';

        // Check if IP is locked out
        const attempts = failedAttempts.get(clientIP);
        if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
            const lockoutExpiry = attempts.timestamp + LOCKOUT_DURATION;
            if (Date.now() < lockoutExpiry) {
                const remainingTime = Math.ceil((lockoutExpiry - Date.now()) / 60000);
                return new Response(JSON.stringify({
                    error: `Too many failed attempts. Please try again in ${remainingTime} minutes.`
                }), {
                    status: 429,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                // Lockout expired, reset attempts
                failedAttempts.delete(clientIP);
            }
        }

        const { username, password } = await request.json();

        // Input validation
        if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Missing credentials' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate input lengths to prevent abuse
        if (username.length > 100 || password.length > 100) {
            return new Response(JSON.stringify({ error: 'Invalid input length' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get admin credentials from environment
        const adminUsername = env.ADMIN_USERNAME || 'admin';
        const adminPasswordHash = env.ADMIN_PASSWORD_HASH;

        if (!adminPasswordHash) {
            console.error('ADMIN_PASSWORD_HASH environment variable not set');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check username and password
        const usernameMatch = username === adminUsername;
        const passwordMatch = await bcrypt.compare(password, adminPasswordHash);

        if (usernameMatch && passwordMatch) {
            // Clear failed attempts on successful login
            failedAttempts.delete(clientIP);

            // Create JWT token
            const JWT_SECRET = getJwtSecret(env);
            const token = await new jose.SignJWT({
                userId: 'admin',
                role: 'admin',
                username: adminUsername
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('8h') // 8-hour session for admin
                .sign(JWT_SECRET);

            // Log successful admin login
            console.log(`Admin login successful from IP: ${clientIP} at ${new Date().toISOString()}`);

            // Determine if we're on a secure connection
            const isSecure = request.url.startsWith('https://');
            const secureFlag = isSecure ? ' Secure;' : '';

            return new Response(JSON.stringify({
                success: true,
                role: 'admin',
                username: adminUsername,
                token: token // Include token in response for client-side storage if needed
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict;${secureFlag} Max-Age=28800` // 8 hours
                }
            });
        } else {
            // Record failed login attempt
            const currentAttempts = failedAttempts.get(clientIP) || { count: 0, timestamp: Date.now() };
            currentAttempts.count += 1;
            currentAttempts.timestamp = Date.now();
            failedAttempts.set(clientIP, currentAttempts);

            // Log failed login attempt
            console.warn(`Failed admin login attempt from IP: ${clientIP} (Attempt ${currentAttempts.count}/${MAX_LOGIN_ATTEMPTS})`);

            return new Response(JSON.stringify({
                error: 'Invalid credentials',
                remainingAttempts: MAX_LOGIN_ATTEMPTS - currentAttempts.count
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Login failed',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
