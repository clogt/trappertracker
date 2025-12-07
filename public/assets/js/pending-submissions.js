// Pending Submissions Management JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const pageMessage = document.getElementById('page-message');
    const logoutButton = document.getElementById('logoutButton');
    const submissionsList = document.getElementById('submissionsList');
    const userEmail = document.getElementById('userEmail');
    const addLocationModal = document.getElementById('addLocationModal');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');

    let allSubmissions = [];
    let deleteSubmissionId = null;
    let map = null;
    let selectedMarker = null;
    let selectedLat = null;
    let selectedLng = null;

    // Check authentication and load data
    checkAuth();

    function displayMessage(message, isError = true) {
        if (pageMessage) {
            pageMessage.textContent = message;
            pageMessage.classList.remove('hidden');
            if (isError) {
                pageMessage.classList.remove('text-green-500');
                pageMessage.classList.add('text-red-500');
            } else {
                pageMessage.classList.remove('text-red-500');
                pageMessage.classList.add('text-green-500');
            }
            setTimeout(() => {
                pageMessage.classList.add('hidden');
                pageMessage.textContent = '';
            }, 5000);
        }
    }

    async function checkAuth() {
        try {
            const profileResponse = await fetch('/api/user/profile', {
                credentials: 'include'
            });

            if (!profileResponse.ok) {
                window.location.href = '/login.html';
                return;
            }

            const profile = await profileResponse.json();
            if (userEmail) {
                userEmail.textContent = profile.email;
            }

            // Load pending submissions
            loadPendingSubmissions();

        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login.html';
        }
    }

    async function loadPendingSubmissions() {
        submissionsList.innerHTML = '<p class="text-gray-500">Loading pending submissions...</p>';

        try {
            const response = await fetch('/api/pending-submissions', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                allSubmissions = data.submissions || [];

                if (allSubmissions.length === 0) {
                    submissionsList.innerHTML = `
                        <div class="text-center py-12">
                            <p class="text-gray-500 text-lg mb-2">No pending submissions</p>
                            <p class="text-sm text-gray-400">All your extension submissions have been completed!</p>
                        </div>
                    `;
                } else {
                    displaySubmissions();
                }

            } else {
                submissionsList.innerHTML = '<p class="text-red-500">Failed to load pending submissions.</p>';
            }
        } catch (error) {
            console.error('Failed to load submissions:', error);
            submissionsList.innerHTML = '<p class="text-red-500">Error loading pending submissions.</p>';
        }
    }

    function displaySubmissions() {
        submissionsList.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date Reported</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Source URL</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        ${allSubmissions.map(submission => `
                            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                    ${new Date(submission.date_reported).toLocaleDateString()}
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                                    ${escapeHtml(truncate(submission.description, 100))}
                                </td>
                                <td class="px-6 py-4 text-sm">
                                    <a href="${escapeHtml(submission.source_url)}" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline" title="${escapeHtml(submission.source_url)}">
                                        ${truncate(submission.source_url, 40)}
                                    </a>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                    <button onclick="openAddLocationModal(${submission.submission_id})" class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Add Location</button>
                                    <button onclick="showDeleteConfirm(${submission.submission_id})" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function truncate(str, maxLength) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    // Initialize map in modal
    function initLocationMap() {
        if (!map) {
            map = L.map('locationMap').setView([39.8283, -98.5795], 4);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Handle map clicks
            map.on('click', function(e) {
                selectedLat = e.latlng.lat;
                selectedLng = e.latlng.lng;

                // Update input fields
                document.getElementById('selectedLat').value = selectedLat.toFixed(6);
                document.getElementById('selectedLng').value = selectedLng.toFixed(6);

                // Remove existing marker if any
                if (selectedMarker) {
                    map.removeLayer(selectedMarker);
                }

                // Add new marker
                selectedMarker = L.marker([selectedLat, selectedLng], {
                    icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                }).addTo(map);

                selectedMarker.bindPopup('Selected Location').openPopup();

                // Enable complete button
                document.getElementById('completeSubmissionBtn').disabled = false;
            });
        }
    }

    // Open add location modal
    window.openAddLocationModal = function(submissionId) {
        const submission = allSubmissions.find(s => s.submission_id === submissionId);
        if (!submission) return;

        // Set submission ID
        document.getElementById('selectedSubmissionId').value = submissionId;

        // Populate details
        document.getElementById('detailDescription').textContent = submission.description;
        document.getElementById('detailSourceURL').textContent = truncate(submission.source_url, 60);
        document.getElementById('detailSourceURL').href = submission.source_url;
        document.getElementById('detailDateReported').textContent = new Date(submission.date_reported).toLocaleString();

        // Clear previous selection
        selectedLat = null;
        selectedLng = null;
        document.getElementById('selectedLat').value = '';
        document.getElementById('selectedLng').value = '';
        document.getElementById('addressSearch').value = '';
        document.getElementById('completeSubmissionBtn').disabled = true;

        if (selectedMarker && map) {
            map.removeLayer(selectedMarker);
            selectedMarker = null;
        }

        // Show modal
        addLocationModal.classList.remove('hidden');

        // Initialize map (delay to ensure modal is visible)
        setTimeout(() => {
            initLocationMap();
            map.invalidateSize();
        }, 100);
    };

    // Address search functionality
    document.getElementById('searchAddressBtn').addEventListener('click', async () => {
        const query = document.getElementById('addressSearch').value.trim();
        if (!query) {
            displayMessage('Please enter an address or location to search.');
            return;
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`,
                {
                    headers: {
                        'User-Agent': 'TrapperTracker/1.0'
                    }
                }
            );

            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);

                // Update map view
                map.setView([lat, lng], 15);

                // Trigger click event to place marker
                selectedLat = lat;
                selectedLng = lng;

                document.getElementById('selectedLat').value = lat.toFixed(6);
                document.getElementById('selectedLng').value = lng.toFixed(6);

                // Remove existing marker
                if (selectedMarker) {
                    map.removeLayer(selectedMarker);
                }

                // Add marker
                selectedMarker = L.marker([lat, lng], {
                    icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                }).addTo(map);

                selectedMarker.bindPopup('Selected Location').openPopup();

                // Enable complete button
                document.getElementById('completeSubmissionBtn').disabled = false;
            } else {
                displayMessage('Location not found. Try a different search term.');
            }
        } catch (error) {
            console.error('Search error:', error);
            displayMessage('Search failed. Please try again.');
        }
    });

    // Allow Enter key to trigger search
    document.getElementById('addressSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('searchAddressBtn').click();
        }
    });

    // Complete submission
    document.getElementById('completeSubmissionBtn').addEventListener('click', async () => {
        const submissionId = document.getElementById('selectedSubmissionId').value;

        if (!selectedLat || !selectedLng) {
            displayMessage('Please select a location on the map first.');
            return;
        }

        const completeBtn = document.getElementById('completeSubmissionBtn');
        completeBtn.disabled = true;
        completeBtn.textContent = 'Completing...';

        try {
            const response = await fetch(`/api/pending-submissions/${submissionId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    latitude: selectedLat,
                    longitude: selectedLng
                })
            });

            if (response.ok) {
                displayMessage('Submission completed successfully!', false);
                closeLocationModal();
                loadPendingSubmissions();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to complete submission.');
                completeBtn.disabled = false;
                completeBtn.textContent = 'Complete Submission';
            }
        } catch (error) {
            console.error('Complete submission error:', error);
            displayMessage('Network error. Please try again.');
            completeBtn.disabled = false;
            completeBtn.textContent = 'Complete Submission';
        }
    });

    // Close location modal
    function closeLocationModal() {
        addLocationModal.classList.add('hidden');
        if (selectedMarker && map) {
            map.removeLayer(selectedMarker);
            selectedMarker = null;
        }
        selectedLat = null;
        selectedLng = null;
    }

    document.getElementById('closeLocationModal').addEventListener('click', closeLocationModal);
    document.getElementById('cancelLocationBtn').addEventListener('click', closeLocationModal);

    // Delete confirmation
    window.showDeleteConfirm = function(submissionId) {
        deleteSubmissionId = submissionId;
        deleteConfirmModal.classList.remove('hidden');
    };

    document.getElementById('confirmDelete').addEventListener('click', async () => {
        if (!deleteSubmissionId) return;

        try {
            const response = await fetch(`/api/pending-submissions/${deleteSubmissionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                displayMessage('Pending submission deleted successfully!', false);
                deleteConfirmModal.classList.add('hidden');
                deleteSubmissionId = null;
                loadPendingSubmissions();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to delete submission.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            displayMessage('Network error. Please try again.');
        }
    });

    document.getElementById('cancelDelete').addEventListener('click', () => {
        deleteConfirmModal.classList.add('hidden');
        deleteSubmissionId = null;
    });

    // Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('userRole');
            document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/';
        });
    }
});
