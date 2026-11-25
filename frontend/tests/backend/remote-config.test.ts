import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');
const remoteConfig = require('../../netlify/functions/remote-config.cjs');

describe('remote-config.cjs', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    process.env.CODEPUSH_API_KEY = 'cp_test_key';
    vi.restoreAllMocks();
  });

  it('GET returns remote config flags for project', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({ rows: [] }) // project stub
      .mockResolvedValueOnce({
        rows: [{ key: 'enable_dark_mode', value: 'true', type: 'boolean', description: 'Dark UI' }],
      });

    const res = await remoteConfig.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { projectId: 'proj_1' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.config).toHaveLength(1);
    expect(body.config[0].key).toBe('enable_dark_mode');
  });

  it('POST upserts remote config array into PostgreSQL', async () => {
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });

    const res = await remoteConfig.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      body: JSON.stringify({
        projectId: 'proj_1',
        config: [
          { key: 'checkout_v2', value: true, type: 'boolean', description: 'New checkout' },
          { key: 'max_retries', value: 3, type: 'number' },
        ],
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(querySpy).toHaveBeenCalled();
    expect(JSON.parse(res.body).success).toBe(true);
  });
});

