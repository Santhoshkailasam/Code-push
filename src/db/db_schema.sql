-- ============================================================
-- CodePush Console SQLite Database Schema
-- File: docs/db_schema.sql
-- ============================================================

-- Table 1: Active Production Release Bundles (Android & iOS)
CREATE TABLE IF NOT EXISTS active_releases (
    platform VARCHAR(10) PRIMARY KEY, -- 'android' or 'ios'
    latestVersion VARCHAR(20) NOT NULL,
    minAppVersion VARCHAR(20) NOT NULL,
    downloadUrl TEXT NOT NULL,
    mandatory INTEGER NOT NULL DEFAULT 0, -- 0 = Optional, 1 = Mandatory
    hash VARCHAR(64) NOT NULL, -- SHA-256 Checksum
    releaseNotes TEXT,
    updatedAt DATETIME NOT NULL,
    sizeBytes INTEGER DEFAULT 184320
);

-- Table 2: Complete Release History Audit Log
CREATE TABLE IF NOT EXISTS release_history (
    id VARCHAR(50) PRIMARY KEY,
    platform VARCHAR(10) NOT NULL,
    version VARCHAR(20) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    mandatory INTEGER NOT NULL DEFAULT 0,
    releaseNotes TEXT,
    createdAt DATETIME NOT NULL,
    sizeBytes INTEGER DEFAULT 184320,
    downloadUrl TEXT
);

-- Index for fast version queries by platform and creation date
CREATE INDEX IF NOT EXISTS idx_release_history_platform_date 
ON release_history(platform, createdAt DESC);

-- Default Initial Seeding Data
INSERT OR IGNORE INTO active_releases (
    platform, latestVersion, minAppVersion, downloadUrl, mandatory, hash, releaseNotes, updatedAt, sizeBytes
) VALUES 
(
    'android', '1.0.0', '1.0.0', 'https://your-site.netlify.app/bundles/android-v1.0.0.zip', 
    0, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Initial production release', '2026-09-21T21:30:00Z', 184320
),
(
    'ios', '1.0.0', '1.0.0', 'https://your-site.netlify.app/bundles/ios-v1.0.0.zip', 
    0, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Initial production release', '2026-09-21T21:30:00Z', 184320
);

INSERT OR IGNORE INTO release_history (
    id, platform, version, hash, mandatory, releaseNotes, createdAt, sizeBytes, downloadUrl
) VALUES 
(
    'rel_1', 'android', '1.0.0', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    0, 'Initial production release', '2026-09-21T21:30:00Z', 184320, 'https://your-site.netlify.app/bundles/android-v1.0.0.zip'
);
