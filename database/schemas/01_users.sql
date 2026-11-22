-- Table: codepush_schema.users
-- Manages developer accounts, roles, and credentials

SET search_path TO codepush_schema, public;

CREATE TABLE IF NOT EXISTS codepush_schema.users (
    id VARCHAR(64) PRIMARY KEY, -- Firebase UID or custom UUID
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(128),
    role VARCHAR(32) DEFAULT 'developer', -- 'admin', 'developer', 'viewer'
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON codepush_schema.users(email);
