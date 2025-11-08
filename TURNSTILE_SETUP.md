# Turnstile Production Setup Guide

## Current Status
TrapperTracker is currently using the **test sitekey** `1x00000000000000000000AA` which always passes validation. This needs to be replaced with production keys.

## Steps to Get Production Keys

### 1. Get Turnstile Keys from Cloudflare Dashboard

1. Log in to your Cloudflare dashboard: https://dash.cloudflare.com
2. Navigate to **Turnstile** in the left sidebar
   - Or go directly to: https://dash.cloudflare.com/?to=/:account/turnstile
3. Click **Add Site** (or **Create Widget**)
4. Configure the widget:
   - **Site name**: TrapperTracker
   - **Domain**: trappertracker.com (add *.trappertracker.pages.dev for preview URLs)
   - **Widget mode**: Managed (recommended) or Non-Interactive
   - **Widget appearance**: Auto (adapts to light/dark mode)
5. Click **Create**
6. Copy both keys:
   - **Site Key** (public - goes in HTML)
   - **Secret Key** (private - goes in environment variables)

### 2. Update Files with Site Key

Replace `1x00000000000000000000AA` with your production site key in these files:

#### Files to update:
- `public/index.html` (line 354)
- `public/login.html` (line 32 and 64)
- `public/mobile.html` (if exists)

Search and replace:
```bash
# From project root
find public -name "*.html" -exec sed -i 's/1x00000000000000000000AA/YOUR_PRODUCTION_SITEKEY/g' {} +
```

Or use Claude Code to do it with:
```
Replace 1x00000000000000000000AA with [YOUR_SITEKEY] in all HTML files
```

### 3. Add Secret Key to Cloudflare Pages Environment Variables

The secret key needs to be added to your Pages project:

#### Option A: Via Dashboard (Recommended)
1. Go to Cloudflare Dashboard → Pages
2. Select **trappertracker** project
3. Go to **Settings** tab → **Environment variables**
4. Add new variable:
   - **Variable name**: `TURNSTILE_SECRET_KEY`
   - **Value**: [Your secret key from step 1]
   - **Environment**: Production and Preview
5. Click **Save**
6. **Redeploy** your site for changes to take effect

#### Option B: Via Wrangler CLI
```bash
# Set for production
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name=trappertracker

# When prompted, paste your secret key
```

### 4. Update wrangler.toml (Optional)

For local development, you can add the secret to `.dev.vars`:

```bash
# Create .dev.vars file (don't commit this!)
echo "TURNSTILE_SECRET_KEY=your_secret_key_here" > .dev.vars
```

Add `.dev.vars` to `.gitignore` if not already there.

### 5. Verify Backend is Using Secret Key

Check `functions/api/auth/index.js` to ensure it's reading from environment:

```javascript
const turnstileSecret = env.TURNSTILE_SECRET_KEY;
```

## Current Files Using Turnstile

### Frontend (HTML):
- `public/index.html` - Auth form overlay
- `public/login.html` - Login and register forms
- `public/mobile.html` - Mobile auth form (if exists)

### Backend (API):
- `functions/api/auth/index.js` - Login and register validation
- Possibly `functions/api/report/index.js` - Report submission

## Testing After Setup

1. Clear browser cache and localStorage
2. Visit trappertracker.com
3. Try to:
   - Register a new account
   - Login
   - Submit a report
4. Check browser console for any Turnstile errors
5. Verify CAPTCHA widget appears and validates correctly

## Troubleshooting

### CAPTCHA not loading
- Check browser console for errors
- Verify site key is correct
- Ensure domain is whitelisted in Turnstile dashboard

### Validation fails
- Check that secret key is set in Pages environment variables
- Verify backend is reading `env.TURNSTILE_SECRET_KEY`
- Check Cloudflare Pages logs for errors

### "Invalid domain" error
- Add all domains in Turnstile dashboard:
  - trappertracker.com
  - *.trappertracker.pages.dev
  - localhost (for local testing)

## Current Test Key Locations

Files currently using test key `1x00000000000000000000AA`:
1. `/public/index.html:354`
2. `/public/login.html:32`
3. `/public/login.html:64`

## Next Steps After Completing This

Once Turnstile is configured with production keys:
1. Test all auth flows
2. Monitor for any validation errors
3. Check Turnstile analytics in Cloudflare dashboard
4. Consider adding rate limiting if abuse is detected
