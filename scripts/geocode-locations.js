#!/usr/bin/env node
/**
 * Geocode trapper locations using OpenStreetMap Nominatim API
 * Free, no API key required, rate limit: 1 request/second
 */

const fs = require('fs');
const https = require('https');

// Load parsed locations
const locations = JSON.parse(fs.readFileSync('trapper-locations.json', 'utf8'));

console.log(`\n🌍 GEOCODING ${locations.length} LOCATIONS`);
console.log(`Rate limit: 1 request/second (Nominatim policy)`);
console.log(`Estimated time: ~${Math.ceil(locations.length / 60)} minutes\n`);

const geocodedResults = [];
let successCount = 0;
let failCount = 0;

// Geocode a single address
async function geocode(location, index) {
    return new Promise((resolve) => {
        const query = encodeURIComponent(location.fullAddress);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=us`;

        const options = {
            headers: {
                'User-Agent': 'TrapperTracker/1.0 (trappertracker.com; contact@trappertracker.com)'
            }
        };

        https.get(url, options, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const results = JSON.parse(data);

                    if (results && results.length > 0) {
                        const result = results[0];
                        successCount++;

                        const geocoded = {
                            ...location,
                            latitude: parseFloat(result.lat),
                            longitude: parseFloat(result.lon),
                            displayName: result.display_name,
                            geocoded: true,
                            geocodeConfidence: result.importance || 0
                        };

                        console.log(`✅ [${index + 1}/${locations.length}] ${location.address}, ${location.city}`);
                        resolve(geocoded);
                    } else {
                        failCount++;
                        console.log(`❌ [${index + 1}/${locations.length}] FAILED: ${location.fullAddress}`);
                        resolve({
                            ...location,
                            geocoded: false,
                            geocodeError: 'No results found'
                        });
                    }
                } catch (err) {
                    failCount++;
                    console.log(`❌ [${index + 1}/${locations.length}] ERROR: ${err.message}`);
                    resolve({
                        ...location,
                        geocoded: false,
                        geocodeError: err.message
                    });
                }
            });
        }).on('error', (err) => {
            failCount++;
            console.log(`❌ [${index + 1}/${locations.length}] NETWORK ERROR: ${err.message}`);
            resolve({
                ...location,
                geocoded: false,
                geocodeError: err.message
            });
        });
    });
}

// Process locations with rate limiting
async function geocodeAll() {
    for (let i = 0; i < locations.length; i++) {
        const result = await geocode(locations[i], i);
        geocodedResults.push(result);

        // Progress update every 20 locations
        if ((i + 1) % 20 === 0) {
            console.log(`\n📊 Progress: ${i + 1}/${locations.length} (${successCount} success, ${failCount} failed)\n`);
        }

        // Rate limiting: Wait 1.1 seconds between requests
        if (i < locations.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1100));
        }
    }

    // Save results
    fs.writeFileSync('trapper-locations-geocoded.json', JSON.stringify(geocodedResults, null, 2));

    console.log(`\n✅ GEOCODING COMPLETE`);
    console.log(`Success: ${successCount}/${locations.length} (${Math.round(successCount/locations.length*100)}%)`);
    console.log(`Failed: ${failCount}/${locations.length}`);
    console.log(`\n📁 Saved to: trapper-locations-geocoded.json`);

    // Show failed addresses
    const failed = geocodedResults.filter(r => !r.geocoded);
    if (failed.length > 0) {
        console.log(`\n❌ FAILED ADDRESSES (${failed.length}):`);
        failed.slice(0, 10).forEach(loc => {
            console.log(`   - ${loc.fullAddress}`);
        });
        if (failed.length > 10) {
            console.log(`   ... and ${failed.length - 10} more`);
        }
    }

    // Create import-ready format
    const importData = geocodedResults
        .filter(r => r.geocoded)
        .map(loc => ({
            latitude: loc.latitude,
            longitude: loc.longitude,
            description: `Trapper location: ${loc.address}${loc.notes ? '. ' + loc.notes : ''}${loc.isNew ? ' (NEW - reported Nov 2024)' : ''}`,
            source_type: 'manual',
            source_url: null,
            approval_status: 'pending',
            submitted_by_user_id: null, // Will be set by admin
            area: loc.area,
            city: loc.city,
            state: loc.state,
            original_address: loc.fullAddress,
            is_new_trapper: loc.isNew
        }));

    fs.writeFileSync('trapper-locations-import-ready.json', JSON.stringify(importData, null, 2));
    console.log(`\n📁 Import-ready data: trapper-locations-import-ready.json (${importData.length} locations)`);
}

// Start geocoding
geocodeAll().catch(console.error);
