# Admin Panel Implementation Quick Start Guide

**Purpose:** Step-by-step guide to begin Phase 1 implementation
**Prerequisite Reading:** `ADMIN_PANEL_SUMMARY.md` and `ADMIN_PANEL_ARCHITECTURE.md`

---

## Pre-Implementation Checklist

Before writing any code:

- [ ] Review and approve architectural specification
- [ ] Confirm Phase 1 scope and timeline
- [ ] Set up development branch: `git checkout -b feature/admin-panel-phase1`
- [ ] Backup production database
- [ ] Create test admin account on staging
- [ ] Set up staging environment with test data

---

## Day 1-2: CSRF Protection System

### Step 1: Create Database Table

Create file: `/home/hobo/Desktop/tt/migrations/001_csrf_tokens.sql`

```sql
-- CSRF Tokens Table
CREATE TABLE IF NOT EXISTS csrf_tokens (
    token TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_csrf_session ON csrf_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_csrf_expires ON csrf_tokens(expires_at);
```

Apply migration:
```bash
wrangler d1 execute DB --file=migrations/001_csrf_tokens.sql
```

### Step 2: Create CSRF Token Generation Endpoint

Create file: `/home/hobo/Desktop/tt/functions/api/admin/csrf-token.js`

```javascript
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';

export async function onRequestGet({ request, env }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) return unauthorizedResponse();

    const sessionId = adminPayload.sessionId || 'default-session';

    // Generate cryptographically secure token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const csrfToken = Array.from(tokenBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store token in database
    await env.DB.prepare(`
        INSERT INTO csrf_tokens (token, session_id, expires_at)
        VALUES (?, ?, ?)
    `).bind(csrfToken, sessionId, expiresAt).run();

    return new Response(JSON.stringify({ csrfToken, expiresAt }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

### Step 3: Create CSRF Validation Middleware

Create file: `/home/hobo/Desktop/tt/functions/api/admin/csrf-middleware.js`

```javascript
export async function validateCSRF(request, env) {
    const csrfToken = request.headers.get('X-CSRF-Token');

    if (!csrfToken) {
        return { valid: false, error: 'CSRF token required' };
    }

    // Verify token exists and not expired
    const token = await env.DB.prepare(`
        SELECT * FROM csrf_tokens
        WHERE token = ? AND used = 0 AND datetime(expires_at) > datetime('now')
    `).bind(csrfToken).first();

    if (!token) {
        return { valid: false, error: 'Invalid or expired CSRF token' };
    }

    // Mark token as used (one-time use)
    await env.DB.prepare(`
        UPDATE csrf_tokens
        SET used = 1, used_at = datetime('now')
        WHERE token = ?
    `).bind(csrfToken).run();

    return { valid: true };
}
```

### Step 4: Update Existing Endpoints

Update `/home/hobo/Desktop/tt/functions/api/admin/delete-user.js`:

```javascript
// Add at top
import { validateCSRF } from './csrf-middleware.js';

export async function onRequestDelete({ request, env }) {
    // Existing auth check
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) return unauthorizedResponse();

    // NEW: CSRF validation
    const csrfCheck = await validateCSRF(request, env);
    if (!csrfCheck.valid) {
        return new Response(JSON.stringify({ error: csrfCheck.error }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Rest of existing code...
}
```

Repeat for:
- `update-user-role.js`
- `delete-report.js`
- `change-password.js`

### Step 5: Update Frontend to Use CSRF

Update `/home/hobo/Desktop/tt/public/assets/js/admin.js`:

```javascript
// Add at top
let csrfToken = null;

async function getCsrfToken() {
    if (csrfToken) return csrfToken;

    const response = await fetch('/api/admin/csrf-token', {
        credentials: 'include'
    });

    if (response.ok) {
        const data = await response.json();
        csrfToken = data.csrfToken;

        // Refresh token before expiry
        setTimeout(() => {
            csrfToken = null;
        }, 55 * 60 * 1000); // 55 minutes (token expires in 60)

        return csrfToken;
    }

    throw new Error('Failed to get CSRF token');
}

// Update deleteUser function
window.deleteUser = async function(userId, email) {
    if (!confirm(`Delete ${email}?`)) return;

    try {
        const token = await getCsrfToken();

        const response = await fetch('/api/admin/delete-user', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': token // NEW
            },
            credentials: 'include',
            body: JSON.stringify({ userId })
        });

        // Rest of existing code...
    } catch (error) {
        console.error('Delete user error:', error);
        displayMessage('Network error. Please try again.');
    }
};

// Update all other state-changing functions similarly
```

### Step 6: Test CSRF Protection

```bash
# Test token generation
curl -X GET http://localhost:8788/api/admin/csrf-token \
  -H "Cookie: admin_token=YOUR_JWT_TOKEN"

# Test endpoint without CSRF (should fail)
curl -X DELETE http://localhost:8788/api/admin/delete-user \
  -H "Cookie: admin_token=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user"}'

# Test endpoint with CSRF (should succeed)
curl -X DELETE http://localhost:8788/api/admin/delete-user \
  -H "Cookie: admin_token=YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: GENERATED_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user"}'
```

---

## Day 3-4: Persistent Rate Limiting

### Step 1: Create Database Tables

Create file: `/home/hobo/Desktop/tt/migrations/002_rate_limiting.sql`

```sql
-- Rate Limit Tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    tracking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TEXT NOT NULL,
    window_end TEXT NOT NULL,
    blocked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ratelimit_ip ON rate_limit_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_ratelimit_endpoint ON rate_limit_tracking(endpoint);
CREATE INDEX IF NOT EXISTS idx_ratelimit_window ON rate_limit_tracking(window_end);

-- Blocked IPs
CREATE TABLE IF NOT EXISTS blocked_ips (
    block_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    blocked_by TEXT,
    blocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    permanent INTEGER DEFAULT 0,
    unblocked INTEGER DEFAULT 0,
    unblocked_at TEXT,
    unblocked_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_blocked_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_expires ON blocked_ips(expires_at);
CREATE INDEX IF NOT EXISTS idx_blocked_active ON blocked_ips(unblocked);
```

Apply:
```bash
wrangler d1 execute DB --file=migrations/002_rate_limiting.sql
```

### Step 2: Create Rate Limiting Middleware

Create file: `/home/hobo/Desktop/tt/functions/api/admin/rate-limit-middleware.js`

```javascript
const RATE_LIMITS = {
    '/api/extension-submit': { window: 60, maxRequests: 10 },
    '/api/admin/delete-user': { window: 60, maxRequests: 5 },
    '/api/admin/update-user-role': { window: 60, maxRequests: 10 },
    '/api/report': { window: 60, maxRequests: 5 },
    'default': { window: 60, maxRequests: 60 }
};

export async function checkRateLimit(request, env, endpoint) {
    const ipAddress = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For') ||
                     'unknown';

    // Check if IP is blocked
    const blocked = await env.DB.prepare(`
        SELECT * FROM blocked_ips
        WHERE ip_address = ?
        AND unblocked = 0
        AND (permanent = 1 OR datetime(expires_at) > datetime('now'))
    `).bind(ipAddress).first();

    if (blocked) {
        return {
            allowed: false,
            error: 'IP address blocked',
            resetAt: blocked.expires_at
        };
    }

    // Get rate limit config
    const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
    const windowStart = new Date(Date.now() - config.window * 1000).toISOString();
    const windowEnd = new Date().toISOString();

    // Get current tracking
    const tracking = await env.DB.prepare(`
        SELECT * FROM rate_limit_tracking
        WHERE ip_address = ?
        AND endpoint = ?
        AND datetime(window_end) > ?
        ORDER BY window_end DESC
        LIMIT 1
    `).bind(ipAddress, endpoint, windowStart).first();

    if (tracking && tracking.request_count >= config.maxRequests) {
        const resetAt = new Date(new Date(tracking.window_end).getTime() + config.window * 1000).toISOString();

        // Auto-block if excessive
        if (tracking.request_count > config.maxRequests * 3) {
            await autoBlockIP(env, ipAddress, 'Excessive rate limit violations');
        }

        return {
            allowed: false,
            error: 'Rate limit exceeded',
            limit: config.maxRequests,
            resetAt
        };
    }

    // Update tracking
    if (tracking) {
        await env.DB.prepare(`
            UPDATE rate_limit_tracking
            SET request_count = request_count + 1,
                updated_at = datetime('now')
            WHERE tracking_id = ?
        `).bind(tracking.tracking_id).run();
    } else {
        await env.DB.prepare(`
            INSERT INTO rate_limit_tracking
            (ip_address, endpoint, request_count, window_start, window_end)
            VALUES (?, ?, 1, ?, ?)
        `).bind(ipAddress, endpoint, windowStart, windowEnd).run();
    }

    return { allowed: true };
}

async function autoBlockIP(env, ipAddress, reason) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await env.DB.prepare(`
        INSERT OR IGNORE INTO blocked_ips (ip_address, reason, expires_at, blocked_by)
        VALUES (?, ?, ?, 'system')
    `).bind(ipAddress, reason, expiresAt).run();
}
```

### Step 3: Apply Rate Limiting to Endpoints

Update `/home/hobo/Desktop/tt/functions/api/extension-submit.js`:

```javascript
import { checkRateLimit } from '../admin/rate-limit-middleware.js';

export async function onRequestPost(context) {
    const { request, env } = context;

    // NEW: Rate limit check
    const rateLimitCheck = await checkRateLimit(request, env, '/api/extension-submit');
    if (!rateLimitCheck.allowed) {
        return new Response(JSON.stringify({
            error: rateLimitCheck.error,
            resetAt: rateLimitCheck.resetAt
        }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': '60'
            }
        });
    }

    // Rest of existing code...
}
```

### Step 4: Test Rate Limiting

```bash
# Test rate limiting - send 15 requests in quick succession
for i in {1..15}; do
  echo "Request $i:"
  curl -X POST http://localhost:8788/api/extension-submit \
    -H "Content-Type: application/json" \
    -H "Cookie: session_token=YOUR_TOKEN" \
    -d '{"description":"test","sourceURL":"https://test.com","dateReported":"2025-12-08T00:00:00Z"}'
  echo ""
done

# Should see rate limit error after 10 requests
```

---

## Day 5-6: IP Blocking System

### Step 1: Create Block/Unblock Endpoints

Create file: `/home/hobo/Desktop/tt/functions/api/admin/block-ip.js`

```javascript
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';
import { validateCSRF } from './csrf-middleware.js';

export async function onRequestPost({ request, env }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) return unauthorizedResponse();

    const csrfCheck = await validateCSRF(request, env);
    if (!csrfCheck.valid) {
        return new Response(JSON.stringify({ error: csrfCheck.error }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { ipAddress, reason, duration } = await request.json();

    // Validation
    if (!ipAddress || !reason) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
        return new Response(JSON.stringify({ error: 'Invalid IP address format' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Calculate expiry
    const expiresAt = duration === 'permanent'
        ? null
        : new Date(Date.now() + parseDuration(duration)).toISOString();

    // Block IP
    await env.DB.prepare(`
        INSERT OR REPLACE INTO blocked_ips
        (ip_address, reason, expires_at, permanent, blocked_by, unblocked)
        VALUES (?, ?, ?, ?, ?, 0)
    `).bind(
        ipAddress,
        reason,
        expiresAt,
        duration === 'permanent' ? 1 : 0,
        adminPayload.username
    ).run();

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

function parseDuration(duration) {
    const units = { m: 60000, h: 3600000, d: 86400000 };
    const match = duration.match(/^(\d+)([mhd])$/);
    if (!match) return 3600000; // default 1 hour
    return parseInt(match[1]) * units[match[2]];
}
```

Create file: `/home/hobo/Desktop/tt/functions/api/admin/unblock-ip.js`

```javascript
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';
import { validateCSRF } from './csrf-middleware.js';

export async function onRequestDelete({ request, env }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) return unauthorizedResponse();

    const csrfCheck = await validateCSRF(request, env);
    if (!csrfCheck.valid) {
        return new Response(JSON.stringify({ error: csrfCheck.error }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const url = new URL(request.url);
    const ipAddress = url.pathname.split('/').pop();

    await env.DB.prepare(`
        UPDATE blocked_ips
        SET unblocked = 1,
            unblocked_at = datetime('now'),
            unblocked_by = ?
        WHERE ip_address = ?
    `).bind(adminPayload.username, ipAddress).run();

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

Create file: `/home/hobo/Desktop/tt/functions/api/admin/blocked-ips.js`

```javascript
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';

export async function onRequestGet({ request, env }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) return unauthorizedResponse();

    const { results } = await env.DB.prepare(`
        SELECT * FROM blocked_ips
        WHERE unblocked = 0
        ORDER BY blocked_at DESC
        LIMIT 100
    `).all();

    return new Response(JSON.stringify({ blockedIPs: results || [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

---

## Day 7-8: Audit Logging

### Step 1: Create Audit Log Tables

Create file: `/home/hobo/Desktop/tt/migrations/003_audit_logging.sql`

```sql
-- Admin Sessions (prerequisite for audit log)
CREATE TABLE IF NOT EXISTS admin_sessions (
    session_id TEXT PRIMARY KEY,
    admin_user TEXT NOT NULL,
    device_info TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0,
    revoked_at TEXT,
    revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_admin ON admin_sessions(admin_user);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON admin_sessions(revoked);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);

-- Audit Log
CREATE TABLE IF NOT EXISTS admin_audit_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES admin_sessions(session_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_user);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON admin_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_log(target_type, target_id);
```

Apply:
```bash
wrangler d1 execute DB --file=migrations/003_audit_logging.sql
```

### Step 2: Create Audit Logging Middleware

Create file: `/home/hobo/Desktop/tt/functions/api/admin/audit-middleware.js`

```javascript
export async function logAdminAction(env, adminPayload, action, targetType, targetId, details) {
    await env.DB.prepare(`
        INSERT INTO admin_audit_log
        (admin_user, action, target_type, target_id, details, ip_address, user_agent, session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        adminPayload.username,
        action,
        targetType,
        targetId,
        JSON.stringify(details.data || {}),
        details.ipAddress || 'unknown',
        details.userAgent || 'unknown',
        adminPayload.sessionId || null
    ).run();
}
```

### Step 3: Add Audit Logging to Endpoints

Update all admin endpoints to log actions:

```javascript
// Example: delete-user.js
import { logAdminAction } from './audit-middleware.js';

export async function onRequestDelete({ request, env }) {
    // ... existing auth and CSRF checks ...

    const { userId } = await request.json();

    // Get user details before deletion
    const userExists = await env.DB.prepare(
        'SELECT user_id, email FROM users WHERE user_id = ?'
    ).bind(userId).first();

    if (!userExists) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Delete user
    await env.DB.prepare(`
        DELETE FROM users WHERE user_id = ?
    `).bind(userId).run();

    // NEW: Log the action
    await logAdminAction(env, adminPayload, 'delete_user', 'user', userId, {
        ipAddress: request.headers.get('CF-Connecting-IP'),
        userAgent: request.headers.get('User-Agent'),
        data: { email: userExists.email }
    });

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

---

## Testing Phase 1 Completion

### Security Tests

```bash
# 1. Test CSRF protection
# - Try state-changing request without token (should fail)
# - Try with expired token (should fail)
# - Try with valid token (should succeed)
# - Try reusing token (should fail)

# 2. Test rate limiting
# - Exceed rate limit (should block)
# - Wait for window reset (should allow again)
# - Test auto-blocking after excessive violations

# 3. Test IP blocking
# - Block an IP manually
# - Try request from blocked IP (should fail)
# - Unblock IP (should work again)

# 4. Test audit logging
# - Perform admin actions
# - Verify all actions logged
# - Check log contains correct details
```

### Deployment Checklist

- [ ] All tests pass locally
- [ ] Database migrations applied to staging
- [ ] Test on staging environment
- [ ] Security review completed
- [ ] Code review by second developer
- [ ] Documentation updated
- [ ] Environment variables set
- [ ] Rollback plan documented

---

## Deployment Steps

```bash
# 1. Create production backup
wrangler d1 backup create DB

# 2. Apply migrations
wrangler d1 execute DB --file=migrations/001_csrf_tokens.sql
wrangler d1 execute DB --file=migrations/002_rate_limiting.sql
wrangler d1 execute DB --file=migrations/003_audit_logging.sql

# 3. Deploy code
git add .
git commit -m "feat: Implement Phase 1 admin panel security features"
git push origin feature/admin-panel-phase1

# 4. Deploy to production
npm run deploy

# 5. Verify deployment
curl https://trappertracker.com/api/admin/verify
curl https://trappertracker.com/api/admin/csrf-token

# 6. Monitor for 24 hours
# - Watch error logs
# - Monitor audit log
# - Check rate limiting effectiveness
```

---

## Common Issues & Solutions

### Issue: CSRF token not found
**Solution:** Ensure admin is logged in and session exists before requesting token

### Issue: Rate limiting not working
**Solution:** Check database has rate_limit_tracking table and indexes

### Issue: IP blocking blocks legitimate users
**Solution:** Review blocked_ips table, check auto-block threshold in middleware

### Issue: Audit log not populating
**Solution:** Verify admin_sessions table exists and sessionId in JWT payload

---

## Next Steps After Phase 1

Once Phase 1 is complete and tested:

1. Begin Phase 2: Enhanced Moderation (Week 4-5)
2. Schedule security audit with external reviewer
3. Gather user feedback from admin dashboard usage
4. Monitor security metrics for 1 week
5. Plan Phase 2 kickoff meeting

---

**Questions?** Contact project coordinator or refer to full architecture document.
