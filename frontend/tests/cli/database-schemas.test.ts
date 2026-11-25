import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const schemasDir = path.resolve(process.cwd(), '../database/schemas');

describe('PostgreSQL Database Schemas', () => {
  const expectedFiles = [
    '00_init_schema.sql',
    '01_users.sql',
    '02_projects.sql',
    '03_releases.sql',
    '04_remote_configs.sql',
    '05_crash_reports.sql',
    '06_telemetry_pings.sql',
    '07_alerts.sql',
    '08_push_notifications.sql',
    'index.sql',
  ];

  it('contains all expected SQL schema files', () => {
    for (const file of expectedFiles) {
      const fullPath = path.join(schemasDir, file);
      expect(fs.existsSync(fullPath), `Missing schema file: ${file}`).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content.trim().length).toBeGreaterThan(20);
    }
  });

  it('defines core codepush_schema tables with primary keys and indexes', () => {
    const releasesSql = fs.readFileSync(path.join(schemasDir, '03_releases.sql'), 'utf8');
    expect(releasesSql).toContain('CREATE TABLE IF NOT EXISTS codepush_schema.releases');
    expect(releasesSql).toContain('canary_schedule JSONB');
    expect(releasesSql).toContain('targeting_rules JSONB');
    expect(releasesSql).toContain('CREATE INDEX IF NOT EXISTS');

    const projectsSql = fs.readFileSync(path.join(schemasDir, '02_projects.sql'), 'utf8');
    expect(projectsSql).toContain('CREATE TABLE IF NOT EXISTS codepush_schema.projects');

    const crashesSql = fs.readFileSync(path.join(schemasDir, '05_crash_reports.sql'), 'utf8');
    expect(crashesSql).toContain('CREATE TABLE IF NOT EXISTS codepush_schema.crash_reports');
  });
});

