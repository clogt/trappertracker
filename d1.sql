-- D1 Setup Script

-- Table 1: users (Accountability & Roles)
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    verification_token TEXT,
    is_verified INTEGER DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'user', -- For tiered users ('user', 'admin', 'moderator')
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: trapper_blips (Trapper Priority/Danger Zones)
CREATE TABLE trapper_blips (
    blip_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reported_by_user_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    report_timestamp TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    description TEXT, -- Added for consistency with other report types
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id)
);

-- Table 3: lost_pets (User Reports)
CREATE TABLE lost_pets (
    pet_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reported_by_user_id TEXT NOT NULL,
    pet_name TEXT NOT NULL,
    species_breed TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    time_lost TEXT NOT NULL,
    photo_url TEXT,
    description TEXT,
    owner_contact_email TEXT NOT NULL,
    is_found INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id)
);

-- Table 4: found_pets (Community Reporting)
CREATE TABLE found_pets (
    found_pet_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reported_by_user_id TEXT NOT NULL,
    species_breed TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    time_found TEXT NOT NULL,
    photo_url TEXT,
    description TEXT, -- e.g., "wearing a blue collar"
    contact_info TEXT NOT NULL, -- contact of the person who found the pet
    is_reunited INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id)
);

-- Table 5: dangerous_animals (Safety Alerts)
CREATE TABLE dangerous_animals (
    danger_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reported_by_user_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    animal_type TEXT NOT NULL, -- 'wild' or 'domestic'
    description TEXT,
    report_timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id)
);
