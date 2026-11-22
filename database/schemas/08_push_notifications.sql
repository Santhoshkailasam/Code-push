-- Table: codepush_schema.push_notifications
-- Manages live push notifications dispatched from CodePush Testing Console

SET search_path TO codepush_schema, public;

CREATE TABLE IF NOT EXISTS codepush_schema.push_notifications (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES codepush_schema.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    subtitle VARCHAR(255),
    image_url TEXT,
    deep_link TEXT,
    sound_tone VARCHAR(64) DEFAULT 'default',
    platform VARCHAR(32) DEFAULT 'all',
    target VARCHAR(32) DEFAULT 'all',
    token TEXT,
    topic VARCHAR(128),
    priority VARCHAR(32) DEFAULT 'high',
    active BOOLEAN DEFAULT TRUE,
    delivery_status VARCHAR(64) DEFAULT 'DELIVERED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_notif_project ON codepush_schema.push_notifications(project_id, active);
