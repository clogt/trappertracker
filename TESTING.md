# TrapperTracker Testing Guide

**For:** Self-sufficient local testing without external interactions
**Tools:** Wrangler Dev, Vitest, Curl
**Directory:** `/home/hobo/Desktop/tt/`

---

## 🚨 CRITICAL: Asset Size Issue Fix

### Problem
Wrangler dev fails with "Asset too large" error because `assets.directory = "."` includes node_modules (112 MiB).

### Solution

**Step 1: Create .wranglerignore**

Already created at `/home/hobo/Desktop/tt/.wranglerignore`:
```
node_modules/
.git/
.wrangler/
.claude/
*.log
*.md
test/
admin-app/
```

**Step 2: Verify wrangler.toml**

Ensure `/home/hobo/Desktop/tt/wrangler.toml` has:
```toml
[assets]
directory = "."
```

(Do NOT add `exclude` field - it's not supported and causes warnings)

---

## 📋 Pre-Test Checklist

Before running ANY tests:

```bash
cd /home/hobo/Desktop/tt

# 1. Verify .wranglerignore exists
ls -la .wranglerignore

# 2. Verify .dev.vars exists with JWT_SECRET
cat .dev.vars

# 3. Check database exists
npx wrangler d1 execute trappertracker --local --command "SELECT name FROM sqlite_master WHERE type='table'"

# 4. Expected output: users, trapper_blips, lost_pets, found_pets, dangerous_animals
```

---

## 🧪 Test Method 1: Wrangler Dev (Interactive)

### Start Server

```bash
cd /home/hobo/Desktop/tt
npm run dev
# or
wrangler dev
```

### Expected Output

```
⛅️ wrangler 4.46.0
Using vars defined in .dev.vars
Your Worker has access to the following bindings:
Binding                                   Resource                  Mode
env.DB (trappertracker)                   D1 Database               local
env.JWT_SECRET ("(hidden)")               Environment Variable      local

⎔ Starting local server...
[wrangler:info] Ready on http://localhost:8787
```

### If ERROR: "Asset too large"

```bash
# Verify .wranglerignore exists and has node_modules
cat .wranglerignore

# If missing, create it:
cat > .wranglerignore <<'EOF'
node_modules/
.git/
.wrangler/
.claude/
*.log
*.md
test/
admin-app/
EOF

# Try again
npm run dev
```

### Test Endpoints (in another terminal)

```bash
# Test homepage
curl -I http://localhost:8787

# Expected: HTTP/1.1 200 OK
# Headers should include:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Content-Security-Policy: ...
# - Strict-Transport-Security: ...

# Test map data API
curl "http://localhost:8787/api/mapdata?lat_min=30&lat_max=31&lon_min=-98&lon_max=-97&show_trappers=true&show_lost_pets=true&show_found_pets=true&show_dangerous_animals=true"

# Expected: JSON with arrays for trappers, lost_pets, found_pets, dangerous_animals

# Test registration (should fail without valid data but return proper error)
curl -X POST http://localhost:8787/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Expected: "User registered successfully" or "Email already registered"

# Test login
curl -X POST http://localhost:8787/api/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Expected: "Login successful" + Set-Cookie header

# Test authenticated report submission
curl -X POST http://localhost:8787/api/report \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "report_type": "dangerZone",
    "latitude": 30.2672,
    "longitude": -97.7431,
    "description": "Test trapper report"
  }'

# Expected: "Report submitted successfully"
```

### Stop Server

```bash
# Press Ctrl+C in the terminal running wrangler dev
```

---

## 🧪 Test Method 2: Wrangler Dev (Background)

### Start in Background

```bash
cd /home/hobo/Desktop/tt
npm run dev > /tmp/wrangler.log 2>&1 &
WRANGLER_PID=$!
echo "Wrangler PID: $WRANGLER_PID"

# Wait for server to start
sleep 5

# Check if running
curl -I http://localhost:8787

# View logs
tail -f /tmp/wrangler.log
```

### Stop Background Server

```bash
# Kill by PID
kill $WRANGLER_PID

# Or find and kill
pkill -f "wrangler dev"
```

---

## 🧪 Test Method 3: Vitest (Unit Tests)

### Vitest Setup

Vitest is already in `package.json`:
```json
"dependencies": {
  "@cloudflare/vitest-pool-workers": "^0.10.5"
}
"scripts": {
  "test": "npx vitest"
}
```

### Create Test Files

Create `/home/hobo/Desktop/tt/test/worker.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import worker from '../_worker.js';

describe('Worker', () => {
  it('should return 200 for homepage', async () => {
    const request = new Request('http://localhost:8787/');
    const env = {
      ASSETS: {
        fetch: async (req) => new Response('test', { status: 200 })
      },
      DB: null,
      JWT_SECRET: 'test-secret'
    };
    const ctx = {
      waitUntil: () => {}
    };

    const response = await worker.fetch(request, env, ctx);
    expect(response.status).toBe(200);
  });

  it('should add security headers', async () => {
    const request = new Request('http://localhost:8787/');
    const env = {
      ASSETS: {
        fetch: async (req) => new Response('test', { status: 200 })
      },
      DB: null,
      JWT_SECRET: 'test-secret'
    };
    const ctx = {
      waitUntil: () => {}
    };

    const response = await worker.fetch(request, env, ctx);
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
```

### Run Tests

```bash
cd /home/hobo/Desktop/tt
npm test

# Or with watch mode
npx vitest --watch

# Or run once
npx vitest run
```

### Expected Output

```
✓ test/worker.test.js (2)
  ✓ Worker (2)
    ✓ should return 200 for homepage
    ✓ should add security headers

Test Files  1 passed (1)
     Tests  2 passed (2)
```

---

## 🧪 Test Method 4: Automated Endpoint Testing

### Create Test Script

Create `/home/hobo/Desktop/tt/test-endpoints.sh`:

```bash
#!/bin/bash
set -e

cd /home/hobo/Desktop/tt

echo "Starting wrangler dev in background..."
npm run dev > /tmp/wrangler-test.log 2>&1 &
WRANGLER_PID=$!

# Wait for server
sleep 8

echo "Testing endpoints..."

# Test 1: Homepage
echo -n "Test 1: Homepage... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/)
if [ "$STATUS" = "200" ]; then
  echo "✅ PASS (200)"
else
  echo "❌ FAIL ($STATUS)"
fi

# Test 2: Security Headers
echo -n "Test 2: Security Headers... "
HEADERS=$(curl -s -I http://localhost:8787/ | grep -E "X-Frame-Options|X-Content-Type")
if [ -n "$HEADERS" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL (Headers missing)"
fi

# Test 3: Map Data API
echo -n "Test 3: Map Data API... "
RESPONSE=$(curl -s "http://localhost:8787/api/mapdata?lat_min=30&lat_max=31&lon_min=-98&lon_max=-97&show_trappers=true")
if echo "$RESPONSE" | grep -q "trappers"; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
fi

# Test 4: Register (should work or say email exists)
echo -n "Test 4: Registration... "
RESPONSE=$(curl -s -X POST http://localhost:8787/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}')
if echo "$RESPONSE" | grep -qE "successfully|already registered"; then
  echo "✅ PASS"
else
  echo "❌ FAIL: $RESPONSE"
fi

# Test 5: Login
echo -n "Test 5: Login... "
RESPONSE=$(curl -s -X POST http://localhost:8787/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}')
if echo "$RESPONSE" | grep -q "successful"; then
  echo "✅ PASS"
else
  echo "⚠️  WARN: $RESPONSE"
fi

echo ""
echo "Stopping wrangler dev..."
kill $WRANGLER_PID

echo "Done!"
```

### Run Automated Tests

```bash
chmod +x /home/hobo/Desktop/tt/test-endpoints.sh
/home/hobo/Desktop/tt/test-endpoints.sh
```

---

## 🐛 Troubleshooting

### Issue: "Asset too large"

```bash
# Verify .wranglerignore exists
ls -la /home/hobo/Desktop/tt/.wranglerignore

# If missing:
cat > /home/hobo/Desktop/tt/.wranglerignore <<'EOF'
node_modules/
.git/
.wrangler/
*.log
*.md
test/
admin-app/
EOF
```

### Issue: "Cannot read properties of undefined (reading 'fetch')"

```bash
# env.ASSETS is undefined
# Check wrangler.toml has:
grep -A 2 "\[assets\]" wrangler.toml

# Should show:
# [assets]
# directory = "."
```

### Issue: "JWT_SECRET environment variable not set"

```bash
# Create .dev.vars
cat > /home/hobo/Desktop/tt/.dev.vars <<'EOF'
JWT_SECRET=your-secret-key-here-change-this-to-random-string
EOF

# Or generate secure one:
echo "JWT_SECRET=$(openssl rand -base64 32)" > .dev.vars
```

### Issue: "Database not found"

```bash
# Initialize database
npx wrangler d1 execute trappertracker --local --file=d1.sql

# Verify tables exist
npx wrangler d1 execute trappertracker --local --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### Issue: Port 8787 already in use

```bash
# Kill existing wrangler processes
pkill -f "wrangler dev"

# Verify nothing on 8787
lsof -i :8787

# Try again
npm run dev
```

---

## 📊 Self-Sufficient Test Checklist

Run this checklist without any external help:

```bash
cd /home/hobo/Desktop/tt

# ✅ 1. Verify files exist
[ -f .wranglerignore ] && echo "✅ .wranglerignore exists" || echo "❌ Missing .wranglerignore"
[ -f .dev.vars ] && echo "✅ .dev.vars exists" || echo "❌ Missing .dev.vars"
[ -f wrangler.toml ] && echo "✅ wrangler.toml exists" || echo "❌ Missing wrangler.toml"

# ✅ 2. Check database
npx wrangler d1 execute trappertracker --local --command "SELECT COUNT(*) FROM sqlite_master WHERE type='table'" 2>&1 | grep -q "results" && echo "✅ Database OK" || echo "❌ Database issue"

# ✅ 3. Start wrangler dev
npm run dev > /tmp/test-wrangler.log 2>&1 &
WRANGLER_PID=$!
sleep 8

# ✅ 4. Test homepage
curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/ | grep -q "200" && echo "✅ Homepage works" || echo "❌ Homepage broken"

# ✅ 5. Test API
curl -s "http://localhost:8787/api/mapdata?lat_min=30&lat_max=31&lon_min=-98&lon_max=-97&show_trappers=true" | grep -q "trappers" && echo "✅ API works" || echo "❌ API broken"

# ✅ 6. Check security headers
curl -s -I http://localhost:8787/ | grep -q "X-Frame-Options" && echo "✅ Security headers present" || echo "❌ Security headers missing"

# ✅ 7. Stop server
kill $WRANGLER_PID && echo "✅ Server stopped"

# ✅ 8. View logs
echo "=== Wrangler Logs ==="
cat /tmp/test-wrangler.log
```

---

## 🚀 Quick Test Command (One-Liner)

```bash
cd /home/hobo/Desktop/tt && npm run dev > /tmp/w.log 2>&1 & sleep 8 && curl -I http://localhost:8787 && pkill -f "wrangler dev"
```

Expected: HTTP/1.1 200 OK with security headers, then server stops.

---

## 📝 For Gemini: Testing Workflow

When Claude runs out of tokens, use this workflow:

1. **Check Prerequisites:**
   ```bash
   cd /home/hobo/Desktop/tt
   ls -la .wranglerignore .dev.vars wrangler.toml
   ```

2. **Start Dev Server:**
   ```bash
   npm run dev
   ```

3. **If "Asset too large" error:**
   ```bash
   cat > .wranglerignore <<'EOF'
   node_modules/
   .git/
   .wrangler/
   *.log
   *.md
   test/
   admin-app/
   EOF
   npm run dev
   ```

4. **In another terminal, test:**
   ```bash
   curl -I http://localhost:8787
   curl "http://localhost:8787/api/mapdata?lat_min=30&lat_max=31&lon_min=-98&lon_max=-97&show_trappers=true"
   ```

5. **When done:**
   ```bash
   # Press Ctrl+C or:
   pkill -f "wrangler dev"
   ```

---

## 📞 Common Commands Reference

```bash
# Start dev server (foreground)
npm run dev

# Start dev server (background)
npm run dev > /tmp/wrangler.log 2>&1 &

# Stop all wrangler processes
pkill -f "wrangler dev"

# View wrangler logs
tail -f /tmp/wrangler.log

# Test homepage
curl http://localhost:8787

# Test API
curl "http://localhost:8787/api/mapdata?lat_min=30&lat_max=31&lon_min=-98&lon_max=-97&show_trappers=true"

# Run vitest
npm test

# Check database
npx wrangler d1 execute trappertracker --local --command "SELECT * FROM users LIMIT 1"

# Deploy (when ready)
npm run deploy
```

---

**Last Updated:** 2025-11-06 by Claude Code
**Token Budget Used:** ~114K / 200K
**Remaining for Gemini:** 86K tokens
