# Domain Setup Guide: trappertracker.com → Cloudflare

## Current Status
- **Domain:** trappertracker.com
- **Registrar:** IONOS
- **Target:** Cloudflare Pages/Workers

---

## Option 1: Full Cloudflare Transfer (Recommended)

### Step 1: Add Domain to Cloudflare

1. Go to https://dash.cloudflare.com
2. Click "Add a Site"
3. Enter: `trappertracker.com`
4. Choose "Free" plan
5. Click "Continue"

Cloudflare will scan your existing DNS records.

### Step 2: Review DNS Records

Cloudflare will import existing records from IONOS. Review and approve them.

### Step 3: Get Cloudflare Nameservers

Cloudflare will provide 2 nameservers like:
```
alba.ns.cloudflare.com
todd.ns.cloudflare.com
```

**Write these down!**

### Step 4: Update Nameservers at IONOS

1. Log in to IONOS: https://www.ionos.com
2. Go to **Domains & SSL** → **trappertracker.com**
3. Find **Nameserver Settings**
4. Change from IONOS nameservers to Cloudflare nameservers
5. Save changes

**IONOS Default Nameservers (you'll replace these):**
- ns1.ionos.com
- ns2.ionos.com

### Step 5: Wait for Propagation

- DNS propagation: 5 minutes - 48 hours (usually < 1 hour)
- Check status: https://dash.cloudflare.com → trappertracker.com
- You'll get email when active

### Step 6: Deploy to Cloudflare Pages

Once domain is active in Cloudflare:

```bash
# Create Pages project
npx wrangler pages project create trappertracker

# Deploy
npx wrangler pages deploy . --project-name=trappertracker

# Add custom domain
npx wrangler pages domain add trappertracker.com --project-name=trappertracker
```

---

## Option 2: CNAME Only (Quick Setup)

Keep IONOS nameservers, just add CNAME record.

### Step 1: Deploy to Cloudflare Pages

```bash
# Create and deploy
npx wrangler pages project create trappertracker
npx wrangler pages deploy . --project-name=trappertracker
```

You'll get a URL like: `trappertracker.pages.dev`

### Step 2: Add CNAME at IONOS

1. Log in to IONOS
2. Go to DNS settings for trappertracker.com
3. Add CNAME record:
   ```
   Type: CNAME
   Host: @ (or www)
   Points to: trappertracker.pages.dev
   TTL: 3600
   ```

### Step 3: Add Domain to Cloudflare Pages

```bash
npx wrangler pages domain add trappertracker.com --project-name=trappertracker
```

---

## SSL/HTTPS Setup

**Automatic with Cloudflare!**
- Free SSL certificate auto-generated
- HTTPS enabled by default
- No configuration needed

---

## Verification

After setup, test:

```bash
# Check DNS resolution
dig trappertracker.com

# Check HTTPS
curl -I https://trappertracker.com

# Visit in browser
open https://trappertracker.com
```

---

## Rollback Plan

If something goes wrong:

1. Change IONOS nameservers back to:
   - ns1.ionos.com
   - ns2.ionos.com
2. Site will revert to IONOS hosting

---

## Need Help?

- Cloudflare Docs: https://developers.cloudflare.com/pages/
- IONOS Support: https://www.ionos.com/help
