// assets/js/map.js (Core Map Logic)

const MAP_API_ENDPOINT = '/api/mapdata'; // Worker endpoint
let map;

// Simple HTML sanitizer
const sanitizeHTML = (str) => {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

// Marker arrays for each layer
let layerGroups = {
    trappers: L.layerGroup(),
    lost_pets: L.layerGroup(),
    found_pets: L.layerGroup(),
    dangerous_animals: L.layerGroup()
};

function initMap() {
    map = L.map('map').setView([39.8283, -98.5795], 4); // Centered on US

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add layer groups to the map
    for (const key in layerGroups) {
        layerGroups[key].addTo(map);
    }

    // Listen for map clicks to place markers in the report form
    map.on('click', function(e) {
        const locationInput = document.getElementById('location');
        if(locationInput) {
            locationInput.value = `${e.latlng.lat}, ${e.latlng.lng}`;
        }
    });

    // Attach listeners to all layer toggles and filters
    document.getElementById('toggle-trappers').addEventListener('change', fetchMapData);
    document.getElementById('toggle-lost-pets').addEventListener('change', fetchMapData);
    document.getElementById('toggle-found-pets').addEventListener('change', fetchMapData);
    document.getElementById('toggle-dangerous-animals').addEventListener('change', fetchMapData);
    document.getElementById('recency-filter')?.addEventListener('change', fetchMapData);
    document.getElementById('advanced-filter-btn')?.addEventListener('click', () => advancedFilterModal.classList.remove('hidden'));

    // Initial data load
    fetchMapData();
}

function fetchMapData(timeStart = null, timeEnd = null) {
    const recency = document.getElementById('recency-filter')?.value || 'all';
    const bounds = map.getBounds();

    const params = new URLSearchParams({
        lat_min: bounds.getSouth(),
        lat_max: bounds.getNorth(),
        lon_min: bounds.getWest(),
        lon_max: bounds.getEast(),
        show_trappers: document.getElementById('toggle-trappers').checked,
        show_lost_pets: document.getElementById('toggle-lost-pets').checked,
        show_found_pets: document.getElementById('toggle-found-pets').checked,
        show_dangerous_animals: document.getElementById('toggle-dangerous-animals').checked,
    });

    if (timeStart) params.append('time_start', timeStart);
    if (timeEnd) params.append('time_end', timeEnd);
    if (recency !== 'all') params.append('recency', recency);

    fetch(`${MAP_API_ENDPOINT}?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            drawMapData(data);
        })
        .catch(err => console.error("Error fetching map data:", err));
}

window.fetchMapData = fetchMapData; // Make it globally accessible

function drawMapData(data) {
    // Clear all layers
    for (const key in layerGroups) {
        layerGroups[key].clearLayers();
    }

    // Draw Trapper Blips
    data.trappers?.forEach(blip => {
        const blipAgeDays = (Date.now() - new Date(blip.report_timestamp)) / (1000 * 60 * 60 * 24);
        let markerColor = blipAgeDays <= 7 ? 'red' : (blipAgeDays <= 30 ? 'orange' : 'grey');
        const circle = L.circle([blip.latitude, blip.longitude], {
            color: markerColor, fillColor: markerColor, fillOpacity: 0.5, radius: 152.4 // 500ft
        });
        circle.bindPopup(`<h3>Reported Trapping Zone</h3><p><strong>Last Reported:</strong> ${new Date(blip.report_timestamp).toLocaleString()}</p><p>${sanitizeHTML(blip.description || '')}</p>`);
        layerGroups.trappers.addLayer(circle);
    });

    // Draw Lost Pets
    data.lost_pets?.forEach(pet => {
        const marker = L.marker([pet.latitude, pet.longitude]);
        marker.bindPopup(`<h3>Lost Pet: ${sanitizeHTML(pet.pet_name)}</h3><p><strong>Species/Breed:</strong> ${sanitizeHTML(pet.species_breed || 'N/A')}</p><p><strong>Description:</strong> ${sanitizeHTML(pet.description || 'N/A')}</p><p><strong>Contact:</strong> ${sanitizeHTML(pet.owner_contact_email)}</p>${pet.photo_url ? `<a href="${sanitizeHTML(pet.photo_url)}" target="_blank">View Photo</a>` : ''}`);
        layerGroups.lost_pets.addLayer(marker);
    });

    // Draw Found Pets
    data.found_pets?.forEach(pet => {
        const marker = L.marker([pet.latitude, pet.longitude], { icon: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }) });
        marker.bindPopup(`<h3>Found Pet</h3><p><strong>Species/Breed:</strong> ${sanitizeHTML(pet.species_breed || 'N/A')}</p><p><strong>Description:</strong> ${sanitizeHTML(pet.description || 'N/A')}</p><p><strong>Contact Finder:</strong> ${sanitizeHTML(pet.contact_info)}</p>${pet.photo_url ? `<a href="${sanitizeHTML(pet.photo_url)}" target="_blank">View Photo</a>` : ''}`);
        layerGroups.found_pets.addLayer(marker);
    });

    // Draw Dangerous Animals
    data.dangerous_animals?.forEach(animal => {
        const circle = L.circle([animal.latitude, animal.longitude], {
            color: 'yellow', fillColor: 'yellow', fillOpacity: 0.6, radius: 50
        });
        circle.bindPopup(`<h3>Dangerous Animal Sighting</h3><p><strong>Type:</strong> ${sanitizeHTML(animal.animal_type)}</p><p><strong>Description:</strong> ${sanitizeHTML(animal.description || 'N/A')}</p><p><strong>Reported:</strong> ${new Date(animal.report_timestamp).toLocaleString()}</p>`);
        layerGroups.dangerous_animals.addLayer(circle);
    });
}

window.onload = initMap;
