-- Table: codepush_schema.releases
-- Manages OTA deployments, tracks, and rollout metadata

SET search_path TO codepush_schema, public;

CREATE TABLE IF NOT EXISTS codepush_schema.releases (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'rel_android_1_0_1_xyz'
    project_id VARCHAR(64) REFERENCES codepush_schema.projects(id) ON DELETE CASCADE,
    platform VARCHAR(16) NOT NULL, -- 'android' or 'ios'
    track VARCHAR(32) NOT NULL DEFAULT 'production', -- 'production', 'staging', 'beta'
    version VARCHAR(32) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    download_url TEXT NOT NULL,
    mandatory BOOLEAN DEFAULT FALSE,
    release_notes TEXT,
    size_bytes BIGINT,
    target_binary_version VARCHAR(32) DEFAULT '*',
    rollout_percentage INT DEFAULT 100,
    api_key VARCHAR(128),
    user_id VARCHAR(64),
    bundle_base64 TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    revoked BOOLEAN DEFAULT FALSE,
    revocation_reason TEXT,
    revoked_at TIMESTAMPTZ,
    signature TEXT,
    signature_algorithm VARCHAR(32) DEFAULT 'ed25519',
    drift_status VARCHAR(32) DEFAULT 'passed',
    -- JSONB Columns for rich, structured configuration
    canary_schedule JSONB,
    targeting_rules JSONB,
    delta_update JSONB,
    asset_manifest JSONB,
    experiment JSONB,
    ai_guardian_report JSONB,
    dual_slot_status JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_releases_active_lookup 
    ON codepush_schema.releases(project_id, platform, track, is_active);
CREATE INDEX IF NOT EXISTS idx_releases_version_hash 
    ON codepush_schema.releases(project_id, version, hash);
