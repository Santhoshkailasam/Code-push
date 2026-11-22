import type { Project } from '../types';

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

  // 1. Fetch from PostgreSQL Projects API
  try {
    const url = userId
      ? `/.netlify/functions/projects?userId=${encodeURIComponent(userId)}`
      : '/.netlify/functions/projects';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.projects)) {
        const projects: Project[] = data.projects;
        if (projects.length > 0) {
          try {
            localStorage.setItem(localKey, JSON.stringify(projects));
          } catch {}
          return projects;
        }
      }
    }
  } catch (err) {
    console.warn('[PostgreSQL Projects API] fetch error, using local cache:', err);
  }

  // 2. Fallback to localStorage cache for offline resiliency
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return [];
}

export async function saveProject(project: Project, userId?: string): Promise<Project[]> {
  const updatedProject = { ...project, userId: userId || project.userId };
  const localKey = `codepush_projects_${userId || 'guest'}`;

  // 1. Prepare optimistic list
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
  } catch {
    updatedList = [updatedProject];
  }

  // 2. Persist to PostgreSQL tables via Projects API
  const res = await fetch('/.netlify/functions/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedProject),
  });

  if (!res.ok) {
    let errMsg = `Database error (HTTP ${res.status})`;
    try {
      const data = await res.json();
      errMsg = data.details || data.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  const savedProject: Project = data.project || updatedProject;
  const sIdx = updatedList.findIndex((p) => p.id === savedProject.id);
  if (sIdx >= 0) {
    updatedList[sIdx] = savedProject;
  } else {
    updatedList = [savedProject, ...updatedList];
  }

  // 3. Update localStorage ONLY after PostgreSQL confirms persistence
  try {
    localStorage.setItem(localKey, JSON.stringify(updatedList));
  } catch {}

  return updatedList;
}

export async function deleteProject(projectId: string, userId?: string): Promise<Project[]> {
  const localKey = `codepush_projects_${userId || 'guest'}`;

  // 1. Remove from PostgreSQL tables via Projects API
  const res = await fetch(`/.netlify/functions/projects?id=${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    let errMsg = `Database error (HTTP ${res.status})`;
    try {
      const data = await res.json();
      errMsg = data.details || data.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  // 2. Remove from localStorage after PostgreSQL deletion
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed: Project[] = JSON.parse(cached);
      const filtered = parsed.filter((p) => p.id !== projectId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch {}

  // 3. Clear active project ID if it was this one
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
