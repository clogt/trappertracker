#!/usr/bin/env node
/**
 * Generate SQL file for importing trapper locations
 * This is simpler than using the API - can run directly with wrangler d1 execute
 */

const fs = require('fs');

// Load import-ready data
if (!fs.existsSync('trapper-locations-import-ready.json')) {
    console.error('❌ ERROR: trapper-locations-import-ready.json not found');
    console.error('   Run geocode-locations.js first!');
    process.exit(1);
}

const locations = JSON.parse(fs.readFileSync('trapper-locations-import-ready.json', 'utf8'));

console.log(`\n📝 GENERATING SQL IMPORT FILE FOR ${locations.length} LOCATIONS\n`);

// Generate SQL INSERT statements
let sql = `-- Bulk import of trapper locations from Reese R. community data
-- Generated: ${new Date().toISOString()}
-- Total locations: ${locations.length}

BEGIN TRANSACTION;

`;

locations.forEach((loc, index) => {
    // Escape single quotes in description
    const description = loc.description.replace(/'/g, "''");

    sql += `-- Location ${index + 1}: ${loc.city}
INSERT INTO trapper_blips (
    latitude,
    longitude,
    description,
    source_type,
    source_url,
    approval_status,
    submitted_by_user_id,
    created_at
) VALUES (
    ${loc.latitude},
    ${loc.longitude},
    '${description}',
    'manual',
    NULL,
    'pending',
    NULL,
    datetime('now')
);

`;
});

sql += `COMMIT;

-- Summary:
-- Total locations: ${locations.length}
-- All set to 'pending' status for admin review
-- Run: npx wrangler d1 execute DB --remote --file=scripts/trapper-import.sql
`;

// Save SQL file
fs.writeFileSync('scripts/trapper-import.sql', sql);

console.log(`✅ SQL file generated: scripts/trapper-import.sql`);
console.log(`\n📊 Statistics:`);
console.log(`   Total INSERT statements: ${locations.length}`);
console.log(`   File size: ${Math.round(Buffer.byteLength(sql) / 1024)} KB`);

console.log(`\n🚀 To import into database:`);
console.log(`   npx wrangler d1 execute DB --remote --file=scripts/trapper-import.sql`);

console.log(`\n👉 After import:`);
console.log(`   1. Log in to admin moderation panel`);
console.log(`   2. Review the ${locations.length} pending reports`);
console.log(`   3. Bulk approve the verified locations`);
console.log(`   4. They'll appear on the public map!\n`);
