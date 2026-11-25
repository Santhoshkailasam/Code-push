import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createDefaultProject,
  getProjects,
  saveProject,
  deleteProject,
  getSelectedProjectId,
  setSelectedProjectId,
} from '../../../src/utils/projectStorage';

describe('projectStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates a default project with userId and API key', () => {
    const proj = createDefaultProject('user123456');
    expect(proj.id).toMatch(/^app_user12_/);
    expect(proj.apiKey).toMatch(/^cp_live_user12_/);
    expect(proj.platform).toBe('both');
    expect(proj.userId).toBe('user123456');
  });

  it('fetches projects from backend API and caches them locally', async () => {
    const apiProjects = [createDefaultProject('u1')];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ projects: apiProjects }), { status: 200 })
    );

    const projects = await getProjects('u1');
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(apiProjects[0].id);
    expect(JSON.parse(localStorage.getItem('codepush_projects_u1')!)).toHaveLength(1);
  });

  it('falls back to localStorage cache when API fails', async () => {
    const cached = [createDefaultProject('u2')];
    localStorage.setItem('codepush_projects_u2', JSON.stringify(cached));
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Offline'));

    const projects = await getProjects('u2');
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(cached[0].id);
  });

  it('saves project via POST and updates local cache', async () => {
    const proj = createDefaultProject('u3');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ project: proj }), { status: 200 })
    );

    const list = await saveProject(proj, 'u3');
    expect(list[0].id).toBe(proj.id);
    expect(JSON.parse(localStorage.getItem('codepush_projects_u3')!)).toHaveLength(1);
  });

  it('throws when saveProject receives non-OK response', async () => {
    const proj = createDefaultProject('u3');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Insert failed' }), { status: 500 })
    );

    await expect(saveProject(proj, 'u3')).rejects.toThrow('Insert failed');
  });

  it('deletes project via DELETE and clears active project if matched', async () => {
    const proj = createDefaultProject('u4');
    localStorage.setItem('codepush_projects_u4', JSON.stringify([proj]));
    setSelectedProjectId(proj.id);
    expect(getSelectedProjectId()).toBe(proj.id);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const remaining = await deleteProject(proj.id, 'u4');

    expect(remaining).toEqual([]);
    expect(getSelectedProjectId()).toBeNull();
  });
});

