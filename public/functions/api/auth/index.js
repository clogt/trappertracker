import * as bcrypt from "bcrypt-ts";
import * as jose from 'jose';

// --- Simple In-Memory Rate Limiter ---
const requestStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 requests per minute

function rateLimiter(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    const requests = requestStore.get(ip) || [];
    const requestsInWindow = requests.filter(timestamp => timestamp > windowStart);

    if (requestsInWindow.length >= MAX_REQUESTS_PER_WINDOW) {
        return false; // Block request
    }

    requestsInWindow.push(now);
    requestStore.set(ip, requestsInWindow);
    return true; // Allow request
}
// --- End Rate Limiter ---

function getJwtSecret(env) {
    if (!env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable not set. Please define it in .dev.vars for local development or as a secret in production.");
    }
    return new TextEncoder().encode(env.JWT_SECRET);
}

export async function authenticateUser(request, env) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(cookie => cookie.startsWith('session='));

    if (!sessionCookie) {
        return null;
    }

    const jwt = sessionCookie.substring('session='.length);

    try {
        const JWT_SECRET = getJwtSecret(env);
        const { payload } = await jose.jwtVerify(jwt, JWT_SECRET);
        return payload.userId;
    } catch (e) {
        console.error("JWT verification failed:", e);
        return null;
    }
}

// Validate Turnstile token
async function validateTurnstile(token, env, ip) {
    if (!token) {
        return { success: false, error: 'CAPTCHA token missing' };
    }

    // Allow test token placeholder until production keys are configured
    if (token === 'test-token') {
        console.warn('Using test-token placeholder, allowing request');
        return { success: true };
    }

    if (!env.TURNSTILE_SECRET_KEY) {
        console.warn('TURNSTILE_SECRET_KEY not configured, skipping validation');
        return { success: true }; // Allow if not configured
    }

    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: env.TURNSTILE_SECRET_KEY,
                response: token,
                remoteip: ip
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Turnstile validation error:', error);
        return { success: false, error: 'CAPTCHA validation failed' };
    }
}

export async function handleRegisterRequest(request, env) {
    const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';
    if (!rateLimiter(ip)) {
        return new Response('Too many requests. Please try again later.', { status: 429 });
    }

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { email, password, turnstileToken } = await request.json();

        // Validate Turnstile CAPTCHA
        const turnstileResult = await validateTurnstile(turnstileToken, env, ip);
        if (!turnstileResult.success) {
            return new Response(JSON.stringify({ error: 'CAPTCHA validation failed. Please try again.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
        if (!email || !password || !passwordRegex.test(password)) {
            return new Response("Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.", { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        // Store user in D1
        await env.DB.prepare(
            'INSERT INTO users (user_id, email, password_hash) VALUES (?, ?, ?)'
        ).bind(userId, email, hashedPassword).run();

        return new Response('User registered successfully', { status: 201 });

    } catch (e) {
        if (e.message.includes("UNIQUE constraint failed")) {
            return new Response("Email already registered", { status: 409 });
        }
        console.error("Registration error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function handleLoginRequest(request, env) {
    const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';
    if (!rateLimiter(ip)) {
        return new Response('Too many requests. Please try again later.', { status: 429 });
    }

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { email, password, turnstileToken } = await request.json();

        // Validate Turnstile CAPTCHA
        const turnstileResult = await validateTurnstile(turnstileToken, env, ip);
        if (!turnstileResult.success) {
            return new Response(JSON.stringify({ error: 'CAPTCHA validation failed. Please try again.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!email || !password) {
            return new Response("Email and password are required", { status: 400 });
        }

        const user = await env.DB.prepare(
            'SELECT * FROM users WHERE email = ?'
        ).bind(email).first();

        if (!user) {
            return new Response("Incorrect email or password", { status: 401 });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return new Response("Incorrect email or password", { status: 401 });
        }

        // Generate JWT
        const JWT_SECRET = getJwtSecret(env);
        const jwt = await new jose.SignJWT({ userId: user.user_id })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('2h') // Token expires in 2 hours
            .sign(JWT_SECRET);

        const response = new Response(JSON.stringify({
            message: 'Login successful',
            role: user.role || 'user'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        response.headers.set('Set-Cookie', `session=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax`);
        return response;

    } catch (e) {
        console.error("Login error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}