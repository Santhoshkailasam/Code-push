import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');
const publishRelease = require('../../netlify/functions/publish-release.cjs');

describe('publish-release.cjs', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    process.env.CODEPUSH_API_KEY = 'cp_test_key';
    vi.restoreAllMocks();
  });

  it('rejects non-POST methods with 405', async () => {
    const res = await publishRelease.handler({ httpMethod: 'GET', headers: {} });
    expect(res.statusCode).toBe(405);
  });

  it('rejects missing platform or version on standard publish', async () => {
    const res = await publishRelease.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      body: JSON.stringify({ platform: 'android' }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('publishes a new release and persists to PostgreSQL', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 'rel_pub_1', version: 'v2.5.0', platform: 'android', track: 'production', is_active: true }] });

    const res = await publishRelease.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      body: JSON.stringify({
        projectId: 'proj_1',
        platform: 'android',
        version: 'v2.5.0',
        track: 'production',
        rolloutPercentage: 25,
        mandatory: false,
        releaseNotes: 'Canary rollout',
        hash: 'sha256-abc',
        downloadUrl: 'https://cdn/v2.5.0.zip',
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });

  it('supports emergency revoke (kill-switch) action', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({
      rows: [{ id: 'rel_pub_1', version: 'v2.5.0', platform: 'android', revoked: true }],
    });

    const res = await publishRelease.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      body: JSON.stringify({
        action: 'revoke',
        releaseId: 'rel_pub_1',
        projectId: 'proj_1',
        reason: 'Crash spike',
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });
});

