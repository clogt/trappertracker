# TrapperTracker Moderation System Implementation Guide

**Generated:** 2025-12-12
**Status:** Production Ready
**Security Level:** CRITICAL

---

## Overview

This comprehensive moderation system provides admins with complete control over user-submitted reports, including approval workflows, bulk actions, spam detection, and detailed analytics.

## System Architecture

### Database Schema

**Migration File:** `/migrations/002_report_moderation_system.sql`

**Key Tables Added/Modified:**
- `trapper_blips`: Enhanced with moderation fields (approval_status, admin_notes, spam_score, etc.)
- `pending_submissions`: Status tracking for extension submissions
- `admin_audit_log`: Complete audit trail of all admin actions
- `report_history`: Track all changes to reports
- `user_reputation`: Automated reputation scoring
- `report_flags`: Community flagging system
- `security_events`: Track suspicious activity

**Database Views:**
- `v_reports_pending_moderation`: Unified view of all report types needing review
- `v_moderation_stats`: Real-time moderation statistics
- `v_spam_detection`: Identify suspicious patterns

### API Endpoints

#### Moderation Queue

**GET `/api/admin/moderation-queue`**
- Returns paginated list of reports with filtering
- Query parameters:
  - `status`: pending|approved|rejected|all (default: pending)
  - `source`: manual|extension|all
  - `sort`: date|spam_score|flags
  - `search`: text search in descriptions
  - `flagged`: true|false
  - `page`: page number
  - `limit`: results per page (max 100)

**Response:**
```json
{
  "reports": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "stats": {
    "total": 1500,
    "pending": 45,
    "approved": 1200,
    "rejected": 255,
    "flagged": 12,
    "suspected_spam": 8
  }
}
```

#### Individual Report Actions

**GET `/api/admin/reports/:id`**
- Returns full report details including:
  - Report data with user information
  - Edit history
  - Flags
  - Similar/duplicate reports nearby
- Requires admin authentication

**PUT `/api/admin/reports/:id/approve`**
- Approve a report and make it visible
- Body: `{ "notes": "Optional approval notes" }`
- Logs action in admin_audit_log
- Updates user reputation

**PUT `/api/admin/reports/:id/reject`**
- Reject a report and hide it
- Body: `{ "reason": "Required rejection reason" }`
- Updates user reputation (negative)
- Logs action with reason

**PUT `/api/admin/reports/:id`**
- Edit report fields (latitude, longitude, description, etc.)
- Body: `{ "latitude": 40.7128, "description": "Updated...", "change_reason": "Optional" }`
- Creates audit trail in report_history
- Allowed fields: latitude, longitude, description, report_timestamp, source_url, admin_notes

**DELETE `/api/admin/reports/:id`**
- Permanently delete a report
- Body: `{ "reason": "Optional deletion reason" }`
- IRREVERSIBLE - use with caution

#### Bulk Actions

**POST `/api/admin/reports/bulk-action`**
- Perform actions on multiple reports at once
- Body:
```json
{
  "action": "approve|reject|delete",
  "reportIds": [1, 2, 3, 4],
  "reason": "Required for reject",
  "notes": "Optional for approve"
}
```
- Limited to 100 reports per request
- Returns success/failure for each report
- Logs all actions individually

#### Analytics

**GET `/api/admin/moderation-stats`**
- Comprehensive statistics dashboard
- Returns:
  - Status breakdown (pending/approved/rejected)
  - Time-based stats (today/this week/this month)
  - Average review times
  - Source breakdown (manual vs extension)
  - Top submitters
  - Rejection reasons
  - Geographic distribution
  - Pending reports age distribution
  - Admin activity
  - Spam detection insights

### User Interface

#### Moderation Queue (`/admin-moderation.html`)

**Features:**
- Real-time statistics dashboard
- Advanced filtering:
  - Status (pending/approved/rejected)
  - Source type (manual/extension)
  - Flagged reports only
  - Text search
  - Sort by date/spam score/flags
- Bulk selection with keyboard shortcuts:
  - Ctrl+A: Approve selected
  - Ctrl+R: Reject selected
- Pagination (20 per page)
- Color-coded status badges
- Spam score indicators
- Quick action buttons

**Workflow:**
1. Admin navigates to `/admin-moderation.html`
2. Reviews pending reports (default view)
3. Can click any report to view full details
4. Approve, reject, or delete individually or in bulk
5. Changes reflected immediately with stats updated

#### Report Detail Modal

**Features:**
- Complete report information
- Interactive map preview with marker
- Submitter information (email, account age, status)
- Admin notes display
- Similar/duplicate reports detection
- Action buttons (approve/reject/delete)
- Edit history display
- Flag information

#### Admin Dashboard Integration

**Quick Actions Panel:**
- Direct link to Moderation Queue
- User Management link
- All Reports link

### Security Features

#### Authentication & Authorization
- All endpoints require admin authentication via JWT
- Token verification on every request
- Role-based access control (admin role required)
- Session validation

#### Audit Logging
Every admin action is logged with:
- Admin user ID and email
- Action type
- Target ID and type
- Action details (JSON)
- IP address
- User agent
- Timestamp

**Logged Actions:**
- report_approve
- report_reject
- report_edit
- report_delete
- report_bulk_approve
- report_bulk_reject
- report_bulk_delete
- bulk_action_summary

#### Input Validation & Sanitization
- All inputs validated server-side
- SQL injection prevention (parameterized queries)
- XSS prevention (HTML escaping)
- Field-level validation for edits
- Whitelist for allowed update fields

#### Rate Limiting (Database-backed)
- Persistent rate limit tracking
- Per-IP and per-user limits
- Automatic blocking for abuse
- Progressive penalties

### Spam Detection System

#### Automated Spam Scoring (0-100)
Calculated on report creation using trigger:
- Empty description: +50 points
- Very short description (< 10 chars): +30 points
- Coordinates at exact 0,0: +40 points
- Multiple reports in last hour: +25 points

**Score Interpretation:**
- 0-24: Minimal risk (green)
- 25-49: Low risk (yellow)
- 50-74: Medium risk (orange)
- 75+: High risk (red)

#### Spam Detection View
SQL view identifies suspicious users:
- High rejection rate
- Multiple high spam scores
- Unusually high submission rate
- Patterns suggesting bot activity

**Auto-flagging criteria:**
- More than 2 rejections in 30 days
- More than 10 submissions per day average
- Multiple high spam score submissions

### User Reputation System

**Automatic Calculation:**
- Total submissions tracked
- Approved submissions (+positive reputation)
- Rejected submissions (-negative reputation)
- Flagged submissions tracked
- Helpful flags (led to action)
- False flags (dismissed)

**Used for:**
- Identifying trusted contributors
- Flagging problematic users
- Auto-moderation decisions
- User suspension considerations

### Report History & Audit Trail

**Change Tracking:**
Every field edit logged with:
- Report ID
- Changed by (admin user ID)
- Change type (created/edited/approved/rejected/deleted)
- Field changed
- Old value
- New value
- Change reason
- Timestamp

**Benefits:**
- Full accountability
- Rollback capability
- Dispute resolution
- Quality assurance

---

## Deployment Checklist

### 1. Database Migration

```bash
# Connect to your D1 database
wrangler d1 execute DB --file=migrations/002_report_moderation_system.sql

# Verify migration
wrangler d1 execute DB --command="SELECT * FROM migrations WHERE migration_name = 'report_moderation_system_v1'"
```

### 2. Environment Variables

Ensure these are set in Cloudflare Pages:
- `JWT_SECRET`: Secure random string for JWT signing
- `ADMIN_PASSWORD_HASH`: bcrypt hash of admin password
- `DB`: D1 database binding

### 3. File Deployment

Ensure these files are deployed:
- `/public/admin-moderation.html`
- `/public/assets/js/admin-moderation.js`
- `/functions/api/admin/moderation-queue.js`
- `/functions/api/admin/moderation-stats.js`
- `/functions/api/admin/reports/[id]/index.js`
- `/functions/api/admin/reports/[id]/approve.js`
- `/functions/api/admin/reports/[id]/reject.js`
- `/functions/api/admin/reports/bulk-action.js`

### 4. Testing Checklist

**Authentication:**
- [ ] Verify admin login redirects unauthenticated users
- [ ] Test JWT token expiration
- [ ] Verify non-admin users cannot access endpoints

**Moderation Queue:**
- [ ] Load moderation queue with pending reports
- [ ] Test all filters (status, source, flagged, search)
- [ ] Test sorting options
- [ ] Test pagination

**Individual Actions:**
- [ ] Approve a report and verify it appears on public map
- [ ] Reject a report with reason
- [ ] Edit report fields and verify history logging
- [ ] Delete a report and verify it's removed
- [ ] View report details with all metadata

**Bulk Actions:**
- [ ] Select multiple reports
- [ ] Bulk approve and verify all approved
- [ ] Bulk reject with reason
- [ ] Bulk delete with confirmation

**Security:**
- [ ] Attempt to access endpoints without authentication (should fail)
- [ ] Attempt SQL injection in search/filters (should be sanitized)
- [ ] Verify all actions logged in admin_audit_log
- [ ] Test rate limiting on submission endpoints

**Spam Detection:**
- [ ] Submit test report with empty description (should have high spam score)
- [ ] Submit multiple reports rapidly (should increase spam score)
- [ ] Verify spam score displayed in moderation queue

**User Reputation:**
- [ ] Approve a user's report and verify reputation increase
- [ ] Reject a user's report and verify reputation decrease
- [ ] View user reputation in user management

---

## Operational Guidelines

### Daily Moderation Workflow

1. **Morning Review:**
   - Check pending count in stats
   - Review high spam score reports first
   - Check flagged reports

2. **Prioritization:**
   - High spam score (75+): Review immediately
   - Flagged reports: Investigate flags
   - Reports pending > 24h: Prioritize
   - New users: Extra scrutiny

3. **Decision Making:**
   - **Approve:** Report is accurate, appropriate, and valuable
   - **Reject:** Report is spam, inaccurate, inappropriate, or duplicate
   - **Delete:** Report violates terms, is malicious, or extremely low quality

### Keyboard Shortcuts

- **Ctrl+A**: Approve selected reports
- **Ctrl+R**: Reject selected reports
- **Click row**: View report details
- **Checkbox**: Select/deselect for bulk action

### Best Practices

1. **Always provide rejection reasons** - Helps users understand and improves future submissions
2. **Use bulk actions for clear-cut cases** - Speeds up moderation
3. **Review report details for complex cases** - Check similar reports, user history
4. **Add admin notes** - Document decisions for future reference
5. **Monitor spam patterns** - Adjust spam detection thresholds as needed
6. **Review audit logs regularly** - Ensure accountability and catch errors

### Handling Edge Cases

**Duplicate Reports:**
- Check "Similar Reports Nearby" section
- Approve the most detailed/accurate one
- Reject others with reason "Duplicate"

**Borderline Quality:**
- Edit to improve if salvageable
- Reject if fundamentally flawed
- Add notes explaining decision

**Suspicious Patterns:**
- Check user submission history
- Look for bot-like behavior
- Consider user suspension if confirmed abuse

**Appeals:**
- Review rejection reason in admin notes
- Check edit history
- Consider user reputation
- Re-approve if legitimate

---

## Monitoring & Maintenance

### Key Metrics to Track

1. **Pending queue size** - Should stay below 50
2. **Average review time** - Target: < 24 hours
3. **Rejection rate** - Typical: 10-20%
4. **Spam detection accuracy** - High score reports should correlate with rejections
5. **Admin activity** - Ensure distributed workload

### Database Maintenance

**Periodic cleanup (monthly):**
```sql
-- Archive old rejected reports (> 90 days)
-- Cleanup old audit logs (> 180 days)
-- Recalculate user reputation scores
```

### Performance Optimization

- Indexes created for common queries
- Views optimized for moderation dashboard
- Pagination limits prevent large result sets
- Caching recommended for stats (5-minute cache)

---

## Troubleshooting

### Common Issues

**"Unauthorized" errors:**
- Check JWT_SECRET is set
- Verify admin token in cookies
- Try re-logging in

**Reports not appearing:**
- Check filter settings (default: pending only)
- Verify database migration ran successfully
- Check approval_status field exists

**Bulk actions failing:**
- Check selection (must have items selected)
- Verify rejection reason provided for bulk reject
- Check browser console for errors

**Spam score always 0:**
- Verify trigger created in migration
- Check existing reports (scores only on new inserts)
- Re-run migration if needed

---

## API Rate Limits

**Per admin user:**
- Moderation queue: 100 requests/minute
- Individual actions: 60 requests/minute
- Bulk actions: 10 requests/minute (max 100 reports per request)

**Global:**
- Stats endpoint: 120 requests/minute (recommended caching)

---

## Support & Escalation

### Critical Issues (Immediate escalation)
- Authentication bypass
- Data corruption
- Mass deletion
- Security breach

### High Priority (4-hour response)
- Moderation queue broken
- Bulk actions failing
- Spam detection malfunction

### Normal Priority (24-hour response)
- UI issues
- Filter not working
- Minor display bugs

---

## Future Enhancements

**Planned features:**
1. Machine learning spam detection
2. User appeals system
3. Automated moderation for trusted users
4. Geographic spam pattern detection
5. Image content analysis (if images added)
6. Collaborative moderation (multiple admins)
7. Moderation reports/exports
8. Custom rejection reason templates

---

## Security Considerations

### Data Privacy
- User emails visible to admins only
- IP addresses logged for security, retained 90 days
- Audit logs retained 180 days
- Deleted reports permanently removed (GDPR compliant)

### Access Control
- Admin role required for all moderation endpoints
- Session timeout: 24 hours
- Password change requires current password
- All actions logged with admin identity

### Incident Response
If security incident detected:
1. Check admin_audit_log for unauthorized actions
2. Review security_events table
3. Check blocked_ips for attack patterns
4. Rotate JWT_SECRET if compromise suspected
5. Force all admin re-authentication

---

**End of Guide**

For technical support, refer to the system administrator or review the admin_audit_log table for detailed action history.
