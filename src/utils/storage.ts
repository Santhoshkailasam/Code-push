import type { VersionData, ReleaseInfo } from '../types';
import initialVersionData from '../../version.json';
import {
  saveFirebaseVersionData,
  deleteFirebaseReleaseRecord,
  clearFirebaseDb,
} from '../../db/firebaseStorage';

const REALTIME_DB_URL = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases.json';

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

export async function loadVersionDataAsync(userId?: string, apiKey?: string, projectId?: string): Promise<VersionData> {
  try {
    const res = await fetch(REALTIME_DB_URL);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.android || data.history)) {
        let historyList = Array.isArray(data.history) ? data.history : [];

        // Scope release history by projectId first, then fallback to userId/apiKey
        if (projectId) {
          const projectScoped = historyList.filter((item: any) => item.projectId === projectId);
          // If we have project-scoped data, use it exclusively
          if (projectScoped.length > 0) {
            historyList = projectScoped;
          } else if (userId || apiKey) {
            // Fallback: scope by user/apiKey for older records
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
        let androidInfo: ReleaseInfo = { ...initialVersionData.android, latestVersion: 'v1.0.0 (Base)' };
        let iosInfo: ReleaseInfo = { ...initialVersionData.ios, latestVersion: 'v1.0.0 (Base)' };

        // Check project-scoped keys in data store
        if (projectId && data.projects && data.projects[projectId]) {
          if (data.projects[projectId].android) androidInfo = data.projects[projectId].android;
          if (data.projects[projectId].ios) iosInfo = data.projects[projectId].ios;
        } else if (apiKey && data.keys && data.keys[apiKey]) {
          if (data.keys[apiKey].android) androidInfo = data.keys[apiKey].android;
          if (data.keys[apiKey].ios) iosInfo = data.keys[apiKey].ios;
        } else if (userId && data.users && data.users[userId]) {
          if (data.users[userId].android) androidInfo = data.users[userId].android;
          if (data.users[userId].ios) iosInfo = data.users[userId].ios;
        }

        // If no stored info but we have history, derive from history
        if (sortedHistory.length > 0) {
          const storedProjectKey = projectId && data.projects && data.projects[projectId];
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
      }
    }
  } catch (e) {
    console.warn('Firebase Realtime DB load error:', e);
  }
  return loadVersionDataSync();
}

export function subscribeToVersionData(
  userId: string | undefined,
  apiKey: string | undefined,
  onData: (data: VersionData) => void,
  projectId?: string
): () => void {
  // Fetch immediately
  loadVersionDataAsync(userId, apiKey, projectId).then(onData).catch(() => {});

  // Poll every 4 seconds for live multi-user dashboard updates
  const interval = setInterval(async () => {
    try {
      const fresh = await loadVersionDataAsync(userId, apiKey, projectId);
      onData(fresh);
    } catch {}
  }, 4000);

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
    const res = await fetch(REALTIME_DB_URL);
    let store = res.ok ? await res.json() : {};
    if (!store) store = {};

    if (!store.history) store.history = [];

    const newItems = data.history.filter(
      (item) => !store.history.some((existing: any) => existing.id === item.id)
    );
    // Tag new items with projectId if provided
    const taggedNewItems = projectId
      ? newItems.map((item) => ({ ...item, projectId }))
      : newItems;

    store.history = [...taggedNewItems, ...store.history];

    // Save scoped by projectId
    if (projectId) {
      if (!store.projects) store.projects = {};
      if (!store.projects[projectId]) store.projects[projectId] = {};
      store.projects[projectId].android = data.android;
      store.projects[projectId].ios = data.ios;
    }

    if (apiKey) {
      if (!store.keys) store.keys = {};
      if (!store.keys[apiKey]) store.keys[apiKey] = {};
      store.keys[apiKey].android = data.android;
      store.keys[apiKey].ios = data.ios;
    }

    if (userId) {
      if (!store.users) store.users = {};
      if (!store.users[userId]) store.users[userId] = {};
      store.users[userId].android = data.android;
      store.users[userId].ios = data.ios;
    }

    store.android = data.android;
    store.ios = data.ios;

    await fetch(REALTIME_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    });
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
