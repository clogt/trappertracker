# Trapper Location Import Process

This directory contains scripts to import Reese R.'s community-sourced trapper location data into TrapperTracker.

## What We Have

**364 trapper locations** across Panama City area:
- Panama City Beach: 216 locations
- Callaway: 62 locations
- Highland Park: 41 locations
- Southport: 28 locations
- Fountain: 15 locations
- Other areas: 2 locations

**24 locations** marked as "NEW" (✓✓) from November 2024

## Import Process (3 Steps)

### Step 1: Parse Addresses ✅ DONE

```bash
node scripts/parse-trapper-data.js
```

**Output:**
- `trapper-locations.json` - Parsed address data
- `trapper-locations.csv` - CSV format

### Step 2: Geocode Addresses (CURRENT STEP)

Convert addresses to lat/lon coordinates using OpenStreetMap Nominatim:

```bash
node scripts/geocode-locations.js
```

⏱️ **Takes ~6 minutes** (1 request/second rate limit)

**Output:**
- `trapper-locations-geocoded.json` - With coordinates
- `trapper-locations-import-ready.json` - Formatted for database

### Step 3: Import to Database

**Option A: SQL Import (RECOMMENDED - Simpler)**

1. Generate SQL file:
```bash
node scripts/generate-sql-import.js
```

2. Import to database:
```bash
export CLOUDFLARE_API_TOKEN="your-token"
npx wrangler d1 execute DB --remote --file=scripts/trapper-import.sql
```

**Option B: API Import**

1. Get admin token from browser (after logging in):
   - Open browser Dev Tools → Application → Cookies
   - Copy `admin_token` value

2. Run import:
```bash
export ADMIN_TOKEN="your-jwt-token"
node scripts/import-to-database.js
```

## After Import

1. Log in to **Admin Moderation Panel**: https://trappertracker.com/admin-moderation.html
2. You'll see **364 pending reports**
3. Review and bulk approve the verified locations
4. They'll appear on the public map!

## Files Created

- `parse-trapper-data.js` - Extract addresses from Reese's message
- `geocode-locations.js` - Convert addresses to coordinates
- `generate-sql-import.js` - Create SQL import file
- `import-to-database.js` - Import via API (alternative method)

## Data Source

All data provided by **Reese R.**, a community member who has been manually tracking trapper locations for years. This is invaluable community-sourced data that makes TrapperTracker immediately useful!

## Notes

- All imports set status to `'pending'` for admin review
- Each location includes area, notes, and "NEW" markers
- Geocoding uses free OSM Nominatim API (no API key needed)
- Failed geocodes are logged for manual review
