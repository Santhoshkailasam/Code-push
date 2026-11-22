-- Table: codepush_schema.telemetry_pings
-- Manages mobile device pings, adoption rates, and geographic analytics

SET search_path TO codepush_schema, public;

CREATE TABLE IF NOT EXISTS codepush_schema.telemetry_pings (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES codepush_schema.projects(id) ON DELETE CASCADE,
    platform VARCHAR(16) NOT NULL,
    device VARCHAR(128),
    country VARCHAR(16),
    timezone VARCHAR(64),
    action VARCHAR(255),
    version VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_recent 
    ON codepush_schema.telemetry_pings(project_id, created_at DESC);
