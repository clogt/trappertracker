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

            // Get admin data from response
            const data = await response.json();

            // Update admin username indicator
            const adminUsernameElement = document.getElementById('adminUsername');
            if (adminUsernameElement && data.username) {
                adminUsernameElement.textContent = data.username;
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
                                        <button onclick="updateUserRole('${user.user_id}')" class="text-xs bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 transition-colors font-medium">Update Role</button>
                                        <button onclick="deleteUser('${user.user_id}', '${escapeJs(user.email)}')" class="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors font-medium">Delete</button>
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
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                ${allReports.slice(0, 50).map(report => {
                                    const reportId = report.blip_id || report.pet_id || report.found_pet_id || report.danger_id;
                                    return `
                                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">#${reportId}</td>
                                        <td class="px-4 py-3 text-sm">
                                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                report.type === 'Danger Zone' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                report.type === 'Lost Pet' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                report.type === 'Found Pet' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                            }">
                                                ${report.type}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">${escapeHtml(report.description || report.pet_name || 'N/A')}</td>
                                        <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}</td>
                                        <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${new Date(report.created_at || report.report_timestamp).toLocaleDateString()}</td>
                                        <td class="px-4 py-3 text-sm">
                                            <button
                                                onclick="deleteReport('${escapeJs(report.type)}', '${reportId}')"
                                                class="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${allReports.length > 50 ? `<p class="mt-4 text-sm text-gray-500 dark:text-gray-400">Showing first 50 of ${allReports.length} reports</p>` : ''}
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
            // Clear admin session data
            document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
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

    // Password Change Modal Logic
    const passwordChangeModal = document.getElementById('passwordChangeModal');
    const changePasswordButton = document.getElementById('changePasswordButton');
    const closePasswordModal = document.getElementById('closePasswordModal');
    const cancelPasswordChange = document.getElementById('cancelPasswordChange');
    const passwordChangeForm = document.getElementById('passwordChangeForm');
    const passwordError = document.getElementById('passwordError');
    const passwordSuccess = document.getElementById('passwordSuccess');

    // Open password change modal
    if (changePasswordButton) {
        changePasswordButton.addEventListener('click', () => {
            passwordChangeModal.classList.remove('hidden');
            passwordError.classList.add('hidden');
            passwordSuccess.classList.add('hidden');
            passwordChangeForm.reset();
        });
    }

    // Close modal functions
    const closePasswordModalFunc = () => {
        passwordChangeModal.classList.add('hidden');
        passwordChangeForm.reset();
        passwordError.classList.add('hidden');
        passwordSuccess.classList.add('hidden');
    };

    if (closePasswordModal) {
        closePasswordModal.addEventListener('click', closePasswordModalFunc);
    }

    if (cancelPasswordChange) {
        cancelPasswordChange.addEventListener('click', closePasswordModalFunc);
    }

    // Close modal on outside click
    if (passwordChangeModal) {
        passwordChangeModal.addEventListener('click', (e) => {
            if (e.target === passwordChangeModal) {
                closePasswordModalFunc();
            }
        });
    }

    // Handle password change form submission
    if (passwordChangeForm) {
        passwordChangeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            passwordError.classList.add('hidden');
            passwordSuccess.classList.add('hidden');

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validate passwords match
            if (newPassword !== confirmPassword) {
                passwordError.textContent = 'New passwords do not match!';
                passwordError.classList.remove('hidden');
                return;
            }

            // Validate new password length
            if (newPassword.length < 12) {
                passwordError.textContent = 'New password must be at least 12 characters long.';
                passwordError.classList.remove('hidden');
                return;
            }

            // Disable submit button during request
            const submitButton = document.getElementById('submitPasswordChange');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Changing...';

            try {
                const response = await fetch('/api/admin/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        currentPassword,
                        newPassword
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    passwordSuccess.textContent = `Password changed successfully! New hash: ${data.newPasswordHash}`;
                    passwordSuccess.classList.remove('hidden');
                    passwordChangeForm.reset();

                    // Show detailed instructions
                    displayMessage('Password changed! Check modal for new hash to update ADMIN_PASSWORD_HASH environment variable.', false);

                    // Auto-close modal after 15 seconds
                    setTimeout(() => {
                        closePasswordModalFunc();
                    }, 15000);
                } else {
                    passwordError.textContent = data.error || 'Failed to change password';
                    passwordError.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Password change error:', error);
                passwordError.textContent = 'Network error. Please try again.';
                passwordError.classList.remove('hidden');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    // Delete report function - make it global
    window.deleteReport = async function(reportType, reportId) {
        if (!confirm(`Are you sure you want to delete this ${reportType} report (#${reportId})?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch('/api/admin/delete-report', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reportType, reportId })
            });

            if (response.ok) {
                const data = await response.json();
                displayMessage(`Report deleted successfully: ${reportType} #${reportId}`, false);
                loadAllReports(); // Reload reports list
                loadDashboardStats(); // Update stats
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to delete report.');
            }
        } catch (error) {
            console.error('Delete report error:', error);
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
