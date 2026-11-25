import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');
const checkUpdate = require('../../netlify/functions/check-update.cjs');

describe('check-update.cjs', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    process.env.CODEPUSH_API_KEY = 'cp_test_key';
    vi.restoreAllMocks();
  });

  it('returns 400 when platform is missing', async () => {
    const res = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('serves active OTA update when version differs and targeting rules pass', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rel_10',
            version: '1.2.0',
            target_binary_version: '^1.0.0',
            download_url: 'https://cdn/1.2.0.zip',
            mandatory: true,
            hash: 'sha256-xyz',
            release_notes: 'Critical fix',
            rollout_percentage: 100,
            revoked: false,
            track: 'production',
            targeting_rules: { targetRegions: ['US', 'IN'] },
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // remote_configs
      .mockResolvedValueOnce({ rows: [] }) // alerts
      .mockResolvedValueOnce({ rows: [] }); // telemetry_pings

    const res = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key', 'x-country': 'IN' },
      queryStringParameters: {
        platform: 'android',
        currentVersion: '1.0.0',
        appVersion: '1.0.5',
        projectId: 'proj_1',
        deviceId: 'dev_123',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.updateAvailable).toBe(true);
    expect(body.latestVersion).toBe('1.2.0');
    expect(body.mandatory).toBe(true);
  });

  it('blocks update when release is revoked (Emergency Kill-Switch)', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rel_revoked',
            version: '1.3.0',
            target_binary_version: '1.0.0',
            download_url: 'https://cdn/1.3.0.zip',
            rollout_percentage: 100,
            revoked: true,
            revocation_reason: 'Boot loop detected',
            track: 'production',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { platform: 'android', currentVersion: '1.0.0', projectId: 'proj_1' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.updateAvailable).toBe(false);
    expect(body.revoked).toBe(true);
  });

  it('respects binary SemVer incompatibility', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rel_v2',
            version: '2.0.0',
            target_binary_version: '>=2.0.0',
            download_url: 'https://cdn/2.0.0.zip',
            rollout_percentage: 100,
            revoked: false,
            track: 'production',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: {
        platform: 'ios',
        currentVersion: '1.0.0',
        appVersion: '1.5.0',
        projectId: 'proj_1',
      },
    });

    const body = JSON.parse(res.body);
    expect(body.updateAvailable).toBe(false);
  });

  it('quarantines matching OS/RAM cohort while serving healthy cohorts normally', async () => {
    const releaseRow = {
      id: 'rel_qc',
      version: '1.0.3',
      target_binary_version: '1.0.0',
      download_url: 'https://cdn/1.0.3.zip',
      rollout_percentage: 100,
      revoked: false,
      track: 'production',
      quarantined_cohorts: [
        { id: 'qc_1', osVersion: '13', ramTier: 'low', reason: 'OOM on low RAM Android 13' },
      ],
    };

    // 1. Matching quarantined device is blocked
    vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [releaseRow] });
    const blockedRes = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: {
        platform: 'android',
        currentVersion: '1.0.2',
        appVersion: '1.0.0',
        osVersion: '13',
        ramTier: 'low',
        projectId: 'proj_1',
      },
    });
    const blockedBody = JSON.parse(blockedRes.body);
    expect(blockedBody.updateAvailable).toBe(false);
    expect(blockedBody.cohortQuarantined).toBe(true);

    // 2. Healthy device (OS 14, high RAM) still receives update
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({ rows: [releaseRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const allowedRes = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: {
        platform: 'android',
        currentVersion: '1.0.2',
        appVersion: '1.0.0',
        osVersion: '14',
        ramTier: 'high',
        projectId: 'proj_1',
      },
    });
    const allowedBody = JSON.parse(allowedRes.body);
    expect(allowedBody.updateAvailable).toBe(true);
    expect(allowedBody.latestVersion).toBe('1.0.3');
  });
});

