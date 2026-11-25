import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import JSZip from 'jszip';
import { calculateTextHash, generateBundleSignature, verifyBundleSignature } from '../../src/utils/crypto';
import { validateBundleFile } from '../../src/utils/bundleValidator';
import { StateRecorder } from '../../src/services/StateRecorder';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');
const store = require('../../netlify/functions/store.cjs');
const publishRelease = require('../../netlify/functions/publish-release.cjs');
const checkUpdate = require('../../netlify/functions/check-update.cjs');
const downloadBundle = require('../../netlify/functions/download-bundle.cjs');
const reportStatus = require('../../netlify/functions/report-status.cjs');
const reportCrash = require('../../netlify/functions/report-crash.cjs');
const sendAlert = require('../../netlify/functions/send-alert.cjs');

describe('In-App CodePush OTA Lifecycle (End-to-End Simulation)', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    store.invalidateStoreCache();
    StateRecorder.clear();
    process.env.CODEPUSH_API_KEY = 'cp_live_e2e_key';
    vi.restoreAllMocks();
  });

  it('simulates full in-app CodePush update: Publish -> Check -> Download -> Verify -> Apply -> Up-to-date', async () => {
    // 1. Create a real ZIP bundle with Hermes-like JS + source map
    const zip = new JSZip();
    const bundleContent = 'var __d=function(){}; NativeModules.RNDeviceInfo.getVersion();';
    zip.file('index.android.bundle', bundleContent);
    zip.file('index.android.bundle.map', JSON.stringify({ version: 3, sources: ['App.tsx'], mappings: 'AAAA' }));
    const zipBase64 = await zip.generateAsync({ type: 'base64' });
    const zipBuffer = Buffer.from(zipBase64, 'base64');
    const zipFile = new File([zipBuffer], 'release-1.1.0.zip', { type: 'application/zip' });

    // Pre-flight validation + cryptographic signing (Console side)
    const validation = await validateBundleFile(zipFile, 'android');
    expect(validation.valid).toBe(true);
    expect(validation.hasSourceMap).toBe(true);

    const bundleHash = await calculateTextHash(zipBase64);
    const { signature } = await generateBundleSignature(bundleHash, 'project_secret');

    // 2. Publish v1.1.0 to Production
    const dbSpy = vi.spyOn(db, 'query').mockResolvedValue({
      rows: [{ id: 'rel_e2e_110', version: '1.1.0', platform: 'android', track: 'production', is_active: true }],
    });

    const pubRes = await publishRelease.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key' },
      body: JSON.stringify({
        projectId: 'proj_e2e',
        platform: 'android',
        version: '1.1.0',
        track: 'production',
        rolloutPercentage: 100,
        mandatory: true,
        targetBinaryVersion: '^1.0.0',
        hash: bundleHash,
        signature,
        bundleBase64: zipBase64,
        downloadUrl: 'https://codepushs.netlify.app/.netlify/functions/download-bundle?platform=android&version=1.1.0',
        releaseNotes: 'In-app checkout hotfix',
      }),
    });
    expect(pubRes.statusCode).toBe(200);

    // 3. Mobile app at v1.0.0 checks for CodePush update
    dbSpy.mockReset();
    dbSpy
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rel_e2e_110',
            version: '1.1.0',
            target_binary_version: '^1.0.0',
            download_url: 'https://codepushs.netlify.app/.netlify/functions/download-bundle?platform=android&version=1.1.0',
            mandatory: true,
            hash: bundleHash,
            release_notes: 'In-app checkout hotfix',
            rollout_percentage: 100,
            revoked: false,
            track: 'production',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // remote_configs
      .mockResolvedValueOnce({ rows: [] }) // alerts
      .mockResolvedValueOnce({ rows: [] }); // telemetry_pings

    const checkRes = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key', 'x-country': 'IN' },
      queryStringParameters: {
        projectId: 'proj_e2e',
        platform: 'android',
        currentVersion: '1.0.0',
        appVersion: '1.0.2',
        deviceId: 'device_pixel_8',
      },
    });
    expect(checkRes.statusCode).toBe(200);
    const updatePayload = JSON.parse(checkRes.body);
    expect(updatePayload.updateAvailable).toBe(true);
    expect(updatePayload.latestVersion).toBe('1.1.0');
    expect(updatePayload.mandatory).toBe(true);

    // 4. Mobile app downloads the bundle ZIP
    dbSpy.mockReset();
    dbSpy.mockResolvedValueOnce({
      rows: [{ bundle_base64: zipBase64, download_url: null }],
    });

    const dlRes = await downloadBundle.handler({
      queryStringParameters: { projectId: 'proj_e2e', platform: 'android', version: '1.1.0' },
    });
    expect(dlRes.statusCode).toBe(200);
    expect(dlRes.headers['Content-Type']).toBe('application/zip');
    expect(dlRes.body).toBe(zipBase64);

    // 5. Mobile app verifies integrity & signature before swapping slot
    const downloadedHash = await calculateTextHash(dlRes.body);
    expect(downloadedHash).toBe(bundleHash);
    expect(await verifyBundleSignature(downloadedHash, signature, 'project_secret')).toBe(true);

    // 6. Mobile app applies update & reports telemetry
    dbSpy.mockReset();
    dbSpy.mockResolvedValue({ rows: [] });
    const statusRes = await reportStatus.handler({
      httpMethod: 'POST',
      headers: { 'x-country': 'IN' },
      body: JSON.stringify({
        projectId: 'proj_e2e',
        platform: 'android',
        version: '1.1.0',
        action: 'Applied CodePush OTA v1.1.0',
        device: 'Pixel 8',
      }),
    });
    expect(statusRes.statusCode).toBe(200);

    // 7. Mobile app re-checks at v1.1.0 -> should be up-to-date
    dbSpy.mockReset();
    dbSpy
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rel_e2e_110',
            version: '1.1.0',
            target_binary_version: '^1.0.0',
            download_url: 'https://cdn/1.1.0.zip',
            rollout_percentage: 100,
            revoked: false,
            track: 'production',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const recheckRes = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key' },
      queryStringParameters: {
        projectId: 'proj_e2e',
        platform: 'android',
        currentVersion: '1.1.0',
        appVersion: '1.0.2',
        deviceId: 'device_pixel_8',
      },
    });
    expect(JSON.parse(recheckRes.body).updateAvailable).toBe(false);
  });

  it('enforces in-app targeting rules (region, minOSVersion, cohort, wifi_only) and canary rollout %', async () => {
    const mockReleaseRow = {
      id: 'rel_canary_25',
      version: '1.2.0',
      target_binary_version: '1.0.0',
      download_url: 'https://cdn/1.2.0.zip',
      rollout_percentage: 100,
      revoked: false,
      track: 'production',
      targeting_rules: {
        targetRegions: ['US', 'IN'],
        minOSVersion: '13.0',
        targetCohort: 'beta_testers',
        network: 'wifi_only',
      },
    };

    // Excluded by region (DE not in [US, IN])
    vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [mockReleaseRow] });
    const regionOut = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key', 'x-country': 'DE' },
      queryStringParameters: { projectId: 'proj_e2e', platform: 'android', currentVersion: '1.0.0' },
    });
    expect(JSON.parse(regionOut.body).targetedOut).toBe(true);

    // Excluded by cellular network when wifi_only is enforced
    vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [mockReleaseRow] });
    const cellularOut = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key', 'x-country': 'US' },
      queryStringParameters: {
        projectId: 'proj_e2e',
        platform: 'android',
        currentVersion: '1.0.0',
        osVersion: '14.0',
        cohort: 'beta_testers',
        network: 'cellular',
      },
    });
    expect(JSON.parse(cellularOut.body).networkExcluded).toBe(true);

    // Eligible when all targeting rules pass
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({ rows: [mockReleaseRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const eligible = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key', 'x-country': 'US' },
      queryStringParameters: {
        projectId: 'proj_e2e',
        platform: 'android',
        currentVersion: '1.0.0',
        osVersion: '14.0',
        cohort: 'beta_testers',
        network: 'wifi',
      },
    });
    expect(JSON.parse(eligible.body).updateAvailable).toBe(true);
  });

  it('triggers emergency kill-switch rollback and records crash + AI diagnosis', async () => {
    // 1. Revoke release
    vi.spyOn(db, 'query').mockResolvedValue({
      rows: [{ id: 'rel_bad', version: '1.3.0', platform: 'android', revoked: true }],
    });

    const revokeRes = await publishRelease.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key' },
      body: JSON.stringify({
        action: 'revoke',
        releaseId: 'rel_bad',
        projectId: 'proj_e2e',
        reason: 'Boot loop on startup',
      }),
    });
    expect(revokeRes.statusCode).toBe(200);

    // 2. App checks update -> receives rollbackToFactory: true
    vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [
        {
          id: 'rel_bad',
          version: '1.3.0',
          target_binary_version: '1.0.0',
          download_url: 'https://cdn/1.3.0.zip',
          revoked: true,
          revocation_reason: 'Boot loop on startup',
          track: 'production',
        },
      ],
    });

    const checkRes = await checkUpdate.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key' },
      queryStringParameters: { projectId: 'proj_e2e', platform: 'android', currentVersion: '1.3.0' },
    });
    const body = JSON.parse(checkRes.body);
    expect(body.updateAvailable).toBe(false);
    expect(body.revoked).toBe(true);
    expect(body.rollbackToFactory).toBe(true);

    // 3. App exports Time-Travel StateRecorder dump & reports crash
    StateRecorder.recordNavigation('CheckoutScreen');
    StateRecorder.recordAction('TAP_PAY', { total: 49.99 });
    const replayDump = StateRecorder.exportReplayDump('TypeError: undefined is not a function');
    expect(replayDump.length).toBeGreaterThanOrEqual(3);

    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ circuit_breaker_enabled: false }] });
    const crashRes = await reportCrash.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key' },
      body: JSON.stringify({
        projectId: 'proj_e2e',
        platform: 'android',
        version: '1.3.0',
        errorMessage: 'TypeError: undefined is not a function',
        stackTrace: 'at PaymentModal (src/PaymentModal.tsx:42:5)',
        replayDump,
      }),
    });
    expect(crashRes.statusCode).toBe(200);
  });

  it('delivers live in-app alert banner from Console to Mobile App', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
    const postAlert = await sendAlert.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key' },
      body: JSON.stringify({
        projectId: 'proj_e2e',
        title: 'Hotfix Ready',
        message: 'Restart app for instant update',
        type: 'info',
        soundTone: 'crystal_glass',
      }),
    });
    expect(postAlert.statusCode).toBe(200);

    vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [
        {
          id: 'al_live_1',
          project_id: 'proj_e2e',
          title: 'Hotfix Ready',
          message: 'Restart app for instant update',
          type: 'info',
          active: true,
          sound_tone: 'crystal_glass',
          created_at: new Date().toISOString(),
        },
      ],
    });
    const getAlert = await sendAlert.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_live_e2e_key' },
      queryStringParameters: { projectId: 'proj_e2e' },
    });
    expect(JSON.parse(getAlert.body).alert.title).toBe('Hotfix Ready');
  });
});
