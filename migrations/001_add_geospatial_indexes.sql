-- Migration: Add indexes for geospatial queries
-- Date: 2025-12-08
-- Purpose: Optimize latitude/longitude queries and timestamp filtering

-- Index for trapper_blips geospatial queries
CREATE INDEX IF NOT EXISTS idx_trapper_blips_lat_lng
ON trapper_blips(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_trapper_blips_timestamp
ON trapper_blips(report_timestamp);

CREATE INDEX IF NOT EXISTS idx_trapper_blips_active
ON trapper_blips(is_active);

-- Index for lost_pets geospatial queries
CREATE INDEX IF NOT EXISTS idx_lost_pets_lat_lng
ON lost_pets(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_lost_pets_time_lost
ON lost_pets(time_lost);

CREATE INDEX IF NOT EXISTS idx_lost_pets_is_found
ON lost_pets(is_found);

-- Index for found_pets geospatial queries
CREATE INDEX IF NOT EXISTS idx_found_pets_lat_lng
ON found_pets(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_found_pets_time_found
ON found_pets(time_found);

CREATE INDEX IF NOT EXISTS idx_found_pets_is_reunited
ON found_pets(is_reunited);

-- Index for dangerous_animals geospatial queries
CREATE INDEX IF NOT EXISTS idx_dangerous_animals_lat_lng
ON dangerous_animals(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_dangerous_animals_timestamp
ON dangerous_animals(report_timestamp);

-- Composite index for common query patterns (active reports within time range)
CREATE INDEX IF NOT EXISTS idx_trapper_blips_active_timestamp
ON trapper_blips(is_active, report_timestamp);

-- Index for user lookups (frequently used in queries)
CREATE INDEX IF NOT EXISTS idx_trapper_blips_user
ON trapper_blips(reported_by_user_id);

CREATE INDEX IF NOT EXISTS idx_lost_pets_user
ON lost_pets(reported_by_user_id);

CREATE INDEX IF NOT EXISTS idx_found_pets_user
ON found_pets(reported_by_user_id);

CREATE INDEX IF NOT EXISTS idx_dangerous_animals_user
ON dangerous_animals(reported_by_user_id);

-- Index for pending submissions
CREATE INDEX IF NOT EXISTS idx_pending_submissions_user
ON pending_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_pending_submissions_completed
ON pending_submissions(completed);
