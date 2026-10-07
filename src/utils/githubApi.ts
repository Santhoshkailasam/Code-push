export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  default_branch: string;
  html_url: string;
  description: string | null;
  updated_at: string;
}

export interface GithubBranch {
  name: string;
  commit: {
    sha: string;
  };
  protected?: boolean;
}

export interface GithubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  public_repos: number;
}

const GITHUB_TOKEN_KEY = 'codepush_github_pat_token';

export function getStoredGithubToken(userId?: string): string | null {
  try {
    const key = userId ? `${GITHUB_TOKEN_KEY}_${userId}` : GITHUB_TOKEN_KEY;
    return localStorage.getItem(key) || localStorage.getItem(GITHUB_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function saveGithubToken(token: string, userId?: string): void {
  try {
    const key = userId ? `${GITHUB_TOKEN_KEY}_${userId}` : GITHUB_TOKEN_KEY;
    localStorage.setItem(key, token.trim());
    localStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
  } catch (err) {
    console.warn('Could not save GitHub token:', err);
  }
}

export function removeGithubToken(userId?: string): void {
  try {
    const key = userId ? `${GITHUB_TOKEN_KEY}_${userId}` : GITHUB_TOKEN_KEY;
    localStorage.removeItem(key);
    localStorage.removeItem(GITHUB_TOKEN_KEY);
  } catch {}
}

/**
 * Fetch authenticated GitHub user details
 */
export async function fetchAuthenticatedGithubUser(token: string): Promise<GithubUser | null> {
  if (!token.trim()) return null;
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${token.trim()}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch GitHub user:', err);
    return null;
  }
}

/**
 * Fetch REAL repositories for authenticated user or public username from GitHub API
 */
export async function fetchGithubRepositories(
  token?: string | null,
  username?: string
): Promise<GithubRepo[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
    try {
      const res = await fetch(
        'https://api.github.com/user/repos?per_page=100&sort=updated&type=all',
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('Authenticated repo fetch failed, trying public fallback:', err);
    }
  }

  // Fallback: Fetch public repositories for given or default username
  const targetUser = username?.trim() || 'Santhoshkailasam';
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(targetUser)}/repos?per_page=100&sort=updated`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('Public repo fetch failed:', err);
  }

  return [];
}

/**
 * Fetch REAL branches for a given GitHub repository (e.g. owner/repo)
 */
export async function fetchGithubBranches(
  fullRepoName: string,
  token?: string | null
): Promise<GithubBranch[]> {
  if (!fullRepoName || !fullRepoName.includes('/')) return [];

  const [owner, repo] = fullRepoName.split('/');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/branches?per_page=100`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error(`Failed to fetch branches for ${fullRepoName}:`, err);
  }

  return [];
}
