# Deployment & Rollback Procedures

## Overview
This document outlines the deployment process, rollback procedures, and operational guidelines for TrapperTracker.com. Follow these procedures carefully to ensure safe, reliable deployments.

---

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Process](#deployment-process)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Database Migrations](#database-migrations)
6. [Emergency Procedures](#emergency-procedures)
7. [Deployment Troubleshooting](#deployment-troubleshooting)

---

## Pre-Deployment Checklist

### Required Checks Before Any Deployment:

- [ ] **Code Review**: All changes reviewed and approved
- [ ] **Local Testing**: All features tested locally
- [ ] **Git Status Clean**: All changes committed to git
- [ ] **Branch**: Currently on `main` branch (or appropriate feature branch)
- [ ] **Database Migrations**: Any SQL migrations tested locally first
- [ ] **Secrets**: No sensitive data in code (check with `git diff`)
- [ ] **Dependencies**: `package.json` dependencies up to date
- [ ] **Backup**: Recent database backup exists (see below)
- [ ] **Monitoring**: Monitoring dashboard open and ready
- [ ] **Communication**: Stakeholders notified if deploying breaking changes

### Create Pre-Deployment Database Backup:
```bash
# Export current database state
npx wrangler d1 export trappertracker --remote --output=backups/backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup was created
ls -lh backups/
```

---

## Deployment Process

### Standard Deployment (No Breaking Changes)

#### 1. Verify Current State
```bash
# Check git status
git status

# Ensure you're on main branch
git branch

# Pull latest changes
git pull origin main

# Check current deployment version
npx wrangler deployments list --project-name=trappertracker
```

#### 2. Test Locally (Optional but Recommended)
```bash
# Start local development server
npx wrangler pages dev ./public

# Open in browser: http://localhost:8788
# Test critical paths:
# - User registration/login
# - Submit trapper report
# - View map
# - Admin panel access
```

#### 3. Deploy to Production
```bash
# Deploy to Cloudflare Pages
npx wrangler pages deploy ./public --project-name=trappertracker

# Save deployment ID from output
# Example output: "Deployment ID: abc123def456"
```

#### 4. Monitor Deployment
```bash
# Watch live logs
npx wrangler tail trappertracker

# Keep this running for 5-10 minutes after deployment
# Watch for errors or unusual patterns
```

### Database Migration Deployment

⚠️ **CRITICAL**: Always backup database before migrations!

#### 1. Test Migration Locally
```bash
# Create local test database
npx wrangler d1 execute trappertracker --local --file=migrations/YOUR_MIGRATION.sql

# Verify migration worked
npx wrangler d1 execute trappertracker --local --command="SELECT * FROM sqlite_master WHERE type='index'"
```

#### 2. Backup Production Database
```bash
# REQUIRED: Create backup before migration
npx wrangler d1 export trappertracker --remote --output=backups/pre-migration-$(date +%Y%m%d-%H%M%S).sql
```

#### 3. Apply Migration to Production
```bash
# Apply migration (database will be briefly unavailable)
npx wrangler d1 execute trappertracker --remote --file=migrations/YOUR_MIGRATION.sql

# Verify migration success
npx wrangler d1 execute trappertracker --remote --command="
  SELECT name FROM sqlite_master WHERE type='index' ORDER BY name
"
```

#### 4. Verify Application Still Works
- Visit https://trappertracker.com
- Test map loading
- Submit test report
- Check admin panel

---

## Post-Deployment Verification

### Automated Checks (Run After Every Deployment)

```bash
#!/bin/bash
# Save as: scripts/verify-deployment.sh

echo "🔍 Starting post-deployment verification..."

# Check 1: Homepage loads
echo "Checking homepage..."
curl -f -s -o /dev/null https://trappertracker.com && echo "✅ Homepage OK" || echo "❌ Homepage FAILED"

# Check 2: Health endpoint
echo "Checking health endpoint..."
STATUS=$(curl -s https://trappertracker.com/api/status | jq -r '.status')
if [ "$STATUS" = "healthy" ]; then
  echo "✅ Health check OK"
else
  echo "❌ Health check FAILED: $STATUS"
fi

# Check 3: Map page
echo "Checking map page..."
curl -f -s -o /dev/null https://trappertracker.com/map.html && echo "✅ Map page OK" || echo "❌ Map page FAILED"

# Check 4: API endpoints
echo "Checking critical API endpoints..."
curl -f -s -o /dev/null https://trappertracker.com/api/map-data && echo "✅ Map data API OK" || echo "❌ Map data API FAILED"

echo "🏁 Verification complete!"
```

### Manual Verification Checklist:

- [ ] **Homepage**: Loads without errors
- [ ] **Map Page**: Map renders with markers
- [ ] **User Registration**: Can create new account
- [ ] **User Login**: Can authenticate
- [ ] **Submit Report**: Can submit trapper blip
- [ ] **Admin Panel**: Admin login works
- [ ] **Error Tracking**: Check for new errors in database
- [ ] **Performance**: Page load time < 3 seconds

### Check for New Errors:
```bash
# View recent error reports
npx wrangler d1 execute trappertracker --remote --command="
  SELECT * FROM error_reports
  WHERE created_at > datetime('now', '-30 minutes')
  ORDER BY created_at DESC
"
```

---

## Rollback Procedures

### When to Rollback

Immediately rollback if you observe:
- **Critical bugs** preventing core functionality
- **Error rate spike** (>10 errors/minute)
- **Database corruption** or data loss
- **Security vulnerability** introduced
- **Complete site outage**

### Rollback Process

#### Option 1: Rollback to Previous Deployment (Fastest)

```bash
# List recent deployments
npx wrangler deployments list --project-name=trappertracker

# Example output:
# 1. abc123 (Current) - 2025-12-08 14:30:00
# 2. def456 (Previous) - 2025-12-07 10:15:00
# 3. ghi789 - 2025-12-06 09:00:00

# Rollback to previous deployment
npx wrangler rollback --project-name=trappertracker --deployment-id=def456

# Or rollback to most recent stable version
npx wrangler rollback --project-name=trappertracker
```

#### Option 2: Revert Git Changes and Redeploy

```bash
# Find the last known good commit
git log --oneline -10

# Revert to that commit
git reset --hard COMMIT_HASH

# Redeploy
npx wrangler pages deploy ./public --project-name=trappertracker

# After confirming rollback works, force push (CAUTION!)
git push origin main --force
```

#### Option 3: Rollback Database Migration

⚠️ **ONLY if migration caused the issue**

```bash
# Restore from pre-migration backup
npx wrangler d1 execute trappertracker --remote --file=backups/pre-migration-TIMESTAMP.sql

# Verify restoration
npx wrangler d1 execute trappertracker --remote --command="
  SELECT COUNT(*) as count FROM trapper_blips
"
```

### Post-Rollback Verification

After rollback, verify:
- [ ] Site is accessible
- [ ] `/api/status` returns healthy
- [ ] No new errors appearing
- [ ] User can complete critical flows
- [ ] Database queries working normally

### Document the Incident

```bash
# Create incident report
cat > incidents/incident-$(date +%Y%m%d-%H%M%S).md << EOF
# Incident Report

**Date**: $(date)
**Severity**: [Critical/High/Medium/Low]
**Duration**: [Time from deployment to rollback]

## What Happened
[Description of the issue]

## Root Cause
[What caused the problem]

## Resolution
[How it was resolved]

## Prevention
[Steps to prevent recurrence]

## Action Items
- [ ] Fix underlying issue
- [ ] Add test to prevent regression
- [ ] Update documentation
EOF
```

---

## Database Migrations

### Migration Naming Convention
```
YYYYMMDD_HHmm_descriptive_name.sql

Examples:
- 20251208_1430_add_geospatial_indexes.sql
- 20251210_0900_add_verification_tokens.sql
- 20251215_1600_create_audit_log_table.sql
```

### Migration Template
```sql
-- Migration: [Description]
-- Date: YYYY-MM-DD
-- Author: [Your Name]
-- Rollback: [Describe how to undo this migration]

-- ============================================
-- Forward Migration
-- ============================================

-- Your changes here

-- ============================================
-- Verification Queries
-- ============================================

-- Add queries to verify migration succeeded
-- SELECT COUNT(*) FROM new_table;
-- SELECT name FROM sqlite_master WHERE type='index';
```

### Migration Safety Rules

1. **Always Backward Compatible**: New deployments should work with old schema
2. **Never Drop Columns in Same Deploy**: Deprecate first, drop later
3. **Add Columns as NULL or with DEFAULT**: Don't break existing inserts
4. **Test Locally First**: Use `--local` flag before `--remote`
5. **Keep Migrations Small**: One logical change per migration
6. **Document Rollback**: Include rollback SQL in migration comments

### Emergency Migration Rollback
```sql
-- Save as: migrations/ROLLBACK_YYYYMMDD_HHmm_name.sql

-- Example: Rollback index creation
DROP INDEX IF EXISTS idx_trapper_blips_lat_lng;
DROP INDEX IF EXISTS idx_trapper_blips_timestamp;

-- Example: Rollback table changes
ALTER TABLE users DROP COLUMN new_column;

-- Example: Restore dropped column (if data was backed up)
-- ALTER TABLE users ADD COLUMN old_column TEXT;
-- UPDATE users SET old_column = ... FROM backup_table;
```

---

## Emergency Procedures

### Critical Outage (Complete Site Down)

```bash
# 1. Immediately rollback
npx wrangler rollback --project-name=trappertracker

# 2. Check Cloudflare status
curl -s https://www.cloudflarestatus.com/api/v2/status.json | jq

# 3. Verify DNS
dig trappertracker.com

# 4. Check worker status
npx wrangler tail trappertracker

# 5. Contact Cloudflare support if platform issue
```

### Database Corruption

```bash
# 1. Stop accepting writes (if possible - feature flag?)

# 2. Export current state
npx wrangler d1 export trappertracker --remote --output=backups/emergency-$(date +%Y%m%d-%H%M%S).sql

# 3. Restore from most recent backup
npx wrangler d1 execute trappertracker --remote --file=backups/backup-LATEST.sql

# 4. Verify data integrity
npx wrangler d1 execute trappertracker --remote --command="
  SELECT COUNT(*) FROM users;
  SELECT COUNT(*) FROM trapper_blips;
  SELECT COUNT(*) FROM lost_pets;
"
```

### Security Incident

```bash
# 1. If secrets exposed: IMMEDIATELY rotate
# - Regenerate JWT_SECRET in Cloudflare dashboard
# - Rotate database credentials
# - Invalidate all user sessions

# 2. If vulnerability discovered:
# - Disable affected feature if possible
# - Deploy hotfix immediately
# - Notify users if data compromised

# 3. Document incident (required for compliance)
```

---

## Deployment Troubleshooting

### Common Issues

#### Issue: "Deployment failed: Worker script too large"
```bash
# Solution: Check bundle size
wrangler pages deploy ./public --dry-run

# Remove unnecessary files from public/
# Consider code splitting for large JS files
```

#### Issue: "Database unavailable after migration"
```bash
# Wait 30 seconds for D1 to recover
sleep 30

# Test database connection
npx wrangler d1 execute trappertracker --remote --command="SELECT 1"

# If still failing, check D1 status in dashboard
```

#### Issue: "API endpoints returning 500 errors"
```bash
# Check worker logs immediately
npx wrangler tail trappertracker

# Look for uncaught exceptions
# Check if environment variables are set correctly
npx wrangler secret list
```

#### Issue: "Users logged out after deployment"
```bash
# This is EXPECTED if JWT_SECRET was rotated
# Users will need to log in again
# NOT a bug - this is a security feature
```

---

## Deployment Schedule

### Recommended Timing:
- **Best**: Tuesday-Thursday, 10am-2pm (low traffic)
- **Avoid**: Friday afternoons (no weekend support)
- **Avoid**: Monday mornings (high user activity)
- **Never**: Late night (if no on-call support)

### Deployment Frequency:
- **Hotfixes**: Deploy immediately
- **Features**: Weekly deployment window
- **Database Migrations**: Maximum once per week
- **Major Changes**: Require 24hr advance notice

---

## Contact Information

### Escalation Path:
1. **Developer**: Check logs and attempt rollback
2. **Operations**: Review monitoring and infrastructure
3. **Cloudflare Support**: Platform-level issues

### Useful Resources:
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Worker Logs**: `npx wrangler tail trappertracker`
- **D1 Dashboard**: Cloudflare Dashboard → D1 → trappertracker
- **Status Page**: https://www.cloudflarestatus.com

---

## Appendix: Useful Commands

### Quick Reference:
```bash
# Deploy to production
npx wrangler pages deploy ./public --project-name=trappertracker

# View recent deployments
npx wrangler deployments list --project-name=trappertracker

# Rollback to previous version
npx wrangler rollback --project-name=trappertracker

# Watch live logs
npx wrangler tail trappertracker

# Backup database
npx wrangler d1 export trappertracker --remote --output=backup.sql

# Restore database
npx wrangler d1 execute trappertracker --remote --file=backup.sql

# Run migration
npx wrangler d1 execute trappertracker --remote --file=migrations/MIGRATION.sql

# Check health
curl https://trappertracker.com/api/status | jq

# View recent errors
npx wrangler d1 execute trappertracker --remote --command="SELECT * FROM error_reports ORDER BY created_at DESC LIMIT 20"
```

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-08 | Ops Consultant | Initial deployment documentation created |

---

**Last Updated**: 2025-12-08
**Document Owner**: Operations Team
**Review Frequency**: Quarterly
