// --- Configuration ---
// The DB_NAME variable is only used to display the name in the HTML UI for context.
const DB_NAME = 'trappertrackerdb';

// Define the API Handlers object. This object maps HTTP method + route pattern to an async function.
const API_HANDLERS = {
    // GET /api/reports - Fetch all map reports
    'GET /api/reports': async (request, env) => {
        const query = `SELECT * FROM reports ORDER BY timestamp DESC`;
        try {
            const { results } = await env.DB.prepare(query).all();
            return new Response(JSON.stringify(results), {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Database query failed. Ensure the "reports" table exists.', details: e.message }), {
                headers: { 'Content-Type': 'application/json' },
                status: 500
            });
        }
    },

    // POST /api/reports - Create a new map report (Trapping Danger or Missing Pet)
    'POST /api/reports': async (request, env) => {
        try {
            const data = await request.json();

            // Validate mandatory fields
            if (!data.type || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
                return new Response('Missing mandatory fields: type, lat, or lng.', { status: 400 });
            }

            // Bindings for the SQL query
            const type = data.type; // 'trapper' or 'missing'
            const lat = data.lat;
            const lng = data.lng;
            const description = data.description || null;

            let petName = null;
            let contact = null;

            if (type === 'missing') {
                petName = data.petName || null;
                contact = data.contact || null;
                if (!petName || !contact) {
                    return new Response('Missing mandatory fields for "missing" report: petName or contact.', { status: 400 });
                }
            }

            const query = `
                INSERT INTO reports (type, latitude, longitude, description, petName, contact) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            await env.DB.prepare(query)
                .bind(type, lat, lng, description, petName, contact)
                .run();

            return new Response(JSON.stringify({ success: true, message: 'Report submitted' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 201
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    },
};

// --- Worker Request Handler ---

const handleCORS = (request) => {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400');
    return new Response(null, { headers, status: 204 });
};

const handleRequest = async (request, env) => {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === 'OPTIONS') {
        return handleCORS(request);
    }

    if (path.startsWith('/api/')) {
        const routeKey = `${method} ${path}`;

        // Attempt to match the exact route for CRUD operations
        if (API_HANDLERS[routeKey]) {
            return API_HANDLERS[routeKey](request, env, path);
        }

        // Handle the /api/reports route specifically
        if (path === '/api/reports' && (method === 'GET' || method === 'POST')) {
            const handlerKey = `${method} /api/reports`;
            if (API_HANDLERS[handlerKey]) {
                return API_HANDLERS[handlerKey](request, env);
            }
        }

        return new Response('API Route Not Found', { status: 404 });
    }

    // Default: Serve the HTML map dashboard
    return new Response(handleHTML(DB_NAME), {
        headers: {
            'Content-Type': 'text/html;charset=utf-8',
            'Cache-Control': 'no-cache',
        },
    });
};

export default {
    fetch: handleRequest,
};

// Serves the full HTML map dashboard
const handleHTML = (DB_NAME) => {
    // Note: All client-side template literals (\`${...}\`) are escaped (\\`${...}\\`)
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trapper & Pet Safety Map</title>
    
    <!-- Leaflet CSS (for the map) -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    
    <!-- Custom Style -->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        html, body, #map {
            height: 100vh;
            width: 100vw;
            margin: 0;
            padding: 0;
            font-family: 'Inter', sans-serif;
            overflow: hidden; /* Prevent body scroll */
        }

        .controls {
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            background: white;
            padding: 8px 15px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            display: flex;
            gap: 15px;
            
        }

        .control-button {
            padding: 10px 18px;
            font-size: 15px;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        #btn-trapper {
            background-color: #ef4444; /* Tailwind Red 500 */
            color: white;
        }
        #btn-trapper:hover { background-color: #dc2626; } /* Tailwind Red 600 */

        #btn-missing {
            background-color: #3b82f6; /* Tailwind Blue 500 */
            color: white;
        }
        #btn-missing:hover { background-color: #2563eb; } /* Tailwind Blue 600 */

        /* --- Reporting Modal --- */
        #report-modal {
            display: none; 
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2000;
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
            width: 90%;
            max-width: 350px;
        }
        
        #report-modal h3 {
            margin-top: 0;
            font-size: 1.5rem;
            font-weight: 700;
        }

        #report-modal label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            font-size: 0.875rem; /* sm */
            color: #4b5563;
        }

        #report-modal input, #report-modal textarea {
            width: 100%;
            box-sizing: border-box; 
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            margin-bottom: 15px;
            font-size: 1rem;
        }
        
        #modal-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 15px;
        }
        
        #modal-cancel {
            background-color: #f3f4f6;
            color: #374151;
            padding: 10px 15px;
            border-radius: 6px;
        }
        #modal-submit {
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
        }

        /* Leaflet Popups for Mobile Readability */
        .leaflet-popup-content-wrapper {
            border-radius: 8px;
        }
        .leaflet-popup-content {
            font-size: 14px;
            padding: 10px;
        }
        
        /* Mobile adjustment for controls */
        @media (max-width: 600px) {
            .controls {
                width: 90%;
                left: 5%;
                transform: translateX(0);
                flex-direction: column;
                gap: 8px;
            }
            .control-button {
                width: 100%;
                font-size: 14px;
            }
        }
    </style>
</head>
<body>

    <!-- The Map Container -->
    <div id="map"></div>

    <!-- The Control Buttons -->
    <div class="controls">
        <button id="btn-trapper" class="control-button">🚩 Report Trapping Danger</button>
        <button id="btn-missing" class="control-button">🐾 Report Missing Pet</button>
    </div>

    <!-- The Pop-up Form (Modal) -->
    <div id="report-modal">
        <h3 id="modal-title">New Report</h3>
        
        <div id="modal-form-content">
            <!-- Form fields injected here -->
        </div>

        <div id="modal-buttons">
            <button id="modal-cancel" class="control-button">Cancel</button>
            <button id="modal-submit" class="control-button"></button>
        </div>
    </div>
    
    <!-- Leaflet JavaScript -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

    <script>
        // --- CLIENT-SIDE JAVASCRIPT ---
        
        // Wrap everything in an event listener to ensure all HTML elements are loaded before running the script
        document.addEventListener('DOMContentLoaded', () => {
        
            // Check if Leaflet (L) is available. If not, alert the user to a network block.
            if (typeof L === 'undefined') {
                document.body.innerHTML = \`<div style="padding: 20px; font-family: sans-serif; text-align: center;">
                    <h1>Loading Error</h1>
                    <p>Could not load the Leaflet map library. Please check your network connection or try a different browser, as some networks may block external JavaScript resources.</p>
                </div>\`;
                return;
            }
            
            const API_ENDPOINT = '/api/reports';
            
            // --- MAP INITIALIZATION ---
            const startLocation = [39.82, -98.57]; 
            const map = L.map('map').setView(startLocation, 4);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(map);

            // Try to find the user's location and zoom in
            map.locate({setView: true, maxZoom: 12});
            map.on('locationfound', (e) => map.setView(e.latlng, 14));

            // --- CUSTOM ICONS ---
            const trapperIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            const missingIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            // --- STATE & MODAL VARIABLES ---
            let currentReportType = null; 
            let currentLatLng = null; 
            
            const modal = document.getElementById('report-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalFormContent = document.getElementById('modal-form-content');
            const modalSubmit = document.getElementById('modal-submit');
            
            // --- MODAL / UI FUNCTIONS ---

            const showModal = (type) => {
                if (type === 'trapper') {
                    modalTitle.innerText = '🚩 Report Trapping Danger';
                    modalFormContent.innerHTML = \`
                        <label for="desc">Description (What did you see?)</label>
                        <textarea id="desc" rows="3" placeholder="e.g., Saw a snare trap near the fence line."></textarea>
                    \`;
                    modalSubmit.innerText = 'Submit Danger Report';
                    modalSubmit.style.backgroundColor = '#ef4444'; 

                } else if (type === 'missing') {
                    modalTitle.innerText = '🐾 Report Missing Pet';
                    modalFormContent.innerHTML = \`
                        <label for="petName">Pet's Name:</label>
                        <input type="text" id="petName" required placeholder="e.g., Buddy">
                        
                        <label for="contact">Your Contact (Phone/Email):</label>
                        <input type="text" id="contact" required placeholder="So neighbors can reach you">
                        
                        <label for="desc">Description (Breed, color, size):</label>
                        <textarea id="desc" rows="3" placeholder="e.g., Golden Retriever, very friendly, wearing a red collar."></textarea>
                    \`;
                    modalSubmit.innerText = 'Submit Missing Report';
                    modalSubmit.style.backgroundColor = '#3b82f6';
                }
                
                modal.style.display = 'block'; 
            }

            const hideModal = () => {
                modal.style.display = 'none';
                document.body.style.cursor = ''; 
                currentReportType = null;
                currentLatLng = null;
            }
            
            // --- DATA SUBMISSION ---

            const submitReport = async () => {
                const report = {
                    type: currentReportType,
                    lat: currentLatLng.lat,
                    lng: currentLatLng.lng,
                    description: document.getElementById('desc').value,
                };

                if (currentReportType === 'missing') {
                    report.petName = document.getElementById('petName').value.trim();
                    report.contact = document.getElementById('contact').value.trim();
                    
                    if (!report.petName || !report.contact) {
                        alert('Please enter your pet\'s name and contact info.');
                        return;
                    }
                }
                
                try {
                    const response = await fetch(API_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(report)
                    });

                    if (!response.ok) {
                        throw new Error(\`Failed to save report: \${response.statusText}\`);
                    }
                    
                    hideModal();
                    await loadReports(); // Reload pins after successful submission
                    alert('Report submitted successfully! The map has been updated.');

                } catch (error) {
                    console.error("Submission Error:", error);
                    alert('Error submitting report. Check the console for details.');
                }
            };

            // --- DATA RETRIEVAL ---

            const loadReports = async () => {
                // Clear existing markers
                map.eachLayer((layer) => {
                    if (layer instanceof L.Marker) {
                        map.removeLayer(layer);
                    }
                });
                
                try {
                    const response = await fetch(API_ENDPOINT);
                    if (!response.ok) {
                        // Attempt to read the error body
                        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
                        throw new Error(\`\${errorBody.message || errorBody.error}\`);
                    }
                    const reports = await response.json();
                    reports.forEach(addPinToMap);

                } catch (error) {
                    console.error("Load Error:", error);
                    // Inform the user specifically about the D1 issue
                    if (error.message.includes('reports table exists')) {
                        // This specific message comes from the Worker API Handler if the table is missing
                        alert("FATAL ERROR: The D1 database table 'reports' is missing. Please re-run the schema SQL in your Cloudflare console.");
                    } else {
                        // General network/fetch failure
                        // We avoid showing the console error directly to the user but give them a general failure message.
                        // Since we know the schema is done, this is likely a network issue.
                        // Check if the map is initialized before assuming a D1 error.
                        // alert(\`Failed to load map data. Please check your network or D1 binding. Error: \${error.message}\`);
                    }
                }
            };

            const addPinToMap = (report) => {
                let icon;
                let popupContent;

                if (report.type === 'trapper') {
                    icon = trapperIcon;
                    const timestamp = new Date(report.timestamp).toLocaleString();
                    popupContent = \`
                        <div style="color: #ef4444; font-weight: bold; margin-bottom: 5px;">🚨 TRAPPING DANGER REPORT</div>
                        <strong>Reported:</strong> \${timestamp}<br>
                        <strong>Location:</strong> \${report.latitude.toFixed(4)}, \${report.longitude.toFixed(4)}<br>
                        <strong>Details:</strong> \${report.description || 'N/A'}
                    \`;
                } else if (report.type === 'missing') {
                    icon = missingIcon;
                    const timestamp = new Date(report.timestamp).toLocaleString();
                    popupContent = \`
                        <div style="color: #3b82f6; font-weight: bold; margin-bottom: 5px;">🐕 MISSING PET: \${report.petName}</div>
                        <strong>Last Seen:</strong> \${timestamp}<br>
                        <strong>Contact:</strong> \${report.contact}<br>
                        <strong>Details:</strong> \${report.description || 'No detailed description provided.'}
                    \`;
                }

                L.marker([report.latitude, report.longitude], { icon: icon })
                    .addTo(map)
                    .bindPopup(popupContent, { minWidth: 200, maxWidth: 300 });
            }

            // --- EVENT HANDLERS ---
            
            // 1. Activate report mode when buttons are clicked
            document.getElementById('btn-trapper').addEventListener('click', () => {
                currentReportType = 'trapper';
                document.body.style.cursor = 'crosshair';
                alert('Click on the map where you have confirmed trapping danger to place the red pin.');
            });

            document.getElementById('btn-missing').addEventListener('click', () => {
                currentReportType = 'missing';
                document.body.style.cursor = 'crosshair';
                alert('Click on the map where your pet was last seen to place the blue pin.');
            });

            // 2. Capture map click to open the modal
            map.on('click', (e) => {
                if (!currentReportType) return;
                currentLatLng = e.latlng;
                showModal(currentReportType);
            });

            // 3. Modal control
            document.getElementById('modal-cancel').addEventListener('click', hideModal);
            document.getElementById('modal-submit').addEventListener('click', submitReport);


            // --- INITIAL LOAD ---
            loadReports();
        }); // End of DOMContentLoaded
    </script>
</body>
</html>
`;
    return htmlContent;
};
