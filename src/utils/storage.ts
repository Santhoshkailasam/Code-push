import type { VersionData } from '../types';
import initialVersionData from '../../version.json';
import {
  initFirebaseDb,
  subscribeToFirebaseVersionData,
  saveFirebaseVersionData,
  deleteFirebaseReleaseRecord,
  clearFirebaseDb,
} from '../../db/firebaseStorage';

export async function loadVersionDataAsync(): Promise<VersionData> {
  try {
    const firebaseData = await initFirebaseDb();
    if (firebaseData) {
      return firebaseData;
    }
  } catch (e) {
    console.warn('Firebase Firestore load error:', e);
  }
  return loadVersionDataSync();
}

export function subscribeToVersionData(onData: (data: VersionData) => void): () => void {
  return subscribeToFirebaseVersionData(onData);
}

export function loadVersionDataSync(): VersionData {
  return initialVersionData as VersionData;
}

export function saveVersionData(data: VersionData): void {
  saveFirebaseVersionData(data).catch((err) =>
    console.error('Failed to execute Firebase Firestore write:', err)
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

