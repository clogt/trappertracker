// --- Configuration ---
// The DB_NAME variable is only used to display the name in the HTML UI for context.
const DB_NAME = 'trappertrackerdb';

// Define the API Handlers object. This object maps HTTP method + route pattern to an async function.
const API_HANDLERS = {
    // GET /api/animals - Fetch all animals
    'GET /api/animals': async (request, env) => {
        // NOTE: The database is accessed via 'env.DB' because the binding variable name is 'DB'.
        const query = `SELECT * FROM animals ORDER BY name ASC`;
        try {
            const { results } = await env.DB.prepare(query).all();
            return new Response(JSON.stringify(results), {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            });
        } catch (e) {
            // This often catches the "no such table: animals" error if initialization failed.
            return new Response(JSON.stringify({ error: 'Database query failed. Ensure the "animals" table exists.', details: e.message }), {
                headers: { 'Content-Type': 'application/json' },
                status: 500
            });
        }
    },

    // POST /api/animals - Create a new animal entry
    'POST /api/animals': async (request, env) => {
        try {
            const data = await request.json();

            // Simple validation
            if (!data.name || !data.habitat || typeof data.population !== 'number' || data.population < 0) {
                return new Response('Missing required fields (name, habitat, population) or invalid data type.', { status: 400 });
            }

            const query = `INSERT INTO animals (name, habitat, population) VALUES (?, ?, ?)`;
            await env.DB.prepare(query).bind(data.name, data.habitat, data.population).run();

            return new Response(JSON.stringify({ success: true, message: 'Animal added' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 201
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    },

    // PUT /api/animals/:id - Update an existing animal entry
    'PUT /api/animals/:id': async (request, env, path) => {
        const id = parseInt(path.split('/')[3]);
        if (isNaN(id)) {
            return new Response('Invalid animal ID', { status: 400 });
        }

        try {
            const data = await request.json();
            const updates = [];
            const bindings = [];

            if (data.name) { updates.push('name = ?'); bindings.push(data.name); }
            if (data.habitat) { updates.push('habitat = ?'); bindings.push(data.habitat); }
            if (typeof data.population === 'number' && data.population >= 0) { updates.push('population = ?'); bindings.push(data.population); }

            if (updates.length === 0) {
                return new Response('No fields provided for update', { status: 400 });
            }

            bindings.push(id);
            const query = `UPDATE animals SET ${updates.join(', ')} WHERE id = ?`;

            const result = await env.DB.prepare(query).bind(...bindings).run();

            if (result.changes === 0) {
                return new Response(JSON.stringify({ success: false, message: 'Animal not found or no changes made' }), { status: 404 });
            }

            return new Response(JSON.stringify({ success: true, message: `Animal ID ${id} updated` }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    },

    // DELETE /api/animals/:id - Delete an animal entry
    'DELETE /api/animals/:id': async (request, env, path) => {
        const id = parseInt(path.split('/')[3]);
        if (isNaN(id)) {
            return new Response('Invalid animal ID', { status: 400 });
        }

        try {
            const query = `DELETE FROM animals WHERE id = ?`;
            const result = await env.DB.prepare(query).bind(id).run();

            if (result.changes === 0) {
                return new Response(JSON.stringify({ success: false, message: 'Animal not found' }), { status: 404 });
            }

            return new Response(JSON.stringify({ success: true, message: `Animal ID ${id} deleted` }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    },
};

// --- Helper Functions ---

const handleCORS = (request) => {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400');
    return new Response(null, { headers, status: 204 });
};

// Serves the full HTML dashboard
const handleHTML = (DB_NAME) => {
    // NOTE: All client-side template literals (\`${...}\`) are escaped (\`\${...}\`)
    // to prevent the server-side Worker from misinterpreting them.
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trapper Tracker Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .data-card { box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05); }
        .text-shadow { text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1); }
        .gradient-bg { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .gradient-bg:hover { opacity: 0.9; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen p-4 sm:p-8">
    <div id="app" class="max-w-7xl mx-auto">
        <header class="mb-8 p-4 bg-white rounded-xl data-card">
            <h1 class="text-4xl sm:text-5xl font-extrabold text-gray-900 text-shadow">Trapper Tracker</h1>
            <p class="text-lg text-gray-500 mt-2">Real-time Wildlife Population Dashboard (DB: **${DB_NAME}**)</p>
        </header>

        <div id="loading" class="text-center p-8 bg-white rounded-xl data-card">
            <svg class="animate-spin h-8 w-8 text-green-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-2 text-gray-600">Loading data...</p>
        </div>
        <div id="error-message" class="hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative data-card" role="alert">
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline" id="error-text"></span>
        </div>

        <div id="dashboard-content" class="hidden">
            <div class="bg-white rounded-xl p-6 data-card mb-8">
                <h2 id="form-title" class="text-2xl font-bold mb-4 text-gray-700">Add New Animal</h2>
                <form id="animal-form" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <input type="hidden" id="animal-id">
                    <div>
                        <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" id="name" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border">
                    </div>
                    <div>
                        <label for="habitat" class="block text-sm font-medium text-gray-700">Habitat</label>
                        <input type="text" id="habitat" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border">
                    </div>
                    <div>
                        <label for="population" class="block text-sm font-medium text-gray-700">Population Count</label>
                        <input type="number" id="population" required min="0" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border">
                    </div>
                    <div class="flex justify-end space-x-3 mt-4 md:mt-0">
                        <button type="submit" id="submit-button" class="gradient-bg text-white font-bold py-2 px-4 rounded-lg transition duration-150 w-full md:w-auto">Add Animal</button>
                        <button type="button" id="cancel-button" class="hidden bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-150 w-full md:w-auto">Cancel</button>
                    </div>
                </form>
            </div>

            <div class="bg-white rounded-xl p-6 data-card">
                <h2 class="text-2xl font-bold mb-4 text-gray-700">Tracked Animals</h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Habitat</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Population</th>
                                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="animal-list" class="bg-white divide-y divide-gray-200"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <div id="confirm-modal" class="fixed inset-0 bg-gray-600 bg-opacity-75 hidden flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">Confirm Deletion</h3>
            <p class="text-gray-600 mb-6">Are you sure you want to delete this animal entry?</p>
            <div class="flex justify-end space-x-3">
                <button id="modal-cancel" class="bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg hover:bg-gray-400 transition">Cancel</button>
                <button id="modal-confirm" class="bg-red-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-red-700 transition">Delete</button>
            </div>
        </div>
    </div>

    <script>
        const API_ENDPOINT = '/api/animals';
        let isEditMode = false;
        let currentAnimalId = null;

        const loading = document.getElementById('loading');
        const dashboardContent = document.getElementById('dashboard-content');
        const errorText = document.getElementById('error-text');
        const errorMessage = document.getElementById('error-message');
        const animalList = document.getElementById('animal-list');
        const animalForm = document.getElementById('animal-form');
        const formTitle = document.getElementById('form-title');
        const submitButton = document.getElementById('submit-button');
        const cancelButton = document.getElementById('cancel-button');
        const confirmModal = document.getElementById('confirm-modal');
        const modalConfirm = document.getElementById('modal-confirm');
        const modalCancel = document.getElementById('modal-cancel');

        const showLoading = () => {
            loading.classList.remove('hidden');
            dashboardContent.classList.add('hidden');
            errorMessage.classList.add('hidden');
        };
        const showContent = () => {
            loading.classList.add('hidden');
            dashboardContent.classList.remove('hidden');
            errorMessage.classList.add('hidden');
        };
        const showError = (message) => {
            loading.classList.add('hidden');
            dashboardContent.classList.add('hidden');
            errorMessage.classList.remove('hidden');
            errorText.textContent = message;
        };
        const resetForm = () => {
            animalForm.reset();
            isEditMode = false;
            currentAnimalId = null;
            formTitle.textContent = 'Add New Animal';
            submitButton.textContent = 'Add Animal';
            cancelButton.classList.add('hidden');
            submitButton.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
            submitButton.classList.add('gradient-bg');
        };

        const fetchData = async () => {
            showLoading();
            try {
                const response = await fetch(API_ENDPOINT);
                if (!response.ok) {
                    const errorJson = await response.json().catch(() => ({}));
                    if (errorJson.error && errorJson.error.includes("no such table")) {
                        showError("Database table 'animals' not found. Please run the Initialization SQL in your D1 Console.");
                        return;
                    }
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                const animals = await response.json();
                renderAnimalList(animals);
                showContent();
            } catch (error) {
                console.error("Fetch Error:", error);
                showError(\`Failed to load data: \${error.message}. Please ensure the D1 database is bound and initialized.\`);
            }
        };

        const saveAnimal = async (event) => {
            event.preventDefault();
            const name = document.getElementById('name').value.trim();
            const habitat = document.getElementById('habitat').value.trim();
            const population = parseInt(document.getElementById('population').value);

            if (!name || !habitat || isNaN(population) || population < 0) {
                 showError("Please enter valid data for all fields (Population must be a non-negative number).");
                 return;
            } else {
                errorMessage.classList.add('hidden');
            }

            const method = isEditMode ? 'PUT' : 'POST';
            const url = isEditMode ? \`\${API_ENDPOINT}/\${currentAnimalId}\` : API_ENDPOINT;
            const body = JSON.stringify({ name, habitat, population });

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                });
                if (!response.ok) {
                    const errorJson = await response.json().catch(() => ({ message: 'Unknown error' }));
                    throw new Error(\`Server failed to \${isEditMode ? 'update' : 'add'} animal: \${errorJson.error || response.statusText}\`);
                }
                resetForm();
                await fetchData();
            } catch (error) {
                console.error("Save Error:", error);
                showError(\`Operation Failed: \${error.message}\`);
            }
        };

        const deleteAnimal = async (id) => {
            confirmModal.classList.add('hidden');
            try {
                const response = await fetch(\`\${API_ENDPOINT}/\${id}\`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    const errorJson = await response.json().catch(() => ({ message: 'Unknown error' }));
                    throw new Error(\`Failed to delete animal: \${errorJson.message || response.statusText}\`);
                }
                await fetchData();
            } catch (error) {
                console.error("Delete Error:", error);
                showError(\`Deletion Failed: \${error.message}\`);
            }
        };

        const renderAnimalList = (animals) => {
            animalList.innerHTML = '';
            if (animals.length === 0) {
                animalList.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No animals tracked yet. Add one above!</td></tr>';
                return;
            }
            animals.forEach(animal => {
                const row = animalList.insertRow();
                row.className = 'hover:bg-green-50 transition duration-100';
                
                // Using innerHTML with escaped template literals for row content
                row.innerHTML = \`
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">\${animal.id}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">\${animal.name}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">\${animal.habitat}</td>
                    <td class="px-4 py-3 text-sm text-gray-500 font-semibold">\${animal.population.toLocaleString()}</td>
                    <td class="px-4 py-3 text-right text-sm font-medium space-x-2 whitespace-nowrap">
                        <button class="text-yellow-600 hover:text-yellow-800 transition duration-150 p-1 rounded-md" data-id="\${animal.id}" data-name="\${animal.name}" data-habitat="\${animal.habitat}" data-population="\${animal.population}">Edit</button>
                        <button class="text-red-600 hover:text-red-800 transition duration-150 p-1 rounded-md ml-2" data-id="\${animal.id}">Delete</button>
                    </td>
                \`;
            });
        };

        const startEdit = (btn) => {
            isEditMode = true;
            currentAnimalId = btn.dataset.id;
            document.getElementById('name').value = btn.dataset.name;
            document.getElementById('habitat').value = btn.dataset.habitat;
            document.getElementById('population').value = btn.dataset.population;
            formTitle.textContent = \`Update Animal (ID: \${currentAnimalId})\`;
            submitButton.textContent = 'Save Changes';
            cancelButton.classList.remove('hidden');
            submitButton.classList.remove('gradient-bg');
            submitButton.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
            window.scrollTo({ top: document.getElementById('animal-form').offsetTop - 10, behavior: 'smooth' });
        };

        const showDeleteModal = (id) => {
            currentAnimalId = id;
            confirmModal.classList.remove('hidden');
            modalConfirm.onclick = () => deleteAnimal(currentAnimalId);
        };

        // --- Event Listeners and Init ---
        animalForm.addEventListener('submit', saveAnimal);
        cancelButton.addEventListener('click', resetForm);
        modalCancel.addEventListener('click', () => confirmModal.classList.add('hidden'));
        
        // Event delegation for Edit/Delete buttons
        animalList.addEventListener('click', (e) => {
            if (e.target.textContent === 'Edit') {
                startEdit(e.target);
            } else if (e.target.textContent === 'Delete') {
                showDeleteModal(e.target.dataset.id);
            }
        });

        document.addEventListener('DOMContentLoaded', fetchData);
    </script>
</body>
</html>
`;
    // Set 'Cache-Control' to prevent browser caching of the dashboard page.
    return new Response(htmlContent, {
        headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
        status: 200
    });
};


// --- Main Worker Handler ---
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // 1. Handle CORS preflight requests
        if (method === 'OPTIONS') {
            return handleCORS(request);
        }

        // 2. API routing
        const apiPath = path.startsWith('/api/') ? path : null;
        // Construct the base route key for matching (e.g., "GET /api/animals")
        const routeKey = `${method} ${apiPath ? apiPath.split('/').slice(0, 3).join('/') : ''}`;

        let apiRouteMatch = Object.keys(API_HANDLERS).find(key => {
            // Check for exact path matches (e.g., GET /api/animals)
            if (key === routeKey) return true;

            // Check for dynamic path matches (e.g., DELETE /api/animals/:id)
            if (key.endsWith('/:id') && apiPath) {
                const baseRoute = key.substring(0, key.lastIndexOf('/'));
                const pathSegments = apiPath.split('/');
                // Check if path has 4 segments (e.g., /api/animals/1) and the base matches
                return pathSegments.length === 4 && pathSegments[3] && pathSegments.slice(0, 3).join('/') === baseRoute;
            }
            return false;
        });

        if (apiRouteMatch) {
            const handler = API_HANDLERS[apiRouteMatch];
            // Execute the handler and add CORS headers
            const response = await handler(request, env, path);
            response.headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
            return response;
        }

        // 3. Serve the static HTML file for all non-API paths
        if (path === '/' || path.includes('/html')) {
            return handleHTML(DB_NAME);
        }

        // 4. Default response (Not Found)
        return new Response('Not Found', { status: 404 });
    }
};
