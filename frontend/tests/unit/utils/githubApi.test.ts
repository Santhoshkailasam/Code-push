import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStoredGithubToken,
  saveGithubToken,
  removeGithubToken,
  fetchAuthenticatedGithubUser,
  fetchGithubRepositories,
  fetchGithubBranches,
} from '../../../src/utils/githubApi';

describe('githubApi', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores, retrieves, and removes GitHub PAT tokens per user', () => {
    expect(getStoredGithubToken('u1')).toBeNull();
    saveGithubToken('  ghp_secret_123  ', 'u1');
    expect(getStoredGithubToken('u1')).toBe('ghp_secret_123');
    removeGithubToken('u1');
    expect(getStoredGithubToken('u1')).toBeNull();
  });

  it('fetches authenticated GitHub user details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ login: 'octocat', name: 'The Octocat', public_repos: 8 }), { status: 200 })
    );

    const user = await fetchAuthenticatedGithubUser('ghp_valid');
    expect(user?.login).toBe('octocat');
    expect(await fetchAuthenticatedGithubUser('   ')).toBeNull();
  });

  it('fetches authenticated repos and falls back to public repos when token fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 1, name: 'codepush-app', full_name: 'user/codepush-app' }]), { status: 200 }));

    const repos = await fetchGithubRepositories('ghp_bad', 'someuser');
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('codepush-app');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('fetches branches for valid repo full_name and returns [] for invalid input', async () => {
    expect(await fetchGithubBranches('invalid-repo-name')).toEqual([]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([{ name: 'main', commit: { sha: 'abc' } }]), { status: 200 })
    );

    const branches = await fetchGithubBranches('owner/repo', 'ghp_tok');
    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe('main');
  });
});

