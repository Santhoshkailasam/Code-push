-- Table: codepush_schema.crash_reports
-- Manages unhandled crash logs, symbolicated stacks, and circuit breaker status

SET search_path TO codepush_schema, public;

CREATE TABLE IF NOT EXISTS codepush_schema.crash_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(64) REFERENCES codepush_schema.projects(id) ON DELETE CASCADE,
    version VARCHAR(32) NOT NULL,
    platform VARCHAR(16) NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,
    symbolicated BOOLEAN DEFAULT FALSE,
    symbolicated_stack TEXT,
    device VARCHAR(128),
    resolved BOOLEAN DEFAULT FALSE,
    circuit_breaker_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crashes_lookup 
    ON codepush_schema.crash_reports(project_id, version, platform, created_at DESC);
