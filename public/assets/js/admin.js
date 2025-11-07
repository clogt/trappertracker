// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const adminMessage = document.getElementById('admin-message');
    const logoutButton = document.getElementById('logoutButton');
    const adminTabs = document.querySelectorAll('.admin-tab');

    // Check authentication
    checkAuth();

    function displayMessage(message, isError = true) {
        if (adminMessage) {
            adminMessage.textContent = message;
            adminMessage.classList.remove('hidden');
            if (isError) {
                adminMessage.classList.remove('text-green-500');
                adminMessage.classList.add('text-red-500');
            } else {
                adminMessage.classList.remove('text-red-500');
                adminMessage.classList.add('text-green-500');
            }
            setTimeout(() => {
                adminMessage.classList.add('hidden');
                adminMessage.textContent = '';
            }, 5000);
        }
    }

    async function checkAuth() {
        try {
            const response = await fetch('/api/admin/verify', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                window.location.href = '/admin-login.html';
                return;
            }

            // User is authenticated as admin, load dashboard data
            loadDashboardStats();
            loadErrorReports();

        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/admin-login.html';
        }
    }

    async function loadDashboardStats() {
        try {
            const response = await fetch('/api/admin/stats', {
                credentials: 'include'
            });

            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
                document.getElementById('totalReports').textContent = stats.totalReports || 0;
                document.getElementById('totalErrors').textContent = stats.totalErrors || 0;
                document.getElementById('activeBlips').textContent = stats.activeBlips || 0;
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async function loadErrorReports() {
        const errorReportsList = document.getElementById('errorReportsList');
        errorReportsList.innerHTML = '<p class="text-gray-500">Loading...</p>';

        try {
            const response = await fetch('/api/admin/error-reports', {
                credentials: 'include'
            });

            if (response.ok) {
                const reports = await response.json();

                if (reports.length === 0) {
                    errorReportsList.innerHTML = '<p class="text-gray-500">No error reports yet.</p>';
                    return;
                }

                errorReportsList.innerHTML = reports.map(report => `
                    <div class="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-xs text-gray-500">#${report.report_id}</span>
                            <span class="text-xs text-gray-500">${new Date(report.created_at).toLocaleString()}</span>
                        </div>
                        <p class="text-gray-800 dark:text-gray-200 mb-2">${escapeHtml(report.description)}</p>
                        <div class="text-xs text-gray-500 space-y-1">
                            ${report.page_url ? `<p><strong>Page:</strong> ${escapeHtml(report.page_url)}</p>` : ''}
                            ${report.user_agent ? `<p><strong>Browser:</strong> ${escapeHtml(report.user_agent)}</p>` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                errorReportsList.innerHTML = '<p class="text-red-500">Failed to load error reports.</p>';
            }
        } catch (error) {
            console.error('Failed to load error reports:', error);
            errorReportsList.innerHTML = '<p class="text-red-500">Error loading reports.</p>';
        }
    }

    let allUsers = [];
    let filteredUsers = [];

    async function loadUsers() {
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '<p class="text-gray-500">Loading...</p>';

        try {
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });

            if (response.ok) {
                allUsers = await response.json();
                filteredUsers = [...allUsers];

                if (allUsers.length === 0) {
                    usersList.innerHTML = '<p class="text-gray-500">No users yet.</p>';
                    return;
                }

                renderUsers();
            } else {
                usersList.innerHTML = '<p class="text-red-500">Failed to load users.</p>';
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            usersList.innerHTML = '<p class="text-red-500">Error loading users.</p>';
        }
    }

    function renderUsers() {
        const usersList = document.getElementById('usersList');

        usersList.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        ${filteredUsers.map(user => `
                            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">${escapeHtml(user.email)}</td>
                                <td class="px-4 py-3 text-sm">
                                    <select id="role-${user.user_id}" class="px-2 py-1 rounded text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                        <option value="enforcement" ${user.role === 'enforcement' ? 'selected' : ''}>Enforcement</option>
                                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    </select>
                                </td>
                                <td class="px-4 py-3 text-sm">
                                    <span class="${user.is_verified ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}">
                                        ${user.is_verified ? '✓ Verified' : '✗ Unverified'}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${new Date(user.created_at).toLocaleDateString()}</td>
                                <td class="px-4 py-3 text-sm">
                                    <div class="flex gap-2">
                                        <button onclick="updateUserRole('${user.user_id}')" class="text-xs bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600">Update Role</button>
                                        <button onclick="deleteUser('${user.user_id}', '${escapeJs(user.email)}')" class="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Showing ${filteredUsers.length} of ${allUsers.length} users
            </div>
        `;
    }

    // User search
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const roleFilter = document.getElementById('userRoleFilter').value;

            filteredUsers = allUsers.filter(user => {
                const matchesSearch = user.email.toLowerCase().includes(query);
                const matchesRole = roleFilter === 'all' || user.role === roleFilter;
                return matchesSearch && matchesRole;
            });

            renderUsers();
        });
    }

    // User role filter
    const userRoleFilter = document.getElementById('userRoleFilter');
    if (userRoleFilter) {
        userRoleFilter.addEventListener('change', (e) => {
            const query = document.getElementById('userSearch').value.toLowerCase();
            const roleFilter = e.target.value;

            filteredUsers = allUsers.filter(user => {
                const matchesSearch = user.email.toLowerCase().includes(query);
                const matchesRole = roleFilter === 'all' || user.role === roleFilter;
                return matchesSearch && matchesRole;
            });

            renderUsers();
        });
    }

    async function loadAllReports() {
        const reportsList = document.getElementById('reportsList');
        reportsList.innerHTML = '<p class="text-gray-500">Loading...</p>';

        try {
            const response = await fetch('/api/admin/all-reports', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const allReports = [
                    ...data.trappers.map(r => ({ ...r, type: 'Danger Zone' })),
                    ...data.lost_pets.map(r => ({ ...r, type: 'Lost Pet' })),
                    ...data.found_pets.map(r => ({ ...r, type: 'Found Pet' })),
                    ...data.dangerous_animals.map(r => ({ ...r, type: 'Dangerous Animal' }))
                ];

                if (allReports.length === 0) {
                    reportsList.innerHTML = '<p class="text-gray-500">No reports yet.</p>';
                    return;
                }

                reportsList.innerHTML = `
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead>
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                            ${allReports.slice(0, 50).map(report => `
                                <tr>
                                    <td class="px-4 py-2 text-sm">${report.type}</td>
                                    <td class="px-4 py-2 text-sm">${escapeHtml(report.description || report.pet_name || 'N/A')}</td>
                                    <td class="px-4 py-2 text-sm text-gray-500">${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}</td>
                                    <td class="px-4 py-2 text-sm text-gray-500">${new Date(report.created_at || report.report_timestamp).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${allReports.length > 50 ? `<p class="mt-4 text-sm text-gray-500">Showing first 50 of ${allReports.length} reports</p>` : ''}
                `;
            } else {
                reportsList.innerHTML = '<p class="text-red-500">Failed to load reports.</p>';
            }
        } catch (error) {
            console.error('Failed to load reports:', error);
            reportsList.innerHTML = '<p class="text-red-500">Error loading reports.</p>';
        }
    }

    // Tab switching
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');

            // Update active tab
            adminTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`${tabName}-content`).classList.remove('hidden');

            // Load data for tab
            if (tabName === 'error-reports') {
                loadErrorReports();
            } else if (tabName === 'users') {
                loadUsers();
            } else if (tabName === 'reports') {
                loadAllReports();
            }
        });
    });

    // Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // Clear any session data
            document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/admin-login.html';
        });
    }

    // Update user role function - make it global
    window.updateUserRole = async function(userId) {
        const roleSelect = document.getElementById(`role-${userId}`);
        if (!roleSelect) return;

        const newRole = roleSelect.value;

        try {
            const response = await fetch('/api/admin/update-user-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId, role: newRole })
            });

            if (response.ok) {
                displayMessage('✓ User role updated successfully!', false);
                loadUsers(); // Reload users list
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to update role.');
            }
        } catch (error) {
            console.error('Update role error:', error);
            displayMessage('Network error. Please try again.');
        }
    };

    // Delete user function - make it global
    window.deleteUser = async function(userId, email) {
        if (!confirm(`Are you sure you want to delete user: ${email}?\n\nThis will permanently delete the user and all their reports.`)) {
            return;
        }

        try {
            const response = await fetch('/api/admin/delete-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId })
            });

            if (response.ok) {
                displayMessage('✓ User deleted successfully!', false);
                loadUsers(); // Reload users list
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to delete user.');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            displayMessage('Network error. Please try again.');
        }
    };

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function escapeJs(str) {
        if (!str) return '';
        return str.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
    }
});
