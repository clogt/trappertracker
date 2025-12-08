// TrapperTracker Background Service Worker
// Handles submission queue, retry logic, and authentication

console.log('TrapperTracker Extension: Background script loaded');

// Constants
const TRAPPERTRACKER_DOMAIN = 'https://trappertracker.com';
const API_ENDPOINT = `${TRAPPERTRACKER_DOMAIN}/api/extension-submit`;
const RETRY_ALARM_NAME = 'trappertracker-retry';
const MAX_RETRIES = 10; // Increased from 5 for better resilience
const INITIAL_BACKOFF = 1000; // 1 second
const KEEPALIVE_INTERVAL = 20000; // 20 seconds - keep service worker alive

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        submissionQueue: [],
        stats: {
            totalSubmissions: 0,
            successfulSubmissions: 0,
            failedSubmissions: 0,
            pendingSubmissions: 0
        }
    });
    console.log('TrapperTracker: Extension installed, storage initialized');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'submitToTrapperTracker') {
        handleNewSubmission(request.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }

    if (request.action === 'getStats') {
        chrome.storage.local.get(['stats'], (result) => {
            sendResponse(result.stats || {});
        });
        return true;
    }

    if (request.action === 'retryFailed') {
        processQueue().then(() => sendResponse({ success: true }));
        return true;
    }
});

// Handle new submission from content script
async function handleNewSubmission(postData) {
    try {
        // Check for duplicate sourceURL in queue
        const queue = await getQueue();
        const duplicate = queue.find(s => s.sourceURL === postData.sourceURL && s.status !== 'failed');

        if (duplicate) {
            console.log('TrapperTracker: Duplicate submission detected, skipping:', postData.sourceURL);
            return { success: false, error: 'Duplicate submission', isDuplicate: true };
        }

        // Add to queue with metadata
        const submission = {
            id: generateId(),
            ...postData,
            latitude: null, // Will be filled by user on TrapperTracker
            longitude: null,
            status: 'pending',
            attempts: 0,
            addedAt: Date.now(),
            lastAttempt: null
        };

        await addToQueue(submission);
        await updateBadge(); // Update badge count

        // Try to submit immediately
        await processQueue();

        return { success: true, id: submission.id };
    } catch (error) {
        console.error('TrapperTracker: Error handling submission:', error);
        return { success: false, error: error.message };
    }
}

// Add submission to local storage queue
async function addToQueue(submission) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['submissionQueue'], (result) => {
            const queue = result.submissionQueue || [];
            queue.push(submission);

            chrome.storage.local.set({ submissionQueue: queue }, () => {
                console.log('TrapperTracker: Added to queue:', submission.id);
                updateStats();
                resolve();
            });
        });
    });
}

// Process the submission queue
async function processQueue() {
    const queue = await getQueue();
    const pendingSubmissions = queue.filter(s => s.status === 'pending' && s.attempts < MAX_RETRIES);

    if (pendingSubmissions.length === 0) {
        console.log('TrapperTracker: No pending submissions to process');
        return;
    }

    console.log(`TrapperTracker: Processing ${pendingSubmissions.length} pending submissions`);

    for (const submission of pendingSubmissions) {
        await attemptSubmission(submission);
        // Add small delay between submissions
        await sleep(500);
    }

    // Schedule retry alarm for remaining failures
    scheduleRetry();
}

// Attempt to submit a single item
async function attemptSubmission(submission) {
    submission.attempts += 1;
    submission.lastAttempt = Date.now();

    try {
        console.log(`TrapperTracker: Attempting submission ${submission.id} (attempt ${submission.attempts})`);

        // Get session cookie from TrapperTracker domain
        const sessionCookie = await getSessionCookie();

        if (!sessionCookie) {
            console.warn('TrapperTracker: User not logged in to TrapperTracker');
            submission.status = 'auth_required';
            await updateQueue(submission);
            return;
        }

        // Make API request
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            credentials: 'include',
            body: JSON.stringify({
                description: submission.description,
                sourceURL: submission.sourceURL,
                dateReported: submission.dateReported,
                latitude: submission.latitude,
                longitude: submission.longitude
            })
        });

        if (response.ok) {
            console.log(`TrapperTracker: Submission ${submission.id} successful`);
            submission.status = 'completed';
            await updateQueue(submission);
            updateStats('success');
            await updateBadge();

            // Show success notification
            showNotification('Success!', 'Report submitted to TrapperTracker', 'success');
        } else if (response.status === 401) {
            console.warn('TrapperTracker: Authentication failed');
            submission.status = 'auth_required';
            await updateQueue(submission);
            await updateBadge();

            // Show auth notification
            showNotification('Authentication Required', 'Please log in to TrapperTracker', 'warning');
        } else {
            throw new Error(`API returned ${response.status}`);
        }

    } catch (error) {
        console.error(`TrapperTracker: Submission ${submission.id} failed:`, error);

        if (submission.attempts >= MAX_RETRIES) {
            submission.status = 'failed';
            updateStats('failed');
        } else {
            submission.status = 'pending';
        }

        await updateQueue(submission);
    }
}

// Get session cookie from TrapperTracker
async function getSessionCookie() {
    return new Promise((resolve) => {
        chrome.cookies.getAll({
            domain: 'trappertracker.com'
        }, (cookies) => {
            // Look for session cookie
            const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));

            if (sessionCookie) {
                resolve(`${sessionCookie.name}=${sessionCookie.value}`);
            } else {
                resolve(null);
            }
        });
    });
}

// Update submission in queue
async function updateQueue(submission) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['submissionQueue'], (result) => {
            const queue = result.submissionQueue || [];
            const index = queue.findIndex(s => s.id === submission.id);

            if (index !== -1) {
                queue[index] = submission;
                chrome.storage.local.set({ submissionQueue: queue }, resolve);
            } else {
                resolve();
            }
        });
    });
}

// Get current queue
async function getQueue() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['submissionQueue'], (result) => {
            resolve(result.submissionQueue || []);
        });
    });
}

// Schedule retry alarm with exponential backoff
function scheduleRetry() {
    chrome.storage.local.get(['submissionQueue'], (result) => {
        const queue = result.submissionQueue || [];
        const pending = queue.filter(s => s.status === 'pending' && s.attempts < MAX_RETRIES);

        if (pending.length === 0) {
            return;
        }

        // Calculate backoff time based on max attempts
        const maxAttempts = Math.max(...pending.map(s => s.attempts));
        const backoffMinutes = Math.pow(2, maxAttempts); // Exponential: 1, 2, 4, 8, 16 minutes

        chrome.alarms.create(RETRY_ALARM_NAME, {
            delayInMinutes: backoffMinutes
        });

        console.log(`TrapperTracker: Scheduled retry in ${backoffMinutes} minutes`);
    });
}

// Listen for retry alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === RETRY_ALARM_NAME) {
        console.log('TrapperTracker: Retry alarm triggered');
        processQueue();
    }
});

// Update statistics
function updateStats(type = null) {
    chrome.storage.local.get(['stats', 'submissionQueue'], (result) => {
        const stats = result.stats || {};
        const queue = result.submissionQueue || [];

        stats.totalSubmissions = queue.length;
        stats.successfulSubmissions = queue.filter(s => s.status === 'completed').length;
        stats.failedSubmissions = queue.filter(s => s.status === 'failed').length;
        stats.pendingSubmissions = queue.filter(s => s.status === 'pending').length;

        chrome.storage.local.set({ stats });
    });
}

// Utility functions
function generateId() {
    return `tt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Show browser notification
function showNotification(title, message, type = 'info') {
    const iconMap = {
        success: '/icons/icon48.png',
        warning: '/icons/icon48.png',
        error: '/icons/icon48.png',
        info: '/icons/icon48.png'
    };

    chrome.notifications.create({
        type: 'basic',
        iconUrl: iconMap[type] || iconMap.info,
        title: `TrapperTracker: ${title}`,
        message: message,
        priority: type === 'error' ? 2 : 1
    });
}

// Update badge with pending count
async function updateBadge() {
    const queue = await getQueue();
    const pendingCount = queue.filter(s => s.status === 'pending' || s.status === 'auth_required').length;

    if (pendingCount > 0) {
        chrome.action.setBadgeText({ text: pendingCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

// Service worker keepalive mechanism
let keepAliveInterval;

function startKeepalive() {
    if (keepAliveInterval) return;

    keepAliveInterval = setInterval(() => {
        // Ping to keep service worker alive
        chrome.storage.local.get(['stats'], () => {
            // This operation keeps the service worker active
        });
    }, KEEPALIVE_INTERVAL);

    console.log('TrapperTracker: Keepalive started');
}

function stopKeepalive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log('TrapperTracker: Keepalive stopped');
    }
}

// Start keepalive on startup
startKeepalive();

// Process queue on startup
processQueue();
updateBadge();

// Set up periodic queue processing (every 5 minutes)
chrome.alarms.create('periodic-queue-check', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'periodic-queue-check') {
        processQueue();
        updateBadge();
    }
});
