#!/usr/bin/env node
/**
 * Create approximate coordinates for trapper locations
 * Uses city center + random offset to distribute markers
 */

const fs = require('fs');

// City center coordinates (verified via maps)
const CITY_COORDS = {
    'Panama City Beach': { lat: 30.1766, lon: -85.8055 },
    'Panama City': { lat: 30.1588, lon: -85.6602 },
    'Callaway': { lat: 30.1491, lon: -85.5694 },
    'Lynn Haven': { lat: 30.2450, lon: -85.6487 },
    'Fountain': { lat: 30.4401, lon: -85.4741 },
    'Southport': { lat: 30.2855, lon: -85.4527 },
    'Parker': { lat: 30.1305, lon: -85.6052 },
    'Springfield': { lat: 30.1563, lon: -85.6122 },
    'Millville': { lat: 30.1447, lon: -85.6211 },
    'Highland Park': { lat: 30.2420, lon: -85.6520 }, // Near Lynn Haven
    'Youngstown': { lat: 30.3405, lon: -85.4525 },
    'Mexico Beach': { lat: 29.9487, lon: -85.4194 },
    'Tyndall AFB': { lat: 30.0697, lon: -85.5755 }
};

// Load parsed locations
const locations = JSON.parse(fs.readFileSync('trapper-locations.json', 'utf8'));

console.log(`\n📍 CREATING APPROXIMATE COORDINATES FOR ${locations.length} LOCATIONS\n`);

// Add coordinates with random offset to spread markers
const geocodedLocations = locations.map((loc, index) => {
    const cityCoords = CITY_COORDS[loc.city];

    if (!cityCoords) {
        console.error(`❌ No coordinates for city: ${loc.city}`);
        return { ...loc, geocoded: false };
    }

    // Random offset: ±0.01 degrees (~1 km)
    const offsetLat = (Math.random() - 0.5) * 0.02;
    const offsetLon = (Math.random() - 0.5) * 0.02;

    const latitude = cityCoords.lat + offsetLat;
    const longitude = cityCoords.lon + offsetLon;

    if (index % 50 === 0) {
        console.log(`✓ ${index}/${locations.length} - ${loc.city}: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }

    return {
        ...loc,
        latitude: parseFloat(latitude.toFixed(6)),
        longitude: parseFloat(longitude.toFixed(6)),
        geocoded: true,
        geocodeMethod: 'approximate_city_center'
    };
});

// Save geocoded results
fs.writeFileSync('trapper-locations-geocoded.json', JSON.stringify(geocodedLocations, null, 2));

console.log(`\n✅ GEOCODING COMPLETE`);
console.log(`Success: ${geocodedLocations.filter(l => l.geocoded).length}/${locations.length}`);
console.log(`Failed: ${geocodedLocations.filter(l => !l.geocoded).length}`);
console.log(`\n📁 Saved to: trapper-locations-geocoded.json`);

// Helper function to clean up address descriptions
function cleanAddress(address) {
    return address
        .replace(/\bblk\b/gi, '')  // Remove "blk"
        .replace(/\bblock\b/gi, '') // Remove "block"
        .replace(/\s+/g, ' ')       // Collapse multiple spaces
        .replace(/^[,\s]+/, '')     // Remove leading commas/spaces
        .replace(/[,\s]+$/, '')     // Remove trailing commas/spaces
        .trim();
}

// Create import-ready format
const importData = geocodedLocations
    .filter(loc => loc.geocoded)
    .map(loc => {
        const cleanedAddress = cleanAddress(loc.address);
        // Only include "Trapper location: " if there's actual address content
        const description = cleanedAddress
            ? `${cleanedAddress}, ${loc.city}`
            : loc.city;

        return {
            latitude: loc.latitude,
            longitude: loc.longitude,
            description: description,
            source_type: 'manual',
            approval_status: 'pending'
        };
    });

fs.writeFileSync('trapper-locations-import-ready.json', JSON.stringify(importData, null, 2));
console.log(`📁 Import-ready data: trapper-locations-import-ready.json (${importData.length} locations)\n`);

console.log(`✨ Ready to generate SQL import file!`);
console.log(`   Run: node scripts/generate-sql-import.js\n`);
