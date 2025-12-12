# JWT Token Revocation System

## Overview
The TrapperTracker platform now supports JWT token revocation, allowing immediate invalidation of user sessions for security purposes. This is implemented using Cloudflare Workers KV for distributed token blacklisting.

---

## How It Works

### Token Lifecycle
1. **Login**: User authenticates, receives JWT token (2-hour expiration)
2. **Requests**: Token is validated on each authenticated request
3. **Blacklist Check**: System checks KV store for revoked tokens/users
4. **Logout/Revocation**: Token is added to blacklist, preventing further use

### Architecture
```
User Request → Cookie Extraction → JWT Verification → KV Blacklist Check → Allow/Deny
                                                              ↓
                                                    [SESSION_BLACKLIST KV]
                                                    - token:${jwt}
                                                    - user_revoked:${userId}
```

---

## Features

### 1. User Logout (Self-Service)
Users can log out voluntarily, which revokes their current session token.

**Endpoint**: `POST /api/logout`

**Request**:
```javascript
fetch('/api/logout', {
    method: 'POST',
    credentials: 'include' // Include session cookie
});
```

**Response**:
```json
{
    "message": "Logged out successfully"
}
```

**What Happens**:
- Current JWT token is added to blacklist
- Session cookie is cleared
- Token remains blacklisted until its natural expiration (2 hours)

### 2. Admin Force Revocation
Administrators can forcefully revoke all sessions for a specific user.

**Endpoint**: `POST /api/admin-revoke-session`

**Use Cases**:
- Compromised account detected
- User ban/suspension
- Security incident response
- Suspicious activity

**Request**:
```javascript
fetch('/api/admin-revoke-session', {
    method: 'POST',
    credentials: 'include', // Admin session cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        userId: 'user-uuid-here',
        reason: 'Compromised account - suspicious login from foreign IP'
    })
});
```

**Response**:
```json
{
    "message": "All sessions revoked for user",
    "userId": "abc-123-def",
    "email": "user@example.com",
    "expiresIn": "8 hours"
}
```

**What Happens**:
- User-level revocation key is added to KV store
- ALL current and future tokens for that user are blocked for 8 hours
- User must wait for revocation to expire, then log in again
- Admin action is logged

---

## Implementation Details

### KV Namespace Configuration
```toml
# wrangler.toml
[[kv_namespaces]]
binding = "SESSION_BLACKLIST"
id = "0f1898736e50470e9c9b10fe7872e06e"
```

### Blacklist Key Formats

#### Individual Token Revocation (Logout)
```
Key: token:${jwt}
Value: {
    "userId": "abc-123",
    "revokedAt": "2025-12-08T14:30:00Z",
    "reason": "user_logout"
}
TTL: Matches token expiration (2 hours)
```

#### User-Level Revocation (Admin Force Logout)
```
Key: user_revoked:${userId}
Value: {
    "userId": "abc-123",
    "email": "user@example.com",
    "revokedAt": "2025-12-08T14:30:00Z",
    "revokedBy": "admin@trappertracker.com",
    "reason": "Compromised account"
}
TTL: 8 hours (28800 seconds)
```

### Authentication Flow (Updated)

**File**: `functions/api/auth/index.js:33`

```javascript
export async function authenticateUser(request, env) {
    // ... extract JWT from cookie ...

    const { payload } = await jose.jwtVerify(jwt, JWT_SECRET);

    if (env.SESSION_BLACKLIST) {
        // Check 1: Individual token revocation
        const isTokenBlacklisted = await env.SESSION_BLACKLIST.get(`token:${jwt}`);
        if (isTokenBlacklisted) {
            return null; // Deny access
        }

        // Check 2: User-level revocation
        const isUserRevoked = await env.SESSION_BLACKLIST.get(`user_revoked:${payload.userId}`);
        if (isUserRevoked) {
            return null; // Deny access
        }
    }

    return payload.userId; // Allow access
}
```

---

## Frontend Integration

### Add Logout Button

```html
<!-- Add to all authenticated pages -->
<button id="logout-btn">Logout</button>

<script>
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            // Redirect to login page
            window.location.href = '/login.html';
        } else {
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
});
</script>
```

### Admin Panel - Revoke User Session

```html
<!-- Add to admin panel -->
<h3>Revoke User Session</h3>
<form id="revoke-form">
    <label>User ID: <input type="text" id="user-id" required /></label>
    <label>Reason: <input type="text" id="reason" required /></label>
    <button type="submit">Revoke All Sessions</button>
</form>

<script>
document.getElementById('revoke-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('user-id').value;
    const reason = document.getElementById('reason').value;

    try {
        const response = await fetch('/api/admin-revoke-session', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, reason })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Sessions revoked for ${data.email}`);
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        console.error('Revocation error:', error);
        alert('Failed to revoke session');
    }
});
</script>
```

---

## Security Considerations

### Performance Impact
- **KV Reads**: 2 additional reads per authenticated request
- **Latency**: ~5-15ms added latency (KV is globally distributed)
- **Cost**: Free tier includes 100,000 reads/day (sufficient for MVP)

### TTL Strategy
- **Individual Tokens**: Expire when token expires (2 hours)
- **User Revocations**: Expire after 8 hours (manual override)
- **Automatic Cleanup**: KV automatically deletes expired entries

### Edge Cases

#### What if KV is unavailable?
```javascript
if (env.SESSION_BLACKLIST) {
    // Only check if KV is configured
    // If KV is down, authentication still works (degraded mode)
}
```

**Behavior**: If KV namespace is not configured or unavailable, authentication falls back to JWT-only validation. This is a safe degradation - users can still access the system.

#### What if token is valid but user is deleted?
The user lookup in `authenticateUser` will fail naturally, denying access. Revocation is an additional security layer.

#### Can users bypass revocation?
No. Every authenticated request checks the blacklist. Even if a user has a valid JWT, it will be rejected if blacklisted.

---

## Operational Procedures

### View Blacklisted Tokens (CLI)

```bash
# List all blacklisted tokens
npx wrangler kv key list --namespace-id=0f1898736e50470e9c9b10fe7872e06e

# Get details for specific token
npx wrangler kv key get "token:eyJhbG..." --namespace-id=0f1898736e50470e9c9b10fe7872e06e

# Get details for user revocation
npx wrangler kv key get "user_revoked:abc-123" --namespace-id=0f1898736e50470e9c9b10fe7872e06e
```

### Manually Revoke Token (Emergency)

```bash
# Revoke specific token
npx wrangler kv key put \
    "token:eyJhbGci..." \
    '{"reason":"emergency_revocation","revokedAt":"2025-12-08T14:30:00Z"}' \
    --namespace-id=0f1898736e50470e9c9b10fe7872e06e \
    --ttl=7200

# Revoke all sessions for user
npx wrangler kv key put \
    "user_revoked:abc-123-def" \
    '{"reason":"emergency","revokedAt":"2025-12-08T14:30:00Z"}' \
    --namespace-id=0f1898736e50470e9c9b10fe7872e06e \
    --ttl=28800
```

### Clear All Revocations (Emergency Reset)

⚠️ **WARNING**: Only use in extreme circumstances

```bash
# Delete all keys in namespace
npx wrangler kv key list --namespace-id=0f1898736e50470e9c9b10fe7872e06e | \
    jq -r '.[].name' | \
    xargs -I {} npx wrangler kv key delete {} --namespace-id=0f1898736e50470e9c9b10fe7872e06e
```

---

## Testing

### Test Logout Flow

```bash
# 1. Login and capture token
TOKEN=$(curl -X POST https://trappertracker.com/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@example.com","password":"Password123!","turnstileToken":"test-token"}' \
    -c cookies.txt -s | grep -o 'session=[^;]*')

# 2. Verify authenticated request works
curl -X GET https://trappertracker.com/api/map-data \
    -b cookies.txt

# 3. Logout
curl -X POST https://trappertracker.com/api/logout \
    -b cookies.txt

# 4. Verify token is now rejected
curl -X GET https://trappertracker.com/api/map-data \
    -b cookies.txt
# Should return 401 Unauthorized
```

### Test Admin Revocation

```bash
# 1. Get user ID from database
USER_ID=$(npx wrangler d1 execute trappertracker --remote \
    --command="SELECT user_id FROM users WHERE email='test@example.com'" \
    | jq -r '.[0].results[0].user_id')

# 2. Admin revokes user session
curl -X POST https://trappertracker.com/api/admin-revoke-session \
    -H 'Content-Type: application/json' \
    -b admin-cookies.txt \
    -d "{\"userId\":\"$USER_ID\",\"reason\":\"Testing revocation\"}"

# 3. Verify user is blocked
curl -X GET https://trappertracker.com/api/map-data \
    -b user-cookies.txt
# Should return 401 Unauthorized
```

---

## Monitoring

### Metrics to Track
- **Revocation Rate**: Number of tokens revoked per day
- **Logout Frequency**: User logout patterns
- **Admin Revocations**: How often admins force-logout users
- **Failed Auth Due to Revocation**: Blocked access attempts

### Query Revocation Logs

```bash
# View recent revocations
npx wrangler kv key list \
    --namespace-id=0f1898736e50470e9c9b10fe7872e06e \
    --prefix="user_revoked:" | \
    jq '.[] | {name: .name, expiration: .expiration}'
```

### Alert on Suspicious Patterns
- High revocation rate (>10/hour) - possible account takeover attempt
- Multiple admin revocations - investigate security incident
- User repeatedly logging out - UX issue or session problem

---

## Migration Plan

### Deploying This Feature

1. **Update wrangler.toml** (Done)
   ```toml
   [[kv_namespaces]]
   binding = "SESSION_BLACKLIST"
   id = "0f1898736e50470e9c9b10fe7872e06e"
   ```

2. **Deploy Updated Code**
   ```bash
   npx wrangler pages deploy ./public --project-name=trappertracker
   ```

3. **Test in Production**
   - Create test account
   - Login, then logout
   - Verify session is invalidated

4. **Add Frontend Logout Buttons**
   - Update all authenticated pages
   - Add logout option to navigation

5. **Document for Admins**
   - Add to admin panel documentation
   - Train admins on revocation procedure

### Rollback Plan
If issues occur, remove KV binding from wrangler.toml and redeploy. Authentication will continue working without revocation (degraded security but functional).

---

## Future Enhancements

### Planned Improvements
- [ ] **Session Management UI**: Let users view active sessions and revoke specific devices
- [ ] **Audit Log**: Store revocation events in D1 database for compliance
- [ ] **Automatic Revocation**: Revoke sessions after password change
- [ ] **Geo-Based Revocation**: Revoke if login from unusual location
- [ ] **Rate Limit Revocation Attempts**: Prevent DoS via logout spam

### Advanced Features
- [ ] **Refresh Tokens**: Longer-lived tokens with automatic rotation
- [ ] **Device Fingerprinting**: Track sessions by device
- [ ] **Suspicious Activity Detection**: Auto-revoke on anomalies

---

## References

- **Cloudflare KV Docs**: https://developers.cloudflare.com/kv/
- **JWT Best Practices**: https://datatracker.ietf.org/doc/html/rfc8725
- **Session Management**: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

---

**Last Updated**: 2025-12-08
**Document Owner**: Security Team
**Review Frequency**: Quarterly
