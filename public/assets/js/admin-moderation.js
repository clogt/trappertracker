// Admin Moderation Queue JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentPage = 1;
    let currentFilters = {
        status: 'pending',
        source: 'all',
        sort: 'date',
        order: 'desc',
        flagged: 'all',
        search: ''
    };
    let selectedReports = new Set();
    let allReports = [];
    let currentDetailReport = null;
    let csrfToken = '';

    // DOM Elements
    const adminMessage = document.getElementById('admin-message');
    const reportsTableBody = document.getElementById('reportsTableBody');
    const selectAllCheckbox = document.getElementById('selectAll');
    const selectAllHeaderCheckbox = document.getElementById('selectAllHeader');
    const selectedCountSpan = document.getElementById('selectedCount');
    const bulkApproveBtn = document.getElementById('bulkApprove');
    const bulkRejectBtn = document.getElementById('bulkReject');
    const bulkDeleteBtn = document.getElementById('bulkDelete');
    const reportDetailModal = document.getElementById('reportDetailModal');
    const closeDetailModalBtn = document.getElementById('closeDetailModal');

    // Fetch CSRF token
    async function getCsrfToken() {
        try {
            const response = await fetch('/api/admin/csrf-token', {
                method: 'GET',
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                csrfToken = data.token;
            } else {
                console.error('Failed to fetch CSRF token');
            }
        } catch (error) {
            console.error('Error fetching CSRF token:', error);
        }
    }

    // Check authentication
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

            const data = await response.json();
            const adminUsernameElement = document.getElementById('adminUsername');
            if (adminUsernameElement && data.username) {
                adminUsernameElement.textContent = data.username;
            }

            // Load initial data
            await getCsrfToken();
            loadStats();
            loadReports();

        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/admin-login.html';
        }
    }

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

    async function loadStats() {
        try {
            const response = await fetch('/api/admin/moderation-stats', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('statPending').textContent = data.statusStats.pending || 0;
                document.getElementById('statApproved').textContent = data.statusStats.approved || 0;
                document.getElementById('statRejected').textContent = data.statusStats.rejected || 0;
                document.getElementById('statFlagged').textContent = data.statusStats.flagged || 0;
                document.getElementById('statSpam').textContent = data.statusStats.suspected_spam || 0;
                document.getElementById('statTotal').textContent = data.statusStats.total || 0;
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async function loadReports() {
        reportsTableBody.innerHTML = '<tr><td colspan="9" class="px-4 py-8 text-center text-gray-500">Loading reports...</td></tr>';

        try {
            const params = new URLSearchParams({
                ...currentFilters,
                page: currentPage,
                limit: 20
            });

            const response = await fetch(`/api/admin/moderation-queue?${params.toString()}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                allReports = data.reports;
                renderReports(data);
                updatePagination(data.pagination);
            } else {
                reportsTableBody.innerHTML = '<tr><td colspan="9" class="px-4 py-8 text-center text-red-500">Failed to load reports</td></tr>';
            }
        } catch (error) {
            console.error('Failed to load reports:', error);
            reportsTableBody.innerHTML = '<tr><td colspan="9" class="px-4 py-8 text-center text-red-500">Error loading reports</td></tr>';
        }
    }

    function renderReports(data) {
        if (!data.reports || data.reports.length === 0) {
            reportsTableBody.innerHTML = '<tr><td colspan="9" class="px-4 py-8 text-center text-gray-500">No reports found with current filters</td></tr>';
            return;
        }

        reportsTableBody.innerHTML = data.reports.map(report => {
            const isSelected = selectedReports.has(report.blip_id);
            const statusBadge = getStatusBadge(report.approval_status);
            const sourceBadge = getSourceBadge(report.source_type);
            const spamBadge = getSpamBadge(report.spam_score);
            const descriptionPreview = escapeHtml(report.description || 'No description').substring(0, 80) + (report.description?.length > 80 ? '...' : '');

            return `
                <tr class="report-row ${isSelected ? 'selected' : ''}" data-report-id="${report.blip_id}">
                    <td class="px-4 py-3">
                        <input type="checkbox" class="report-checkbox rounded" data-report-id="${report.blip_id}" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        #${report.blip_id}
                        ${report.is_new_user ? '<span class="ml-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1 rounded" title="New user (< 7 days)">NEW</span>' : ''}
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge}">${report.approval_status}</span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div class="max-w-xs">${descriptionPreview}</div>
                        ${report.user_email ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">By: ${escapeHtml(report.user_email)}</div>` : ''}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        ${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}
                        ${report.source_url ? `<br><a href="${escapeHtml(report.source_url)}" target="_blank" class="text-blue-500 hover:underline text-xs">Source</a>` : ''}
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sourceBadge}">${report.source_type || 'manual'}</span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        ${formatDate(report.created_at)}
                        ${report.pending_duration_hours !== null ? `<div class="text-xs text-orange-600 dark:text-orange-400">${report.pending_duration_hours}h pending</div>` : ''}
                    </td>
                    <td class="px-4 py-3 text-sm">
                        ${report.flag_count > 0 ? `<span class="text-red-600 dark:text-red-400 font-semibold">${report.flag_count} flags</span><br>` : ''}
                        ${report.spam_score > 0 ? `<span class="${spamBadge} px-2 py-1 rounded text-xs">${report.spam_score}%</span>` : ''}
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <div class="flex gap-1">
                            <button onclick="viewReportDetail(${report.blip_id})" class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600" title="View Details">
                                View
                            </button>
                            ${report.approval_status === 'pending' ? `
                                <button onclick="quickApprove(${report.blip_id})" class="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600" title="Approve (A)">
                                    Approve
                                </button>
                                <button onclick="quickReject(${report.blip_id})" class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600" title="Reject (R)">
                                    Reject
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach checkbox event listeners
        document.querySelectorAll('.report-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleCheckboxChange);
        });

        // Attach row click event listeners
        document.querySelectorAll('.report-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('button') && !e.target.closest('input[type="checkbox"]') && !e.target.closest('a')) {
                    const reportId = parseInt(row.dataset.reportId);
                    viewReportDetail(reportId);
                }
            });
        });
    }

    function getStatusBadge(status) {
        switch (status) {
            case 'pending': return 'status-badge-pending';
            case 'approved': return 'status-badge-approved';
            case 'rejected': return 'status-badge-rejected';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    }

    function getSourceBadge(source) {
        switch (source) {
            case 'extension': return 'source-badge-extension';
            case 'manual': return 'source-badge-manual';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    }

    function getSpamBadge(score) {
        if (score >= 75) return 'spam-score-high';
        if (score >= 50) return 'spam-score-medium';
        if (score >= 25) return 'spam-score-low';
        return 'bg-gray-100 text-gray-800';
    }

    function handleCheckboxChange(e) {
        const reportId = parseInt(e.target.dataset.reportId);
        if (e.target.checked) {
            selectedReports.add(reportId);
        } else {
            selectedReports.delete(reportId);
        }
        updateSelectionUI();
    }

    function updateSelectionUI() {
        selectedCountSpan.textContent = `${selectedReports.size} selected`;
        const hasSelection = selectedReports.size > 0;
        bulkApproveBtn.disabled = !hasSelection;
        bulkRejectBtn.disabled = !hasSelection;
        bulkDeleteBtn.disabled = !hasSelection;

        // Update select all checkbox state
        const allCurrentReportIds = allReports.map(r => r.blip_id);
        const allSelected = allCurrentReportIds.length > 0 && allCurrentReportIds.every(id => selectedReports.has(id));
        selectAllCheckbox.checked = allSelected;
        selectAllHeaderCheckbox.checked = allSelected;

        // Update row selection styling
        document.querySelectorAll('.report-row').forEach(row => {
            const reportId = parseInt(row.dataset.reportId);
            if (selectedReports.has(reportId)) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }

    // Select All functionality
    selectAllCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            allReports.forEach(report => selectedReports.add(report.blip_id));
        } else {
            allReports.forEach(report => selectedReports.delete(report.blip_id));
        }
        updateSelectionUI();
        document.querySelectorAll('.report-checkbox').forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
    });

    selectAllHeaderCheckbox.addEventListener('change', (e) => {
        selectAllCheckbox.checked = e.target.checked;
        selectAllCheckbox.dispatchEvent(new Event('change'));
    });

    // Filter change handlers
    document.getElementById('filterStatus').addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        currentPage = 1;
        selectedReports.clear();
        loadReports();
    });

    document.getElementById('filterSource').addEventListener('change', (e) => {
        currentFilters.source = e.target.value;
        currentPage = 1;
        selectedReports.clear();
        loadReports();
    });

    document.getElementById('filterSort').addEventListener('change', (e) => {
        currentFilters.sort = e.target.value;
        currentPage = 1;
        loadReports();
    });

    document.getElementById('filterFlagged').addEventListener('change', (e) => {
        currentFilters.flagged = e.target.value;
        currentPage = 1;
        selectedReports.clear();
        loadReports();
    });

    // Search with debounce
    let searchTimeout;
    document.getElementById('filterSearch').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = e.target.value;
            currentPage = 1;
            selectedReports.clear();
            loadReports();
        }, 500);
    });

    // Bulk Actions
    bulkApproveBtn.addEventListener('click', async () => {
        if (selectedReports.size === 0) return;

        if (!confirm(`Approve ${selectedReports.size} selected report(s)?`)) return;

        const notes = prompt('Add approval notes (optional):') || 'Bulk approved';

        try {
            const response = await fetch('/api/admin/reports/bulk-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'approve',
                    reportIds: Array.from(selectedReports),
                    notes
                })
            });

            if (response.ok) {
                const data = await response.json();
                displayMessage(`Successfully approved ${data.results.success.length} report(s)`, false);
                selectedReports.clear();
                loadReports();
                loadStats();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to approve reports');
            }
        } catch (error) {
            console.error('Bulk approve error:', error);
            displayMessage('Network error. Please try again.');
        }
    });

    bulkRejectBtn.addEventListener('click', async () => {
        if (selectedReports.size === 0) return;

        const reason = prompt(`Reject ${selectedReports.size} selected report(s)?\n\nRejection reason (required):`);
        if (!reason) return;

        try {
            const response = await fetch('/api/admin/reports/bulk-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'reject',
                    reportIds: Array.from(selectedReports),
                    reason
                })
            });

            if (response.ok) {
                const data = await response.json();
                displayMessage(`Successfully rejected ${data.results.success.length} report(s)`, false);
                selectedReports.clear();
                loadReports();
                loadStats();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to reject reports');
            }
        } catch (error) {
            console.error('Bulk reject error:', error);
            displayMessage('Network error. Please try again.');
        }
    });

    bulkDeleteBtn.addEventListener('click', async () => {
        if (selectedReports.size === 0) return;

        if (!confirm(`PERMANENTLY DELETE ${selectedReports.size} selected report(s)?\n\nThis action cannot be undone!`)) return;

        const reason = prompt('Deletion reason (optional):') || 'Bulk deletion';

        try {
            const response = await fetch('/api/admin/reports/bulk-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'delete',
                    reportIds: Array.from(selectedReports),
                    reason
                })
            });

            if (response.ok) {
                const data = await response.json();
                displayMessage(`Successfully deleted ${data.results.success.length} report(s)`, false);
                selectedReports.clear();
                loadReports();
                loadStats();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to delete reports');
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
            displayMessage('Network error. Please try again.');
        }
    });

    // Quick Actions (global functions for inline buttons)
    window.quickApprove = async function(reportId) {
        if (!confirm(`Approve report #${reportId}?`)) return;

        const notes = prompt('Add approval notes (optional):') || 'Quick approved';

        try {
            const response = await fetch(`/api/admin/reports/${reportId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({ notes })
            });

            if (response.ok) {
                displayMessage(`Report #${reportId} approved successfully`, false);
                loadReports();
                loadStats();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to approve report');
            }
        } catch (error) {
            console.error('Quick approve error:', error);
            displayMessage('Network error. Please try again.');
        }
    };

    window.quickReject = async function(reportId) {
        const reason = prompt(`Reject report #${reportId}?\n\nRejection reason (required):`);
        if (!reason) return;

        try {
            const response = await fetch(`/api/admin/reports/${reportId}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                displayMessage(`Report #${reportId} rejected successfully`, false);
                loadReports();
                loadStats();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to reject report');
            }
        } catch (error) {
            console.error('Quick reject error:', error);
            displayMessage('Network error. Please try again.');
        }
    };

    // View Report Detail (will implement next)
    window.viewReportDetail = async function(reportId) {
        try {
            const response = await fetch(`/api/admin/reports/${reportId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                showReportDetailModal(data);
            } else {
                displayMessage('Failed to load report details');
            }
        } catch (error) {
            console.error('Failed to load report details:', error);
            displayMessage('Error loading report details');
        }
    };

    function showReportDetailModal(data) {
        currentDetailReport = data.report;
        const content = document.getElementById('reportDetailContent');

        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 class="text-lg font-semibold mb-4">Report Information</h3>
                    <dl class="space-y-2 text-sm">
                        <div><dt class="font-medium text-gray-600 dark:text-gray-400">Report ID:</dt><dd class="text-gray-900 dark:text-gray-100">#${data.report.blip_id}</dd></div>
                        <div><dt class="font-medium text-gray-600 dark:text-gray-400">Status:</dt><dd><span class="px-2 py-1 rounded text-xs ${getStatusBadge(data.report.approval_status)}">${data.report.approval_status}</span></dd></div>
                        <div><dt class="font-medium text-gray-600 dark:text-gray-400">Description:</dt><dd class="text-gray-900 dark:text-gray-100">${escapeHtml(data.report.description || 'N/A')}</dd></div>
                        <div><dt class="font-medium text-gray-600 dark:text-gray-400">Location:</dt><dd class="text-gray-900 dark:text-gray-100">${data.report.latitude}, ${data.report.longitude}</dd></div>
                        <div><dt class="font-medium text-gray-600 dark:text-gray-400">Submitted:</dt><dd class="text-gray-900 dark:text-gray-100">${formatDate(data.report.created_at)}</dd></div>
                        <div><dt class="font-medium text-gray-600 dark:text-gray-400">Source:</dt><dd><span class="px-2 py-1 rounded text-xs ${getSourceBadge(data.report.source_type)}">${data.report.source_type || 'manual'}</span></dd></div>
                        ${data.report.source_url ? `<div><dt class="font-medium text-gray-600 dark:text-gray-400">Source URL:</dt><dd><a href="${escapeHtml(data.report.source_url)}" target="_blank" class="text-blue-500 hover:underline break-all">${escapeHtml(data.report.source_url)}</a></dd></div>` : ''}
                        <div><dt class="font-medium text-gray-600 dark:text-gray-400">Spam Score:</dt><dd><span class="${getSpamBadge(data.report.spam_score)} px-2 py-1 rounded text-xs">${data.report.spam_score}%</span></dd></div>
                        ${data.report.flag_count > 0 ? `<div><dt class="font-medium text-gray-600 dark:text-gray-400">Flags:</dt><dd class="text-red-600 dark:text-red-400 font-semibold">${data.report.flag_count} flags</dd></div>` : ''}
                    </dl>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-4">Location Preview</h3>
                    <div id="miniMap" class="rounded border border-gray-300 dark:border-gray-600"></div>
                </div>
            </div>

            ${data.report.user_email ? `
            <div class="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                <h3 class="text-lg font-semibold mb-2">Submitter Information</h3>
                <p class="text-sm"><strong>Email:</strong> ${escapeHtml(data.report.user_email)}</p>
                <p class="text-sm"><strong>Account Status:</strong> ${data.report.user_status || 'active'}</p>
                <p class="text-sm"><strong>User Age:</strong> ${data.report.user_age_days} days ${data.report.is_new_user ? '(NEW USER)' : ''}</p>
            </div>
            ` : ''}

            ${data.report.admin_notes ? `
            <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded">
                <h3 class="text-lg font-semibold mb-2">Admin Notes</h3>
                <p class="text-sm">${escapeHtml(data.report.admin_notes)}</p>
            </div>
            ` : ''}

            ${data.similarReports && data.similarReports.length > 0 ? `
            <div class="mt-6">
                <h3 class="text-lg font-semibold mb-2">Similar Reports Nearby</h3>
                <div class="space-y-2">
                    ${data.similarReports.map(sr => `
                        <div class="p-2 bg-yellow-50 dark:bg-yellow-900 rounded text-sm">
                            <strong>#${sr.blip_id}</strong> - ${escapeHtml(sr.description || 'No description')}
                            (${sr.latitude.toFixed(4)}, ${sr.longitude.toFixed(4)}) - ${sr.approval_status}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="mt-6 flex gap-3">
                ${data.report.approval_status === 'pending' ? `
                    <button onclick="approveFromDetail(${data.report.blip_id})" class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                        Approve Report
                    </button>
                    <button onclick="rejectFromDetail(${data.report.blip_id})" class="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                        Reject Report
                    </button>
                ` : ''}
                <button onclick="deleteFromDetail(${data.report.blip_id})" class="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                    Delete Report
                </button>
            </div>
        `;

        reportDetailModal.classList.remove('hidden');

        // Initialize map
        setTimeout(() => {
            const map = L.map('miniMap').setView([data.report.latitude, data.report.longitude], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
            L.marker([data.report.latitude, data.report.longitude]).addTo(map);
        }, 100);
    }

    closeDetailModalBtn.addEventListener('click', () => {
        reportDetailModal.classList.add('hidden');
    });

    window.approveFromDetail = async function(reportId) {
        if (!confirm(`Approve report #${reportId}?`)) return;
        const notes = prompt('Add approval notes (optional):') || 'Approved from detail view';

        try {
            const response = await fetch(`/api/admin/reports/${reportId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({ notes })
            });

            if (response.ok) {
                displayMessage(`Report #${reportId} approved successfully`, false);
                reportDetailModal.classList.add('hidden');
                loadReports();
                loadStats();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to approve report');
            }
        } catch (error) {
            console.error('Approve error:', error);
            displayMessage('Network error. Please try again.');
        }
    };

    window.rejectFromDetail = async function(reportId) {
        const reason = prompt(`Reject report #${reportId}?\n\nRejection reason (required):`);
        if (!reason) return;

        try {
            const response = await fetch(`/api/admin/reports/${reportId}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                displayMessage(`Report #${reportId} rejected successfully`, false);
                reportDetailModal.classList.add('hidden');
                loadReports();
                loadStats();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to reject report');
            }
        } catch (error) {
            console.error('Reject error:', error);
            displayMessage('Network error. Please try again.');
        }
    };

    window.deleteFromDetail = async function(reportId) {
        if (!confirm(`PERMANENTLY DELETE report #${reportId}?\n\nThis action cannot be undone!`)) return;
        const reason = prompt('Deletion reason (optional):') || 'Deleted from detail view';

        try {
            const response = await fetch(`/api/admin/reports/${reportId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                displayMessage(`Report #${reportId} deleted successfully`, false);
                reportDetailModal.classList.add('hidden');
                loadReports();
                loadStats();
            } else {
                const error = await response.json();
                displayMessage(error.error || 'Failed to delete report');
            }
        } catch (error) {
            console.error('Delete error:', error);
            displayMessage('Network error. Please try again.');
        }
    };

    function updatePagination(pagination) {
        document.getElementById('pageStart').textContent = ((pagination.page - 1) * pagination.limit) + 1;
        document.getElementById('pageEnd').textContent = Math.min(pagination.page * pagination.limit, pagination.total);
        document.getElementById('pageTotal').textContent = pagination.total;

        const paginationButtons = document.getElementById('paginationButtons');
        paginationButtons.innerHTML = '';

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.className = 'relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-l-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700';
        prevBtn.disabled = pagination.page === 1;
        if (prevBtn.disabled) prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
        prevBtn.addEventListener('click', () => {
            if (pagination.page > 1) {
                currentPage = pagination.page - 1;
                loadReports();
            }
        });
        paginationButtons.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= Math.min(pagination.pages, 10); i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = `relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 ${i === pagination.page ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200' : ''}`;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                loadReports();
            });
            paginationButtons.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.className = 'relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-r-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700';
        nextBtn.disabled = pagination.page === pagination.pages;
        if (nextBtn.disabled) nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
        nextBtn.addEventListener('click', () => {
            if (pagination.page < pagination.pages) {
                currentPage = pagination.page + 1;
                loadReports();
            }
        });
        paginationButtons.appendChild(nextBtn);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+A: Approve selected
        if (e.ctrlKey && e.key === 'a' && selectedReports.size > 0) {
            e.preventDefault();
            bulkApproveBtn.click();
        }
        // Ctrl+R: Reject selected
        if (e.ctrlKey && e.key === 'r' && selectedReports.size > 0) {
            e.preventDefault();
            bulkRejectBtn.click();
        }
    });

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Make filterByStatus globally accessible for onclick handlers on stat cards
    window.filterByStatus = function(status) {
        // Map special filter types to actual status values and filters
        if (status === 'spam') {
            // Show pending reports (spam would be pending with high spam_score)
            currentFilters.status = 'pending';
            currentFilters.sort = 'spam_score';
            currentFilters.flagged = 'all';
        } else if (status === 'flagged') {
            // Show all reports that have been flagged
            currentFilters.status = 'all';
            currentFilters.flagged = 'true';
            currentFilters.sort = 'flags';
        } else {
            // Standard status filter (pending, approved, rejected)
            currentFilters.status = status;
            currentFilters.flagged = 'all';
            currentFilters.sort = 'date';
        }

        currentPage = 1;
        selectedReports.clear();
        loadReports();

        // Update the filter dropdowns to match
        document.getElementById('filterStatus').value = currentFilters.status;
        document.getElementById('filterFlagged').value = currentFilters.flagged;
        document.getElementById('filterSort').value = currentFilters.sort;
    };
});
