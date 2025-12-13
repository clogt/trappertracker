#!/usr/bin/env node
/**
 * Import geocoded trapper locations to TrapperTracker database
 */

const fs = require('fs');
const https = require('https');

// Configuration
const API_URL = 'https://trappertracker.com/api/admin/bulk-import-trappers';
// const API_URL = 'http://localhost:8788/api/admin/bulk-import-trappers'; // For local testing

// Load import-ready data
if (!fs.existsSync('trapper-locations-import-ready.json')) {
    console.error('❌ ERROR: trapper-locations-import-ready.json not found');
    console.error('   Run geocode-locations.js first!');
    process.exit(1);
}

const locations = JSON.parse(fs.readFileSync('trapper-locations-import-ready.json', 'utf8'));

console.log(`\n📤 IMPORTING ${locations.length} TRAPPER LOCATIONS TO DATABASE`);
console.log(`API Endpoint: ${API_URL}\n`);

// You'll need to get this from your admin session cookie
// After logging in to admin panel, check browser dev tools → Application → Cookies
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

if (!ADMIN_TOKEN) {
    console.log(`⚠️  No ADMIN_TOKEN provided. You have two options:\n`);
    console.log(`Option 1: Set environment variable:`);
    console.log(`   export ADMIN_TOKEN="your-jwt-token-here"`);
    console.log(`   node scripts/import-to-database.js\n`);
    console.log(`Option 2: Use the manual import tool (recommended):`);
    console.log(`   I'll create a simpler import script...\n`);
    process.exit(1);
}

// Import data
async function importData() {
    const payload = JSON.stringify({
        locations: locations,
        submitted_by_user_id: null // Community contribution
    });

    const url = new URL(API_URL);

    const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'Cookie': `admin_token=${ADMIN_TOKEN}`
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({ statusCode: res.statusCode, data: result });
                } catch (err) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Run import
importData()
    .then(response => {
        if (response.statusCode === 200) {
            console.log(`✅ IMPORT SUCCESSFUL!\n`);
            console.log(`Results:`);
            console.log(`  Total: ${response.data.results.total}`);
            console.log(`  Success: ${response.data.results.success}`);
            console.log(`  Failed: ${response.data.results.failed}\n`);

            if (response.data.results.errors && response.data.results.errors.length > 0) {
                console.log(`❌ Errors (first 5):`);
                response.data.results.errors.slice(0, 5).forEach(err => {
                    console.log(`   - ${err.error}`);
                });
            }

            console.log(`\n🎉 ${response.data.results.success} trapper locations imported!`);
            console.log(`\n👉 Next steps:`);
            console.log(`   1. Log in to admin panel: https://trappertracker.com/admin-moderation.html`);
            console.log(`   2. Review pending reports`);
            console.log(`   3. Approve the trapper locations`);
            console.log(`   4. They'll appear on the public map!\n`);
        } else {
            console.error(`❌ IMPORT FAILED`);
            console.error(`Status: ${response.statusCode}`);
            console.error(`Response:`, JSON.stringify(response.data, null, 2));
        }
    })
    .catch(error => {
        console.error(`❌ ERROR:`, error.message);
    });
