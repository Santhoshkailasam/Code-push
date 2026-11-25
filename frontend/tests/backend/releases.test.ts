import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');
const releases = require('../../netlify/functions/releases.cjs');

describe('releases.cjs', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    process.env.CODEPUSH_API_KEY = 'cp_test_key';
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await releases.handler({ httpMethod: 'GET', headers: {} });
    expect(res.statusCode).toBe(401);
  });

  it('GET returns formatted release history and active android/ios targets', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [
        {
          id: 'rel_1',
          project_id: 'proj_1',
          platform: 'android',
          track: 'production',
          version: 'v1.2.0',
          hash: 'h1',
          download_url: 'https://cdn/1.zip',
          mandatory: true,
          is_active: true,
          revoked: false,
          rollout_percentage: 100,
        },
        {
          id: 'rel_2',
          project_id: 'proj_1',
          platform: 'ios',
          track: 'production',
          version: 'v1.1.0',
          hash: 'h2',
          download_url: 'https://cdn/2.zip',
          mandatory: false,
          is_active: true,
          revoked: false,
          rollout_percentage: 50,
        },
      ],
    });

    const res = await releases.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { projectId: 'proj_1' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.history).toHaveLength(2);
    expect(body.android.version).toBe('v1.2.0');
    expect(body.ios.version).toBe('v1.1.0');
  });

  it('DELETE requires release id and deletes record from PostgreSQL', async () => {
    const missingId = await releases.handler({
      httpMethod: 'DELETE',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
    });
    expect(missingId.statusCode).toBe(400);

    vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] });
    const ok = await releases.handler({
      httpMethod: 'DELETE',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { id: 'rel_1' },
    });
    expect(ok.statusCode).toBe(200);
    expect(JSON.parse(ok.body).success).toBe(true);
  });
});

