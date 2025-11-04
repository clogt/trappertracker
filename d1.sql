-- D1 Setup Script
-- Table 1: users (Accountability)
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    verification_token TEXT,
    is_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: trapper_blips (Trapper Priority/Danger Zones)
CREATE TABLE trapper_blips (
    blip_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reported_by_user_id INTEGER NOT NULL,
    latitude REAL NOT NULL,        -- The final, OFFSET latitude
    longitude REAL NOT NULL,       -- The final, OFFSET longitude
    report_timestamp TEXT NOT NULL,-- Date and Time of Observation (For filters)
    is_active INTEGER DEFAULT 1,   -- 1 = Active, 0 = Reviewed/Removed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id)
);

-- Table 3: lost_pets (Secondary Utility)
CREATE TABLE lost_pets (
    pet_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reported_by_user_id INTEGER NOT NULL,
    pet_name TEXT NOT NULL,
    species_breed TEXT,
    latitude REAL NOT NULL,        -- Exact latitude (No offset)
    longitude REAL NOT NULL,       -- Exact longitude (No offset)
    time_lost TEXT NOT NULL,       -- Date and Time the pet was lost (For filters)
    photo_url TEXT,                -- URL to image stored in R2
    owner_contact_email TEXT NOT NULL,
    is_found INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id)
);