import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');
const sendAlert = require('../../netlify/functions/send-alert.cjs');

describe('send-alert.cjs', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    process.env.CODEPUSH_API_KEY = 'cp_test_key';
    vi.restoreAllMocks();
  });

  it('GET returns active alert and alert history', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [
        {
          id: 'al_1',
          project_id: 'proj_1',
          title: 'Maintenance',
          message: 'Scheduled downtime at 02:00 UTC',
          type: 'warning',
          active: true,
          sound_tone: 'crystal_glass',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await sendAlert.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { projectId: 'proj_1' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.alert.title).toBe('Maintenance');
    expect(body.allAlerts).toHaveLength(1);
  });

  it('POST validates non-empty message and broadcasts alert', async () => {
    const bad = await sendAlert.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      body: JSON.stringify({ projectId: 'proj_1', message: '   ' }),
    });
    expect(bad.statusCode).toBe(400);

    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
    const ok = await sendAlert.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      body: JSON.stringify({
        projectId: 'proj_1',
        title: 'Hotfix Live',
        message: 'Restart app to apply security patch',
        type: 'info',
        soundTone: 'crystal_glass',
      }),
    });
    expect(ok.statusCode).toBe(200);
    expect(JSON.parse(ok.body).success).toBe(true);
  });

  it('DELETE deactivates alerts for project', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] });
    const res = await sendAlert.handler({
      httpMethod: 'DELETE',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { projectId: 'proj_1' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });
});

