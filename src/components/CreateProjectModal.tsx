import React, { useState, useEffect } from 'react';
import { X, Smartphone, Sparkles } from 'lucide-react';
import type { Project } from '../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
  theme?: 'dark' | 'light';
  userId?: string;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  theme = 'dark',
  userId,
}) => {
  const isDark = theme === 'dark';
  const [appName, setAppName] = useState('');
  const [generatedId, setGeneratedId] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAppName('');
      const shortUid = userId ? userId.slice(0, 6) : 'app';
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      setGeneratedId(`app_${shortUid}_${Date.now().toString(36)}_${randomSuffix}`);
      setCopiedId(false);
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const shortUid = userId ? userId.slice(0, 6) : 'app';
  const generatedApiKey = `cp_live_${shortUid}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

  const handleCopyId = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(generatedId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!appName.trim()) return;

    const newProj: Project = {
      id: generatedId,
      name: appName.trim(),
      platform: 'both',
      branch: 'main',
      apiKey: generatedApiKey,
      webhookUrl: `https://codepushs.netlify.app/.netlify/functions/github-webhook?project=${generatedId}`,
      createdAt: new Date().toISOString(),
      userId,
    };

    onCreateProject(newProj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl transition-all duration-300 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-white shadow-slate-950/90'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200/10 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Create New App</h2>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Enter app name to generate your dedicated App ID
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-5">
          {/* App Name Input */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              App Name
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. My Mobile App"
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
              autoFocus
            />
          </div>

          {/* App ID Always Visible */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                App ID (Auto-Generated)
              </label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Unique
              </span>
            </div>
            <div
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs font-mono transition-all ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-cyan-300'
                  : 'bg-slate-50 border-slate-200 text-blue-600'
              }`}
            >
              <span className="font-bold truncate max-w-[280px]">{generatedId}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className={`ml-2 px-2 py-1 rounded-lg text-[10px] font-sans font-bold transition-all cursor-pointer shrink-0 ${
                  copiedId
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {copiedId ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Your releases and bundles will be scoped to this App ID.
            </p>
          </div>

          <button
            type="submit"
            disabled={!appName.trim()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer mt-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Create App</span>
          </button>
        </form>
      </div>
    </div>
  );
};
