import type { VersionData } from '../types';
import initialVersionData from '../../version.json';
import {
  saveFirebaseVersionData,
  deleteFirebaseReleaseRecord,
  clearFirebaseDb,
} from '../../db/firebaseStorage';

const REALTIME_DB_URL = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases.json';

export async function loadVersionDataAsync(): Promise<VersionData> {
  try {
    const res = await fetch(REALTIME_DB_URL);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.android || data.history)) {
        const historyList = Array.isArray(data.history) ? data.history : [];
        const sortedHistory = historyList.sort(
          (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        return {
          android: data.android || (initialVersionData as any).android,
          ios: data.ios || (initialVersionData as any).ios,
          history: sortedHistory,
        };
      }
    }
  } catch (e) {
    console.warn('Firebase Realtime DB load error:', e);
  }
  return loadVersionDataSync();
}

export function subscribeToVersionData(onData: (data: VersionData) => void): () => void {
  // Fetch immediately
  loadVersionDataAsync().then(onData).catch(() => {});

  // Poll every 4 seconds for live multi-user dashboard updates
  const interval = setInterval(async () => {
    try {
      const fresh = await loadVersionDataAsync();
      onData(fresh);
    } catch {}
  }, 4000);

  return () => clearInterval(interval);
}

export function loadVersionDataSync(): VersionData {
  return initialVersionData as VersionData;
}

export function saveVersionData(data: VersionData): void {
  saveFirebaseVersionData(data).catch((err) =>
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

