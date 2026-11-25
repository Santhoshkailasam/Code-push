import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');
const sendPush = require('../../netlify/functions/send-push-notification.cjs');

describe('send-push-notification.cjs', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    process.env.CODEPUSH_API_KEY = 'cp_test_key';
    vi.restoreAllMocks();
  });

  it('handles CORS OPTIONS preflight', async () => {
    const res = await sendPush.handler({ httpMethod: 'OPTIONS' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await sendPush.handler({
      httpMethod: 'GET',
      headers: {},
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET returns push notification history from PostgreSQL', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({
      rows: [
        {
          id: 'push_1',
          project_id: 'proj_1',
          title: 'New Feature',
          body: 'Check out v2.0',
          sound_channel: 'electronic_pulse',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await sendPush.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { projectId: 'proj_1' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('pushNotification');
  });
});
