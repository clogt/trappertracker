# Health Endpoint Routing Issue

**Status**: 🔴 BLOCKED
**Date**: 2025-12-08
**Priority**: High

---

## Issue Summary

The `/api/status` health check endpoint is not being routed correctly by Cloudflare Pages. Instead of returning JSON from `functions/api/status.js`, it returns the HTML from `public/index.html`.

## What We've Tried

1. **Created endpoint as directory** (`functions/api/status/index.js`) - Failed
2. **Converted to file** (`functions/api/status.js`) - Failed
3. **Multiple redeployments** - Failed
4. **Cache bypass headers** - Failed
5. **Different deployment URLs** (preview domains) - Failed (Cloudflare Access blocks)

## Technical Details

### Symptom:
```bash
$ curl https://trappertracker.com/api/status
# Returns: HTML (index.html) instead of JSON
```

### Expected:
```json
{
  "timestamp": "2025-12-08T...",
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy", "latency_ms": 15 },
    "storage": { "status": "healthy" },
    "cache": { "status": "healthy" }
  }
}
```

### Working Comparison:
- ✅ `/api/reports` works correctly (returns JSON)
- ✅ `/api/auth/verify` works correctly (returns JSON)
- ❌ `/api/status` returns HTML

### File Structure:
```
functions/api/
├── reports.js          ✅ WORKS
├── status.js           ❌ DOESN'T WORK (returns HTML)
├── logout/
│   └── index.js        (not tested)
└── admin-revoke-session/
    └── index.js        (not tested)
```

## Possible Root Causes

1. **Reserved route name**: "status" might be a reserved path in Cloudflare Pages
2. **CDN caching**: Cloudflare edge is aggressively caching the 404 → index.html fallback
3. **Routing priority**: Static assets might have priority over Functions routes
4. **Deployment propagation delay**: Could take 24+ hours to fully propagate

## Workarounds

### Workaround #1: Rename Endpoint (RECOMMENDED)

Rename `/api/status` to `/api/health` to avoid potential keyword conflict:

```bash
# Rename the file
mv functions/api/status.js functions/api/health.js

# Redeploy
npx wrangler pages deploy ./public --project-name=trappertracker

# Test
curl https://trappertracker.com/api/health
```

### Workaround #2: Use Existing Endpoint

Use `/api/reports` as a health check since it's already working:

```bash
curl https://trappertracker.com/api/reports
# If returns JSON array, system is healthy
```

### Workaround #3: Wait 24-48 Hours

Cloudflare's global CDN might need time to fully propagate the new function. Check again tomorrow.

### Workaround #4: Purge Cloudflare Cache

1. Log in to Cloudflare Dashboard
2. Go to **trappertracker.com** domain
3. Navigate to **Caching** → **Configuration**
4. Click **Purge Everything**
5. Wait 5 minutes
6. Test again

## Action Plan

**Immediate (Now)**:
- [x] Document the issue
- [ ] Try Workaround #1 (rename to `/api/health`)
- [ ] Test renamed endpoint

**If Renaming Doesn't Work**:
- [ ] Contact Cloudflare Pages support
- [ ] Use Workaround #2 (monitor `/api/reports` instead)

**Long-term**:
- [ ] Investigate if "status" is a reserved keyword
- [ ] Review Cloudflare Pages routing documentation
- [ ] Consider custom _routes.json configuration

## Impact

**Current Impact**: Medium
- ❌ Cannot set up external uptime monitoring (UptimeRobot, Pingdom)
- ❌ No dedicated health check endpoint
- ✅ Site is fully functional (all other endpoints work)
- ✅ Can still monitor via `/api/reports` endpoint

**Workaround Available**: Yes (rename to `/api/health` or monitor `/api/reports`)

## Update Log

| Date | Action | Result |
|------|--------|--------|
| 2025-12-08 18:00 | Created `functions/api/status/index.js` | ❌ Returns HTML |
| 2025-12-08 18:15 | Fixed KV binding check (KV → SESSION_BLACKLIST) | ❌ Still returns HTML |
| 2025-12-08 18:20 | Converted to file `functions/api/status.js` | ❌ Still returns HTML |
| 2025-12-08 18:25 | Multiple redeployments with cache bypass | ❌ Still returns HTML |
| 2025-12-08 18:30 | Documented issue, proposing rename workaround | ⏳ Pending |

---

**Next Steps**: Try renaming endpoint to `/api/health` to avoid potential keyword conflict.

**If Issue Persists**: Contact Cloudflare Pages support with this documentation.
