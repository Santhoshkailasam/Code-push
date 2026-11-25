import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const reportStatus = require('../../netlify/functions/report-status.cjs');

describe('report-status.cjs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET returns latest telemetry pings for project', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [
        { id: 'ping_1', projectId: 'proj_1', platform: 'android', country: 'IN', version: '1.2.0', action: 'Applied update' },
      ],
    });

    const res = await reportStatus.handler({
      httpMethod: 'GET',
      queryStringParameters: { projectId: 'proj_1' },
    });

    expect(res.statusCode).toBe(200);
    const rows = JSON.parse(res.body);
    expect(rows).toHaveLength(1);
    expect(rows[0].country).toBe('IN');
  });

  it('POST records telemetry ping and optional FCM device token', async () => {
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });

    const res = await reportStatus.handler({
      httpMethod: 'POST',
      headers: { 'x-country': 'US' },
      body: JSON.stringify({
        projectId: 'proj_1',
        platform: 'android',
        version: '1.2.0',
        action: 'Update applied',
        device: 'Pixel 7',
        fcmToken: 'fcm_token_very_long_string_123456',
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(querySpy).toHaveBeenCalledTimes(3); // project stub + telemetry_pings + device_tokens
  });
});

