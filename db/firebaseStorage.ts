import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { VersionData, ReleaseHistoryItem, ReleaseInfo } from '../src/types';
import initialVersionData from '../version.json';

const ACTIVE_RELEASES_COLLECTION = 'codepush_active_releases';
const ACTIVE_DOC_ID = 'current_status';
const RELEASE_HISTORY_COLLECTION = 'codepush_release_history';

/**
 * Initializes Firebase Firestore data or loads existing version data.
 */
export async function initFirebaseDb(): Promise<VersionData> {
  try {
    const activeDocRef = doc(db, ACTIVE_RELEASES_COLLECTION, ACTIVE_DOC_ID);
    const activeDocSnap = await getDoc(activeDocRef);

    const historyCollRef = collection(db, RELEASE_HISTORY_COLLECTION);
    const historySnap = await getDocs(historyCollRef);

    const initialTyped = initialVersionData as unknown as VersionData;

    if (!activeDocSnap.exists() && historySnap.empty) {
      // Seed initial data to Firebase Firestore
      await saveFirebaseVersionData(initialTyped);
      return initialTyped;
    }

    let androidInfo = initialTyped.android;
    let iosInfo = initialTyped.ios;

    if (activeDocSnap.exists()) {
      const activeData = activeDocSnap.data();
      if (activeData.android) androidInfo = activeData.android as ReleaseInfo;
      if (activeData.ios) iosInfo = activeData.ios as ReleaseInfo;
    }

    const historyItems: ReleaseHistoryItem[] = [];
    historySnap.forEach((docSnap) => {
      historyItems.push(docSnap.data() as ReleaseHistoryItem);
    });

    const sortedHistory = historyItems.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      android: androidInfo,
      ios: iosInfo,
      history: sortedHistory,
    };
  } catch (err) {
    console.warn('Firebase Firestore initialization failed, falling back to initial defaults:', err);
    return initialVersionData as unknown as VersionData;
  }
}

/**
 * Real-time listener for Firestore updates (multi-user live updates)
 */
export function subscribeToFirebaseVersionData(
  onData: (data: VersionData) => void
): () => void {
  try {
    const activeDocRef = doc(db, ACTIVE_RELEASES_COLLECTION, ACTIVE_DOC_ID);
    const unsubscribeActive = onSnapshot(activeDocRef, (snap) => {
      if (snap.exists()) {
        const activeData = snap.data();
        const historyCollRef = collection(db, RELEASE_HISTORY_COLLECTION);
        getDocs(historyCollRef).then((historySnap) => {
          const historyItems: ReleaseHistoryItem[] = [];
          historySnap.forEach((docSnap) => {
            historyItems.push(docSnap.data() as ReleaseHistoryItem);
          });
          const sortedHistory = historyItems.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const initialTyped = initialVersionData as unknown as VersionData;
          onData({
            android: (activeData.android as ReleaseInfo) || initialTyped.android,
            ios: (activeData.ios as ReleaseInfo) || initialTyped.ios,
            history: sortedHistory,
          });
        });
      }
    });

    return unsubscribeActive;
  } catch (err) {
    console.warn('Could not subscribe to Firebase Firestore updates:', err);
    return () => { };
  }
}

/**
 * Saves current active releases and release history records to Firebase Firestore.
 */
export async function saveFirebaseVersionData(data: VersionData): Promise<void> {
  try {
    const activeDocRef = doc(db, ACTIVE_RELEASES_COLLECTION, ACTIVE_DOC_ID);
    await setDoc(activeDocRef, {
      android: data.android,
      ios: data.ios,
      updatedAt: new Date().toISOString(),
    });

    for (const item of data.history) {
      const itemRef = doc(db, RELEASE_HISTORY_COLLECTION, item.id);
      await setDoc(itemRef, item);
    }
  } catch (err) {
    console.error('Failed to save to Firebase Firestore:', err);
  }
}

/**
 * Deletes a release item from Firebase Firestore history collection.
 */
export async function deleteFirebaseReleaseRecord(id: string): Promise<void> {
  try {
    const itemRef = doc(db, RELEASE_HISTORY_COLLECTION, id);
    await deleteDoc(itemRef);
  } catch (err) {
    console.error(`Failed to delete doc ${id} from Firebase Firestore:`, err);
  }
}

/**
 * Resets Firebase Firestore records back to default version data.
 */
export async function clearFirebaseDb(): Promise<VersionData> {
  try {
    const initialTyped = initialVersionData as unknown as VersionData;
    await saveFirebaseVersionData(initialTyped);
    return initialTyped;
  } catch (err) {
    console.error('Failed to reset Firebase database:', err);
  }
  return initialVersionData as unknown as VersionData;
}
