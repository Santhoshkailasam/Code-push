import type { VersionData } from '../types';
import initialVersionData from '../../version.json';
import {
  initSqliteDb,
  saveSqliteVersionData,
  deleteSqliteReleaseRecord,
  clearSqliteDb,
} from '../db/sqliteStorage';

const STORAGE_KEY = 'codepush_version_data_v1';

export async function loadVersionDataAsync(): Promise<VersionData> {
  try {
    const sqliteData = await initSqliteDb();
    if (sqliteData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sqliteData));
      return sqliteData;
    }
  } catch (e) {
    console.warn('SQLite DB load error, using localStorage fallback:', e);
  }
  return loadVersionDataSync();
}

export function loadVersionDataSync(): VersionData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.android && parsed.ios && Array.isArray(parsed.history)) {
        return parsed as VersionData;
      }
    }
  } catch (e) {
    console.warn('Failed to load version data from localStorage:', e);
  }
  return initialVersionData as VersionData;
}

export function saveVersionData(data: VersionData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    saveSqliteVersionData(data).catch((err) =>
      console.error('Failed to execute SQLite SQL write:', err)
    );
  } catch (e) {
    console.error('Failed to save version data:', e);
  }
}

export async function deleteReleaseRecord(id: string): Promise<void> {
  await deleteSqliteReleaseRecord(id);
}

export async function resetVersionDataAsync(): Promise<VersionData> {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return await clearSqliteDb();
  } catch (e) {
    console.error('Failed to reset SQLite version data:', e);
  }
  return initialVersionData as VersionData;
}
