-- Table: codepush_schema.alerts
-- Manages in-app testing alert modal broadcasts

SET search_path TO codepush_schema, public;

CREATE TABLE IF NOT EXISTS codepush_schema.alerts (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES codepush_schema.projects(id) ON DELETE CASCADE,
    title VARCHAR(255),
    message TEXT NOT NULL,
    type VARCHAR(32) DEFAULT 'info',
    active BOOLEAN DEFAULT TRUE,
    sound_tone VARCHAR(64) DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_project ON codepush_schema.alerts(project_id, active);
