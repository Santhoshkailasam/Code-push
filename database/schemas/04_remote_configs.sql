-- Table: codepush_schema.remote_configs
-- Manages dynamic runtime configuration and feature flags

SET search_path TO codepush_schema, public;

CREATE TABLE IF NOT EXISTS codepush_schema.remote_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(64) REFERENCES codepush_schema.projects(id) ON DELETE CASCADE,
    key VARCHAR(128) NOT NULL,
    value JSONB NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, key)
);

CREATE INDEX IF NOT EXISTS idx_remote_configs_project ON codepush_schema.remote_configs(project_id);
