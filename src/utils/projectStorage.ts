import type { Project } from '../types';
import { db } from '../../db/firebaseConfig';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const PROJECTS_RTDB_URL = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_user_projects';
const PROJECTS_COLLECTION = 'codepush_user_projects';
const ACTIVE_PROJECT_KEY = 'codepush_active_project_id';

export function createDefaultProject(userId?: string): Project {
  const shortUid = userId ? userId.slice(0, 6) : 'guest';
  return {
    id: `app_${shortUid}_${Date.now().toString(36)}`,
    name: 'My Mobile App',
    platform: 'both',
    githubRepo: '',
    branch: 'main',
    apiKey: `cp_live_${shortUid}_${Date.now().toString(36)}`,
    webhookUrl: `https://codepushs.netlify.app/.netlify/functions/github-webhook?userId=${userId || 'guest'}`,
    createdAt: new Date().toISOString(),
    userId: userId,
  };
}

export async function getProjects(userId?: string): Promise<Project[]> {
  const localKey = `codepush_projects_${userId || 'guest'}`;

  // Clean legacy active project ID if pointing to old skillswap default
  try {
    if (localStorage.getItem(ACTIVE_PROJECT_KEY) === 'proj_skillswap_default') {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  } catch {}

  // 1. Fetch from Firebase Realtime Database (shared across local & production)
  try {
    const res = await fetch(`${PROJECTS_RTDB_URL}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        const rawList: Project[] = Object.values(data);
        const filtered = rawList.filter((p: Project) => {
          if (!p || !p.id) return false;
          // Filter by userId if provided, or include if matching
          if (userId && p.userId && p.userId !== userId) return false;
          return p.id.startsWith('app_');
        });

        // Check if there are local projects in localStorage not yet synced to RTDB
        try {
          const cached = localStorage.getItem(localKey);
          if (cached) {
            const localProjects: Project[] = JSON.parse(cached);
            if (Array.isArray(localProjects)) {
              for (const lp of localProjects) {
                if (lp && lp.id?.startsWith('app_') && !filtered.some((p) => p.id === lp.id)) {
                  filtered.push(lp);
                  // Sync missing local project up to RTDB
                  fetch(`${PROJECTS_RTDB_URL}/${lp.id}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(lp),
                  }).catch(() => {});
                }
              }
            }
          }
        } catch {}

        if (filtered.length > 0) {
          try {
            localStorage.setItem(localKey, JSON.stringify(filtered));
          } catch {}
          return filtered;
        }
      }
    }
  } catch (err) {
    console.warn('Firebase RTDB getProjects error, falling back:', err);
  }

  // 2. Fallback to localStorage
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (p: Project) => p && p.id && p.id.startsWith('app_')
        );
        if (cleaned.length > 0) return cleaned;
      }
    }
  } catch {}

  return [];
}

export async function saveProject(project: Project, userId?: string): Promise<Project[]> {
  const updatedProject = { ...project, userId: userId || project.userId };
  const localKey = `codepush_projects_${userId || 'guest'}`;

  // 1. Update localStorage immediately
  let updatedList: Project[] = [];
  try {
    const cached = localStorage.getItem(localKey);
    const existing: Project[] = cached ? JSON.parse(cached) : [];
    const idx = existing.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      updatedList = [...existing];
      updatedList[idx] = updatedProject;
    } else {
      updatedList = [updatedProject, ...existing];
    }
    localStorage.setItem(localKey, JSON.stringify(updatedList));
  } catch {
    updatedList = [updatedProject];
  }

  // 2. Save to Firebase Realtime Database (primary shared cloud database)
  try {
    await fetch(`${PROJECTS_RTDB_URL}/${project.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProject),
    });
  } catch (err) {
    console.warn('Firebase RTDB save project error:', err);
  }

  // 3. Fallback/Dual-write to Firestore (if permitted)
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, project.id);
    await setDoc(docRef, updatedProject, { merge: true });
  } catch {}

  return updatedList;
}

export async function deleteProject(projectId: string, userId?: string): Promise<Project[]> {
  const localKey = `codepush_projects_${userId || 'guest'}`;

  // 1. Remove from localStorage
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed: Project[] = JSON.parse(cached);
      const filtered = parsed.filter((p) => p.id !== projectId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch {}

  // 2. Remove from Firebase Realtime Database
  try {
    await fetch(`${PROJECTS_RTDB_URL}/${projectId}.json`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Firebase RTDB delete project error:', err);
  }

  // 3. Remove from Firestore
  try {
    await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
  } catch {}

  // 4. Clear active project ID if it was this one
  try {
    if (localStorage.getItem(ACTIVE_PROJECT_KEY) === projectId) {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  } catch {}

  return getProjects(userId);
}

export function getSelectedProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setSelectedProjectId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch {}
}
