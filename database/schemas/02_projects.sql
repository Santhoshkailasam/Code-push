-- Table: codepush_schema.projects
-- Manages registered mobile applications and API keys

SET search_path TO codepush_schema, public;

CREATE TABLE IF NOT EXISTS codepush_schema.projects (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'app_rCYp1a_mvdfs5j4'
    user_id VARCHAR(64) REFERENCES codepush_schema.users(id) ON DELETE SET NULL,
    name VARCHAR(128) NOT NULL,
    platform VARCHAR(16) NOT NULL DEFAULT 'both', -- 'android', 'ios', 'both'
    api_key VARCHAR(128) UNIQUE NOT NULL,
    github_repo VARCHAR(255),
    branch VARCHAR(64) DEFAULT 'main',
    webhook_url TEXT,
    slack_webhook_url TEXT,
    discord_webhook_url TEXT,
    circuit_breaker_enabled BOOLEAN DEFAULT TRUE,
    circuit_breaker_threshold INT DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_api_key ON codepush_schema.projects(api_key);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON codepush_schema.projects(user_id);
