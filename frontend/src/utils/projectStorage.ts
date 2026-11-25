import type { Project } from '../types';

let selectedProjectIdMemory: string | null = null;

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
  // Fetch directly from PostgreSQL Projects API (no localStorage caching)
  try {
    const url = userId
      ? `/.netlify/functions/projects?userId=${encodeURIComponent(userId)}`
      : '/.netlify/functions/projects';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.projects)) {
        return data.projects as Project[];
      }
    }
  } catch (err) {
    console.warn('[PostgreSQL Projects API] fetch error:', err);
  }

  return [];
}

export async function saveProject(project: Project, userId?: string): Promise<Project[]> {
  const updatedProject = { ...project, userId: userId || project.userId };

  // Persist to PostgreSQL tables via Projects API
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

  return getProjects(userId);
}

export async function deleteProject(projectId: string, userId?: string): Promise<Project[]> {
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

  // 2. Clear active project ID if it was this one
  if (selectedProjectIdMemory === projectId) {
    selectedProjectIdMemory = null;
  }

  return getProjects(userId);
}

export function getSelectedProjectId(): string | null {
  return selectedProjectIdMemory;
}

export function setSelectedProjectId(id: string): void {
  selectedProjectIdMemory = id;
}
