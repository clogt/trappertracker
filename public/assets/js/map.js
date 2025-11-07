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

// Function to update map marker and zoom to location
window.updateMapMarker = function(lat, lng, zoom = 15) {
    if (map) {
        // Zoom and center the map to the new location
        map.setView([lat, lng], zoom);

        // Optionally add a temporary marker to show the selected location
        // Remove any existing temporary marker
        if (window.tempMarker) {
            map.removeLayer(window.tempMarker);
        }

        // Add new temporary marker
        window.tempMarker = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(map);

        window.tempMarker.bindPopup('<strong>Selected Location</strong><br>Click Submit Report to save').openPopup();
    }
};

// Quick location search functionality
function setupQuickSearch() {
    const quickSearchInput = document.getElementById('quick-search');
    const quickSearchBtn = document.getElementById('quick-search-btn');
    const quickSearchMobileInput = document.getElementById('quick-search-mobile');
    const quickSearchMobileBtn = document.getElementById('quick-search-mobile-btn');

    let autocompleteTimeout;
    let lastAutocompleteRequest = 0;
    const AUTOCOMPLETE_DEBOUNCE = 300; // ms
    const NOMINATIM_RATE_LIMIT = 1000; // 1 req/sec

    // Create autocomplete dropdown
    function createAutocompleteDropdown(inputElement) {
        const existingDropdown = inputElement.parentElement.querySelector('.quick-search-dropdown');
        if (existingDropdown) return existingDropdown;

        const dropdown = document.createElement('div');
        dropdown.className = 'quick-search-dropdown hidden absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto';
        dropdown.style.position = 'absolute';
        dropdown.style.top = 'calc(100% + 4px)';
        dropdown.style.left = '0';
        dropdown.style.width = '100%';
        dropdown.style.zIndex = '9999';
        inputElement.parentElement.style.position = 'relative';
        inputElement.parentElement.appendChild(dropdown);
        return dropdown;
    }

    // Debounced autocomplete search
    async function searchAutocomplete(query, dropdown) {
        if (!query || query.length < 2) {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
            return;
        }

        clearTimeout(autocompleteTimeout);

        // Show loading state immediately
        dropdown.innerHTML = '<div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Loading...</div>';
        dropdown.classList.remove('hidden');

        autocompleteTimeout = setTimeout(async () => {
            // Respect rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - lastAutocompleteRequest;
            if (timeSinceLastRequest < NOMINATIM_RATE_LIMIT) {
                await new Promise(resolve => setTimeout(resolve, NOMINATIM_RATE_LIMIT - timeSinceLastRequest));
            }
            lastAutocompleteRequest = Date.now();

            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                    `q=${encodeURIComponent(query)}&` +
                    `format=json&` +
                    `limit=5&` +
                    `countrycodes=us`,
                    {
                        headers: {
                            'User-Agent': 'TrapperTracker/1.0'
                        }
                    }
                );

                if (!response.ok) throw new Error('Autocomplete unavailable');

                const data = await response.json();

                if (data && data.length > 0) {
                    dropdown.innerHTML = '';
                    data.forEach(place => {
                        const item = document.createElement('div');
                        item.className = 'px-4 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0';
                        item.textContent = place.display_name;
                        item.addEventListener('click', () => {
                            const lat = parseFloat(place.lat);
                            const lng = parseFloat(place.lon);

                            // Determine zoom level
                            let zoomLevel = 12;
                            if (place.type === 'postcode' || /^\d{5}$/.test(query.trim())) {
                                zoomLevel = 13;
                            }

                            // Zoom map to location
                            if (map) {
                                map.setView([lat, lng], zoomLevel);
                            }

                            // Clear the dropdown
                            dropdown.classList.add('hidden');
                            dropdown.innerHTML = '';
                        });
                        dropdown.appendChild(item);
                    });
                    dropdown.classList.remove('hidden');
                } else {
                    dropdown.innerHTML = '<div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No results found</div>';
                    dropdown.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Autocomplete error:', error);
                dropdown.classList.add('hidden');
                dropdown.innerHTML = '';
            }
        }, AUTOCOMPLETE_DEBOUNCE);
    }

    async function performSearch(query) {
        if (!query || query.trim().length < 2) {
            alert('Please enter a city name or zip code');
            return;
        }

        try {
            // Add delay to respect Nominatim rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(query)}&` +
                `format=json&` +
                `limit=1&` +
                `countrycodes=us`,
                {
                    headers: {
                        'User-Agent': 'TrapperTracker/1.0'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Search service unavailable');
            }

            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);

                // Determine zoom level based on search type
                let zoomLevel = 12; // Default for cities

                // If it's a zip code (5 digits), zoom closer
                if (/^\d{5}$/.test(query.trim())) {
                    zoomLevel = 13;
                }

                // Zoom map to location
                if (map) {
                    map.setView([lat, lng], zoomLevel);
                }
            } else {
                alert('Location not found. Try a different city or zip code.');
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('Search failed. Please try again.');
        }
    }

    // Desktop search with autocomplete
    if (quickSearchBtn && quickSearchInput) {
        const desktopDropdown = createAutocompleteDropdown(quickSearchInput);

        quickSearchInput.addEventListener('input', (e) => {
            searchAutocomplete(e.target.value, desktopDropdown);
        });

        quickSearchBtn.addEventListener('click', () => {
            performSearch(quickSearchInput.value);
            desktopDropdown.classList.add('hidden');
        });

        quickSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(quickSearchInput.value);
                desktopDropdown.classList.add('hidden');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!quickSearchInput.contains(e.target) && !desktopDropdown.contains(e.target)) {
                desktopDropdown.classList.add('hidden');
            }
        });
    }

    // Mobile search with autocomplete
    if (quickSearchMobileBtn && quickSearchMobileInput) {
        const mobileDropdown = createAutocompleteDropdown(quickSearchMobileInput);

        quickSearchMobileInput.addEventListener('input', (e) => {
            searchAutocomplete(e.target.value, mobileDropdown);
        });

        quickSearchMobileBtn.addEventListener('click', () => {
            performSearch(quickSearchMobileInput.value);
            mobileDropdown.classList.add('hidden');
        });

        quickSearchMobileInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(quickSearchMobileInput.value);
                mobileDropdown.classList.add('hidden');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!quickSearchMobileInput.contains(e.target) && !mobileDropdown.contains(e.target)) {
                mobileDropdown.classList.add('hidden');
            }
        });
    }
}

window.onload = () => {
    initMap();
    setupQuickSearch();
};
