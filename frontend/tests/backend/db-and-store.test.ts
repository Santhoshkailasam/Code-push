import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const store = require('../../netlify/functions/store.cjs');

describe('db.cjs and store.cjs', () => {
  beforeEach(() => {
    store.invalidateStoreCache();
    vi.restoreAllMocks();
  });

  it('db.getPool() returns a singleton pg Pool instance', () => {
    const pool1 = db.getPool();
    const pool2 = db.getPool();
    expect(pool1).toBe(pool2);
    expect(typeof db.query).toBe('function');
  });

  it('formatReleaseRow normalizes snake_case DB rows to camelCase Release objects', () => {
    const formatted = store.formatReleaseRow({
      id: 'rel_1',
      project_id: 'proj_1',
      platform: 'android',
      track: 'staging',
      version: 'v1.0.5',
      hash: 'h123',
      download_url: 'https://cdn/1.zip',
      mandatory: true,
      release_notes: 'Bug fix',
      size_bytes: '2048',
      target_binary_version: '1.0.0',
      rollout_percentage: 50,
      is_active: true,
      revoked: false,
    });

    expect(formatted.id).toBe('rel_1');
    expect(formatted.projectId).toBe('proj_1');
    expect(formatted.sizeBytes).toBe(2048);
    expect(formatted.rolloutPercentage).toBe(50);
    expect(formatted.mandatory).toBe(true);
    expect(store.formatReleaseRow(null)).toBeNull();
  });

  it('getReleaseData caches PostgreSQL results for 10s', async () => {
    const querySpy = vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [
        {
          id: 'rel_cached',
          project_id: 'proj_1',
          platform: 'android',
          track: 'production',
          version: 'v3.0.0',
          is_active: true,
          revoked: false,
        },
      ],
    });

    const data1 = await store.getReleaseData();
    const data2 = await store.getReleaseData();

    expect(data1.android.version).toBe('v3.0.0');
    expect(data2.android.version).toBe('v3.0.0');
    expect(querySpy).toHaveBeenCalledTimes(1);
  });
});

