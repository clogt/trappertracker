# Admin Panel Implementation Guide
## Priority Features for TrapperTracker Administrative Control

**For:** Admin-Panel-Architect
**From:** TrapperTracker Operations Consultant
**Date:** 2025-12-08

---

## Overview

This guide provides the admin-panel-architect with specific, actionable implementation requirements for building a production-ready administrative control panel. These features are prioritized based on operational necessity and impact on admin workload reduction.

---

## Priority 1: Critical Features (Implement First)

### 1.1 Pending Submissions Admin View

**Current Gap:** Users can view their own pending submissions at `/pending-submissions.html`, but admins cannot see ALL pending submissions across all users. This creates a blind spot for extension-scraped reports awaiting review.

**What to Build:**

**New Page:** `/admin-pending-submissions.html`

**Features:**
- Table displaying ALL pending submissions (not just current admin's)
- Columns: Submission ID, User Email, Description, Source URL, Date Reported, Created At, Actions
- Filters: By user, date range, source (extension vs. manual)
- Sorting: By date (oldest first, newest first), by user
- Bulk actions: Approve selected, Reject selected, Delete selected

**Actions Per Submission:**
- **Approve:** Moves submission to user's pending queue (user can add coordinates)
- **Reject:** Deletes submission and sends rejection email to user with reason
- **Review Source:** Opens source URL (Facebook post) in new tab for verification
- **Delete:** Permanently removes submission (used for spam)

**API Endpoint Needed:**

```javascript
// GET /api/admin/pending-submissions (NEW)
// Returns ALL pending submissions across all users

export async function onRequestGet({ request, env }) {
    // Verify admin authentication
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) {
        return unauthorizedResponse();
    }

    // Query all pending submissions (completed = 0)
    const submissions = await env.DB.prepare(`
        SELECT
            ps.submission_id,
            ps.user_id,
            ps.description,
            ps.source_url,
            ps.date_reported,
            ps.created_at,
            ps.completed,
            u.email
        FROM pending_submissions ps
        JOIN users u ON ps.user_id = u.user_id
        WHERE ps.completed = 0
        ORDER BY ps.created_at DESC
        LIMIT 100
    `).all();

    return new Response(JSON.stringify(submissions.results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

```javascript
// POST /api/admin/pending-submissions/:id/approve (NEW)
// Approves submission for user to complete

export async function onRequestPost({ request, env, params }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) {
        return unauthorizedResponse();
    }

    const submissionId = params.id;

    // Verify submission exists
    const submission = await env.DB.prepare(
        'SELECT * FROM pending_submissions WHERE submission_id = ?'
    ).bind(submissionId).first();

    if (!submission) {
        return new Response(JSON.stringify({ error: 'Submission not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Update status (could add 'admin_approved' column if needed)
    // For now, approval just means it stays in user's queue

    // Send notification email to user (optional)
    // await sendEmail(submission.user_id, 'Pending submission approved', ...);

    return new Response(JSON.stringify({ success: true, message: 'Submission approved' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

```javascript
// DELETE /api/admin/pending-submissions/:id (NEW)
// Rejects/deletes submission

export async function onRequestDelete({ request, env, params }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) {
        return unauthorizedResponse();
    }

    const submissionId = params.id;
    const { rejectionReason } = await request.json();

    // Delete submission
    await env.DB.prepare(
        'DELETE FROM pending_submissions WHERE submission_id = ?'
    ).bind(submissionId).run();

    // Optionally notify user of rejection
    // await sendRejectionEmail(userId, rejectionReason);

    return new Response(JSON.stringify({ success: true, message: 'Submission deleted' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

**UI Mockup:**

```html
<!-- Admin Dashboard - New Tab: "Pending Submissions (Admin View)" -->
<div id="admin-pending-submissions-content" class="tab-content">
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">All Pending Submissions (Admin View)</h2>
            <div class="flex gap-2">
                <input type="text" id="adminPendingSearch" placeholder="Search by user or description..."
                       class="px-3 py-2 border rounded-md text-sm">
                <select id="adminPendingSourceFilter" class="px-3 py-2 border rounded-md text-sm">
                    <option value="all">All Sources</option>
                    <option value="extension">Extension Only</option>
                    <option value="manual">Manual Only</option>
                </select>
                <button id="bulkApproveBtn" class="bg-green-600 text-white px-4 py-2 rounded-md text-sm">
                    Bulk Approve Selected
                </button>
                <button id="bulkDeleteBtn" class="bg-red-600 text-white px-4 py-2 rounded-md text-sm">
                    Bulk Delete Selected
                </button>
            </div>
        </div>

        <table class="min-w-full divide-y divide-gray-200">
            <thead>
                <tr>
                    <th><input type="checkbox" id="selectAllPending"></th>
                    <th>ID</th>
                    <th>User</th>
                    <th>Description</th>
                    <th>Source</th>
                    <th>Date Reported</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="adminPendingSubmissionsList">
                <!-- Populated via JavaScript -->
            </tbody>
        </table>

        <div id="adminPendingEmpty" class="text-center text-gray-500 py-8 hidden">
            No pending submissions to review.
        </div>
    </div>
</div>
```

---

### 1.2 Real-Time Activity Feed

**Purpose:** Give admins instant visibility into recent platform activity without refreshing dashboard.

**What to Build:**

**Location:** Add to main admin dashboard (right sidebar or bottom panel)

**Features:**
- Live-updating feed of last 50 actions
- Color-coded by action type:
  - Green: New report approved
  - Yellow: Report pending review
  - Red: Report rejected or flagged
  - Blue: User registered or logged in
  - Purple: Extension submission received
- Click on activity item to view full details
- Auto-refresh every 30 seconds (configurable)
- Pause/Resume button (stop auto-refresh)

**API Endpoint Needed:**

```javascript
// GET /api/admin/recent-activity (NEW)
// Returns last 50 platform activities

export async function onRequestGet({ request, env }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) {
        return unauthorizedResponse();
    }

    // Get recent activities from multiple tables
    const activities = [];

    // Recent danger zone reports
    const recentBlips = await env.DB.prepare(`
        SELECT
            'danger_zone' as type,
            blip_id as id,
            description,
            created_at,
            'approved' as status
        FROM trapper_blips
        ORDER BY created_at DESC
        LIMIT 20
    `).all();

    activities.push(...recentBlips.results);

    // Recent pending submissions
    const recentPending = await env.DB.prepare(`
        SELECT
            'pending_submission' as type,
            submission_id as id,
            description,
            created_at,
            CASE WHEN completed = 1 THEN 'completed' ELSE 'pending' END as status
        FROM pending_submissions
        ORDER BY created_at DESC
        LIMIT 20
    `).all();

    activities.push(...recentPending.results);

    // Recent user registrations
    const recentUsers = await env.DB.prepare(`
        SELECT
            'user_registered' as type,
            user_id as id,
            email as description,
            created_at,
            CASE WHEN is_verified = 1 THEN 'verified' ELSE 'unverified' END as status
        FROM users
        ORDER BY created_at DESC
        LIMIT 10
    `).all();

    activities.push(...recentUsers.results);

    // Sort all activities by created_at DESC
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Return top 50
    return new Response(JSON.stringify(activities.slice(0, 50)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

**UI Implementation:**

```html
<!-- Admin Dashboard - Activity Feed (Right Sidebar) -->
<div class="fixed right-0 top-20 w-80 h-screen bg-white dark:bg-gray-800 shadow-lg p-4 overflow-y-auto">
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Real-Time Activity</h3>
        <button id="pauseActivityFeed" class="text-sm text-blue-600 hover:text-blue-800">
            ⏸ Pause
        </button>
    </div>

    <div id="activityFeed" class="space-y-2">
        <!-- Populated via JavaScript -->
    </div>
</div>

<script>
let activityFeedPaused = false;
let activityFeedInterval;

async function loadActivityFeed() {
    if (activityFeedPaused) return;

    const response = await fetch('/api/admin/recent-activity', {
        credentials: 'include'
    });
    const activities = await response.json();

    const activityFeed = document.getElementById('activityFeed');
    activityFeed.innerHTML = activities.map(activity => {
        let bgColor = 'bg-gray-100';
        let icon = '📄';

        if (activity.type === 'danger_zone') {
            bgColor = 'bg-green-100 dark:bg-green-900';
            icon = '⚠️';
        } else if (activity.type === 'pending_submission') {
            bgColor = 'bg-yellow-100 dark:bg-yellow-900';
            icon = '⏳';
        } else if (activity.type === 'user_registered') {
            bgColor = 'bg-blue-100 dark:bg-blue-900';
            icon = '👤';
        }

        return `
            <div class="${bgColor} p-2 rounded-md text-sm">
                <div class="flex items-start gap-2">
                    <span class="text-lg">${icon}</span>
                    <div class="flex-1">
                        <div class="font-medium text-gray-800 dark:text-gray-200">${activity.type.replace('_', ' ')}</div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">${activity.description.substring(0, 60)}...</div>
                        <div class="text-xs text-gray-500 mt-1">${new Date(activity.created_at).toLocaleTimeString()}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Auto-refresh every 30 seconds
activityFeedInterval = setInterval(loadActivityFeed, 30000);

// Pause/Resume functionality
document.getElementById('pauseActivityFeed').addEventListener('click', (e) => {
    activityFeedPaused = !activityFeedPaused;
    e.target.textContent = activityFeedPaused ? '▶️ Resume' : '⏸ Pause';
});

// Initial load
loadActivityFeed();
</script>
```

---

### 1.3 Emergency Rate Limiting Controls

**Purpose:** Provide admins with instant controls to throttle submissions during spam attacks or system overload.

**What to Build:**

**Location:** Admin dashboard - New tab "System Controls" or top banner

**Features:**
- Global killswitch: Disable all submissions (maintenance mode)
- Rate limit slider: Adjust submissions per user per day (default: 10)
- New user restrictions: Extra throttling for accounts <7 days old
- Extension killswitch: Disable extension submissions only
- CAPTCHA enforcement: Require CAPTCHA for all submissions (not just new users)
- IP-based rate limiting: Max submissions per IP per hour

**API Endpoint Needed:**

```javascript
// GET /api/admin/system-config (NEW)
// Returns current system configuration

export async function onRequestGet({ request, env }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) {
        return unauthorizedResponse();
    }

    // Fetch configuration from KV storage or environment variables
    const config = {
        globalSubmissionsEnabled: await env.KV.get('global_submissions_enabled') !== 'false',
        rateLimit: parseInt(await env.KV.get('rate_limit') || '10'),
        newUserRateLimit: parseInt(await env.KV.get('new_user_rate_limit') || '5'),
        extensionEnabled: await env.KV.get('extension_enabled') !== 'false',
        captchaRequired: await env.KV.get('captcha_required') === 'true',
        ipRateLimit: parseInt(await env.KV.get('ip_rate_limit') || '20')
    };

    return new Response(JSON.stringify(config), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

```javascript
// POST /api/admin/system-config (NEW)
// Updates system configuration

export async function onRequestPost({ request, env }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) {
        return unauthorizedResponse();
    }

    const config = await request.json();

    // Validate configuration
    if (config.rateLimit < 1 || config.rateLimit > 1000) {
        return new Response(JSON.stringify({ error: 'Rate limit must be between 1 and 1000' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Store configuration in KV (or use environment variables)
    await env.KV.put('global_submissions_enabled', config.globalSubmissionsEnabled.toString());
    await env.KV.put('rate_limit', config.rateLimit.toString());
    await env.KV.put('new_user_rate_limit', config.newUserRateLimit.toString());
    await env.KV.put('extension_enabled', config.extensionEnabled.toString());
    await env.KV.put('captcha_required', config.captchaRequired.toString());
    await env.KV.put('ip_rate_limit', config.ipRateLimit.toString());

    // Log configuration change
    console.log(`Admin ${adminPayload.userId} updated system config:`, config);

    return new Response(JSON.stringify({ success: true, message: 'Configuration updated' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

**UI Implementation:**

```html
<!-- Admin Dashboard - System Controls Tab -->
<div id="system-controls-content" class="tab-content">
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">System Controls</h2>

        <div class="space-y-4">
            <!-- Global Submissions Toggle -->
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                    <h3 class="font-medium">Global Submissions</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Enable/disable all report submissions</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="globalSubmissionsEnabled" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
            </div>

            <!-- Extension Toggle -->
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                    <h3 class="font-medium">Browser Extension Submissions</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Enable/disable extension submissions</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="extensionEnabled" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
            </div>

            <!-- CAPTCHA Enforcement -->
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                    <h3 class="font-medium">CAPTCHA Enforcement</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Require CAPTCHA for all submissions</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="captchaRequired" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-600"></div>
                </label>
            </div>

            <!-- Rate Limits -->
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 class="font-medium mb-2">Rate Limits</h3>

                <div class="space-y-3">
                    <div>
                        <label class="text-sm text-gray-600 dark:text-gray-400">Standard Users (submissions/day)</label>
                        <input type="range" id="rateLimit" min="1" max="50" value="10"
                               class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
                        <div class="text-center text-sm font-medium" id="rateLimitValue">10</div>
                    </div>

                    <div>
                        <label class="text-sm text-gray-600 dark:text-gray-400">New Users <7 days (submissions/day)</label>
                        <input type="range" id="newUserRateLimit" min="1" max="20" value="5"
                               class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
                        <div class="text-center text-sm font-medium" id="newUserRateLimitValue">5</div>
                    </div>

                    <div>
                        <label class="text-sm text-gray-600 dark:text-gray-400">Per IP Address (submissions/hour)</label>
                        <input type="range" id="ipRateLimit" min="5" max="100" value="20"
                               class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
                        <div class="text-center text-sm font-medium" id="ipRateLimitValue">20</div>
                    </div>
                </div>
            </div>

            <!-- Save Button -->
            <div class="flex justify-end">
                <button id="saveSystemConfig"
                        class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium">
                    Save Configuration
                </button>
            </div>
        </div>
    </div>
</div>

<script>
// Load current configuration
async function loadSystemConfig() {
    const response = await fetch('/api/admin/system-config', { credentials: 'include' });
    const config = await response.json();

    document.getElementById('globalSubmissionsEnabled').checked = config.globalSubmissionsEnabled;
    document.getElementById('extensionEnabled').checked = config.extensionEnabled;
    document.getElementById('captchaRequired').checked = config.captchaRequired;
    document.getElementById('rateLimit').value = config.rateLimit;
    document.getElementById('rateLimitValue').textContent = config.rateLimit;
    document.getElementById('newUserRateLimit').value = config.newUserRateLimit;
    document.getElementById('newUserRateLimitValue').textContent = config.newUserRateLimit;
    document.getElementById('ipRateLimit').value = config.ipRateLimit;
    document.getElementById('ipRateLimitValue').textContent = config.ipRateLimit;
}

// Update slider value displays
document.getElementById('rateLimit').addEventListener('input', (e) => {
    document.getElementById('rateLimitValue').textContent = e.target.value;
});
document.getElementById('newUserRateLimit').addEventListener('input', (e) => {
    document.getElementById('newUserRateLimitValue').textContent = e.target.value;
});
document.getElementById('ipRateLimit').addEventListener('input', (e) => {
    document.getElementById('ipRateLimitValue').textContent = e.target.value;
});

// Save configuration
document.getElementById('saveSystemConfig').addEventListener('click', async () => {
    const config = {
        globalSubmissionsEnabled: document.getElementById('globalSubmissionsEnabled').checked,
        extensionEnabled: document.getElementById('extensionEnabled').checked,
        captchaRequired: document.getElementById('captchaRequired').checked,
        rateLimit: parseInt(document.getElementById('rateLimit').value),
        newUserRateLimit: parseInt(document.getElementById('newUserRateLimit').value),
        ipRateLimit: parseInt(document.getElementById('ipRateLimit').value)
    };

    const response = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
    });

    if (response.ok) {
        alert('Configuration saved successfully!');
    } else {
        alert('Failed to save configuration.');
    }
});

// Load on page load
loadSystemConfig();
</script>
```

---

## Priority 2: High-Impact Features (Implement Next)

### 2.1 Geographic Heatmap with Anomaly Detection

**Purpose:** Visualize report density across geographic regions, identify spam clusters and legitimate hotspots.

**What to Build:**

**Location:** Admin dashboard - New tab "Geographic Analysis"

**Features:**
- Interactive map (Leaflet.js) showing report density
- Color gradient: Blue (low), Yellow (medium), Red (high)
- Click on cluster to see individual reports
- Anomaly detection: Highlight suspicious clusters (many reports, few users, short time span)
- Filter by date range, report type, user tier
- Export cluster data as CSV

**Technical Approach:**

1. **Backend: Clustering Algorithm**
   - Use DBSCAN or grid-based clustering
   - Group reports within 500m radius and 24-hour window
   - Calculate cluster metrics:
     - Report count
     - Unique user count
     - Time span
     - Description similarity
   - Flag as suspicious if:
     - Report count >10
     - Unique user count <3
     - Time span <2 hours
     - Description similarity >80%

2. **Frontend: Heatmap Rendering**
   - Use Leaflet.heat plugin for heatmap layer
   - Use Leaflet.markercluster for clustered markers
   - Add custom styling for suspicious clusters (red border)

**API Endpoint Needed:**

```javascript
// GET /api/admin/geographic-clusters (NEW)
// Returns report clusters with anomaly scoring

export async function onRequestGet({ request, env }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) {
        return unauthorizedResponse();
    }

    // Get all reports from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const reports = await env.DB.prepare(`
        SELECT
            blip_id,
            latitude,
            longitude,
            description,
            reported_by_user_id,
            created_at
        FROM trapper_blips
        WHERE created_at > ?
        ORDER BY created_at DESC
    `).bind(thirtyDaysAgo).all();

    // Simple clustering: group reports within 0.01 degrees (roughly 1km)
    const clusters = [];
    const processed = new Set();

    for (const report of reports.results) {
        if (processed.has(report.blip_id)) continue;

        const cluster = {
            center_lat: report.latitude,
            center_lon: report.longitude,
            reports: [report],
            unique_users: new Set([report.reported_by_user_id])
        };

        // Find nearby reports
        for (const other of reports.results) {
            if (other.blip_id === report.blip_id || processed.has(other.blip_id)) continue;

            const latDiff = Math.abs(other.latitude - report.latitude);
            const lonDiff = Math.abs(other.longitude - report.longitude);

            if (latDiff < 0.01 && lonDiff < 0.01) { // Within ~1km
                cluster.reports.push(other);
                cluster.unique_users.add(other.reported_by_user_id);
                processed.add(other.blip_id);
            }
        }

        processed.add(report.blip_id);

        // Calculate anomaly score
        const reportCount = cluster.reports.length;
        const userCount = cluster.unique_users.size;
        const timeSpan = (new Date(cluster.reports[0].created_at) - new Date(cluster.reports[cluster.reports.length - 1].created_at)) / (1000 * 60 * 60); // hours

        cluster.anomaly_score = 0;
        if (reportCount > 10) cluster.anomaly_score += 30;
        if (userCount < 3) cluster.anomaly_score += 40;
        if (timeSpan < 2) cluster.anomaly_score += 30;

        cluster.is_suspicious = cluster.anomaly_score > 50;
        cluster.report_count = reportCount;
        cluster.user_count = userCount;
        cluster.time_span_hours = Math.round(timeSpan);

        clusters.push(cluster);
    }

    // Sort by anomaly score (suspicious first)
    clusters.sort((a, b) => b.anomaly_score - a.anomaly_score);

    return new Response(JSON.stringify(clusters), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

**UI Implementation:**

```html
<!-- Admin Dashboard - Geographic Analysis Tab -->
<div id="geographic-analysis-content" class="tab-content">
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Geographic Analysis</h2>

        <div class="mb-4 flex gap-4">
            <select id="heatmapDateRange" class="px-3 py-2 border rounded-md text-sm">
                <option value="7">Last 7 Days</option>
                <option value="30" selected>Last 30 Days</option>
                <option value="90">Last 90 Days</option>
            </select>
            <button id="refreshHeatmap" class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm">
                Refresh
            </button>
            <button id="exportClusters" class="bg-green-600 text-white px-4 py-2 rounded-md text-sm">
                Export Clusters (CSV)
            </button>
        </div>

        <!-- Map Container -->
        <div id="heatmapContainer" class="h-96 rounded-lg border border-gray-300"></div>

        <!-- Suspicious Clusters List -->
        <div class="mt-6">
            <h3 class="text-lg font-semibold mb-2">Suspicious Clusters (Anomaly Score >50)</h3>
            <div id="suspiciousClustersList" class="space-y-2">
                <!-- Populated via JavaScript -->
            </div>
        </div>
    </div>
</div>

<script>
let heatmapMap;
let heatmapLayer;

async function initHeatmap() {
    // Initialize Leaflet map
    heatmapMap = L.map('heatmapContainer').setView([39.8283, -98.5795], 4); // Center of US
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(heatmapMap);

    await loadHeatmapData();
}

async function loadHeatmapData() {
    const response = await fetch('/api/admin/geographic-clusters', { credentials: 'include' });
    const clusters = await response.json();

    // Clear existing heatmap layer
    if (heatmapLayer) {
        heatmapMap.removeLayer(heatmapLayer);
    }

    // Prepare heatmap data
    const heatmapData = clusters.map(cluster => [
        cluster.center_lat,
        cluster.center_lon,
        cluster.report_count / 10 // Intensity based on report count
    ]);

    // Add heatmap layer (requires Leaflet.heat plugin)
    heatmapLayer = L.heatLayer(heatmapData, { radius: 25 }).addTo(heatmapMap);

    // Add markers for suspicious clusters
    clusters.filter(c => c.is_suspicious).forEach(cluster => {
        const marker = L.marker([cluster.center_lat, cluster.center_lon], {
            icon: L.icon({
                iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>',
                iconSize: [30, 30]
            })
        }).addTo(heatmapMap);

        marker.bindPopup(`
            <strong>SUSPICIOUS CLUSTER</strong><br>
            Reports: ${cluster.report_count}<br>
            Unique Users: ${cluster.user_count}<br>
            Time Span: ${cluster.time_span_hours}h<br>
            Anomaly Score: ${cluster.anomaly_score}
        `);
    });

    // Update suspicious clusters list
    const suspiciousList = document.getElementById('suspiciousClustersList');
    const suspiciousClusters = clusters.filter(c => c.is_suspicious);

    if (suspiciousClusters.length === 0) {
        suspiciousList.innerHTML = '<p class="text-gray-500">No suspicious clusters detected.</p>';
    } else {
        suspiciousList.innerHTML = suspiciousClusters.map(cluster => `
            <div class="border border-red-300 bg-red-50 dark:bg-red-900 p-3 rounded-md">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-medium text-red-800 dark:text-red-200">
                            Cluster: ${cluster.center_lat.toFixed(4)}, ${cluster.center_lon.toFixed(4)}
                        </div>
                        <div class="text-sm text-gray-700 dark:text-gray-300">
                            ${cluster.report_count} reports from ${cluster.user_count} users in ${cluster.time_span_hours}h
                        </div>
                        <div class="text-sm text-red-600 dark:text-red-400">
                            Anomaly Score: ${cluster.anomaly_score}
                        </div>
                    </div>
                    <button onclick="investigateCluster(${cluster.center_lat}, ${cluster.center_lon})"
                            class="bg-red-600 text-white px-3 py-1 rounded-md text-sm">
                        Investigate
                    </button>
                </div>
            </div>
        `).join('');
    }
}

function investigateCluster(lat, lon) {
    // Zoom to cluster on map
    heatmapMap.setView([lat, lon], 14);

    // Open modal with cluster details (future feature)
    alert(`Investigating cluster at ${lat.toFixed(4)}, ${lon.toFixed(4)}\n\nFeature coming soon: View all reports in cluster, batch delete spam.`);
}

// Export clusters as CSV
document.getElementById('exportClusters').addEventListener('click', async () => {
    const response = await fetch('/api/admin/geographic-clusters', { credentials: 'include' });
    const clusters = await response.json();

    const csv = [
        ['Latitude', 'Longitude', 'Report Count', 'User Count', 'Time Span (hours)', 'Anomaly Score', 'Suspicious'],
        ...clusters.map(c => [
            c.center_lat,
            c.center_lon,
            c.report_count,
            c.user_count,
            c.time_span_hours,
            c.anomaly_score,
            c.is_suspicious ? 'YES' : 'NO'
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trappertracker_clusters_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
});

// Initialize on page load
initHeatmap();
</script>
```

---

### 2.2 Report Flagging System (Community Moderation)

**Purpose:** Empower community to flag problematic reports, reducing admin workload and improving content quality.

**What to Build:**

**User-Facing:**
- Add "Flag" button to each report popup on main map
- Flag modal with reason selection: Spam, Off-topic, Harassment, Duplicate, Outdated, Insufficient Evidence
- Optional comment field for flagging reason

**Admin-Facing:**
- New tab in admin dashboard: "Flagged Reports"
- List of reports with flag count, flag reasons, and flagging users
- Actions: Dismiss flags (keep report), Edit report, Remove report, Ban reporter

**Database Schema:**

```sql
CREATE TABLE report_flags (
    flag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL, -- 'danger_zone', 'lost_pet', 'found_pet', 'dangerous_animal'
    report_id INTEGER NOT NULL,
    flagged_by_user_id TEXT NOT NULL,
    flag_reason TEXT NOT NULL,
    flag_comment TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending', -- 'pending', 'upheld', 'dismissed'
    reviewed_by_admin_id TEXT,
    reviewed_at TEXT,
    FOREIGN KEY (flagged_by_user_id) REFERENCES users(user_id)
);
```

**API Endpoints Needed:**

```javascript
// POST /api/report/flag (NEW)
// User flags a report

export async function onRequestPost({ request, env }) {
    // Verify user authentication
    const userPayload = await authenticateUser(request, env);
    if (!userPayload) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { reportType, reportId, flagReason, flagComment } = await request.json();

    // Validate inputs
    const validReasons = ['spam', 'off-topic', 'harassment', 'duplicate', 'outdated', 'insufficient-evidence'];
    if (!validReasons.includes(flagReason)) {
        return new Response(JSON.stringify({ error: 'Invalid flag reason' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Check if user already flagged this report
    const existingFlag = await env.DB.prepare(
        'SELECT * FROM report_flags WHERE report_type = ? AND report_id = ? AND flagged_by_user_id = ?'
    ).bind(reportType, reportId, userPayload.userId).first();

    if (existingFlag) {
        return new Response(JSON.stringify({ error: 'You have already flagged this report' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Insert flag
    await env.DB.prepare(`
        INSERT INTO report_flags (report_type, report_id, flagged_by_user_id, flag_reason, flag_comment)
        VALUES (?, ?, ?, ?, ?)
    `).bind(reportType, reportId, userPayload.userId, flagReason, flagComment || null).run();

    // Check if auto-hide threshold reached (e.g., 5 flags from standard users)
    const flagCount = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM report_flags WHERE report_type = ? AND report_id = ? AND status = "pending"'
    ).bind(reportType, reportId).first();

    // Auto-hide if 5+ flags (configurable threshold)
    if (flagCount.count >= 5) {
        // Hide report (add 'is_hidden' column to report tables)
        const tableName = reportType === 'danger_zone' ? 'trapper_blips' :
                         reportType === 'lost_pet' ? 'lost_pets' :
                         reportType === 'found_pet' ? 'found_pets' : 'dangerous_animals';

        // Note: You'll need to add 'is_hidden' column to each table
        // await env.DB.prepare(`UPDATE ${tableName} SET is_hidden = 1 WHERE ... = ?`).bind(reportId).run();
    }

    return new Response(JSON.stringify({ success: true, message: 'Report flagged successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

```javascript
// GET /api/admin/flagged-reports (NEW)
// Returns all flagged reports for admin review

export async function onRequestGet({ request, env }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) {
        return unauthorizedResponse();
    }

    // Get flagged reports with aggregated flag counts
    const flaggedReports = await env.DB.prepare(`
        SELECT
            rf.report_type,
            rf.report_id,
            COUNT(rf.flag_id) as flag_count,
            GROUP_CONCAT(rf.flag_reason) as flag_reasons,
            MIN(rf.created_at) as first_flagged_at
        FROM report_flags rf
        WHERE rf.status = 'pending'
        GROUP BY rf.report_type, rf.report_id
        HAVING flag_count >= 1
        ORDER BY flag_count DESC, first_flagged_at ASC
        LIMIT 100
    `).all();

    // For each flagged report, fetch report details
    const detailedReports = [];
    for (const flag of flaggedReports.results) {
        let tableName, idColumn, descColumn;

        if (flag.report_type === 'danger_zone') {
            tableName = 'trapper_blips';
            idColumn = 'blip_id';
            descColumn = 'description';
        } else if (flag.report_type === 'lost_pet') {
            tableName = 'lost_pets';
            idColumn = 'pet_id';
            descColumn = 'pet_name';
        } else if (flag.report_type === 'found_pet') {
            tableName = 'found_pets';
            idColumn = 'found_pet_id';
            descColumn = 'description';
        } else {
            tableName = 'dangerous_animals';
            idColumn = 'danger_id';
            descColumn = 'description';
        }

        const report = await env.DB.prepare(
            `SELECT * FROM ${tableName} WHERE ${idColumn} = ?`
        ).bind(flag.report_id).first();

        if (report) {
            detailedReports.push({
                ...flag,
                report_details: report
            });
        }
    }

    return new Response(JSON.stringify(detailedReports), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

**User-Facing UI (Add to Main Map):**

```javascript
// In map.js - Add flag button to report popup
function createReportPopup(report, reportType) {
    return `
        <div class="report-popup">
            <h3>${report.description || report.pet_name}</h3>
            <p>${new Date(report.created_at || report.report_timestamp).toLocaleString()}</p>
            <div class="popup-actions">
                <button onclick="shareReport('${reportType}', '${report.id}')" class="btn-share">Share</button>
                <button onclick="openFlagModal('${reportType}', '${report.id}')" class="btn-flag">🚩 Flag</button>
            </div>
        </div>
    `;
}

function openFlagModal(reportType, reportId) {
    // Show modal with flag reason selection
    const modal = document.getElementById('flagReportModal');
    modal.classList.remove('hidden');

    document.getElementById('flagReportType').value = reportType;
    document.getElementById('flagReportId').value = reportId;
}

async function submitFlag() {
    const reportType = document.getElementById('flagReportType').value;
    const reportId = document.getElementById('flagReportId').value;
    const flagReason = document.getElementById('flagReason').value;
    const flagComment = document.getElementById('flagComment').value;

    const response = await fetch('/api/report/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reportType, reportId, flagReason, flagComment })
    });

    if (response.ok) {
        alert('Report flagged successfully. Thank you for helping keep TrapperTracker accurate!');
        document.getElementById('flagReportModal').classList.add('hidden');
    } else {
        const error = await response.json();
        alert(error.error || 'Failed to flag report');
    }
}
```

---

## Summary of Critical Implementation Priorities

### Immediate (0-2 Weeks):
1. Pending Submissions Admin View - Essential for extension workflow oversight
2. Emergency Rate Limiting Controls - Spam attack defense
3. Real-Time Activity Feed - Operational awareness

### Short-term (2-6 Weeks):
4. Geographic Heatmap - Pattern recognition and spam detection
5. Report Flagging System - Community self-moderation
6. Extension Health Monitoring - Proactive maintenance

### Medium-term (6-12 Weeks):
7. Automated Moderation Rules - Workload reduction
8. Moderator Role & Tools - Team scaling
9. Alert Center - Critical event notifications

---

## Technical Stack Recommendations

**Frontend:**
- Leaflet.js for maps (already in use)
- Leaflet.heat for heatmap visualization
- Leaflet.markercluster for cluster rendering
- Tailwind CSS for styling (already in use)
- Chart.js for analytics dashboards (add if not present)

**Backend:**
- Cloudflare Workers (already in use)
- D1 Database (SQLite) (already in use)
- KV Storage for configuration (add Workers KV binding)
- Cloudflare Rate Limiting (built-in, configure in dashboard)

**Security:**
- Admin authentication via JWT (already implemented)
- Role-based access control (extend existing user roles)
- Audit logging (add to database)
- IP-based rate limiting (Cloudflare WAF)

---

## Integration with Existing Codebase

**Files to Modify:**

1. `/functions/_worker.js` - Add new API route handlers
2. `/public/admin-dashboard.html` - Add new tabs and UI elements
3. `/public/assets/js/admin.js` - Add new JavaScript functions
4. `/d1.sql` - Add new tables (report_flags, admin_audit_log)
5. `/functions/api/admin/` - Create new API endpoint files

**New Files to Create:**

1. `/functions/api/admin/pending-submissions.js` - Admin view of pending submissions
2. `/functions/api/admin/system-config.js` - System configuration management
3. `/functions/api/admin/recent-activity.js` - Real-time activity feed
4. `/functions/api/admin/geographic-clusters.js` - Clustering analysis
5. `/functions/api/admin/flagged-reports.js` - Flagged content review
6. `/functions/api/report/flag.js` - User flagging endpoint
7. `/public/assets/js/heatmap.js` - Geographic heatmap visualization

---

## Next Steps for Admin-Panel-Architect

1. **Review this guide** and prioritize features based on project timeline
2. **Set up development branch** for admin panel enhancements
3. **Implement Priority 1 features first** (Pending Submissions Admin View, Emergency Controls, Activity Feed)
4. **Test thoroughly** with realistic data (create test reports, simulate spam attacks)
5. **Collaborate with operations consultant** (me) for workflow validation
6. **Deploy incrementally** (one feature at a time to avoid breaking production)
7. **Gather admin feedback** after each deployment (iterate based on real usage)

---

**Contact:** Available for ongoing consultation and implementation support.

