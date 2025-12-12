# Moderation System Deployment Guide

## Quick Start Deployment

### Step 1: Run Database Migration

```bash
# Apply the moderation system migration to your D1 database
wrangler d1 execute DB --file=migrations/002_report_moderation_system.sql --remote
```

**What this does:**
- Adds moderation fields to `trapper_blips` table
- Creates audit logging tables
- Creates user reputation system
- Sets up spam detection triggers
- Creates database views for analytics

### Step 2: Verify Migration

```bash
# Check that migration completed successfully
wrangler d1 execute DB --command="SELECT * FROM migrations ORDER BY applied_at DESC LIMIT 5" --remote
```

You should see: `report_moderation_system_v1` in the results.

### Step 3: Test Locally (Optional)

```bash
# Run local development server
npm run dev

# Navigate to:
# http://localhost:8788/admin-login.html
# Login with your admin credentials
# Then go to: http://localhost:8788/admin-moderation.html
```

### Step 4: Deploy to Production

```bash
# Deploy all files to Cloudflare Pages
git add .
git commit -m "feat: Add comprehensive moderation system for reports"
git push origin main
```

**Cloudflare Pages will automatically:**
- Deploy the new HTML files
- Deploy the new API endpoints
- Make the moderation queue live

### Step 5: Verify Production Deployment

1. Navigate to: `https://trappertracker.com/admin-login.html`
2. Login with admin credentials
3. Click "Moderation Queue" from dashboard
4. Verify you can see pending reports
5. Test approve/reject actions

---

## Files Deployed

### New Frontend Files
- `/public/admin-moderation.html` - Moderation queue UI
- `/public/assets/js/admin-moderation.js` - Moderation queue JavaScript

### New API Endpoints
- `/functions/api/admin/moderation-queue.js` - List reports with filters
- `/functions/api/admin/moderation-stats.js` - Analytics dashboard
- `/functions/api/admin/reports/[id]/index.js` - Get/Edit/Delete individual report
- `/functions/api/admin/reports/[id]/approve.js` - Approve report
- `/functions/api/admin/reports/[id]/reject.js` - Reject report
- `/functions/api/admin/reports/bulk-action.js` - Bulk approve/reject/delete

### Database Migration
- `/migrations/002_report_moderation_system.sql` - Complete schema updates

### Updated Files
- `/public/admin-dashboard.html` - Added Quick Actions panel

### Documentation
- `/MODERATION_SYSTEM_GUIDE.md` - Complete system documentation
- `/MODERATION_DEPLOYMENT.md` - This deployment guide

---

## Environment Variables Required

Ensure these are set in Cloudflare Pages settings:

```
JWT_SECRET=<your-secure-jwt-secret>
ADMIN_PASSWORD_HASH=<bcrypt-hash-of-admin-password>
```

**To generate a new admin password hash:**
```bash
# Use the built-in password change feature in admin dashboard
# Or use bcrypt CLI tool
```

---

## Post-Deployment Verification

### 1. Check Moderation Queue Access

```bash
# Test endpoint accessibility
curl -X GET "https://trappertracker.com/api/admin/moderation-queue?status=pending" \
  -H "Cookie: admin_token=YOUR_ADMIN_TOKEN" \
  -v
```

Should return JSON with reports array.

### 2. Test Authentication

```bash
# Attempt access without auth (should fail with 401)
curl -X GET "https://trappertracker.com/api/admin/moderation-queue" -v
```

Should return: `{"error":"Unauthorized. Admin authentication required."}`

### 3. Verify Stats Endpoint

```bash
# Test stats endpoint
curl -X GET "https://trappertracker.com/api/admin/moderation-stats" \
  -H "Cookie: admin_token=YOUR_ADMIN_TOKEN"
```

Should return comprehensive statistics.

---

## Initial Configuration

### Set Existing Reports to 'approved' Status

If you have existing reports that should be marked as approved:

```sql
-- Run this in D1 console
UPDATE trapper_blips
SET approval_status = 'approved',
    source_type = 'manual',
    approved_at = created_at
WHERE approval_status IS NULL;
```

### Initialize User Reputation

```sql
-- Create reputation entries for existing users
INSERT INTO user_reputation (user_id, total_submissions, approved_submissions)
SELECT
    reported_by_user_id,
    COUNT(*) as total,
    COUNT(*) as approved
FROM trapper_blips
WHERE approval_status = 'approved'
GROUP BY reported_by_user_id;
```

---

## Testing the System

### Manual Test Workflow

1. **Navigate to moderation queue:**
   - Go to `/admin-moderation.html`
   - Verify pending reports load

2. **Test individual approval:**
   - Click "View" on a pending report
   - Click "Approve Report"
   - Verify it moves to approved status

3. **Test rejection:**
   - Click "View" on another report
   - Click "Reject Report"
   - Enter rejection reason
   - Verify it moves to rejected status

4. **Test bulk actions:**
   - Select multiple reports with checkboxes
   - Click "Approve Selected"
   - Verify confirmation and success message

5. **Test filters:**
   - Change status filter to "Approved"
   - Verify only approved reports show
   - Test search functionality

6. **Test sorting:**
   - Sort by "Spam Score"
   - Verify high spam scores appear first

7. **Verify audit logging:**
   ```sql
   SELECT * FROM admin_audit_log
   ORDER BY created_at DESC
   LIMIT 10;
   ```
   Should show your recent actions.

---

## Rollback Plan

If issues arise, you can rollback:

### 1. Remove New Files
```bash
git revert <commit-hash>
git push origin main
```

### 2. Database Rollback (if needed)

**WARNING: This will lose moderation data!**

```sql
-- Only run if you need to completely rollback
DROP TABLE IF EXISTS admin_audit_log;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS rate_limit_tracking;
DROP TABLE IF EXISTS blocked_ips;
DROP TABLE IF EXISTS report_flags;
DROP TABLE IF EXISTS security_events;
DROP TABLE IF EXISTS system_configuration;
DROP TABLE IF EXISTS report_history;
DROP TABLE IF EXISTS user_activity_log;
DROP TABLE IF EXISTS user_reputation;

-- Remove added columns (SQLite doesn't support DROP COLUMN easily)
-- You may need to recreate tables or keep the columns
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Pending Queue Size**
   - Alert if > 100 pending reports
   - Check daily via stats endpoint

2. **Average Review Time**
   - Target: < 24 hours
   - Monitor via moderation-stats endpoint

3. **Rejection Rate**
   - Normal: 10-20%
   - Alert if > 50% (possible spam attack)

4. **Failed Actions**
   - Monitor Cloudflare logs for 500 errors
   - Check admin_audit_log for failed bulk actions

### Set Up Alerts (Optional)

Create a scheduled worker to check metrics:

```javascript
// Example alert check
const stats = await fetch('/api/admin/moderation-stats');
if (stats.statusStats.pending > 100) {
  // Send alert (email, Slack, etc.)
}
```

---

## Common Issues & Solutions

### Issue: "Unauthorized" errors after login

**Solution:**
- Clear browser cookies
- Re-login to admin panel
- Verify JWT_SECRET is set in environment

### Issue: Reports not appearing in queue

**Solution:**
- Check filter settings (default: pending only)
- Verify migration ran successfully
- Check database: `SELECT COUNT(*) FROM trapper_blips WHERE approval_status = 'pending'`

### Issue: Spam scores all showing 0

**Solution:**
- Spam scores only calculate on INSERT
- Existing reports will have 0
- New reports will get scores automatically
- To recalculate existing: Create a script to update based on criteria

### Issue: Bulk actions timing out

**Solution:**
- Reduce selection size (max 100 reports)
- Check Cloudflare worker timeout limits
- Split into smaller batches

### Issue: Map not loading in detail view

**Solution:**
- Check browser console for errors
- Verify Leaflet CDN is accessible
- Check Content Security Policy settings

---

## Performance Optimization

### Database Indexes

Already created by migration:
- `idx_trapper_blips_status` - Fast status filtering
- `idx_trapper_blips_reviewed` - Quick reviewed report queries
- `idx_pending_submissions_status` - Pending submission lookups

### Recommended Caching

**Stats endpoint:**
- Cache for 5 minutes (stats don't need real-time updates)
- Implement in Cloudflare Workers

**Moderation queue:**
- No caching (needs real-time data)
- Rely on database indexes

### Pagination

- Default: 20 items per page
- Maximum: 100 items per page
- Prevents large result sets

---

## Security Hardening

### Already Implemented

- JWT authentication on all endpoints
- Input sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention (HTML escaping)
- Audit logging of all actions
- Rate limiting tables (ready for enforcement)

### Additional Recommendations

1. **Enable IP-based rate limiting:**
   ```javascript
   // Add to endpoints
   const ip = request.headers.get('CF-Connecting-IP');
   // Check rate_limit_tracking table
   ```

2. **Add CAPTCHA for high-risk actions:**
   - Optional for bulk deletions
   - Consider for suspicion patterns

3. **Regular audit log review:**
   - Weekly review of admin actions
   - Check for anomalies

4. **Rotate JWT_SECRET periodically:**
   - Every 90 days recommended
   - Forces all admins to re-authenticate

---

## Maintenance Schedule

### Daily
- [ ] Check pending queue size
- [ ] Review flagged reports
- [ ] Monitor for spam patterns

### Weekly
- [ ] Review rejection reasons
- [ ] Check user reputation scores
- [ ] Review admin activity logs

### Monthly
- [ ] Archive old audit logs (>180 days)
- [ ] Review and update spam detection thresholds
- [ ] Performance optimization check
- [ ] Security audit

### Quarterly
- [ ] Database cleanup (old rejected reports)
- [ ] Review and update documentation
- [ ] Security vulnerability scan
- [ ] Backup audit logs for compliance

---

## Support Contacts

**Database Issues:**
- Check Cloudflare D1 dashboard
- Review query logs

**Authentication Issues:**
- Verify JWT_SECRET in environment
- Check admin user exists in users table

**Performance Issues:**
- Check Cloudflare Analytics
- Review worker execution times
- Optimize database queries

---

## Success Criteria

Deployment is successful when:

- [ ] Admin can login and access moderation queue
- [ ] Pending reports display correctly
- [ ] Individual approve/reject actions work
- [ ] Bulk actions complete successfully
- [ ] Stats dashboard loads with data
- [ ] Report detail view shows all information
- [ ] All actions logged in admin_audit_log
- [ ] Spam scores calculated for new reports
- [ ] User reputation updates on approval/rejection
- [ ] No authentication errors
- [ ] No database errors in logs

---

**Deployment Complete!**

The moderation system is now live and ready for use. Admins can access it at:
- Main dashboard: `/admin-dashboard.html`
- Moderation queue: `/admin-moderation.html`

For detailed usage instructions, see `/MODERATION_SYSTEM_GUIDE.md`
