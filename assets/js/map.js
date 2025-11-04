// assets/js/map.js (Core Map Logic)

const MAP_API_ENDPOINT = '/api/mapdata'; // Worker endpoint
let map;

function initMap() {
    // 1. Initialize Leaflet/Mapbox map in the #map container
    // map = L.map('map').setView([40.7, -74.0], 12); 
    // ... tile layer setup ...

    // 2. Load data immediately with default Trapper Priority filters
    fetchMapData();

    // 3. Attach listeners to the filters
    document.getElementById('recency-filter').addEventListener('change', fetchMapData);
    document.getElementById('toggle-lost-pets').addEventListener('change', fetchMapData);
    document.getElementById('advanced-filter-btn').addEventListener('click', showAdvancedFilter);
}

function fetchMapData(timeStart=null, timeEnd=null) {
    const recency = document.getElementById('recency-filter').value;
    const showPets = document.getElementById('toggle-lost-pets').checked;
    const bounds = map.getBounds(); // Get current map viewport

    // Construct the query parameters
    const params = new URLSearchParams({
        recency: recency,
        show_pets: showPets,
        lat_min: bounds.getSouth(),
        lat_max: bounds.getNorth(),
        lon_min: bounds.getWest(),
        lon_max: bounds.getEast(),
        time_start: timeStart,
        time_end: timeEnd
    });

    // Call the Cloudflare Worker API
    fetch(`${MAP_API_ENDPOINT}?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            drawBlips(data.trappers, data.pets);
        })
        .catch(err => console.error("Error fetching map data:", err));
}

function drawBlips(trapperData, petData) {
    // Clear existing markers
    // ...

    // 1. Draw Trapper Blips (Trapper Priority)
    trapperData.forEach(blip => {
        const blipAgeDays = (Date.now() - new Date(blip.report_timestamp)) / (1000 * 60 * 60 * 24);
        
        let markerColor = 'grey'; // Default: Historical record
        if (blipAgeDays <= 7) {
            markerColor = 'red-bright'; // HIGH CONFIDENCE/RECENT ACTIVITY
        } else if (blipAgeDays <= 30) {
            markerColor = 'red-dull';   // MODERATE CONFIDENCE
        }

        // Pop-up displays crucial reliability data
        const popupContent = `
            <h3>Reported Trapping Zone</h3>
            <p><strong>Last Reported:</strong> ${new Date(blip.report_timestamp).toLocaleString()}</p>
            <p style="color: ${markerColor};"><strong>Status:</strong> ${blipAgeDays <= 30 ? 'RECENTLY ACTIVE' : 'HISTORICAL'}</p>
        `;
        // Draw the marker using the blip.latitude and blip.longitude (the OFFSET coordinates)
        // ...
    });

    // 2. Draw Lost Pet Pins (Secondary Layer)
    petData.forEach(pet => {
        // Draw the marker (blue/green icon) using pet.latitude and pet.longitude (EXACT coordinates)
        // Pop-up displays photo, name, and contact
        // ...
    });
}

function showAdvancedFilter() {
    // Logic to show the advanced filter modal
    // On modal submission, call fetchMapData(startTime, endTime) with the user inputs.
}

window.onload = initMap;
