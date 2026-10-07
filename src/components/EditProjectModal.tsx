import React, { useState, useEffect } from 'react';
import {
  X,
  Folder,
  Smartphone,
  Apple,
  Layers,
  Sparkles,
  Key,
  RefreshCw,
  Search,
  Lock,
  Globe,
  Loader2,
  Check,
} from 'lucide-react';
import type { Project } from '../types';
import {
  getStoredGithubToken,
  saveGithubToken,
  fetchAuthenticatedGithubUser,
  fetchGithubRepositories,
  fetchGithubBranches,
  type GithubRepo,
  type GithubBranch,
  type GithubUser,
} from '../utils/githubApi';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onUpdateProject: (updated: Project) => void;
  theme?: 'dark' | 'light';
  userId?: string;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  theme = 'dark',
  userId,
}) => {
  const isDark = theme === 'dark';

  const [projectName, setProjectName] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [platform, setPlatform] = useState<'android' | 'ios' | 'both'>('both');

  // Live GitHub API State
  const [githubToken, setGithubToken] = useState<string>(() => getStoredGithubToken(userId) || '');
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [realRepos, setRealRepos] = useState<GithubRepo[]>([]);
  const [realBranches, setRealBranches] = useState<GithubBranch[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');

  useEffect(() => {
    if (project && isOpen) {
      setProjectName(project.name || '');
      setGithubRepo(project.githubRepo || '');
      setBranch(project.branch || 'main');
      setPlatform(project.platform || 'both');

      const token = getStoredGithubToken(userId) || '';
      setGithubToken(token);
      loadRealRepos(token);
    }
  }, [project, isOpen, userId]);

  const loadRealRepos = async (tokenVal: string) => {
    setLoadingRepos(true);
    if (tokenVal.trim()) {
      saveGithubToken(tokenVal, userId);
      const userObj = await fetchAuthenticatedGithubUser(tokenVal);
      setGithubUser(userObj);
    }
    const reposList = await fetchGithubRepositories(tokenVal);
    setRealRepos(reposList);
    setLoadingRepos(false);
  };

  const loadRealBranches = async (repoName: string) => {
    if (!repoName || !repoName.includes('/')) return;
    setLoadingBranches(true);
    const branchesList = await fetchGithubBranches(repoName, githubToken);
    setRealBranches(branchesList);
    setLoadingBranches(false);
  };

  useEffect(() => {
    if (isOpen && githubRepo && githubRepo.includes('/')) {
      loadRealBranches(githubRepo);
    }
  }, [isOpen, githubRepo]);

  if (!isOpen || !project) return null;

  const handleSave = () => {
    if (!projectName.trim()) return;

    const updated: Project = {
      ...project,
      name: projectName.trim(),
      githubRepo: githubRepo.trim() || undefined,
      branch: branch.trim() || 'main',
      platform,
    };

    onUpdateProject(updated);
    onClose();
  };

  const filteredRepos = realRepos.filter((r) =>
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl transition-all duration-300 max-h-[90vh] flex flex-col overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-white shadow-slate-950/90'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Project Settings &amp; Repo</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Update live repository &amp; branch configuration from GitHub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 py-4 px-1">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-white"
            />
          </div>

          {/* GitHub Token & User Connection */}
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold flex items-center space-x-1.5">
                <Key className="h-3.5 w-3.5 text-blue-500" />
                <span>GitHub Personal Token</span>
              </span>
              {githubUser && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  @{githubUser.login}
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="Personal Access Token (ghp_...)"
                className="flex-1 px-3 py-1.5 rounded-xl border text-xs font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
              <button
                type="button"
                onClick={() => loadRealRepos(githubToken)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Fetch</span>
              </button>
            </div>
          </div>

          {/* GitHub Repository Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live GitHub Repository
              </label>
              {loadingRepos && (
                <span className="text-[10px] text-blue-500 font-bold flex items-center space-x-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading repos...</span>
                </span>
              )}
            </div>

            <div className="relative mb-2">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Search real GitHub repos..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {filteredRepos.length > 0 ? (
                filteredRepos.map((r) => {
                  const isSel = githubRepo === r.full_name;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setGithubRepo(r.full_name)}
                      className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSel
                          ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate flex items-center space-x-2">
                        {r.private ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                        <span className="text-xs font-mono font-bold truncate">{r.full_name}</span>
                      </div>
                      {isSel && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="username/repository"
                  className="w-full px-4 py-2.5 rounded-2xl border text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-white"
                />
              )}
            </div>
          </div>

          {/* Target Branch with Real Branch Fetching */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Target Branch
              </label>
              {loadingBranches && (
                <span className="text-[10px] text-blue-500 font-bold flex items-center space-x-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading branches...</span>
                </span>
              )}
            </div>

            {realBranches.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {realBranches.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => setBranch(b.name)}
                    className={`p-2 rounded-xl border text-xs font-mono font-bold flex items-center justify-between transition-all cursor-pointer ${
                      branch === b.name
                        ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    {branch === b.name && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="branch name (e.g. main)"
                className="w-full px-4 py-2 rounded-2xl border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-white"
              />
            )}
          </div>

          {/* Target Platform */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Target Platform
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'android', label: 'Android', icon: Smartphone },
                { id: 'ios', label: 'iOS', icon: Apple },
                { id: 'both', label: 'Both', icon: Layers },
              ].map((p) => {
                const Icon = p.icon;
                const isSel = platform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id as any)}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      isSel
                        ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="w-2/3 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
