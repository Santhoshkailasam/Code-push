import type { VersionData, ReleaseInfo } from '../types';
import initialVersionData from '../../version.json';
import {
  saveFirebaseVersionData,
  deleteFirebaseReleaseRecord,
  clearFirebaseDb,
} from '../../db/firebaseStorage';

const DB_BASE = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases';

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

// In-flight request deduplication to prevent redundant concurrent fetches
let activeFetchPromise: Promise<VersionData> | null = null;

export async function loadVersionDataAsync(userId?: string, apiKey?: string, projectId?: string): Promise<VersionData> {
  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      // Fetch only metadata endpoints in parallel (~4 KB total).
      // Crucial: We avoid fetching root /codepush_releases.json directly because it includes
      // large bundle blobs (/bundles) which are ~4 MB and cause huge network latency & thread freezing.
      const [historyRes, projectsRes, keysRes, androidRes, iosRes] = await Promise.all([
        fetch(`${DB_BASE}/history.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${DB_BASE}/projects.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${DB_BASE}/keys.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${DB_BASE}/android.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${DB_BASE}/ios.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      let historyList: any[] = [];
      if (Array.isArray(historyRes)) {
        historyList = historyRes;
      } else if (historyRes && typeof historyRes === 'object') {
        historyList = Object.values(historyRes);
      }

      // Scope release history by projectId first, then fallback to userId/apiKey
      if (projectId) {
        const projectScoped = historyList.filter((item: any) => item.projectId === projectId);
        if (projectScoped.length > 0) {
          historyList = projectScoped;
        } else if (userId || apiKey) {
          historyList = historyList.filter(
            (item: any) => (userId && item.userId === userId) || (apiKey && item.apiKey === apiKey)
          );
        } else {
          historyList = [];
        }
      } else if (userId || apiKey) {
        historyList = historyList.filter(
          (item: any) => (userId && item.userId === userId) || (apiKey && item.apiKey === apiKey)
        );
      }

      const sortedHistory = historyList.sort(
        (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      // Determine android/ios info scoped to projectId
      let androidInfo: ReleaseInfo = androidRes || { ...initialVersionData.android, latestVersion: 'v1.0.0 (Base)' };
      let iosInfo: ReleaseInfo = iosRes || { ...initialVersionData.ios, latestVersion: 'v1.0.0 (Base)' };

      // Check project-scoped keys in data store
      if (projectId && projectsRes && projectsRes[projectId]) {
        if (projectsRes[projectId].android) androidInfo = projectsRes[projectId].android;
        if (projectsRes[projectId].ios) iosInfo = projectsRes[projectId].ios;
      } else if (apiKey && keysRes && keysRes[apiKey]) {
        if (keysRes[apiKey].android) androidInfo = keysRes[apiKey].android;
        if (keysRes[apiKey].ios) iosInfo = keysRes[apiKey].ios;
      }

      // If no stored info but we have history, derive from history
      if (sortedHistory.length > 0) {
        const storedProjectKey = projectId && projectsRes && projectsRes[projectId];
        if (!storedProjectKey) {
          const latestAndroid = sortedHistory.find((h: any) => h.platform === 'android');
          const latestIos = sortedHistory.find((h: any) => h.platform === 'ios');

          if (latestAndroid) {
            androidInfo = {
              latestVersion: latestAndroid.version,
              minAppVersion: '1.0.0',
              downloadUrl: latestAndroid.downloadUrl || '',
              mandatory: latestAndroid.mandatory,
              hash: latestAndroid.hash,
              releaseNotes: latestAndroid.releaseNotes,
              updatedAt: latestAndroid.createdAt,
              sizeBytes: latestAndroid.sizeBytes,
              userId: latestAndroid.userId,
              apiKey: latestAndroid.apiKey,
            };
          }

          if (latestIos) {
            iosInfo = {
              latestVersion: latestIos.version,
              minAppVersion: '1.0.0',
              downloadUrl: latestIos.downloadUrl || '',
              mandatory: latestIos.mandatory,
              hash: latestIos.hash,
              releaseNotes: latestIos.releaseNotes,
              updatedAt: latestIos.createdAt,
              sizeBytes: latestIos.sizeBytes,
              userId: latestIos.userId,
              apiKey: latestIos.apiKey,
            };
          }
        }
      }

      return {
        android: androidInfo,
        ios: iosInfo,
        history: sortedHistory,
      };
    } catch (e) {
      console.warn('Firebase Realtime DB load error:', e);
      return loadVersionDataSync();
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
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
  return initialVersionData as VersionData;
}

export async function saveVersionData(
  data: VersionData,
  userId?: string,
  apiKey?: string,
  projectId?: string
): Promise<void> {
  try {
    const historyRes = await fetch(`${DB_BASE}/history.json`);
    let history: any[] = [];
    if (historyRes.ok) {
      const parsed = await historyRes.json();
      if (Array.isArray(parsed)) history = parsed;
      else if (parsed && typeof parsed === 'object') history = Object.values(parsed);
    }

    const newItems = data.history.filter(
      (item) => !history.some((existing: any) => existing.id === item.id)
    );
    const taggedNewItems = projectId
      ? newItems.map((item) => ({ ...item, projectId }))
      : newItems;

    const updatedHistory = [...taggedNewItems, ...history];

    const writes: Promise<any>[] = [
      fetch(`${DB_BASE}/history.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedHistory),
      }),
      fetch(`${DB_BASE}/android.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.android),
      }),
      fetch(`${DB_BASE}/ios.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.ios),
      }),
    ];

    if (projectId) {
      writes.push(
        fetch(`${DB_BASE}/projects/${projectId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ android: data.android, ios: data.ios }),
        })
      );
    }

    if (apiKey) {
      writes.push(
        fetch(`${DB_BASE}/keys/${apiKey}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ android: data.android, ios: data.ios }),
        })
      );
    }

    await Promise.allSettled(writes);
  } catch (err) {
    console.warn('Firebase RTDB save warning:', err);
  }

  saveFirebaseVersionData(data, userId, apiKey).catch((err) =>
    console.error('Failed to execute Firebase write:', err)
  );
}

export async function deleteReleaseRecord(id: string): Promise<void> {
  await deleteFirebaseReleaseRecord(id);
}

export async function resetVersionDataAsync(): Promise<VersionData> {
  try {
    return await clearFirebaseDb();
  } catch (e) {
    console.error('Failed to reset Firebase version data:', e);
  }
  return initialVersionData as VersionData;
}
