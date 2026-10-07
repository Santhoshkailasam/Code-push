import type { Project } from '../types';
import { db } from '../../db/firebaseConfig';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

const PROJECTS_COLLECTION = 'codepush_user_projects';
const ACTIVE_PROJECT_KEY = 'codepush_active_project_id';

export function createDefaultProject(userId?: string): Project {
  const shortUid = userId ? userId.slice(0, 6) : 'guest';
  return {
    id: `proj_${shortUid}_${Date.now().toString(36)}`,
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

  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        // Strip all legacy mock projects (proj_ prefix = old auto-generated defaults)
        const cleaned = parsed.filter(
          (p: Project) => p.id.startsWith('app_') // only keep user-created apps
        );
        localStorage.setItem(localKey, JSON.stringify(cleaned));
        if (cleaned.length > 0) return cleaned;
      }
    }
  } catch {}

  // Fetch from Firestore
  if (userId) {
    try {
      const userProjectsRef = collection(db, PROJECTS_COLLECTION);
      const snap = await getDocs(userProjectsRef);
      const list: Project[] = [];
      const toDelete: string[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as Project;
        if (item.userId === userId) {
          if (item.id.startsWith('app_')) {
            list.push(item);
          } else {
            // Queue stale mock docs for cleanup
            toDelete.push(docSnap.id);
          }
        }
      });
      // Silently delete stale mock docs from Firestore
      toDelete.forEach((id) => {
        deleteDoc(doc(db, PROJECTS_COLLECTION, id)).catch(() => {});
      });
      if (list.length > 0) {
        localStorage.setItem(localKey, JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn('Firestore fetch projects warning:', err);
    }
  }

  // No projects found anywhere — user needs to create their first app
  return [];
}

export async function saveProject(project: Project, userId?: string): Promise<Project[]> {
  const projects = await getProjects(userId);
  const existingIdx = projects.findIndex((p) => p.id === project.id);
  const updatedProject = { ...project, userId: userId || project.userId };

  let updatedList: Project[];
  if (existingIdx >= 0) {
    updatedList = [...projects];
    updatedList[existingIdx] = updatedProject;
  } else {
    updatedList = [updatedProject, ...projects];
  }

  const localKey = `codepush_projects_${userId || 'guest'}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(updatedList));
  } catch {}

  // Save to Firestore
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, project.id);
    await setDoc(docRef, updatedProject, { merge: true });
  } catch (err) {
    console.warn('Firestore save project warning:', err);
  }

  return updatedList;
}

export async function deleteProject(projectId: string, userId?: string): Promise<Project[]> {
  const localKey = `codepush_projects_${userId || 'guest'}`;

  // Remove from localStorage
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed: Project[] = JSON.parse(cached);
      const filtered = parsed.filter((p) => p.id !== projectId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch {}

  // Remove from Firestore
  try {
    await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
  } catch (err) {
    console.warn('Firestore delete project warning:', err);
  }

  // Clear active project ID if it was this one
  try {
    if (localStorage.getItem(ACTIVE_PROJECT_KEY) === projectId) {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  } catch {}

  // Return updated list
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
