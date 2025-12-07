// TrapperTracker Extension Popup Script

// Update stats on popup open
chrome.runtime.sendMessage({ action: 'getStats' }, (stats) => {
    if (stats) {
        document.getElementById('totalSubmissions').textContent = stats.totalSubmissions || 0;
        document.getElementById('successfulSubmissions').textContent = stats.successfulSubmissions || 0;
        document.getElementById('pendingSubmissions').textContent = stats.pendingSubmissions || 0;
        document.getElementById('failedSubmissions').textContent = stats.failedSubmissions || 0;

        // Show auth warning if there are auth_required submissions
        chrome.storage.local.get(['submissionQueue'], (result) => {
            const queue = result.submissionQueue || [];
            const needsAuth = queue.some(s => s.status === 'auth_required');

            if (needsAuth) {
                document.getElementById('authWarning').style.display = 'block';
            }
        });
    }
});

// Retry button
document.getElementById('retryBtn').addEventListener('click', () => {
    const btn = document.getElementById('retryBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Retrying...';

    chrome.runtime.sendMessage({ action: 'retryFailed' }, (response) => {
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '🔄 Retry Failed Submissions';

            // Refresh stats
            location.reload();
        }, 2000);
    });
});

// Open TrapperTracker button
document.getElementById('openTrackerBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://trappertracker.com' });
});
