# QUICK IMPORT - Get 364 Addresses on the Map (5 minutes)

## Option 1: Browser-Based Geocoding (EASIEST - No CLI needed)

1. Open in browser:
   ```
   http://localhost:8788/admin-import-trappers.html
   OR
   https://trappertracker.com/admin-import-trappers.html (after deploying)
   ```

2. Click "Start Geocoding" button
3. Wait 6-7 minutes while it geocodes all 364 addresses
4. Click "Import to Database" when done
5. Done! Check the map

## Option 2: Command Line (Faster if network works)

```bash
cd /home/hobo/Desktop/tt

# Step 1: Geocode (6 min)
node scripts/geocode-locations.js

# Step 2: Generate SQL
node scripts/generate-sql-import.js

# Step 3: Import to database
export CLOUDFLARE_API_TOKEN="vikVCvVXS-7rIohZOQepv4QDQaefGA9hYuHKawDa"
npx wrangler d1 execute DB --remote --file=scripts/trapper-import.sql

# Step 4: View in admin panel
open https://trappertracker.com/admin-moderation.html
# Bulk approve all 364 reports
```

## Option 3: Manual CSV Upload (if geocoding fails)

1. Open `trapper-locations.csv` in Google Sheets
2. Install "Geocode by Awesome Table" add-on
3. Geocode all addresses
4. Export as JSON
5. Use bulk import API

## What Happens After Import

- 364 reports added to database with status='pending'
- Go to Admin Moderation panel
- See all 364 reports listed
- Bulk select all → Bulk Approve
- **BOOM** - Map shows all trapper locations!

## Current Status

✅ **Addresses parsed:** 364 locations
✅ **Data ready:** trapper-locations.json
⏳ **Need to geocode:** Use Option 1 or 2 above
⏳ **Need to import:** After geocoding

## Files Created

- `trapper-locations.json` - Parsed addresses
- `trapper-locations.csv` - CSV format
- `scripts/parse-trapper-data.js` - Parser (done)
- `scripts/geocode-locations.js` - Geocoder (ready)
- `scripts/generate-sql-import.js` - SQL generator (ready)
- `public/admin-import-trappers.html` - Browser tool (IN PROGRESS)
- `functions/api/admin/bulk-import-trappers.js` - API endpoint (ready)
