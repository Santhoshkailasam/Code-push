import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserApiKey,
  getCachedVersionData,
  setCachedVersionData,
  loadVersionDataAsync,
  loadVersionDataSync,
  saveVersionData,
  deleteReleaseRecord,
  subscribeToVersionData,
} from '../../../src/utils/storage';

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('generates and persists user API key', () => {
    expect(getUserApiKey()).toBe('cp_live_default_key');
    const key1 = getUserApiKey('uid_abc123');
    const key2 = getUserApiKey('uid_abc123');
    expect(key1).toMatch(/^cp_live_uid_ab_/);
    expect(key1).toBe(key2);
  });

  it('caches and retrieves version data per project', () => {
    const base = loadVersionDataSync();
    expect(base.android).toBeDefined();
    expect(base.ios).toBeDefined();

    setCachedVersionData('proj_1', base);
    const cached = getCachedVersionData('proj_1');
    expect(cached?.android.latestVersion).toBe(base.android.latestVersion);
  });

  it('loads version data from backend API and caches it', async () => {
    const mockResponse = {
      android: { latestVersion: 'v2.1.0', minAppVersion: '1.0.0', downloadUrl: 'https://cdn/b.zip', mandatory: false, hash: 'h1', releaseNotes: 'fix', timestamp: '2026-01-01' },
      ios: { latestVersion: 'v2.0.0', minAppVersion: '1.0.0', downloadUrl: 'https://cdn/i.zip', mandatory: false, hash: 'h2', releaseNotes: 'init', timestamp: '2026-01-01' },
      history: [{ id: 'rel_1', version: 'v2.1.0', platform: 'android' }],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const data = await loadVersionDataAsync('u1', 'cp_key', 'proj_api');
    expect(data.android.latestVersion).toBe('v2.1.0');
    expect(data.history).toHaveLength(1);
    expect(getCachedVersionData('proj_api')?.android.latestVersion).toBe('v2.1.0');
  });

  it('saves version data and deletes release records via backend API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const base = loadVersionDataSync();
    const withHistory = {
      ...base,
      history: [
        {
          id: 'rel_99',
          version: 'v1.2.3',
          platform: 'android' as const,
          track: 'production' as const,
          rolloutPercentage: 100,
          mandatory: false,
          releaseNotes: 'test',
          downloadUrl: 'https://cdn/1.zip',
          hash: 'abc',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await saveVersionData(withHistory, 'u1', 'key1', 'proj_save');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/.netlify/functions/publish-release',
      expect.objectContaining({ method: 'POST' })
    );

    await deleteReleaseRecord('rel_99', 'proj_save', 'key1', 'u1');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/.netlify/functions/releases?id=rel_99'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('subscribes to version data updates and cleans up interval', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ history: [] }), { status: 200 })
    );

    const onData = vi.fn();
    const unsubscribe = subscribeToVersionData('u1', 'key1', onData, 'proj_sub');
    await vi.advanceTimersByTimeAsync(10);
    expect(onData).toHaveBeenCalled();

    unsubscribe();
    vi.useRealTimers();
  });
});

