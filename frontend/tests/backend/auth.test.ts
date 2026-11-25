import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');

describe('auth.cjs', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    vi.restoreAllMocks();
    delete process.env.CODEPUSH_API_KEY;
  });

  it('extracts API key from headers, bearer token, query, or body', () => {
    expect(auth.extractApiKey({ headers: { 'x-codepush-api-key': 'cp_1' } })).toBe('cp_1');
    expect(auth.extractApiKey({ headers: { Authorization: 'Bearer cp_2' } })).toBe('cp_2');
    expect(auth.extractApiKey({ headers: {}, queryStringParameters: { apiKey: 'cp_3' } })).toBe('cp_3');
    expect(auth.extractApiKey({ headers: {} }, { apiKey: 'cp_4' })).toBe('cp_4');
    expect(auth.extractApiKey({ headers: {} })).toBeNull();
  });

  it('returns 401 when API key is missing', async () => {
    const res = await auth.verifyApiKey(null);
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('validates master CODEPUSH_API_KEY from env', async () => {
    process.env.CODEPUSH_API_KEY = 'cp_master_secret';
    const res = await auth.verifyApiKey('cp_master_secret', 'proj_1');
    expect(res.valid).toBe(true);
    expect(res.isMaster).toBe(true);
    expect(res.projectId).toBe('proj_1');
  });

  it('validates project API key against PostgreSQL and caches result', async () => {
    const querySpy = vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [{ id: 'proj_abc', user_id: 'u1', name: 'App', platform: 'both', api_key: 'cp_live_abc' }],
    });

    const first = await auth.verifyApiKey('cp_live_abc', 'proj_abc');
    expect(first.valid).toBe(true);
    expect(first.projectId).toBe('proj_abc');

    const second = await auth.verifyApiKey('cp_live_abc', 'proj_abc');
    expect(second.valid).toBe(true);
    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when API key belongs to a different projectId', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [{ id: 'proj_other', user_id: 'u1', name: 'Other', platform: 'android', api_key: 'cp_live_other' }],
    });

    const res = await auth.verifyApiKey('cp_live_other', 'proj_requested');
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});

