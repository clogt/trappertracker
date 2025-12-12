// User Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const dashboardMessage = document.getElementById('dashboard-message');
    const logoutButton = document.getElementById('logoutButton');
    const reportsList = document.getElementById('reportsList');
    const filterTabs = document.querySelectorAll('.report-filter-tab');
    const editReportModal = document.getElementById('editReportModal');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const userEmail = document.getElementById('userEmail');

    let allReports = [];
    let currentFilter = 'all';
    let deleteReportData = null;

    // Check authentication and load data
    checkAuth();

    function displayMessage(message, isError = true) {
        if (dashboardMessage) {
            dashboardMessage.textContent = message;
            dashboardMessage.classList.remove('hidden');
            if (isError) {
                dashboardMessage.classList.remove('text-green-500');
                dashboardMessage.classList.add('text-red-500');
            } else {
                dashboardMessage.classList.remove('text-red-500');
                dashboardMessage.classList.add('text-green-500');
            }
            setTimeout(() => {
                dashboardMessage.classList.add('hidden');
                dashboardMessage.textContent = '';
            }, 5000);
        }
    }

    async function checkAuth() {
        try {
            const profileResponse = await fetch('/api/auth/verify', {
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

            // Load dashboard data
            loadReports();

        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login.html';
        }
    }

    async function loadReports() {
        reportsList.innerHTML = '<p class="text-gray-500">Loading your reports...</p>';

        try {
            const response = await fetch('/api/user/reports', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();

                // Combine all reports with type labels
                allReports = [
                    ...data.dangerZones.map(r => ({ ...r, type: 'dangerZone', typeName: '🚨 Danger Zone' })),
                    ...data.lostPets.map(r => ({ ...r, type: 'lostPet', typeName: '😿 Lost Pet' })),
                    ...data.foundPets.map(r => ({ ...r, type: 'foundPet', typeName: '😺 Found Pet' })),
                    ...data.dangerousAnimals.map(r => ({ ...r, type: 'dangerousAnimal', typeName: '⚠️ Dangerous Animal' }))
                ];

                // Sort by date (newest first)
                allReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                // Update stats
                document.getElementById('totalMyReports').textContent = allReports.length;
                document.getElementById('myDangerZones').textContent = data.dangerZones.length;
                document.getElementById('myLostPets').textContent = data.lostPets.length;
                document.getElementById('myFoundPets').textContent = data.foundPets.length;

                // Display reports
                displayReports(currentFilter);

            } else {
                reportsList.innerHTML = '<p class="text-red-500">Failed to load reports.</p>';
            }
        } catch (error) {
            console.error('Failed to load reports:', error);
            reportsList.innerHTML = '<p class="text-red-500">Error loading reports.</p>';
        }
    }

    function displayReports(filter) {
        let filteredReports = allReports;

        if (filter !== 'all') {
            filteredReports = allReports.filter(r => r.type === filter);
        }

        if (filteredReports.length === 0) {
            reportsList.innerHTML = '<p class="text-gray-500">No reports found.</p>';
            return;
        }

        reportsList.innerHTML = filteredReports.map(report => {
            const shareUrl = `${window.location.origin}/#report-${report.type}-${report.id}`;
            const shareText = getShareText(report);

            return `
                <div class="report-card bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <span class="text-sm font-medium">${report.typeName}</span>
                            <p class="text-xs text-gray-500 dark:text-gray-400">${new Date(report.created_at).toLocaleString()}</p>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="shareReport('${escapeJs(shareUrl)}', '${escapeJs(shareText)}')" class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">Share</button>
                            <button onclick="editReport('${report.type}', ${report.id})" class="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600">Edit</button>
                            <button onclick="showDeleteConfirm('${report.type}', ${report.id})" class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Delete</button>
                        </div>
                    </div>
                    <div class="text-sm text-gray-700 dark:text-gray-300">
                        ${renderReportDetails(report)}
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                        <button onclick="shareToFacebook('${escapeJs(shareUrl)}')" class="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">📘 Facebook</button>
                        <button onclick="shareToTwitter('${escapeJs(shareUrl)}', '${escapeJs(shareText)}')" class="text-xs bg-sky-500 text-white px-3 py-1 rounded hover:bg-sky-600">🐦 Twitter</button>
                        <button onclick="copyShareLink('${escapeJs(shareUrl)}')" class="text-xs bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600">🔗 Copy Link</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getShareText(report) {
        switch (report.type) {
            case 'dangerZone':
                return `⚠️ Danger Zone Alert: ${report.description || 'Trapping activity reported'}`;
            case 'lostPet':
                return `😿 Lost Pet: ${report.pet_name} (${report.species_breed || 'Pet'}) - Please help!`;
            case 'foundPet':
                return `😺 Found Pet: ${report.species_breed || 'Pet'} found - Looking for owner!`;
            case 'dangerousAnimal':
                return `⚠️ Dangerous Animal Alert: ${report.animal_type} - ${report.description || 'Stay safe!'}`;
            default:
                return 'TrapperTracker Report';
        }
    }

    function escapeJs(str) {
        if (!str) return '';
        return str.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
    }

    function renderReportDetails(report) {
        let details = `<p><strong>Location:</strong> ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</p>`;

        if (report.type === 'lostPet') {
            details += `<p><strong>Pet Name:</strong> ${escapeHtml(report.pet_name)}</p>`;
            details += `<p><strong>Breed:</strong> ${escapeHtml(report.species_breed || 'N/A')}</p>`;
            details += `<p><strong>Contact:</strong> ${escapeHtml(report.owner_contact_email)}</p>`;
            if (report.description) details += `<p><strong>Description:</strong> ${escapeHtml(report.description)}</p>`;
            if (report.is_found) details += `<p class="text-green-600 font-medium">✓ Marked as Found</p>`;
        } else if (report.type === 'foundPet') {
            details += `<p><strong>Breed:</strong> ${escapeHtml(report.species_breed || 'N/A')}</p>`;
            details += `<p><strong>Contact:</strong> ${escapeHtml(report.contact_info)}</p>`;
            if (report.description) details += `<p><strong>Description:</strong> ${escapeHtml(report.description)}</p>`;
            if (report.is_reunited) details += `<p class="text-green-600 font-medium">✓ Reunited</p>`;
        } else if (report.type === 'dangerZone') {
            if (report.description) details += `<p><strong>Description:</strong> ${escapeHtml(report.description)}</p>`;
            details += `<p><strong>Status:</strong> ${report.is_active ? 'Active' : 'Inactive'}</p>`;
        } else if (report.type === 'dangerousAnimal') {
            details += `<p><strong>Type:</strong> ${escapeHtml(report.animal_type)}</p>`;
            if (report.description) details += `<p><strong>Description:</strong> ${escapeHtml(report.description)}</p>`;
        }

        return details;
    }

    // Share functions - make them global
    window.shareReport = async function(url, text) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'TrapperTracker Report',
                    text: text,
                    url: url
                });
            } catch (error) {
                console.log('Share cancelled or failed:', error);
            }
        } else {
            copyShareLink(url);
        }
    };

    window.shareToFacebook = function(url) {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    };

    window.shareToTwitter = function(url, text) {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
    };

    window.copyShareLink = function(url) {
        navigator.clipboard.writeText(url).then(() => {
            displayMessage('✓ Link copied to clipboard!', false);
        }).catch(() => {
            displayMessage('Failed to copy link.');
        });
    };

    window.editReport = function(type, id) {
        const report = allReports.find(r => r.type === type && r.id === id);
        if (!report) return;

        document.getElementById('editReportId').value = id;
        document.getElementById('editReportType').value = type;

        const formFields = document.getElementById('editFormFields');

        if (type === 'dangerZone') {
            formFields.innerHTML = `
                <div>
                    <label class="block text-sm font-medium mb-1">Description</label>
                    <textarea id="editDescription" rows="3" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">${escapeHtml(report.description || '')}</textarea>
                </div>
            `;
        } else if (type === 'lostPet') {
            formFields.innerHTML = `
                <div><label class="block text-sm font-medium mb-1">Pet Name</label>
                <input type="text" id="editPetName" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" value="${escapeHtml(report.pet_name)}"></div>
                <div><label class="block text-sm font-medium mb-1">Species/Breed</label>
                <input type="text" id="editSpeciesBreed" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" value="${escapeHtml(report.species_breed || '')}"></div>
                <div><label class="block text-sm font-medium mb-1">Contact Email</label>
                <input type="email" id="editContact" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" value="${escapeHtml(report.owner_contact_email)}"></div>
                <div><label class="block text-sm font-medium mb-1">Description</label>
                <textarea id="editDescription" rows="3" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">${escapeHtml(report.description || '')}</textarea></div>
            `;
        } else if (type === 'foundPet') {
            formFields.innerHTML = `
                <div><label class="block text-sm font-medium mb-1">Species/Breed</label>
                <input type="text" id="editSpeciesBreed" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" value="${escapeHtml(report.species_breed || '')}"></div>
                <div><label class="block text-sm font-medium mb-1">Contact Info</label>
                <input type="text" id="editContact" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" value="${escapeHtml(report.contact_info)}"></div>
                <div><label class="block text-sm font-medium mb-1">Description</label>
                <textarea id="editDescription" rows="3" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">${escapeHtml(report.description || '')}</textarea></div>
            `;
        } else if (type === 'dangerousAnimal') {
            formFields.innerHTML = `
                <div><label class="block text-sm font-medium mb-1">Animal Type</label>
                <select id="editAnimalType" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                    <option value="wild" ${report.animal_type === 'wild' ? 'selected' : ''}>Wild</option>
                    <option value="domestic" ${report.animal_type === 'domestic' ? 'selected' : ''}>Domestic</option>
                </select></div>
                <div><label class="block text-sm font-medium mb-1">Description</label>
                <textarea id="editDescription" rows="3" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">${escapeHtml(report.description || '')}</textarea></div>
            `;
        }

        editReportModal.classList.remove('hidden');
    };

    window.showDeleteConfirm = function(type, id) {
        deleteReportData = { type, id };
        deleteConfirmModal.classList.remove('hidden');
    };

    // Edit form submission
    document.getElementById('editReportForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const reportType = document.getElementById('editReportType').value;
        const reportId = document.getElementById('editReportId').value;

        let data = {};

        if (reportType === 'dangerZone') {
            data.description = document.getElementById('editDescription').value;
        } else if (reportType === 'lostPet') {
            data.pet_name = document.getElementById('editPetName').value;
            data.species_breed = document.getElementById('editSpeciesBreed').value;
            data.owner_contact_email = document.getElementById('editContact').value;
            data.description = document.getElementById('editDescription').value;
        } else if (reportType === 'foundPet') {
            data.species_breed = document.getElementById('editSpeciesBreed').value;
            data.contact_info = document.getElementById('editContact').value;
            data.description = document.getElementById('editDescription').value;
        } else if (reportType === 'dangerousAnimal') {
            data.animal_type = document.getElementById('editAnimalType').value;
            data.description = document.getElementById('editDescription').value;
        }

        try {
            const response = await fetch('/api/user/update-report', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reportType, reportId, data })
            });

            if (response.ok) {
                displayMessage('✓ Report updated successfully!', false);
                editReportModal.classList.add('hidden');
                loadReports();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to update report.');
            }
        } catch (error) {
            console.error('Update error:', error);
            displayMessage('Network error. Please try again.');
        }
    });

    // Delete confirmation
    document.getElementById('confirmDelete').addEventListener('click', async () => {
        if (!deleteReportData) return;

        try {
            const response = await fetch('/api/user/delete-report', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    reportType: deleteReportData.type,
                    reportId: deleteReportData.id
                })
            });

            if (response.ok) {
                displayMessage('✓ Report deleted successfully!', false);
                deleteConfirmModal.classList.add('hidden');
                deleteReportData = null;
                loadReports();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to delete report.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            displayMessage('Network error. Please try again.');
        }
    });

    // Modal close buttons
    document.getElementById('closeEditModal').addEventListener('click', () => {
        editReportModal.classList.add('hidden');
    });
    document.getElementById('cancelEdit').addEventListener('click', () => {
        editReportModal.classList.add('hidden');
    });
    document.getElementById('cancelDelete').addEventListener('click', () => {
        deleteConfirmModal.classList.add('hidden');
        deleteReportData = null;
    });

    // Filter tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            currentFilter = tab.getAttribute('data-type');
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            displayReports(currentFilter);
        });
    });

    // Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // Clear localStorage
            localStorage.removeItem('userRole');
            // Clear cookies
            document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/';
        });
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
});
