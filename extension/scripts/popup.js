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

// Toggle queue view
let queueVisible = false;
document.getElementById('toggleQueueBtn').addEventListener('click', () => {
    queueVisible = !queueVisible;
    const container = document.getElementById('queueContainer');
    const btn = document.getElementById('toggleQueueBtn');

    if (queueVisible) {
        container.style.display = 'block';
        btn.textContent = '📋 Hide Queue';
        loadQueue();
    } else {
        container.style.display = 'none';
        btn.textContent = '📋 View Queue';
    }
});

// Load and display queue
function loadQueue() {
    chrome.storage.local.get(['submissionQueue'], (result) => {
        const queue = result.submissionQueue || [];
        const queueList = document.getElementById('queueList');

        if (queue.length === 0) {
            queueList.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">No submissions in queue</div>';
            return;
        }

        // Sort: pending first, then completed, then failed
        const sortedQueue = queue.sort((a, b) => {
            const order = { pending: 0, auth_required: 1, completed: 2, failed: 3 };
            return order[a.status] - order[b.status];
        });

        queueList.innerHTML = sortedQueue.map(item => `
            <div class="queue-item">
                <div class="queue-item-header">
                    <span class="queue-item-status ${item.status}">${item.status.replace('_', ' ')}</span>
                    <span style="font-size: 10px; color: #9ca3af;">Attempt ${item.attempts}/${10}</span>
                </div>
                <div class="queue-item-desc" title="${escapeHtml(item.description)}">${escapeHtml(item.description.substring(0, 80))}...</div>
                <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">${new Date(item.addedAt).toLocaleString()}</div>
                <div class="queue-item-actions">
                    ${item.status === 'failed' || item.status === 'auth_required' ?
                        `<button class="queue-item-btn" onclick="retryItem('${item.id}')">🔄 Retry</button>` : ''}
                    <button class="queue-item-btn remove" onclick="removeItem('${item.id}')">🗑️ Remove</button>
                </div>
            </div>
        `).join('');
    });
}

// Retry individual item
window.retryItem = function(itemId) {
    chrome.storage.local.get(['submissionQueue'], (result) => {
        const queue = result.submissionQueue || [];
        const item = queue.find(s => s.id === itemId);

        if (item) {
            item.status = 'pending';
            item.attempts = 0;
            chrome.storage.local.set({ submissionQueue: queue }, () => {
                chrome.runtime.sendMessage({ action: 'retryFailed' });
                setTimeout(() => loadQueue(), 1000);
            });
        }
    });
};

// Remove individual item
window.removeItem = function(itemId) {
    chrome.storage.local.get(['submissionQueue'], (result) => {
        const queue = result.submissionQueue || [];
        const newQueue = queue.filter(s => s.id !== itemId);

        chrome.storage.local.set({ submissionQueue: newQueue }, () => {
            loadQueue();
            location.reload(); // Refresh stats
        });
    });
};

// Clear all failed submissions
document.getElementById('clearFailedBtn').addEventListener('click', () => {
    if (confirm('Clear all failed submissions?')) {
        chrome.storage.local.get(['submissionQueue'], (result) => {
            const queue = result.submissionQueue || [];
            const newQueue = queue.filter(s => s.status !== 'failed');

            chrome.storage.local.set({ submissionQueue: newQueue }, () => {
                loadQueue();
                location.reload();
            });
        });
    }
});

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
