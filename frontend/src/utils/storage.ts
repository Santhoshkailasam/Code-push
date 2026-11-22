import type { VersionData, ReleaseInfo, ReleaseHistoryItem } from '../types';
import initialVersionData from '../../version.json';

export function getUserApiKey(uid?: string): string {
  if (!uid) return 'cp_live_default_key';
  const apiKeyStorageKey = `codepush_user_api_key_${uid}`;
  try {
    const stored = localStorage.getItem(apiKeyStorageKey);
    if (stored) return stored;
  } catch {}
  const fallbackKey = `cp_live_${uid.slice(0, 6)}_${Date.now().toString(36)}`;
  try {
    localStorage.setItem(apiKeyStorageKey, fallbackKey);
  } catch {}
  return fallbackKey;
}

export function getCachedVersionData(projectId?: string): VersionData | null {
  if (!projectId) return null;
  try {
    const raw = localStorage.getItem(`codepush_cached_data_${projectId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedVersionData(projectId: string, data: VersionData): void {
  if (!projectId || !data) return;
  try {
    localStorage.setItem(`codepush_cached_data_${projectId}`, JSON.stringify(data));
  } catch {}
}

// In-flight request deduplication per project to prevent cross-project cache collisions
const activeFetchPromises = new Map<string, Promise<VersionData>>();

export async function loadVersionDataAsync(
  userId?: string,
  apiKey?: string,
  projectId?: string
): Promise<VersionData> {
  const cacheKey = projectId || 'global';
  const existingPromise = activeFetchPromises.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const fetchPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) headers['x-codepush-api-key'] = apiKey;
      if (userId) headers['x-user-id'] = userId;

      const url = projectId
        ? `/.netlify/functions/releases?projectId=${encodeURIComponent(projectId)}`
        : '/.netlify/functions/releases';

      const res = await fetch(url, { headers });
      if (res.ok) {
        const json = await res.json();
        const history: ReleaseHistoryItem[] = Array.isArray(json.history) ? json.history : [];

        const androidInfo: ReleaseInfo =
          json.android || { ...(initialVersionData.android as unknown as ReleaseInfo), latestVersion: 'v1.0.0 (Base)' };
        const iosInfo: ReleaseInfo =
          json.ios || { ...(initialVersionData.ios as unknown as ReleaseInfo), latestVersion: 'v1.0.0 (Base)' };

        const versionData: VersionData = {
          android: androidInfo,
          ios: iosInfo,
          history,
        };

        if (projectId) {
          setCachedVersionData(projectId, versionData);
        }

        return versionData;
      }
    } catch (e) {
      console.warn('[PostgreSQL Releases API] load error, using local cache:', e);
    } finally {
      activeFetchPromises.delete(cacheKey);
    }

    if (projectId) {
      const cached = getCachedVersionData(projectId);
      if (cached) return cached;
    }

    return {
      android: { ...(initialVersionData.android as unknown as ReleaseInfo), latestVersion: 'v1.0.0 (Base)' },
      ios: { ...(initialVersionData.ios as unknown as ReleaseInfo), latestVersion: 'v1.0.0 (Base)' },
      history: [],
    };
  })();

  activeFetchPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export function subscribeToVersionData(
  userId: string | undefined,
  apiKey: string | undefined,
  onData: (data: VersionData) => void,
  projectId?: string
): () => void {
  // Fetch immediately
  loadVersionDataAsync(userId, apiKey, projectId).then(onData).catch(() => {});

  // Poll every 10 seconds for live updates, only when the tab is currently active
  const interval = setInterval(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const fresh = await loadVersionDataAsync(userId, apiKey, projectId);
      onData(fresh);
    } catch {}
  }, 10000);

  return () => clearInterval(interval);
}

export function loadVersionDataSync(): VersionData {
  return initialVersionData as unknown as VersionData;
}

export async function saveVersionData(
  data: VersionData,
  userId?: string,
  apiKey?: string,
  projectId?: string
): Promise<void> {
  if (projectId) {
    setCachedVersionData(projectId, data);
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) headers['x-codepush-api-key'] = apiKey;
    if (userId) headers['x-user-id'] = userId;

    // Publish/Upsert the latest releases to PostgreSQL
    if (data.history && data.history.length > 0) {
      const latestItem = data.history[0];
      await fetch('/.netlify/functions/publish-release', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...latestItem,
          projectId: projectId || latestItem.projectId,
          userId: userId || latestItem.userId,
          apiKey: apiKey || latestItem.apiKey,
        }),
      });
    }
  } catch (err) {
    console.warn('[PostgreSQL Releases API] save release error:', err);
  }
}

export async function deleteReleaseRecord(id: string): Promise<void> {
  try {
    await fetch(`/.netlify/functions/releases?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('[PostgreSQL Releases API] Failed to delete release:', err);
  }
}

export async function resetVersionDataAsync(): Promise<VersionData> {
  return initialVersionData as unknown as VersionData;
}
