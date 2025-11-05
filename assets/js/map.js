// assets/js/map.js (Core Map Logic)

const MAP_API_ENDPOINT = '/api/mapdata'; // Worker endpoint
let map;

function initMap() {
    // 1. Initialize Leaflet map in the #map container
    map = L.map('map').setView([39.8283, -98.5795], 4); // Centered on US

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Listen for map clicks to place markers
    map.on('click', function(e) {
        document.getElementById('location').value = `${e.latlng.lat}, ${e.latlng.lng}`;
    });

    // 2. Load data immediately with default filters
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

let markers = [];

function drawBlips(trapperData, petData) {
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];

    // 1. Draw Trapper Blips (Trapper Priority)
    trapperData.forEach(blip => {
        const blipAgeDays = (Date.now() - new Date(blip.report_timestamp)) / (1000 * 60 * 60 * 24);
        
        let markerColor = 'grey'; // Default: Historical record
        if (blipAgeDays <= 7) {
            markerColor = 'red'; // HIGH CONFIDENCE/RECENT ACTIVITY
        } else if (blipAgeDays <= 30) {
            markerColor = 'orange';   // MODERATE CONFIDENCE
        }

        const circle = L.circle([blip.latitude, blip.longitude], {
            color: markerColor,
            fillColor: markerColor,
            fillOpacity: 0.5,
            radius: 152.4 // 500 feet in meters
        }).addTo(map);

        // Pop-up displays crucial reliability data
        const popupContent = `
            <h3>Reported Trapping Zone</h3>
            <p><strong>Last Reported:</strong> ${new Date(blip.report_timestamp).toLocaleString()}</p>
            <p style="color: ${markerColor};"><strong>Status:</strong> ${blipAgeDays <= 30 ? 'RECENTLY ACTIVE' : 'HISTORICAL'}</p>
        `;
        circle.bindPopup(popupContent);
        markers.push(circle);
    });

    // 2. Draw Lost Pet Pins (Secondary Layer)
    if (petData) {
        petData.forEach(pet => {
            const marker = L.marker([pet.latitude, pet.longitude]).addTo(map);
            const popupContent = `
                <h3>Lost Pet: ${pet.pet_name}</h3>
                <p><strong>Contact:</strong> ${pet.owner_contact_email}</p>
            `;
            marker.bindPopup(popupContent);
            markers.push(marker);
        });
    }
}

function showAdvancedFilter() {
    // Logic to show the advanced filter modal
    // On modal submission, call fetchMapData(startTime, endTime) with the user inputs.
    alert('Advanced filter is not implemented yet.');
}

window.onload = initMap;