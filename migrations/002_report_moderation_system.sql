-- Migration: Report Moderation System Enhancement
-- Date: 2025-12-12
-- Purpose: Add comprehensive moderation workflow to all report types

-- ============================================
-- Update pending_submissions table structure
-- ============================================

-- Add status field if it doesn't exist (safer approach)
ALTER TABLE pending_submissions ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE pending_submissions ADD COLUMN submitted_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- Update trapper_blips for moderation workflow
-- ============================================

-- Add moderation tracking columns
ALTER TABLE trapper_blips ADD COLUMN admin_notes TEXT;
ALTER TABLE trapper_blips ADD COLUMN reviewed_at TEXT;
ALTER TABLE trapper_blips ADD COLUMN edited_by_admin_id TEXT;
ALTER TABLE trapper_blips ADD COLUMN edited_at TEXT;
ALTER TABLE trapper_blips ADD COLUMN flag_count INTEGER DEFAULT 0;
ALTER TABLE trapper_blips ADD COLUMN spam_score INTEGER DEFAULT 0; -- 0-100, higher = more likely spam
ALTER TABLE trapper_blips ADD COLUMN source_type TEXT DEFAULT 'manual'; -- 'manual', 'extension', 'admin'

-- ============================================
-- Create indexes for moderation queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trapper_blips_status ON trapper_blips(approval_status, report_timestamp);
CREATE INDEX IF NOT EXISTS idx_trapper_blips_reviewed ON trapper_blips(approval_status, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_pending_submissions_status ON pending_submissions(status, submitted_at);

-- ============================================
-- Create views for moderation dashboard
-- ============================================

-- View: All reports needing moderation (pending only)
DROP VIEW IF EXISTS v_reports_pending_moderation;
CREATE VIEW v_reports_pending_moderation AS
SELECT
    'trapper_blips' as report_type,
    blip_id as report_id,
    latitude,
    longitude,
    description,
    report_timestamp as event_timestamp,
    created_at,
    approval_status as status,
    admin_notes,
    reviewed_at,
    approved_by_admin_id as reviewed_by,
    source_url,
    source_type,
    flag_count,
    spam_score,
    reported_by_user_id as user_id
FROM trapper_blips
WHERE approval_status = 'pending'

UNION ALL

SELECT
    'lost_pets' as report_type,
    pet_id as report_id,
    latitude,
    longitude,
    description,
    time_lost as event_timestamp,
    created_at,
    'approved' as status, -- Lost pets don't have status field yet
    NULL as admin_notes,
    NULL as reviewed_at,
    NULL as reviewed_by,
    NULL as source_url,
    'manual' as source_type,
    0 as flag_count,
    0 as spam_score,
    reported_by_user_id as user_id
FROM lost_pets

UNION ALL

SELECT
    'found_pets' as report_type,
    found_pet_id as report_id,
    latitude,
    longitude,
    description,
    time_found as event_timestamp,
    created_at,
    'approved' as status,
    NULL as admin_notes,
    NULL as reviewed_at,
    NULL as reviewed_by,
    NULL as source_url,
    'manual' as source_type,
    0 as flag_count,
    0 as spam_score,
    reported_by_user_id as user_id
FROM found_pets

UNION ALL

SELECT
    'dangerous_animals' as report_type,
    danger_id as report_id,
    latitude,
    longitude,
    description,
    report_timestamp as event_timestamp,
    created_at,
    'approved' as status,
    NULL as admin_notes,
    NULL as reviewed_at,
    NULL as reviewed_by,
    NULL as source_url,
    'manual' as source_type,
    0 as flag_count,
    0 as spam_score,
    reported_by_user_id as user_id
FROM dangerous_animals

ORDER BY created_at DESC;

-- View: Moderation queue statistics
DROP VIEW IF EXISTS v_moderation_stats;
CREATE VIEW v_moderation_stats AS
SELECT
    COUNT(*) as total_reports,
    SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved_count,
    SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
    SUM(CASE WHEN flag_count > 0 THEN 1 ELSE 0 END) as flagged_count,
    SUM(CASE WHEN spam_score > 50 THEN 1 ELSE 0 END) as suspected_spam_count,
    AVG(CASE
        WHEN approval_status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL
        THEN CAST((julianday(reviewed_at) - julianday(created_at)) * 24 * 60 AS INTEGER)
        ELSE NULL
    END) as avg_review_time_minutes
FROM trapper_blips;

-- View: Recent moderation activity
DROP VIEW IF EXISTS v_recent_moderation_activity;
CREATE VIEW v_recent_moderation_activity AS
SELECT
    aal.log_id,
    aal.admin_user_id,
    u.email as admin_email,
    aal.action_type,
    aal.target_type,
    aal.target_id,
    aal.action_details,
    aal.created_at
FROM admin_audit_log aal
LEFT JOIN users u ON aal.admin_user_id = u.user_id
WHERE aal.action_type IN (
    'report_approve',
    'report_reject',
    'report_edit',
    'report_delete',
    'pending_submission_approve',
    'pending_submission_reject'
)
ORDER BY aal.created_at DESC
LIMIT 100;

-- View: Spam detection patterns
DROP VIEW IF EXISTS v_spam_detection;
CREATE VIEW v_spam_detection AS
SELECT
    reported_by_user_id as user_id,
    COUNT(*) as total_submissions,
    SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
    SUM(CASE WHEN spam_score > 50 THEN 1 ELSE 0 END) as high_spam_score_count,
    GROUP_CONCAT(DISTINCT description) as recent_descriptions,
    MAX(created_at) as last_submission,
    COUNT(DISTINCT DATE(created_at)) as unique_submission_days,
    CAST(COUNT(*) AS FLOAT) / NULLIF(COUNT(DISTINCT DATE(created_at)), 0) as avg_submissions_per_day
FROM trapper_blips
WHERE created_at >= datetime('now', '-30 days')
GROUP BY reported_by_user_id
HAVING
    rejected_count > 2
    OR high_spam_score_count > 1
    OR avg_submissions_per_day > 10
ORDER BY rejected_count DESC, avg_submissions_per_day DESC;

-- ============================================
-- Create trigger for spam score calculation
-- ============================================

-- Calculate spam score based on patterns
DROP TRIGGER IF EXISTS calculate_spam_score;
CREATE TRIGGER calculate_spam_score
AFTER INSERT ON trapper_blips
BEGIN
    UPDATE trapper_blips
    SET spam_score = (
        -- Base score: 0
        0 +
        -- Very short description (< 10 chars): +30 points
        CASE WHEN LENGTH(NEW.description) < 10 THEN 30 ELSE 0 END +
        -- Empty description: +50 points
        CASE WHEN NEW.description IS NULL OR TRIM(NEW.description) = '' THEN 50 ELSE 0 END +
        -- Coordinates at exact 0,0: +40 points
        CASE WHEN NEW.latitude = 0 AND NEW.longitude = 0 THEN 40 ELSE 0 END +
        -- User has multiple reports in last hour: +25 points
        CASE WHEN (
            SELECT COUNT(*) FROM trapper_blips
            WHERE reported_by_user_id = NEW.reported_by_user_id
            AND created_at >= datetime('now', '-1 hour')
        ) > 3 THEN 25 ELSE 0 END
    )
    WHERE blip_id = NEW.blip_id;
END;

-- ============================================
-- Record migration
-- ============================================

INSERT OR IGNORE INTO migrations (migration_name) VALUES ('report_moderation_system_v1');
