import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');
const reportCrash = require('../../netlify/functions/report-crash.cjs');

describe('report-crash.cjs', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    process.env.CODEPUSH_API_KEY = 'cp_test_key';
    vi.restoreAllMocks();
  });

  it('GET returns crash reports and circuit breaker status', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'cr_1',
            project_id: 'proj_1',
            platform: 'android',
            version: '1.0.1',
            error_message: 'TypeError: Cannot read property of undefined',
            created_at: new Date().toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ circuit_breaker_enabled: true, circuit_breaker_threshold: 5 }],
      });

    const res = await reportCrash.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { projectId: 'proj_1' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.crashes).toHaveLength(1);
    expect(body.circuitBreaker.threshold).toBe(5);
  });

  it('GET with action=ai-diagnosis returns AI Guardian root-cause report', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [
        {
          id: 'cr_2',
          platform: 'android',
          version: '1.0.1',
          error_message: 'TypeError: undefined is not a function',
          stack_trace: 'at checkout (PaymentModal.tsx:88:12)',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await reportCrash.handler({
      httpMethod: 'GET',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { projectId: 'proj_1', action: 'ai-diagnosis', version: '1.0.1', platform: 'android' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.aiReport).toBeDefined();
    expect(body.aiReport.rootCause).toBeTruthy();
  });

  it('POST records a new crash report to PostgreSQL', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ circuit_breaker_enabled: false }] });

    const res = await reportCrash.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      body: JSON.stringify({
        projectId: 'proj_1',
        platform: 'android',
        version: '1.0.1',
        errorMessage: 'Unhandled Promise Rejection',
        stackTrace: 'Error: Boom\n at App.tsx:10:2',
        deviceModel: 'Pixel 8',
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('auto-quarantines a crashing OS/RAM cohort without tripping global circuit breaker', async () => {
    reportCrash.resetCohortWindow();
    vi.spyOn(db, 'query')
      .mockResolvedValue({
        rows: [
          {
            id: 'rel_qc_1',
            circuit_breaker_enabled: false,
            quarantined_cohorts: [],
          },
        ],
      });

    const sendCrash = () =>
      reportCrash.handler({
        httpMethod: 'POST',
        headers: { 'x-codepush-api-key': 'cp_test_key' },
        body: JSON.stringify({
          projectId: 'proj_1',
          platform: 'android',
          version: '1.0.3',
          osVersion: '13',
          ramTier: 'low',
          cohortThreshold: 2,
          message: 'OutOfMemoryError in ImageLoader',
        }),
      });

    const first = JSON.parse((await sendCrash()).body);
    expect(first.cohortQuarantined).toBe(false);

    const second = JSON.parse((await sendCrash()).body);
    expect(second.cohortQuarantined).toBe(true);
    expect(second.quarantinedCohort.osVersion).toBe('13');
    expect(second.quarantinedCohort.ramTier).toBe('low');
  });

  it('lifts a cohort quarantine rule via action=lift-quarantine', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rel_qc_1',
            quarantined_cohorts: [{ id: 'qc_123', osVersion: '13', ramTier: 'low', reason: 'OOM', crashCount: 3 }],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const res = await reportCrash.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      body: JSON.stringify({
        projectId: 'proj_1',
        action: 'lift-quarantine',
        releaseId: 'rel_qc_1',
        cohortId: 'qc_123',
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.quarantinedCohorts).toHaveLength(0);
  });
});

