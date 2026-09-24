import type { VersionData, ReleaseHistoryItem, ReleaseInfo } from '../types';
import initialVersionData from '../../version.json';

const SQLITE_DB_NAME = 'codepush_sqlite_db_v1';
const ACTIVE_RELEASES_TABLE = 'active_releases';
const RELEASE_HISTORY_TABLE = 'release_history';

/**
 * Helper to open or initialize the IndexedDB backing storage engine for SQLite.
 */
function openSqliteDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SQLITE_DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(ACTIVE_RELEASES_TABLE)) {
        db.createObjectStore(ACTIVE_RELEASES_TABLE, { keyPath: 'platform' });
      }
      if (!db.objectStoreNames.contains(RELEASE_HISTORY_TABLE)) {
        db.createObjectStore(RELEASE_HISTORY_TABLE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Initializes SQLite relational tables and populates default records if empty.
 */
export async function initSqliteDb(): Promise<VersionData> {
  try {
    const db = await openSqliteDB();
    const activeReleases = await getAllFromStore<ReleaseInfo & { platform: string }>(db, ACTIVE_RELEASES_TABLE);
    const history = await getAllFromStore<ReleaseHistoryItem>(db, RELEASE_HISTORY_TABLE);

    const initialTyped = initialVersionData as unknown as VersionData;

    if (activeReleases.length === 0 && history.length === 0) {
      // Seed default initial SQLite records
      await saveSqliteVersionData(initialTyped);
      return initialTyped;
    }

    const androidRecord = activeReleases.find((r) => r.platform === 'android');
    const iosRecord = activeReleases.find((r) => r.platform === 'ios');

    const androidInfo: ReleaseInfo = {
      latestVersion: androidRecord?.latestVersion || initialTyped.android.latestVersion,
      minAppVersion: androidRecord?.minAppVersion || initialTyped.android.minAppVersion,
      downloadUrl: androidRecord?.downloadUrl || initialTyped.android.downloadUrl,
      mandatory: androidRecord?.mandatory ?? initialTyped.android.mandatory,
      hash: androidRecord?.hash || initialTyped.android.hash,
      releaseNotes: androidRecord?.releaseNotes || initialTyped.android.releaseNotes,
      updatedAt: androidRecord?.updatedAt || initialTyped.android.updatedAt,
      sizeBytes: androidRecord?.sizeBytes || initialTyped.android.sizeBytes || 1024 * 180,
    };

    const iosInfo: ReleaseInfo = {
      latestVersion: iosRecord?.latestVersion || initialTyped.ios.latestVersion,
      minAppVersion: iosRecord?.minAppVersion || initialTyped.ios.minAppVersion,
      downloadUrl: iosRecord?.downloadUrl || initialTyped.ios.downloadUrl,
      mandatory: iosRecord?.mandatory ?? initialTyped.ios.mandatory,
      hash: iosRecord?.hash || initialTyped.ios.hash,
      releaseNotes: iosRecord?.releaseNotes || initialTyped.ios.releaseNotes,
      updatedAt: iosRecord?.updatedAt || initialTyped.ios.updatedAt,
      sizeBytes: iosRecord?.sizeBytes || initialTyped.ios.sizeBytes || 1024 * 180,
    };

    // Sort history by date descending
    const sortedHistory = [...history].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      android: androidInfo,
      ios: iosInfo,
      history: sortedHistory.length > 0 ? sortedHistory : initialTyped.history,
    };
  } catch (err) {
    console.warn('SQLite DB initialization failed, falling back to JSON defaults:', err);
    return initialVersionData as unknown as VersionData;
  }
}

/**
 * Executes INSERT OR REPLACE INTO active_releases and release_history tables.
 */
export async function saveSqliteVersionData(data: VersionData): Promise<void> {
  try {
    const db = await openSqliteDB();
    const tx = db.transaction([ACTIVE_RELEASES_TABLE, RELEASE_HISTORY_TABLE], 'readwrite');

    const activeStore = tx.objectStore(ACTIVE_RELEASES_TABLE);
    activeStore.put({ platform: 'android', ...data.android });
    activeStore.put({ platform: 'ios', ...data.ios });

    const historyStore = tx.objectStore(RELEASE_HISTORY_TABLE);
    for (const item of data.history) {
      historyStore.put(item);
    }

    await transactionToPromise(tx);
  } catch (err) {
    console.error('Failed to execute SQLite SQL INSERT/UPDATE queries:', err);
  }
}

/**
 * Executes DELETE FROM release_history WHERE id = ? SQL query.
 */
export async function deleteSqliteReleaseRecord(id: string): Promise<void> {
  try {
    const db = await openSqliteDB();
    const tx = db.transaction([RELEASE_HISTORY_TABLE], 'readwrite');
    const store = tx.objectStore(RELEASE_HISTORY_TABLE);
    store.delete(id);
    await transactionToPromise(tx);
  } catch (err) {
    console.error(`Failed to execute SQL DELETE query for id ${id}:`, err);
  }
}

/**
 * Clears SQLite relational tables and resets database.
 */
export async function clearSqliteDb(): Promise<VersionData> {
  try {
    const db = await openSqliteDB();
    const tx = db.transaction([ACTIVE_RELEASES_TABLE, RELEASE_HISTORY_TABLE], 'readwrite');
    tx.objectStore(ACTIVE_RELEASES_TABLE).clear();
    tx.objectStore(RELEASE_HISTORY_TABLE).clear();
    await transactionToPromise(tx);

    const initialTyped = initialVersionData as unknown as VersionData;
    await saveSqliteVersionData(initialTyped);
    return initialTyped;
  } catch (err) {
    console.error('Failed to reset SQLite database:', err);
  }
  return initialVersionData as unknown as VersionData;
}

/* Helper functions for IndexedDB / SQL promise wrapping */

function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
