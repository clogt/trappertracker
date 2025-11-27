// TrapperTracker Background Service Worker
// Handles submission queue, retry logic, and authentication

console.log('TrapperTracker Extension: Background script loaded');

// Constants
const TRAPPERTRACKER_DOMAIN = 'https://trappertracker.pages.dev';
const API_ENDPOINT = `${TRAPPERTRACKER_DOMAIN}/api/extension-submit`;
const RETRY_ALARM_NAME = 'trappertracker-retry';
const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 1000; // 1 second

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
        } else if (response.status === 401) {
            console.warn('TrapperTracker: Authentication failed');
            submission.status = 'auth_required';
            await updateQueue(submission);
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
            domain: 'trappertracker.pages.dev'
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

// Process queue on startup
processQueue();

// Set up periodic queue processing (every 5 minutes)
chrome.alarms.create('periodic-queue-check', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'periodic-queue-check') {
        processQueue();
    }
});
