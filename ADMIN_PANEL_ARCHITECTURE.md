# TrapperTracker.com Administrative Control Panel
## Comprehensive Architectural Specification Document

**Document Version:** 1.0
**Date:** 2025-12-08
**Project Location:** /home/hobo/Desktop/tt
**System Security Manager:** Head Admin Panel Architect

---

## EXECUTIVE SUMMARY

This document outlines a production-ready, security-first administrative control panel for TrapperTracker.com, a community platform handling sensitive location data for animal trap reporting, lost/found pets, and dangerous animal alerts. The admin panel must provide comprehensive user management, content moderation, security monitoring, and data integrity verification while protecting against common attack vectors (DoS, XSS, SQL injection, malicious content).

### Current State Assessment

**Existing Infrastructure:**
- **Authentication:** JWT-based admin login with bcrypt password hashing, 5-attempt rate limiting, 15-min lockout
- **Admin Endpoints:** 11 API routes (verify, stats, users, all-reports, error-reports, update-user-role, delete-user, change-password, delete-report)
- **Database:** Cloudflare D1 with 7 tables (users, trapper_blips, lost_pets, found_pets, dangerous_animals, error_reports, pending_submissions)
- **Browser Extension:** Submits data via /api/extension-submit with basic sanitization
- **UI:** Single admin dashboard (admin-dashboard.html) with tabs for error reports, users, and all reports

**Current Strengths:**
- Secure password management with bcrypt hashing (cost factor appropriate)
- JWT tokens with HttpOnly, SameSite=Strict cookies
- Basic rate limiting on admin login (IP-based, in-memory)
- Input validation and SQL injection prevention via parameterized queries
- HTML sanitization on extension submissions
- Role-based access control (user, enforcement, admin)

**Critical Gaps Identified:**

1. **Security Vulnerabilities:**
   - No CSRF protection on state-changing operations
   - In-memory rate limiting (resets on worker restart)
   - No IP blocking/reputation system for persistent attackers
   - No comprehensive audit logging for admin actions
   - Missing session management (no session invalidation, device tracking)
   - No 2FA or multi-factor authentication
   - Rate limiting only on login, not on API endpoints

2. **Data Integrity:**
   - No duplicate submission detection
   - No malicious content pattern detection
   - Limited validation on extension data (basic sanitization only)
   - No data quality scoring or anomaly detection
   - No reconciliation process for failed submissions

3. **User Management:**
   - Cannot verify/unverify users manually
   - No account suspension (soft delete) capability
   - No user activity history tracking
   - No bulk user operations
   - No user reputation scoring

4. **Report Moderation:**
   - Pending submissions not integrated into main admin dashboard
   - No approval/rejection workflow for reports
   - No flagging system for suspicious reports
   - No bulk moderation actions
   - No report editing capability (only delete)
   - No report history/audit trail

5. **System Monitoring:**
   - Limited real-time statistics (only basic counts)
   - No system health monitoring
   - No performance metrics
   - No security event dashboard
   - No automated alerting

6. **Operational Gaps:**
   - No database maintenance tools
   - No data export capabilities
   - No archival system for old reports
   - No database integrity checks
   - No backup verification

---

## FEATURE MATRIX WITH PRIORITIES

### CRITICAL PRIORITY (Security & Core Functionality)

| Feature | Status | Complexity | Time Est. | Dependencies |
|---------|--------|------------|-----------|--------------|
| **CSRF Protection** | Missing | Medium | 4h | Token generation system |
| **Persistent Rate Limiting** | Partial | Medium | 6h | Cloudflare KV or D1 storage |
| **IP Blocking System** | Missing | Medium | 6h | Rate limiting storage |
| **Comprehensive Audit Logging** | Missing | High | 8h | New D1 table, middleware |
| **Session Management** | Missing | High | 8h | New D1 table, auth refactor |
| **API Rate Limiting** | Missing | Medium | 6h | Middleware, KV storage |
| **Pending Submissions Review** | Partial | Low | 4h | Integrate into admin dash |
| **Report Approval Workflow** | Missing | High | 10h | New status field, endpoints |
| **Enhanced Input Validation** | Partial | Medium | 6h | Schema validation library |
| **Duplicate Detection** | Missing | High | 8h | Hashing algorithm, search |

**Total Critical: 66 hours (~8.5 days)**

### HIGH PRIORITY (Enhanced Security & Moderation)

| Feature | Status | Complexity | Time Est. | Dependencies |
|---------|--------|------------|-----------|--------------|
| **Malicious Content Detection** | Missing | High | 12h | Pattern library, ML optional |
| **User Suspension System** | Missing | Medium | 6h | New user status field |
| **Report Flagging System** | Missing | Medium | 6h | New flags table |
| **User Activity History** | Missing | Medium | 6h | Activity logging table |
| **Bulk User Operations** | Missing | Low | 4h | UI checkboxes, batch API |
| **Bulk Report Operations** | Missing | Low | 4h | UI checkboxes, batch API |
| **Report Edit Capability** | Missing | Medium | 6h | Update endpoints, validation |
| **Security Event Dashboard** | Missing | High | 10h | Aggregation queries, charts |
| **Advanced Stats Dashboard** | Partial | Medium | 8h | Time-series queries, charts |
| **Data Anomaly Detection** | Missing | High | 10h | Statistical analysis |

**Total High: 72 hours (~9 days)**

### MEDIUM PRIORITY (Operational Efficiency)

| Feature | Status | Complexity | Time Est. | Dependencies |
|---------|--------|------------|-----------|--------------|
| **User Reputation Scoring** | Missing | High | 10h | Algorithm design, scoring |
| **Report History/Audit Trail** | Missing | Medium | 6h | Change tracking table |
| **Database Maintenance Tools** | Missing | Medium | 8h | Cleanup scripts, UI |
| **Data Export System** | Missing | Medium | 6h | CSV/JSON export endpoints |
| **Automated Alerting** | Missing | High | 10h | Email/webhook integration |
| **Performance Monitoring** | Missing | Medium | 6h | Metrics collection |
| **Advanced Search/Filters** | Partial | Medium | 8h | Full-text search, indexing |
| **Report Categories/Tags** | Missing | Medium | 6h | Tags table, UI |
| **User Communication** | Missing | High | 8h | Email system integration |
| **Extension Submission Stats** | Missing | Low | 4h | Tracking, dashboard widget |

**Total Medium: 72 hours (~9 days)**

### LOW PRIORITY (Nice-to-Have Features)

| Feature | Status | Complexity | Time Est. | Dependencies |
|---------|--------|------------|-----------|--------------|
| **Two-Factor Authentication** | Missing | High | 12h | TOTP library, QR codes |
| **Admin Team Management** | Missing | High | 10h | Multiple admins, permissions |
| **Data Archival System** | Missing | High | 10h | Archive storage, restore |
| **Database Integrity Checks** | Missing | Medium | 6h | Validation scripts |
| **Geo-fencing Alerts** | Missing | High | 12h | Geospatial queries |
| **Report Analytics** | Missing | High | 12h | Data visualization |
| **Mobile Admin Interface** | Missing | High | 16h | Responsive redesign |
| **API Documentation** | Missing | Medium | 8h | OpenAPI/Swagger setup |
| **Automated Backups** | Missing | Medium | 6h | Cloudflare integration |
| **Custom Admin Roles** | Missing | High | 10h | Granular permissions |

**Total Low: 102 hours (~13 days)**

---

## API ENDPOINT CATALOG

### EXISTING ENDPOINTS (TO ENHANCE)

#### Authentication & Session Management

**`POST /api/admin-login`**
- **Current:** Basic JWT login with rate limiting
- **Enhancements Needed:**
  - Add device fingerprinting
  - Log login attempts to audit table
  - Implement session tracking
  - Add optional 2FA check
  - CSRF token generation on login

**`GET /api/admin/verify`**
- **Current:** Simple JWT verification
- **Enhancements Needed:**
  - Validate session hasn't been revoked
  - Check session device matches
  - Log verification attempts
  - Return session metadata

**`POST /api/admin/change-password`**
- **Current:** Password change with hash generation
- **Enhancements Needed:**
  - Require CSRF token
  - Invalidate all other sessions on change
  - Enforce password complexity rules
  - Log password changes to audit trail

#### User Management

**`GET /api/admin/users`**
- **Current:** Returns all users with basic info
- **Enhancements Needed:**
  - Add pagination (limit/offset)
  - Add sorting options
  - Include user statistics (report count, last active)
  - Add filtering by multiple criteria
  - Include suspension status

**`POST /api/admin/update-user-role`**
- **Current:** Updates user role with validation
- **Enhancements Needed:**
  - Require CSRF token
  - Log role changes to audit trail
  - Prevent self-demotion
  - Send notification to user
  - Rate limit this endpoint

**`DELETE /api/admin/delete-user`**
- **Current:** Hard delete user
- **Enhancements Needed:**
  - Require CSRF token
  - Implement soft delete option
  - Log deletion to audit trail
  - Archive user data before deletion
  - Prevent self-deletion
  - Rate limit this endpoint

#### Report Management

**`GET /api/admin/all-reports`**
- **Current:** Returns 50 reports from each table
- **Enhancements Needed:**
  - Add pagination
  - Add filtering by status, date range, type
  - Include report status (pending, approved, flagged)
  - Add sorting options
  - Include reporter information

**`DELETE /api/admin/delete-report`**
- **Current:** Delete report by type and ID
- **Enhancements Needed:**
  - Require CSRF token
  - Log deletion to audit trail
  - Implement soft delete option
  - Archive report data
  - Rate limit this endpoint

**`GET /api/admin/error-reports`**
- **Current:** Returns last 100 error reports
- **Enhancements Needed:**
  - Add pagination
  - Add filtering by date, severity
  - Add resolution status tracking
  - Include admin notes field

**`GET /api/admin/stats`**
- **Current:** Returns 4 basic counts
- **Enhancements Needed:**
  - Add time-series data (7-day, 30-day trends)
  - Add growth rates
  - Add security metrics
  - Add extension submission stats
  - Add performance metrics

### NEW ENDPOINTS REQUIRED

#### CSRF Protection

**`GET /api/admin/csrf-token`**
- **Purpose:** Generate CSRF token for current session
- **Auth:** Requires admin JWT
- **Response:**
  ```json
  {
    "csrfToken": "random-token-string",
    "expiresAt": "2025-12-08T12:00:00Z"
  }
  ```

#### Session Management

**`GET /api/admin/sessions`**
- **Purpose:** List all active admin sessions
- **Auth:** Requires admin JWT
- **Response:**
  ```json
  {
    "sessions": [
      {
        "sessionId": "session-uuid",
        "deviceInfo": "Chrome on Windows",
        "ipAddress": "192.168.1.1",
        "createdAt": "2025-12-08T10:00:00Z",
        "lastActivity": "2025-12-08T11:30:00Z",
        "isCurrent": true
      }
    ]
  }
  ```

**`DELETE /api/admin/sessions/:sessionId`**
- **Purpose:** Revoke specific session
- **Auth:** Requires admin JWT + CSRF token
- **Response:** `{ "success": true }`

**`POST /api/admin/logout-all`**
- **Purpose:** Revoke all sessions except current
- **Auth:** Requires admin JWT + CSRF token
- **Response:** `{ "sessionsRevoked": 3 }`

#### Audit Logging

**`GET /api/admin/audit-log`**
- **Purpose:** Retrieve admin action audit log
- **Auth:** Requires admin JWT
- **Query Params:**
  - `limit` (default: 50, max: 500)
  - `offset` (default: 0)
  - `startDate` (ISO 8601)
  - `endDate` (ISO 8601)
  - `action` (filter by action type)
  - `adminUser` (filter by admin username)
- **Response:**
  ```json
  {
    "logs": [
      {
        "logId": 12345,
        "adminUser": "admin",
        "action": "delete_user",
        "targetType": "user",
        "targetId": "user-uuid",
        "details": { "email": "user@example.com" },
        "ipAddress": "192.168.1.1",
        "timestamp": "2025-12-08T11:00:00Z"
      }
    ],
    "total": 1250,
    "hasMore": true
  }
  ```

#### User Management Enhancements

**`POST /api/admin/suspend-user`**
- **Purpose:** Suspend user account (soft delete)
- **Auth:** Requires admin JWT + CSRF token
- **Body:**
  ```json
  {
    "userId": "user-uuid",
    "reason": "Violation of terms",
    "duration": "7d" // or "permanent"
  }
  ```
- **Response:** `{ "success": true, "suspendedUntil": "2025-12-15T00:00:00Z" }`

**`POST /api/admin/unsuspend-user`**
- **Purpose:** Restore suspended user account
- **Auth:** Requires admin JWT + CSRF token
- **Body:** `{ "userId": "user-uuid" }`
- **Response:** `{ "success": true }`

**`POST /api/admin/verify-user`**
- **Purpose:** Manually verify user email
- **Auth:** Requires admin JWT + CSRF token
- **Body:** `{ "userId": "user-uuid" }`
- **Response:** `{ "success": true }`

**`GET /api/admin/user-activity/:userId`**
- **Purpose:** Get user activity history
- **Auth:** Requires admin JWT
- **Response:**
  ```json
  {
    "userId": "user-uuid",
    "email": "user@example.com",
    "activities": [
      {
        "activityId": 123,
        "action": "submit_report",
        "reportType": "danger_zone",
        "reportId": 456,
        "ipAddress": "192.168.1.1",
        "timestamp": "2025-12-08T11:00:00Z"
      }
    ],
    "stats": {
      "totalReports": 15,
      "flaggedReports": 2,
      "reputationScore": 85
    }
  }
  ```

**`POST /api/admin/bulk-user-action`**
- **Purpose:** Perform bulk operations on users
- **Auth:** Requires admin JWT + CSRF token
- **Body:**
  ```json
  {
    "userIds": ["user-uuid-1", "user-uuid-2"],
    "action": "suspend", // or "delete", "verify", "change_role"
    "params": { "reason": "Spam", "duration": "permanent" }
  }
  ```
- **Response:** `{ "success": true, "affected": 2 }`

#### Report Moderation

**`GET /api/admin/pending-reports`**
- **Purpose:** Get all reports pending approval
- **Auth:** Requires admin JWT
- **Query Params:** pagination, filtering
- **Response:**
  ```json
  {
    "reports": [
      {
        "reportId": 123,
        "reportType": "danger_zone",
        "status": "pending",
        "submittedBy": "user@example.com",
        "submittedAt": "2025-12-08T10:00:00Z",
        "flagReason": null,
        "data": { /* report details */ }
      }
    ]
  }
  ```

**`POST /api/admin/approve-report`**
- **Purpose:** Approve pending report
- **Auth:** Requires admin JWT + CSRF token
- **Body:**
  ```json
  {
    "reportId": 123,
    "reportType": "danger_zone",
    "adminNotes": "Verified via source URL"
  }
  ```
- **Response:** `{ "success": true }`

**`POST /api/admin/reject-report`**
- **Purpose:** Reject pending report
- **Auth:** Requires admin JWT + CSRF token
- **Body:**
  ```json
  {
    "reportId": 123,
    "reportType": "danger_zone",
    "reason": "Duplicate submission",
    "notifyUser": true
  }
  ```
- **Response:** `{ "success": true }`

**`POST /api/admin/flag-report`**
- **Purpose:** Flag report for review
- **Auth:** Requires admin JWT + CSRF token
- **Body:**
  ```json
  {
    "reportId": 123,
    "reportType": "danger_zone",
    "flagReason": "suspicious_location",
    "severity": "medium"
  }
  ```
- **Response:** `{ "success": true, "flagId": 456 }`

**`PUT /api/admin/edit-report`**
- **Purpose:** Edit existing report
- **Auth:** Requires admin JWT + CSRF token
- **Body:**
  ```json
  {
    "reportId": 123,
    "reportType": "danger_zone",
    "updates": {
      "description": "Updated description",
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "adminNotes": "Corrected location based on source"
  }
  ```
- **Response:** `{ "success": true }`

**`POST /api/admin/bulk-report-action`**
- **Purpose:** Perform bulk operations on reports
- **Auth:** Requires admin JWT + CSRF token
- **Body:**
  ```json
  {
    "reports": [
      { "reportId": 123, "reportType": "danger_zone" },
      { "reportId": 124, "reportType": "danger_zone" }
    ],
    "action": "approve", // or "reject", "flag", "delete"
    "params": { "reason": "Verified batch" }
  }
  ```
- **Response:** `{ "success": true, "affected": 2 }`

#### Data Integrity

**`GET /api/admin/duplicate-reports`**
- **Purpose:** Find potential duplicate reports
- **Auth:** Requires admin JWT
- **Query Params:** `reportType`, `threshold` (similarity score)
- **Response:**
  ```json
  {
    "duplicates": [
      {
        "group": [
          { "reportId": 123, "reportType": "danger_zone", "score": 0.95 },
          { "reportId": 124, "reportType": "danger_zone", "score": 0.95 }
        ],
        "reason": "Same location and date"
      }
    ]
  }
  ```

**`GET /api/admin/anomalous-reports`**
- **Purpose:** Get reports flagged by anomaly detection
- **Auth:** Requires admin JWT
- **Response:**
  ```json
  {
    "anomalies": [
      {
        "reportId": 123,
        "reportType": "danger_zone",
        "anomalyType": "impossible_travel",
        "score": 0.92,
        "details": "User submitted from NYC at 10am, LA at 10:15am"
      }
    ]
  }
  ```

**`POST /api/admin/merge-reports`**
- **Purpose:** Merge duplicate reports
- **Auth:** Requires admin JWT + CSRF token
- **Body:**
  ```json
  {
    "primaryReportId": 123,
    "duplicateReportIds": [124, 125],
    "reportType": "danger_zone"
  }
  ```
- **Response:** `{ "success": true }`

#### Security Monitoring

**`GET /api/admin/security-events`**
- **Purpose:** Get security event dashboard data
- **Auth:** Requires admin JWT
- **Query Params:** `startDate`, `endDate`, `severity`
- **Response:**
  ```json
  {
    "events": [
      {
        "eventId": 123,
        "type": "rate_limit_exceeded",
        "severity": "medium",
        "ipAddress": "192.168.1.1",
        "timestamp": "2025-12-08T11:00:00Z",
        "details": { "endpoint": "/api/extension-submit", "count": 50 }
      }
    ],
    "summary": {
      "totalEvents": 250,
      "criticalEvents": 5,
      "blockedIPs": 12
    }
  }
  ```

**`GET /api/admin/blocked-ips`**
- **Purpose:** List blocked IP addresses
- **Auth:** Requires admin JWT
- **Response:**
  ```json
  {
    "blockedIPs": [
      {
        "ipAddress": "192.168.1.1",
        "reason": "Repeated failed login attempts",
        "blockedAt": "2025-12-08T10:00:00Z",
        "expiresAt": "2025-12-15T10:00:00Z",
        "permanent": false
      }
    ]
  }
  ```

**`POST /api/admin/block-ip`**
- **Purpose:** Manually block IP address
- **Auth:** Requires admin JWT + CSRF token
- **Body:**
  ```json
  {
    "ipAddress": "192.168.1.1",
    "reason": "Malicious activity",
    "duration": "7d" // or "permanent"
  }
  ```
- **Response:** `{ "success": true }`

**`DELETE /api/admin/unblock-ip/:ipAddress`**
- **Purpose:** Unblock IP address
- **Auth:** Requires admin JWT + CSRF token
- **Response:** `{ "success": true }`

#### System Statistics

**`GET /api/admin/stats/advanced`**
- **Purpose:** Get comprehensive statistics with time-series data
- **Auth:** Requires admin JWT
- **Query Params:** `period` (7d, 30d, 90d)
- **Response:**
  ```json
  {
    "overview": {
      "totalUsers": 1500,
      "totalReports": 5000,
      "activeUsers30d": 450,
      "growthRate": 0.15
    },
    "timeSeries": {
      "newUsers": [ /* 7-day data */ ],
      "newReports": [ /* 7-day data */ ],
      "extensionSubmissions": [ /* 7-day data */ ]
    },
    "reportBreakdown": {
      "danger_zones": 2500,
      "lost_pets": 1500,
      "found_pets": 800,
      "dangerous_animals": 200
    },
    "security": {
      "failedLogins24h": 15,
      "blockedIPs": 5,
      "suspendedUsers": 10
    }
  }
  ```

**`GET /api/admin/stats/extension`**
- **Purpose:** Get browser extension submission statistics
- **Auth:** Requires admin JWT
- **Response:**
  ```json
  {
    "totalSubmissions": 500,
    "pendingSubmissions": 25,
    "completedSubmissions": 450,
    "rejectedSubmissions": 25,
    "successRate": 0.90,
    "avgCompletionTime": "4.5 hours"
  }
  ```

#### Data Export

**`GET /api/admin/export/users`**
- **Purpose:** Export user data as CSV/JSON
- **Auth:** Requires admin JWT
- **Query Params:** `format` (csv, json), filters
- **Response:** File download

**`GET /api/admin/export/reports`**
- **Purpose:** Export report data as CSV/JSON
- **Auth:** Requires admin JWT
- **Query Params:** `format`, `reportType`, filters
- **Response:** File download

**`GET /api/admin/export/audit-log`**
- **Purpose:** Export audit log
- **Auth:** Requires admin JWT
- **Query Params:** `format`, date range
- **Response:** File download

---

## DATABASE MIGRATION PLAN

### New Tables Required

#### 1. admin_sessions

```sql
CREATE TABLE admin_sessions (
    session_id TEXT PRIMARY KEY,
    admin_user TEXT NOT NULL,
    device_info TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0,
    revoked_at TEXT,
    revoked_reason TEXT
);

CREATE INDEX idx_sessions_admin ON admin_sessions(admin_user);
CREATE INDEX idx_sessions_revoked ON admin_sessions(revoked);
CREATE INDEX idx_sessions_expires ON admin_sessions(expires_at);
```

#### 2. admin_audit_log

```sql
CREATE TABLE admin_audit_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user TEXT NOT NULL,
    action TEXT NOT NULL, -- 'create_user', 'delete_user', 'update_role', etc.
    target_type TEXT, -- 'user', 'report', 'setting', etc.
    target_id TEXT,
    details TEXT, -- JSON string with action details
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES admin_sessions(session_id)
);

CREATE INDEX idx_audit_admin ON admin_audit_log(admin_user);
CREATE INDEX idx_audit_action ON admin_audit_log(action);
CREATE INDEX idx_audit_timestamp ON admin_audit_log(timestamp);
CREATE INDEX idx_audit_target ON admin_audit_log(target_type, target_id);
```

#### 3. csrf_tokens

```sql
CREATE TABLE csrf_tokens (
    token TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    used_at TEXT,
    FOREIGN KEY (session_id) REFERENCES admin_sessions(session_id)
);

CREATE INDEX idx_csrf_session ON csrf_tokens(session_id);
CREATE INDEX idx_csrf_expires ON csrf_tokens(expires_at);
```

#### 4. rate_limit_tracking

```sql
CREATE TABLE rate_limit_tracking (
    tracking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TEXT NOT NULL,
    window_end TEXT NOT NULL,
    blocked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ratelimit_ip ON rate_limit_tracking(ip_address);
CREATE INDEX idx_ratelimit_endpoint ON rate_limit_tracking(endpoint);
CREATE INDEX idx_ratelimit_window ON rate_limit_tracking(window_end);
```

#### 5. blocked_ips

```sql
CREATE TABLE blocked_ips (
    block_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    blocked_by TEXT, -- admin username
    blocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    permanent INTEGER DEFAULT 0,
    unblocked INTEGER DEFAULT 0,
    unblocked_at TEXT,
    unblocked_by TEXT
);

CREATE INDEX idx_blocked_ip ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_expires ON blocked_ips(expires_at);
CREATE INDEX idx_blocked_active ON blocked_ips(unblocked);
```

#### 6. report_flags

```sql
CREATE TABLE report_flags (
    flag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL, -- 'danger_zone', 'lost_pet', etc.
    report_id INTEGER NOT NULL,
    flag_reason TEXT NOT NULL,
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    flagged_by TEXT, -- admin username or 'system'
    flagged_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved INTEGER DEFAULT 0,
    resolved_at TEXT,
    resolved_by TEXT,
    resolution_notes TEXT
);

CREATE INDEX idx_flags_report ON report_flags(report_type, report_id);
CREATE INDEX idx_flags_resolved ON report_flags(resolved);
CREATE INDEX idx_flags_severity ON report_flags(severity);
```

#### 7. report_history

```sql
CREATE TABLE report_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL,
    report_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'created', 'edited', 'approved', 'rejected', 'deleted'
    changed_by TEXT, -- user_id or admin username
    changes TEXT, -- JSON string of what changed
    admin_notes TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_report ON report_history(report_type, report_id);
CREATE INDEX idx_history_timestamp ON report_history(timestamp);
```

#### 8. user_activity_log

```sql
CREATE TABLE user_activity_log (
    activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'login', 'submit_report', 'update_profile', etc.
    resource_type TEXT, -- 'report', 'profile', etc.
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_activity_user ON user_activity_log(user_id);
CREATE INDEX idx_activity_timestamp ON user_activity_log(timestamp);
CREATE INDEX idx_activity_action ON user_activity_log(action);
```

#### 9. security_events

```sql
CREATE TABLE security_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- 'rate_limit_exceeded', 'suspicious_pattern', 'xss_attempt', etc.
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    ip_address TEXT,
    user_id TEXT,
    endpoint TEXT,
    details TEXT, -- JSON string
    auto_blocked INTEGER DEFAULT 0,
    reviewed INTEGER DEFAULT 0,
    reviewed_by TEXT,
    reviewed_at TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_type ON security_events(event_type);
CREATE INDEX idx_security_severity ON security_events(severity);
CREATE INDEX idx_security_timestamp ON security_events(timestamp);
CREATE INDEX idx_security_ip ON security_events(ip_address);
```

#### 10. user_reputation

```sql
CREATE TABLE user_reputation (
    user_id TEXT PRIMARY KEY,
    reputation_score INTEGER DEFAULT 100, -- 0-100 scale
    total_reports INTEGER DEFAULT 0,
    approved_reports INTEGER DEFAULT 0,
    rejected_reports INTEGER DEFAULT 0,
    flagged_reports INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    spam_flags INTEGER DEFAULT 0,
    last_calculated TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_reputation_score ON user_reputation(reputation_score);
```

### Modifications to Existing Tables

#### users table

```sql
-- Add new columns
ALTER TABLE users ADD COLUMN suspended INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN suspended_until TEXT;
ALTER TABLE users ADD COLUMN suspended_reason TEXT;
ALTER TABLE users ADD COLUMN last_login TEXT;
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_password_change TEXT;
```

#### pending_submissions table

```sql
-- Add status tracking
ALTER TABLE pending_submissions ADD COLUMN status TEXT DEFAULT 'pending'; -- 'pending', 'approved', 'rejected', 'completed'
ALTER TABLE pending_submissions ADD COLUMN reviewed_by TEXT;
ALTER TABLE pending_submissions ADD COLUMN reviewed_at TEXT;
ALTER TABLE pending_submissions ADD COLUMN rejection_reason TEXT;
```

#### All report tables (trapper_blips, lost_pets, found_pets, dangerous_animals)

```sql
-- For trapper_blips
ALTER TABLE trapper_blips ADD COLUMN status TEXT DEFAULT 'approved'; -- 'pending', 'approved', 'rejected', 'flagged'
ALTER TABLE trapper_blips ADD COLUMN approved_by TEXT;
ALTER TABLE trapper_blips ADD COLUMN approved_at TEXT;
ALTER TABLE trapper_blips ADD COLUMN flagged INTEGER DEFAULT 0;
ALTER TABLE trapper_blips ADD COLUMN deleted INTEGER DEFAULT 0;
ALTER TABLE trapper_blips ADD COLUMN deleted_at TEXT;
ALTER TABLE trapper_blips ADD COLUMN deleted_by TEXT;

-- Repeat for lost_pets, found_pets, dangerous_animals
-- (Same columns for each table)
```

### Migration Script

Create `/home/hobo/Desktop/tt/migrations/001_admin_panel_enhancement.sql`:

```sql
-- Migration 001: Admin Panel Enhancement
-- Date: 2025-12-08
-- Purpose: Add comprehensive admin panel features

BEGIN TRANSACTION;

-- Create new tables
-- [Include all CREATE TABLE statements above]

-- Modify existing tables
-- [Include all ALTER TABLE statements above]

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(suspended);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_submissions(status);
CREATE INDEX IF NOT EXISTS idx_pending_reviewed ON pending_submissions(reviewed_at);

CREATE INDEX IF NOT EXISTS idx_blips_status ON trapper_blips(status);
CREATE INDEX IF NOT EXISTS idx_blips_deleted ON trapper_blips(deleted);

-- Initialize reputation scores for existing users
INSERT INTO user_reputation (user_id, total_reports)
SELECT u.user_id,
       (SELECT COUNT(*) FROM trapper_blips WHERE reported_by_user_id = u.user_id)
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_reputation WHERE user_id = u.user_id);

COMMIT;
```

---

## SECURITY IMPLEMENTATION SPECIFICATIONS

### 1. CSRF Protection

**Implementation Strategy:**

```javascript
// functions/api/admin/csrf-token.js
import { verifyAdminToken, unauthorizedResponse } from './auth-helper.js';
import { randomBytes } from 'crypto';

export async function onRequestGet({ request, env }) {
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) return unauthorizedResponse();

    const sessionId = adminPayload.sessionId;

    // Generate cryptographically secure token
    const csrfToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store token in database
    await env.DB.prepare(`
        INSERT INTO csrf_tokens (token, session_id, expires_at)
        VALUES (?, ?, ?)
    `).bind(csrfToken, sessionId, expiresAt).run();

    return new Response(JSON.stringify({ csrfToken, expiresAt }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

**Middleware for CSRF Validation:**

```javascript
// functions/api/admin/csrf-middleware.js
export async function validateCSRF(request, env) {
    const csrfToken = request.headers.get('X-CSRF-Token');

    if (!csrfToken) {
        return { valid: false, error: 'CSRF token required' };
    }

    // Verify token exists and not expired
    const token = await env.DB.prepare(`
        SELECT * FROM csrf_tokens
        WHERE token = ? AND used = 0 AND expires_at > datetime('now')
    `).bind(csrfToken).first();

    if (!token) {
        return { valid: false, error: 'Invalid or expired CSRF token' };
    }

    // Mark token as used (one-time use)
    await env.DB.prepare(`
        UPDATE csrf_tokens
        SET used = 1, used_at = datetime('now')
        WHERE token = ?
    `).bind(csrfToken).run();

    return { valid: true };
}
```

**Usage in Endpoints:**

```javascript
// Example: functions/api/admin/delete-user.js
import { validateCSRF } from './csrf-middleware.js';

export async function onRequestDelete({ request, env }) {
    // Verify admin auth
    const adminPayload = await verifyAdminToken(request, env);
    if (!adminPayload) return unauthorizedResponse();

    // Validate CSRF token
    const csrfCheck = await validateCSRF(request, env);
    if (!csrfCheck.valid) {
        return new Response(JSON.stringify({ error: csrfCheck.error }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Proceed with deletion...
}
```

### 2. Persistent Rate Limiting

**IP-Based Rate Limiting with D1:**

```javascript
// functions/api/admin/rate-limit-middleware.js

const RATE_LIMITS = {
    '/api/extension-submit': { window: 60, maxRequests: 10 }, // 10 req/min
    '/api/admin/delete-user': { window: 60, maxRequests: 5 },  // 5 req/min
    '/api/admin/update-user-role': { window: 60, maxRequests: 10 },
    '/api/report': { window: 60, maxRequests: 5 },
    'default': { window: 60, maxRequests: 60 } // 60 req/min for other endpoints
};

export async function checkRateLimit(request, env, endpoint) {
    const ipAddress = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For') ||
                     'unknown';

    // Check if IP is blocked
    const blocked = await env.DB.prepare(`
        SELECT * FROM blocked_ips
        WHERE ip_address = ?
        AND unblocked = 0
        AND (permanent = 1 OR expires_at > datetime('now'))
    `).bind(ipAddress).first();

    if (blocked) {
        await logSecurityEvent(env, {
            eventType: 'blocked_ip_attempt',
            severity: 'high',
            ipAddress,
            endpoint,
            details: JSON.stringify({ reason: blocked.reason })
        });

        return {
            allowed: false,
            error: 'IP address blocked due to suspicious activity',
            resetAt: blocked.expires_at
        };
    }

    // Get rate limit config for endpoint
    const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
    const windowStart = new Date(Date.now() - config.window * 1000).toISOString();
    const windowEnd = new Date().toISOString();

    // Get or create rate limit tracking
    const tracking = await env.DB.prepare(`
        SELECT * FROM rate_limit_tracking
        WHERE ip_address = ?
        AND endpoint = ?
        AND window_end > ?
        ORDER BY window_end DESC
        LIMIT 1
    `).bind(ipAddress, endpoint, windowStart).first();

    if (tracking && tracking.request_count >= config.maxRequests) {
        // Rate limit exceeded
        const resetAt = new Date(new Date(tracking.window_end).getTime() + config.window * 1000).toISOString();

        // Auto-block if excessive violations
        if (tracking.request_count > config.maxRequests * 3) {
            await autoBlockIP(env, ipAddress, 'Excessive rate limit violations', '1h');
        }

        await logSecurityEvent(env, {
            eventType: 'rate_limit_exceeded',
            severity: 'medium',
            ipAddress,
            endpoint,
            details: JSON.stringify({
                requestCount: tracking.request_count,
                limit: config.maxRequests
            })
        });

        return {
            allowed: false,
            error: 'Rate limit exceeded',
            limit: config.maxRequests,
            resetAt
        };
    }

    // Update or create tracking record
    if (tracking) {
        await env.DB.prepare(`
            UPDATE rate_limit_tracking
            SET request_count = request_count + 1,
                updated_at = datetime('now')
            WHERE tracking_id = ?
        `).bind(tracking.tracking_id).run();
    } else {
        await env.DB.prepare(`
            INSERT INTO rate_limit_tracking
            (ip_address, endpoint, request_count, window_start, window_end)
            VALUES (?, ?, 1, ?, ?)
        `).bind(ipAddress, endpoint, windowStart, windowEnd).run();
    }

    return { allowed: true };
}

async function autoBlockIP(env, ipAddress, reason, duration) {
    const expiresAt = duration === 'permanent'
        ? null
        : new Date(Date.now() + parseDuration(duration)).toISOString();

    await env.DB.prepare(`
        INSERT INTO blocked_ips (ip_address, reason, expires_at, permanent, blocked_by)
        VALUES (?, ?, ?, ?, 'system')
    `).bind(ipAddress, reason, expiresAt, duration === 'permanent' ? 1 : 0).run();

    await logSecurityEvent(env, {
        eventType: 'ip_auto_blocked',
        severity: 'high',
        ipAddress,
        details: JSON.stringify({ reason, duration })
    });
}

function parseDuration(duration) {
    const units = { m: 60000, h: 3600000, d: 86400000 };
    const match = duration.match(/^(\d+)([mhd])$/);
    if (!match) return 3600000; // default 1 hour
    return parseInt(match[1]) * units[match[2]];
}

async function logSecurityEvent(env, event) {
    await env.DB.prepare(`
        INSERT INTO security_events
        (event_type, severity, ip_address, endpoint, details, timestamp)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
        event.eventType,
        event.severity,
        event.ipAddress,
        event.endpoint || null,
        event.details
    ).run();
}
```

### 3. Session Management

**Enhanced JWT with Session Tracking:**

```javascript
// functions/api/admin-login/index.js (enhanced)
import { randomUUID } from 'crypto';

export async function onRequestPost({ request, env }) {
    // ... existing auth logic ...

    if (usernameMatch && passwordMatch) {
        const sessionId = randomUUID();
        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
        const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
        const userAgent = request.headers.get('User-Agent') || 'unknown';

        // Create session record
        await env.DB.prepare(`
            INSERT INTO admin_sessions
            (session_id, admin_user, device_info, user_agent, ip_address, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(sessionId, adminUsername, extractDeviceInfo(userAgent), userAgent, ipAddress, expiresAt).run();

        // Create JWT with session ID
        const token = await new jose.SignJWT({
            userId: 'admin',
            role: 'admin',
            username: adminUsername,
            sessionId: sessionId
        })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(JWT_SECRET);

        // Log successful login to audit trail
        await env.DB.prepare(`
            INSERT INTO admin_audit_log
            (admin_user, action, details, ip_address, user_agent, session_id)
            VALUES (?, 'admin_login', ?, ?, ?, ?)
        `).bind(
            adminUsername,
            JSON.stringify({ success: true }),
            ipAddress,
            userAgent,
            sessionId
        ).run();

        // ... return response with token ...
    }
}

function extractDeviceInfo(userAgent) {
    // Simple device/browser extraction
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
}
```

**Enhanced Token Verification:**

```javascript
// functions/api/admin/auth-helper.js (enhanced)
export async function verifyAdminToken(request, env) {
    try {
        const cookies = request.headers.get('Cookie') || '';
        const adminTokenCookie = cookies.split(';').find(c => c.trim().startsWith('admin_token='));
        if (!adminTokenCookie) return null;

        const token = adminTokenCookie.split('=')[1];
        if (!token) return null;

        const JWT_SECRET = getJwtSecret(env);
        const { payload } = await jose.jwtVerify(token, JWT_SECRET);

        if (payload.role !== 'admin') return null;

        // Verify session hasn't been revoked
        const session = await env.DB.prepare(`
            SELECT * FROM admin_sessions
            WHERE session_id = ? AND revoked = 0 AND expires_at > datetime('now')
        `).bind(payload.sessionId).first();

        if (!session) {
            console.warn(`Revoked or expired session: ${payload.sessionId}`);
            return null;
        }

        // Update last activity
        await env.DB.prepare(`
            UPDATE admin_sessions
            SET last_activity = datetime('now')
            WHERE session_id = ?
        `).bind(payload.sessionId).run();

        return payload;
    } catch (error) {
        console.error('Admin token verification failed:', error.message);
        return null;
    }
}
```

### 4. Comprehensive Audit Logging

**Audit Logging Middleware:**

```javascript
// functions/api/admin/audit-middleware.js

export async function logAdminAction(env, adminPayload, action, targetType, targetId, details) {
    const ipAddress = details.ipAddress || 'unknown';
    const userAgent = details.userAgent || 'unknown';

    await env.DB.prepare(`
        INSERT INTO admin_audit_log
        (admin_user, action, target_type, target_id, details, ip_address, user_agent, session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        adminPayload.username,
        action,
        targetType,
        targetId,
        JSON.stringify(details.data || {}),
        ipAddress,
        userAgent,
        adminPayload.sessionId
    ).run();
}

// Usage example in delete-user.js:
await logAdminAction(env, adminPayload, 'delete_user', 'user', userId, {
    ipAddress: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
    data: { email: userExists.email }
});
```

### 5. Enhanced Input Validation

**Validation Schema Library:**

```javascript
// functions/api/admin/validation-schemas.js

export const schemas = {
    extensionSubmission: {
        description: {
            type: 'string',
            minLength: 10,
            maxLength: 1000,
            required: true,
            sanitize: true,
            pattern: /^[a-zA-Z0-9\s\.,;:!?'"()\-]+$/ // Alphanumeric + common punctuation
        },
        sourceURL: {
            type: 'string',
            minLength: 10,
            maxLength: 500,
            required: true,
            sanitize: true,
            pattern: /^https?:\/\/.+$/
        },
        dateReported: {
            type: 'string',
            required: true,
            pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
            validate: (value) => {
                const date = new Date(value);
                const now = new Date();
                const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                return date <= now && date >= oneYearAgo;
            }
        },
        latitude: {
            type: 'number',
            required: false,
            min: -90,
            max: 90
        },
        longitude: {
            type: 'number',
            required: false,
            min: -180,
            max: 180
        }
    },

    userUpdate: {
        userId: {
            type: 'string',
            required: true,
            pattern: /^[a-zA-Z0-9\-_]+$/,
            minLength: 1,
            maxLength: 100
        },
        role: {
            type: 'string',
            required: true,
            enum: ['user', 'enforcement', 'admin']
        }
    },

    reportEdit: {
        reportId: {
            type: 'number',
            required: true,
            min: 1
        },
        reportType: {
            type: 'string',
            required: true,
            enum: ['danger_zone', 'lost_pet', 'found_pet', 'dangerous_animal']
        },
        updates: {
            type: 'object',
            required: true,
            validate: (value) => {
                return Object.keys(value).length > 0 && Object.keys(value).length <= 10;
            }
        }
    }
};

export function validateInput(data, schemaName) {
    const schema = schemas[schemaName];
    if (!schema) throw new Error(`Unknown schema: ${schemaName}`);

    const errors = [];
    const sanitized = {};

    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];

        // Check required
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field} is required`);
            continue;
        }

        // Skip validation if optional and not provided
        if (!rules.required && (value === undefined || value === null)) {
            continue;
        }

        // Type validation
        if (rules.type && typeof value !== rules.type) {
            errors.push(`${field} must be of type ${rules.type}`);
            continue;
        }

        // String validations
        if (rules.type === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`${field} must be at least ${rules.minLength} characters`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`${field} must be at most ${rules.maxLength} characters`);
            }
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(`${field} has invalid format`);
            }
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
            }
        }

        // Number validations
        if (rules.type === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`${field} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
                errors.push(`${field} must be at most ${rules.max}`);
            }
        }

        // Custom validation
        if (rules.validate && !rules.validate(value)) {
            errors.push(`${field} validation failed`);
        }

        // Sanitization
        if (rules.sanitize && rules.type === 'string') {
            sanitized[field] = sanitizeHTML(value);
        } else {
            sanitized[field] = value;
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        data: sanitized
    };
}

function sanitizeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"/]/g, function (tag) {
        const tagsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#x27;',
            '"': '&quot;',
            '/': '&#x2F;',
        };
        return tagsToReplace[tag] || tag;
    });
}
```

### 6. Malicious Content Detection

```javascript
// functions/api/admin/content-filter.js

const SUSPICIOUS_PATTERNS = {
    // XSS attempts
    xss: [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // event handlers
        /<iframe/gi,
        /document\.cookie/gi,
        /eval\(/gi
    ],

    // SQL injection attempts
    sqlInjection: [
        /(\bor\b|\band\b).*?=.*?=/i,
        /union.*?select/i,
        /drop\s+table/i,
        /insert\s+into/i,
        /delete\s+from/i
    ],

    // Spam patterns
    spam: [
        /(viagra|cialis|pharmacy|casino|poker)/i,
        /https?:\/\/[^\s]{50,}/i, // suspiciously long URLs
        /\b[A-Z]{10,}\b/g // excessive caps
    ],

    // Profanity/abuse
    profanity: [
        // Add common profanity patterns (basic example)
        /\b(badword1|badword2)\b/gi
    ]
};

export function detectMaliciousContent(text) {
    const findings = [];

    for (const [category, patterns] of Object.entries(SUSPICIOUS_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                findings.push({
                    category,
                    pattern: pattern.toString(),
                    severity: category === 'xss' || category === 'sqlInjection' ? 'critical' : 'medium'
                });
            }
        }
    }

    return {
        isMalicious: findings.length > 0,
        findings,
        riskScore: calculateRiskScore(findings)
    };
}

function calculateRiskScore(findings) {
    let score = 0;
    for (const finding of findings) {
        if (finding.severity === 'critical') score += 100;
        else if (finding.severity === 'high') score += 50;
        else if (finding.severity === 'medium') score += 25;
        else score += 10;
    }
    return Math.min(score, 100);
}

export async function logMaliciousContent(env, submission, findings) {
    await env.DB.prepare(`
        INSERT INTO security_events
        (event_type, severity, ip_address, user_id, details)
        VALUES ('malicious_content_detected', ?, ?, ?, ?)
    `).bind(
        findings[0].severity,
        submission.ipAddress || 'unknown',
        submission.userId || null,
        JSON.stringify({ findings, content: submission.description.substring(0, 200) })
    ).run();
}
```

### 7. Duplicate Detection

```javascript
// functions/api/admin/duplicate-detector.js
import { createHash } from 'crypto';

export async function detectDuplicates(env, report) {
    const { reportType, latitude, longitude, description, dateReported } = report;

    // Generate content hash
    const contentHash = createHash('sha256')
        .update(`${description}-${latitude}-${longitude}`)
        .digest('hex');

    // Check for exact duplicates
    const exactDuplicates = await findExactDuplicates(env, contentHash, reportType);

    // Check for near-duplicates (same location + similar time)
    const nearDuplicates = await findNearDuplicates(env, {
        reportType,
        latitude,
        longitude,
        dateReported
    });

    return {
        hasExactDuplicate: exactDuplicates.length > 0,
        hasNearDuplicate: nearDuplicates.length > 0,
        exactDuplicates,
        nearDuplicates,
        contentHash
    };
}

async function findExactDuplicates(env, contentHash, reportType) {
    // Would need to add content_hash column to report tables
    const table = getTableName(reportType);

    const { results } = await env.DB.prepare(`
        SELECT * FROM ${table}
        WHERE content_hash = ?
        LIMIT 10
    `).bind(contentHash).all();

    return results || [];
}

async function findNearDuplicates(env, params) {
    const { reportType, latitude, longitude, dateReported } = params;
    const table = getTableName(reportType);
    const idField = getIdField(reportType);

    // Find reports within 100m radius and within 24 hours
    const latThreshold = 0.0009; // ~100m
    const lngThreshold = 0.0009;
    const reportDate = new Date(dateReported);
    const dayBefore = new Date(reportDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const dayAfter = new Date(reportDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { results } = await env.DB.prepare(`
        SELECT *,
               ABS(latitude - ?) as lat_diff,
               ABS(longitude - ?) as lng_diff
        FROM ${table}
        WHERE deleted = 0
        AND latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        AND created_at BETWEEN ? AND ?
        LIMIT 10
    `).bind(
        latitude,
        longitude,
        latitude - latThreshold,
        latitude + latThreshold,
        longitude - lngThreshold,
        longitude + lngThreshold,
        dayBefore,
        dayAfter
    ).all();

    return results || [];
}

function getTableName(reportType) {
    const tables = {
        'danger_zone': 'trapper_blips',
        'lost_pet': 'lost_pets',
        'found_pet': 'found_pets',
        'dangerous_animal': 'dangerous_animals'
    };
    return tables[reportType] || 'trapper_blips';
}

function getIdField(reportType) {
    const fields = {
        'danger_zone': 'blip_id',
        'lost_pet': 'pet_id',
        'found_pet': 'found_pet_id',
        'dangerous_animal': 'danger_id'
    };
    return fields[reportType] || 'blip_id';
}
```

---

## UI/UX DESIGN SPECIFICATIONS

### Admin Dashboard Layout

**Navigation Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  TrapperTracker Admin  |  admin@trappertracker.com  [Logout]│
├─────────────────────────────────────────────────────────────┤
│ [Dashboard] [Users] [Reports] [Pending] [Security] [System] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Dashboard Content - Stats, Charts, Recent Activity]       │
│                                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 1. Enhanced Stats Dashboard

**File:** `/home/hobo/Desktop/tt/public/admin-dashboard-v2.html`

**Features:**
- Real-time metrics with auto-refresh (30s interval)
- Time-series charts (7-day trends)
- Security alerts widget
- Quick actions panel
- Recent activity feed

**Stats Widgets:**
```html
<div class="stats-grid grid grid-cols-2 md:grid-cols-4 gap-4">
    <!-- User Stats -->
    <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">1,234</div>
        <div class="stat-label">Total Users</div>
        <div class="stat-trend positive">+15%</div>
    </div>

    <!-- Report Stats -->
    <div class="stat-card">
        <div class="stat-icon">📍</div>
        <div class="stat-value">5,678</div>
        <div class="stat-label">Total Reports</div>
        <div class="stat-trend positive">+8%</div>
    </div>

    <!-- Security Stats -->
    <div class="stat-card alert">
        <div class="stat-icon">🛡️</div>
        <div class="stat-value">12</div>
        <div class="stat-label">Security Events</div>
        <div class="stat-trend negative">↑ 3 new</div>
    </div>

    <!-- Pending Stats -->
    <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">45</div>
        <div class="stat-label">Pending Review</div>
        <div class="stat-action">[Review Now]</div>
    </div>
</div>
```

#### 2. User Management Interface

**Features:**
- Advanced search with multiple filters
- Bulk selection with actions toolbar
- Inline role editing
- User detail modal with activity history
- Suspension interface

**Table Layout:**
```html
<div class="user-management">
    <!-- Filters & Search -->
    <div class="filters-bar">
        <input type="search" placeholder="Search by email...">
        <select id="roleFilter">
            <option>All Roles</option>
            <option>User</option>
            <option>Enforcement</option>
            <option>Admin</option>
        </select>
        <select id="statusFilter">
            <option>All Statuses</option>
            <option>Active</option>
            <option>Suspended</option>
            <option>Unverified</option>
        </select>
        <button id="clearFilters">Clear</button>
    </div>

    <!-- Bulk Actions Toolbar (hidden by default) -->
    <div class="bulk-actions hidden">
        <span>3 users selected</span>
        <button>Change Role</button>
        <button>Suspend</button>
        <button class="danger">Delete</button>
    </div>

    <!-- Users Table -->
    <table class="admin-table">
        <thead>
            <tr>
                <th><input type="checkbox" id="selectAll"></th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Reports</th>
                <th>Reputation</th>
                <th>Joined</th>
                <th>Last Active</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="usersTableBody">
            <!-- Populated via JS -->
        </tbody>
    </table>

    <!-- Pagination -->
    <div class="pagination">
        <button id="prevPage">← Previous</button>
        <span>Page 1 of 10</span>
        <button id="nextPage">Next →</button>
    </div>
</div>
```

#### 3. Report Moderation Interface

**Features:**
- Tabbed view: All | Pending | Flagged | Approved | Rejected
- Map preview for location-based reports
- Side-by-side source comparison (for extension submissions)
- Quick approve/reject buttons
- Bulk moderation actions
- Edit report modal

**Layout:**
```html
<div class="report-moderation">
    <!-- Status Tabs -->
    <div class="status-tabs">
        <button class="tab active" data-status="all">All (234)</button>
        <button class="tab" data-status="pending">Pending (45)</button>
        <button class="tab" data-status="flagged">Flagged (12)</button>
        <button class="tab" data-status="approved">Approved (150)</button>
        <button class="tab" data-status="rejected">Rejected (27)</button>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
        <select id="reportTypeFilter">
            <option>All Types</option>
            <option>Danger Zones</option>
            <option>Lost Pets</option>
            <option>Found Pets</option>
            <option>Dangerous Animals</option>
        </select>
        <input type="date" id="dateFrom" placeholder="From">
        <input type="date" id="dateTo" placeholder="To">
        <select id="reporterFilter">
            <option>All Reporters</option>
            <option>Extension Submissions</option>
            <option>Manual Submissions</option>
        </select>
    </div>

    <!-- Reports Grid/List -->
    <div id="reportsList" class="reports-list">
        <!-- Report Card Example -->
        <div class="report-card pending">
            <div class="report-header">
                <span class="report-type danger-zone">Danger Zone</span>
                <span class="report-id">#1234</span>
                <span class="report-status">Pending Review</span>
            </div>
            <div class="report-body">
                <div class="report-info">
                    <p class="description">Found trap at trail entrance...</p>
                    <div class="metadata">
                        <span>📍 40.7128, -74.0060</span>
                        <span>👤 user@example.com</span>
                        <span>🕐 2 hours ago</span>
                        <span>🔗 <a href="#">Source URL</a></span>
                    </div>
                </div>
                <div class="report-map">
                    <!-- Mini map preview -->
                    <div id="map-1234" class="mini-map"></div>
                </div>
            </div>
            <div class="report-actions">
                <button class="approve">✓ Approve</button>
                <button class="reject">✗ Reject</button>
                <button class="edit">✏️ Edit</button>
                <button class="flag">🚩 Flag</button>
                <button class="delete danger">🗑️ Delete</button>
            </div>
        </div>
    </div>
</div>
```

#### 4. Pending Submissions Integration

**Enhanced pending-submissions.html:**
- Move pending submissions into main admin dashboard
- Add batch completion workflow
- Geocoding API integration for address search
- Approval/rejection workflow

#### 5. Security Dashboard

**Features:**
- Real-time security event stream
- Blocked IPs management
- Rate limit monitoring
- Failed login attempts tracker
- Suspicious activity alerts

**Layout:**
```html
<div class="security-dashboard">
    <!-- Security Metrics -->
    <div class="security-metrics grid grid-cols-3 gap-4">
        <div class="metric-card">
            <h3>Failed Logins (24h)</h3>
            <div class="metric-value">15</div>
            <div class="metric-chart">[Mini chart]</div>
        </div>
        <div class="metric-card alert">
            <h3>Blocked IPs</h3>
            <div class="metric-value">5</div>
            <div class="metric-action">[Manage]</div>
        </div>
        <div class="metric-card">
            <h3>Security Events</h3>
            <div class="metric-value">42</div>
            <div class="metric-breakdown">
                3 Critical | 12 High | 27 Medium
            </div>
        </div>
    </div>

    <!-- Recent Security Events -->
    <div class="security-events">
        <h3>Recent Security Events</h3>
        <div class="event-stream">
            <div class="event critical">
                <span class="event-time">2 min ago</span>
                <span class="event-type">XSS Attempt Detected</span>
                <span class="event-ip">192.168.1.100</span>
                <button>Block IP</button>
            </div>
            <!-- More events -->
        </div>
    </div>

    <!-- Blocked IPs Management -->
    <div class="blocked-ips">
        <h3>Blocked IP Addresses</h3>
        <table>
            <thead>
                <tr>
                    <th>IP Address</th>
                    <th>Reason</th>
                    <th>Blocked At</th>
                    <th>Expires</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="blockedIPsList">
                <!-- Populated via JS -->
            </tbody>
        </table>
    </div>
</div>
```

#### 6. Audit Log Viewer

**Features:**
- Comprehensive action history
- Advanced filtering
- Export functionality
- Action rollback (where applicable)

**Layout:**
```html
<div class="audit-log-viewer">
    <!-- Filters -->
    <div class="audit-filters">
        <input type="search" placeholder="Search logs...">
        <select id="actionFilter">
            <option>All Actions</option>
            <option>User Management</option>
            <option>Report Moderation</option>
            <option>Security Events</option>
            <option>Settings Changes</option>
        </select>
        <input type="date" id="auditDateFrom">
        <input type="date" id="auditDateTo">
        <button>Export CSV</button>
    </div>

    <!-- Audit Log Table -->
    <table class="audit-table">
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>IP Address</th>
                <th>Details</th>
            </tr>
        </thead>
        <tbody id="auditLogBody">
            <!-- Example Row -->
            <tr>
                <td>2025-12-08 11:30:45</td>
                <td>admin@trappertracker.com</td>
                <td>delete_user</td>
                <td>user@example.com</td>
                <td>192.168.1.1</td>
                <td><button>View Details</button></td>
            </tr>
        </tbody>
    </table>
</div>
```

### Responsive Design Considerations

**Mobile Breakpoints:**
- Desktop: 1024px+
- Tablet: 768px - 1023px
- Mobile: < 768px

**Mobile Optimizations:**
- Hamburger menu for navigation
- Collapsible filter sections
- Card-based layout instead of tables on small screens
- Touch-friendly buttons (min 44x44px)
- Simplified stats dashboard (2 columns instead of 4)

---

## IMPLEMENTATION ROADMAP

### Phase 1: Critical Security & Core Features (3 weeks)

**Week 1: Security Foundation**
- [ ] Implement CSRF protection system
- [ ] Build persistent rate limiting with D1
- [ ] Create IP blocking system
- [ ] Add comprehensive audit logging
- [ ] Enhance session management

**Week 2: User & Report Management**
- [ ] Build pending submissions review interface
- [ ] Implement report approval workflow
- [ ] Add enhanced input validation
- [ ] Create duplicate detection system
- [ ] Build user suspension system

**Week 3: Integration & Testing**
- [ ] Integrate all security features into existing endpoints
- [ ] Add CSRF tokens to all state-changing operations
- [ ] Comprehensive security testing (OWASP Top 10)
- [ ] Load testing for rate limiting
- [ ] User acceptance testing

**Deliverables:**
- Secure admin panel with CSRF protection
- Persistent rate limiting on all critical endpoints
- IP blocking and reputation system
- Complete audit trail for all admin actions
- Report approval workflow

### Phase 2: Enhanced Moderation & Monitoring (2 weeks)

**Week 4: Malicious Content & Anomaly Detection**
- [ ] Implement malicious content detection
- [ ] Build data anomaly detection system
- [ ] Create user reputation scoring
- [ ] Add bulk user operations
- [ ] Add bulk report operations

**Week 5: Security Dashboard & Monitoring**
- [ ] Build security event dashboard
- [ ] Create advanced stats dashboard with charts
- [ ] Implement report flagging system
- [ ] Add user activity history tracking
- [ ] Build report edit capability

**Deliverables:**
- Malicious content filtering
- Security event monitoring dashboard
- Advanced statistics with visualizations
- Bulk moderation capabilities

### Phase 3: Operational Tools & Polish (2 weeks)

**Week 6: Data Management**
- [ ] Build database maintenance tools
- [ ] Implement data export system
- [ ] Create automated alerting (email/webhook)
- [ ] Add performance monitoring
- [ ] Build advanced search/filters

**Week 7: UI Polish & Documentation**
- [ ] Responsive design implementation
- [ ] Add report categories/tags system
- [ ] Build extension submission stats dashboard
- [ ] Create admin user guide
- [ ] API documentation (OpenAPI)

**Deliverables:**
- Complete data export capabilities
- Automated alerting system
- Polished, responsive UI
- Comprehensive documentation

### Phase 4: Advanced Features (Optional - 2 weeks)

**Week 8-9: Future Enhancements**
- [ ] Two-factor authentication (2FA)
- [ ] Admin team management (multiple admins)
- [ ] Data archival system
- [ ] Geo-fencing alerts
- [ ] Report analytics dashboard
- [ ] Custom admin roles with granular permissions

**Deliverables:**
- 2FA for admin accounts
- Multi-admin support
- Advanced analytics

---

## TESTING STRATEGY

### Security Testing Checklist

**OWASP Top 10 Validation:**

1. **Injection (SQL, XSS, Command)**
   - [ ] Test all input fields with SQL injection payloads
   - [ ] Test XSS vectors in description fields
   - [ ] Verify parameterized queries everywhere
   - [ ] Test output encoding

2. **Broken Authentication**
   - [ ] Test session fixation
   - [ ] Test session timeout
   - [ ] Test concurrent session handling
   - [ ] Verify JWT expiration
   - [ ] Test password reset flow

3. **Sensitive Data Exposure**
   - [ ] Verify HTTPS everywhere
   - [ ] Test cookie security flags
   - [ ] Check for sensitive data in logs
   - [ ] Verify password hashing

4. **XML External Entities (XXE)**
   - N/A (no XML processing)

5. **Broken Access Control**
   - [ ] Test horizontal privilege escalation
   - [ ] Test vertical privilege escalation
   - [ ] Verify CSRF protection on all state-changing ops
   - [ ] Test forced browsing to admin endpoints

6. **Security Misconfiguration**
   - [ ] Verify error messages don't leak info
   - [ ] Test default credentials
   - [ ] Check HTTP security headers
   - [ ] Verify CORS configuration

7. **Cross-Site Scripting (XSS)**
   - [ ] Test stored XSS in all text fields
   - [ ] Test reflected XSS in search/filters
   - [ ] Test DOM-based XSS
   - [ ] Verify Content-Security-Policy

8. **Insecure Deserialization**
   - [ ] Test JSON parsing with malformed data
   - [ ] Verify prototype pollution prevention

9. **Using Components with Known Vulnerabilities**
   - [ ] Run npm audit
   - [ ] Check dependency versions
   - [ ] Review third-party libraries

10. **Insufficient Logging & Monitoring**
    - [ ] Verify all admin actions logged
    - [ ] Test security event detection
    - [ ] Verify log integrity

### Rate Limiting Tests

- [ ] Test login rate limiting (exceed 5 attempts)
- [ ] Test API endpoint rate limiting
- [ ] Test rate limit reset after window
- [ ] Test IP blocking after excessive violations
- [ ] Test legitimate traffic isn't blocked

### Performance Testing

- [ ] Load test admin dashboard with 1000 users
- [ ] Load test report listing with 10,000 reports
- [ ] Test database query performance
- [ ] Test rate limiting under high load
- [ ] Test session validation performance

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] Run all security tests
- [ ] Run performance tests
- [ ] Backup production database
- [ ] Review all environment variables
- [ ] Test database migrations on staging
- [ ] Review audit log functionality
- [ ] Verify CSRF tokens working
- [ ] Test rate limiting configuration

### Migration Steps

1. **Database Migration:**
   ```bash
   wrangler d1 execute DB --file=migrations/001_admin_panel_enhancement.sql
   ```

2. **Environment Variables:**
   ```bash
   # Add new variables to wrangler.toml or Cloudflare dashboard
   JWT_SECRET=<existing>
   ADMIN_USERNAME=<existing>
   ADMIN_PASSWORD_HASH=<existing>
   CSRF_SECRET=<new-random-secret>
   ALERT_EMAIL=<admin-email>
   WEBHOOK_URL=<optional-slack-webhook>
   ```

3. **Deploy Functions:**
   ```bash
   npm run deploy
   ```

4. **Verify Deployment:**
   - [ ] Test admin login
   - [ ] Verify CSRF token generation
   - [ ] Test user management endpoints
   - [ ] Test report moderation
   - [ ] Check audit log population

### Post-Deployment

- [ ] Monitor error logs for 24 hours
- [ ] Review security event dashboard
- [ ] Test all critical workflows
- [ ] Verify audit logging working
- [ ] Check rate limiting effectiveness
- [ ] Monitor performance metrics

---

## MAINTENANCE & MONITORING

### Daily Tasks

- Review security event dashboard
- Check pending reports queue
- Monitor failed login attempts
- Review blocked IPs list

### Weekly Tasks

- Review audit logs for anomalies
- Analyze user reputation scores
- Check for duplicate reports
- Review system performance metrics
- Clean up expired sessions/tokens

### Monthly Tasks

- Database maintenance (vacuum, analyze)
- Review and archive old audit logs
- Security patch updates
- Performance optimization review
- User behavior analysis

### Alerting Rules

**Critical Alerts (Immediate Action):**
- More than 10 failed admin login attempts in 1 hour
- XSS or SQL injection attempt detected
- More than 5 IPs auto-blocked in 1 hour
- Database connection failures

**High Priority (Review within 24h):**
- More than 50 reports flagged as suspicious
- User reputation score drops below 20
- More than 100 rate limit violations in 1 day

**Medium Priority (Review weekly):**
- Pending reports queue > 100
- Inactive admin session for 30 days

---

## APPENDIX A: API Request/Response Examples

### Example: Approve Report with CSRF

**Request:**
```http
POST /api/admin/approve-report HTTP/1.1
Host: trappertracker.com
Cookie: admin_token=<jwt-token>
X-CSRF-Token: <csrf-token>
Content-Type: application/json

{
  "reportId": 123,
  "reportType": "danger_zone",
  "adminNotes": "Verified via source URL"
}
```

**Response (Success):**
```json
{
  "success": true,
  "reportId": 123,
  "status": "approved",
  "approvedBy": "admin@trappertracker.com",
  "approvedAt": "2025-12-08T11:30:00Z"
}
```

**Response (CSRF Failure):**
```json
{
  "error": "Invalid or expired CSRF token",
  "code": "CSRF_VALIDATION_FAILED"
}
```

---

## APPENDIX B: Database Schema ER Diagram (Text)

```
users
├─ user_id (PK)
├─ email
├─ password_hash
├─ role
├─ suspended
├─ suspended_until
└─ last_login
    │
    ├──→ trapper_blips.reported_by_user_id (FK)
    ├──→ lost_pets.reported_by_user_id (FK)
    ├──→ found_pets.reported_by_user_id (FK)
    ├──→ dangerous_animals.reported_by_user_id (FK)
    ├──→ pending_submissions.user_id (FK)
    ├──→ user_activity_log.user_id (FK)
    └──→ user_reputation.user_id (FK)

admin_sessions
├─ session_id (PK)
├─ admin_user
├─ ip_address
├─ expires_at
└─ revoked
    │
    ├──→ admin_audit_log.session_id (FK)
    └──→ csrf_tokens.session_id (FK)

admin_audit_log
├─ log_id (PK)
├─ admin_user
├─ action
├─ target_type
├─ target_id
├─ session_id (FK)
└─ timestamp

report_flags
├─ flag_id (PK)
├─ report_type
├─ report_id
├─ severity
└─ resolved

security_events
├─ event_id (PK)
├─ event_type
├─ severity
├─ ip_address
└─ timestamp
```

---

## CONCLUSION

This architectural specification provides a comprehensive blueprint for transforming TrapperTracker's admin panel into a production-ready, security-first administrative control system. The phased implementation approach ensures critical security features are deployed first, followed by enhanced moderation tools and operational efficiencies.

**Key Success Metrics:**
- Zero successful XSS/SQL injection attacks
- < 0.1% false positive rate on malicious content detection
- 99.9% uptime for admin panel
- < 500ms average response time for dashboard loads
- 100% audit coverage for admin actions

**Next Steps:**
1. Review and approve this specification
2. Begin Phase 1 implementation (Critical Security)
3. Schedule weekly progress reviews
4. Conduct security audit after Phase 1 completion

---

**Document Prepared By:** Head System Security Manager & Admin Panel Architect
**For Questions or Clarifications:** Contact project coordinator
