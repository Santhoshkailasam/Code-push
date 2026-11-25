import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIdTokenResult, signOut } from 'firebase/auth';
import { auth } from '../../../db/firebaseConfig';
import {
  subscribeApiLogs,
  addApiLog,
  getEnvTokenConfig,
  getEnvVariablesList,
  formatFullDateTime,
  extractTokenSession,
  getValidAccessToken,
  executeAuthenticatedApiCall,
  authenticatedFetch,
  simulateTokenExpiry,
} from '../../../src/utils/tokenManager';

vi.mock('firebase/auth', () => ({
  getIdTokenResult: vi.fn(),
  signOut: vi.fn(),
}));

describe('tokenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('subscribes to and records API call logs', () => {
    const received: any[] = [];
    const unsubscribe = subscribeApiLogs((logs) => received.push(logs));

    addApiLog({
      endpoint: '/.netlify/functions/releases',
      method: 'GET',
      tokenUsed: 'tok_123',
      status: 'SUCCESS',
      statusCode: 200,
    });

    expect(received.length).toBeGreaterThanOrEqual(2);
    const latest = received[received.length - 1];
    expect(latest[0].endpoint).toBe('/.netlify/functions/releases');
    expect(latest[0].status).toBe('SUCCESS');
    unsubscribe();
  });

  it('parses env token config with sensible defaults', () => {
    const cfg = getEnvTokenConfig();
    expect(cfg.totalMs).toBeGreaterThan(0);
    expect(cfg.refreshMs).toBeGreaterThan(0);
    expect(Array.isArray(getEnvVariablesList())).toBe(true);
  });

  it('formats full date time accurately', () => {
    const formatted = formatFullDateTime(new Date('2026-10-02T10:13:47Z').getTime());
    expect(formatted.dayName).toBeTruthy();
    expect(formatted.dateStr).toContain('2026');
    expect(formatted.fullFormatted).toContain('at');
  });

  it('extracts token session from Firebase user', async () => {
    vi.mocked(getIdTokenResult).mockResolvedValueOnce({
      token: 'fb_access_token_xyz',
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
    } as any);

    const mockUser = {
      uid: 'user_123',
      email: 'dev@codepush.io',
      displayName: 'Dev User',
      photoURL: null,
      refreshToken: 'fb_refresh_abc',
    } as any;

    const session = await extractTokenSession(mockUser);
    expect(session.uid).toBe('user_123');
    expect(session.email).toBe('dev@codepush.io');
    expect(session.accessToken).toBeTruthy();
    expect(session.expiresAt).toBeGreaterThan(session.tokenIssuedAt);
  });

  it('returns cached valid access token without refreshing', async () => {
    const session = {
      uid: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      accessToken: 'valid_cached_tok',
      refreshToken: 'ref_1',
      expiresAt: Date.now() + 120000,
      refreshTokenExpiresAt: Date.now() + 86400000,
      tokenIssuedAt: Date.now(),
    };
    localStorage.setItem('codepush_cached_user', JSON.stringify(session));

    const token = await getValidAccessToken();
    expect(token).toBe('valid_cached_tok');
  });

  it('throws UNAUTHENTICATED when no session or user exists', async () => {
    (auth as any).currentUser = null;
    await expect(getValidAccessToken()).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws SESSION_EXPIRED when cached session is expired and no currentUser exists', async () => {
    (auth as any).currentUser = null;
    localStorage.setItem(
      'codepush_cached_user',
      JSON.stringify({
        uid: 'u1',
        accessToken: 'expired_tok',
        expiresAt: Date.now() - 5000,
      })
    );
    await expect(getValidAccessToken()).rejects.toThrow('SESSION_EXPIRED');
    expect(localStorage.getItem('codepush_cached_user')).toBeNull();
  });

  it('refreshes token via Firebase currentUser when expired or forced', async () => {
    (auth as any).currentUser = {
      uid: 'u2',
      email: 'u2@test.com',
      displayName: 'U2',
      photoURL: null,
      refreshToken: 'ref_2',
    };
    vi.mocked(getIdTokenResult).mockResolvedValueOnce({
      token: 'fresh_token_999',
      expirationTime: new Date(Date.now() + 60000).toISOString(),
    } as any);

    const token = await getValidAccessToken(true);
    expect(token).toBe('fresh_token_999');
    expect(JSON.parse(localStorage.getItem('codepush_cached_user')!).accessToken).toBe('fresh_token_999');
  });

  it('signs out and throws SESSION_EXPIRED when Firebase refresh fails', async () => {
    (auth as any).currentUser = { uid: 'u3', email: 'u3@test.com' };
    vi.mocked(getIdTokenResult).mockRejectedValueOnce(new Error('Network error'));

    await expect(getValidAccessToken(true)).rejects.toThrow('SESSION_EXPIRED');
    expect(signOut).toHaveBeenCalled();
  });

  it('wraps API calls with executeAuthenticatedApiCall and authenticatedFetch', async () => {
    localStorage.setItem(
      'codepush_cached_user',
      JSON.stringify({
        uid: 'u1',
        accessToken: 'tok_abcdef123456',
        expiresAt: Date.now() + 120000,
      })
    );

    const res = await executeAuthenticatedApiCall('publishRelease', async (tok) => `ok:${tok}`);
    expect(res).toBe('ok:tok_abcdef123456');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const httpRes = await authenticatedFetch('/.netlify/functions/releases');
    expect(httpRes.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const callHeaders = fetchSpy.mock.calls[0][1]?.headers as Headers;
    expect(callHeaders.get('Authorization')).toBe('Bearer tok_abcdef123456');
  });

  it('simulates token expiry for testing', () => {
    localStorage.setItem(
      'codepush_cached_user',
      JSON.stringify({ uid: 'u1', expiresAt: Date.now() + 60000 })
    );
    const updated = simulateTokenExpiry(5);
    expect(updated).not.toBeNull();
    expect(updated!.expiresAt).toBeLessThanOrEqual(Date.now() + 5500);
  });
});

