# TrapperTracker - Handoff to Gemini

**Date:** 2025-11-06
**Working Directory:** `/home/hobo/Desktop/tt/`
**Current State:** 95% complete, ready for deployment

---

## ✅ COMPLETED

### Documentation (Ready to Commit)
- `README.md` - Full project documentation
- `API.md` - Complete API reference
- `CONTRIBUTING.md` - Contributor guidelines
- `DOMAIN_SETUP.md` - Domain migration guide
- `.env.example` - Environment variable template
- `gofundme_page_content.md` - Fundraising content

### Code Updates (Not Committed Yet)
- `_worker.js` - Fixed asset serving
- `wrangler.toml` - Updated assets directory
- `package.json` - Added dev/deploy scripts
- `index.html` - Minor fixes

### Infrastructure
- Database: All 5 tables created locally
- Wrangler: Configured and authenticated
- Git: Repository connected to github.com/clogt/trappertracker

---

## 🎯 YOUR TASKS

### Task 1: Commit Everything to GitHub

```bash
cd /home/hobo/Desktop/tt

# Stage all files
git add README.md API.md CONTRIBUTING.md DOMAIN_SETUP.md .env.example gofundme_page_content.md
git add _worker.js wrangler.toml package.json index.html

# Create commit
git commit -m "docs: Add comprehensive documentation and deployment configs

- Add README with setup instructions
- Add API documentation
- Add contributing guidelines
- Add domain setup guide
- Update wrangler config for proper asset serving
- Add npm scripts for dev/deploy/db tasks

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
git push origin main
```

### Task 2: Deploy to Cloudflare Pages

```bash
# Create Pages project
npx wrangler pages project create trappertracker

# Deploy current code
npx wrangler pages deploy . --project-name=trappertracker

# Note the deployment URL (will be trappertracker.pages.dev)
```

### Task 3: Configure trappertracker.com Domain

**User has domain at IONOS. Two options:**

**OPTION A (Recommended): Full Transfer**
1. User goes to https://dash.cloudflare.com
2. Adds site: trappertracker.com
3. Cloudflare provides nameservers
4. User updates IONOS to use Cloudflare nameservers
5. After DNS propagation, run:
   ```bash
   npx wrangler pages domain add trappertracker.com --project-name=trappertracker
   ```

**OPTION B (Quick): CNAME Only**
1. After deployment, add CNAME at IONOS:
   - Type: CNAME
   - Host: @ or www
   - Points to: trappertracker.pages.dev
2. Then run:
   ```bash
   npx wrangler pages domain add trappertracker.com --project-name=trappertracker
   ```

### Task 4: Set Production Secrets

```bash
# Set JWT secret for production
npx wrangler secret put JWT_SECRET
# When prompted, enter: a strong random 32+ character string
# Generate with: openssl rand -base64 32
```

### Task 5: Initialize Production Database

```bash
# Run migrations on remote database
npm run db:migrate:remote
```

### Task 6: Verify Deployment

```bash
# Test production site
curl -I https://trappertracker.com
curl -I https://trappertracker.pages.dev

# Should return 200 OK with proper headers
```

---

## ⚠️ KNOWN ISSUES TO FIX

### Critical (Fix Before Production)
1. **Login endpoint 500 error** - functions/api/auth/index.js
   - Possible JWT_SECRET configuration issue
   - Test after setting production secret

2. **Database schema type mismatch** - d1.sql
   - `reported_by_user_id` is INTEGER in 3 tables
   - Should be TEXT to match `users.user_id`
   - Fix in: lost_pets, found_pets, dangerous_animals tables

3. **Security headers missing** - _worker.js
   - Add: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
   - Critical for production security

### Medium Priority
4. **Dark mode labels** - index.html lines 39, 43, 47, 51
   - Add `dark:text-gray-200` class to make visible

5. **Recency filter not implemented** - assets/js/map.js
   - Dropdown exists but doesn't filter by date
   - Need to convert "Last 7 Days" to time_start parameter

### Low Priority
6. **Donation link placeholder** - index.html line 24
   - Currently points to "#"
   - Need actual Ko-fi or GitHub Sponsors URL

---

## 🔧 FIXES TO APPLY

### Fix 1: Database Schema

Edit `d1.sql` lines 30, 47, 63:
```sql
-- Change from:
reported_by_user_id INTEGER NOT NULL,

-- Change to:
reported_by_user_id TEXT NOT NULL,
```

Then re-run migrations locally and remotely.

### Fix 2: Security Headers

Add to `_worker.js` after line 17 (before return statement):

```javascript
function addSecurityHeaders(response) {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com; img-src 'self' data: https:; connect-src 'self' https://nominatim.openstreetmap.org;");
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('X-Frame-Options', 'DENY');
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return newResponse;
}

// Wrap all return statements:
return addSecurityHeaders(response);
```

### Fix 3: Dark Mode Labels

Edit `index.html` lines 39, 43, 47, 51:
```html
<!-- Change from: -->
<label for="toggle-trappers" class="ml-2 block text-sm text-gray-900">

<!-- Change to: -->
<label for="toggle-trappers" class="ml-2 block text-sm text-gray-900 dark:text-gray-200">
```

---

## 📋 VERIFICATION CHECKLIST

After deployment, verify:

- [ ] https://trappertracker.com loads
- [ ] All static assets load (CSS, JS, images)
- [ ] Map displays correctly
- [ ] Registration works
- [ ] Login works (after secret is set)
- [ ] Report submission works
- [ ] All 4 report types appear on map
- [ ] Layer toggles work
- [ ] Dark mode works
- [ ] No console errors
- [ ] SSL certificate active
- [ ] All endpoints return proper status codes

---

## 🚀 DEPLOYMENT ORDER

1. **Apply fixes** (schema, security, dark mode)
2. **Test locally** with `npm run dev`
3. **Commit to GitHub**
4. **Deploy to Cloudflare Pages**
5. **Set production secrets**
6. **Migrate production database**
7. **Configure domain** (user coordinates with IONOS)
8. **Verify deployment**
9. **Monitor for errors**

---

## 📞 CONTACTS & RESOURCES

**User Info:**
- Email: b.zidzik@gmail.com
- Cloudflare Account: aaa44243e7d12c5daab2555cc08eb8aa
- Domain: trappertracker.com (at IONOS)
- GitHub: github.com/clogt/trappertracker

**Key Files:**
- Worker: `_worker.js`
- Database: `d1.sql`
- Config: `wrangler.toml`
- Environment: `.dev.vars` (local), secrets (production)

**Commands Reference:**
- Dev server: `npm run dev`
- Deploy: `npm run deploy`
- DB migrate local: `npm run db:migrate`
- DB migrate remote: `npm run db:migrate:remote`

---

## 💡 NOTES FOR GEMINI

- Work from `/home/hobo/Desktop/tt/` directory
- Wrangler is authenticated and ready
- Git has push access configured
- Database exists but may need schema fixes
- User prefers full Cloudflare transfer for domain
- Test thoroughly before marking complete
- Report any blockers immediately

---

## 🎯 SUCCESS CRITERIA

Deployment is complete when:
1. Code pushed to GitHub
2. Site deployed to Cloudflare Pages
3. trappertracker.com domain working
4. SSL certificate active
5. All critical bugs fixed
6. No 500 errors on any endpoint
7. Site fully functional end-to-end

---

**Good luck! The project is in great shape - just needs deployment and final polish.**

---
Last updated: 2025-11-06 by Claude Code
