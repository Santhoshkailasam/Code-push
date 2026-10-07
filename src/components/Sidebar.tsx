import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  UploadCloud,
  History,
  BookOpen,
  KeyRound,
  Server,
  ShieldCheck,
  FolderPlus,
  ChevronDown,
  Check,
  Smartphone,
} from 'lucide-react';
import type { Project } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  theme?: 'dark' | 'light';
  onOpenCreateAppModal?: () => void;
  projects?: Project[];
  activeProjectId?: string;
  onSwitchProject?: (projectId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  theme = 'dark',
  onOpenCreateAppModal,
  projects = [],
  activeProjectId,
  onSwitchProject,
}) => {
  const isDark = theme === 'dark';
  const [showAppDropdown, setShowAppDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAppDropdown(false);
      }
    };

    if (showAppDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAppDropdown]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'publish', label: 'Publish Update', icon: UploadCloud },
    { id: 'history', label: 'Release History', icon: History },
    { id: 'profile', label: 'Profile & API Keys', icon: KeyRound },
    { id: 'docs', label: 'Integration Docs', icon: BookOpen },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-60'
      } ${
        isDark
          ? 'bg-slate-900/95 border-r border-slate-800'
          : 'bg-white border-r border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col justify-between shrink-0 h-screen sticky top-0 backdrop-blur-xl transition-all duration-300 ease-in-out z-30`}
    >
      <div>
        {/* Brand Header */}
        <div
          className={`p-4 ${isCollapsed ? 'flex justify-center' : 'p-5'} border-b ${
            isDark ? 'border-slate-800/80' : 'border-slate-200/80'
          } transition-all duration-300`}
        >
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl overflow-hidden shadow-lg shadow-cyan-500/20 shrink-0 border border-cyan-500/30 transform transition-transform hover:scale-105 bg-slate-900 flex items-center justify-center p-1">
              <img src="/logo.png" alt="CodePush Logo" className="h-full w-full object-cover rounded-xl" />
            </div>
            {!isCollapsed && (
              <div className="truncate transition-all duration-300">
                <div className="flex items-center space-x-2">
                  <span className={`font-black text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    CodePush
                  </span>
                </div>
                <span className="inline-block bg-cyan-50 text-cyan-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-cyan-200">
                  Self-Hosted OTA
                </span>
              </div>
            )}
          </div>
        </div>

        {/* App Switcher */}
        {!isCollapsed && projects.length > 0 && (
          <div className={`px-3 pt-3 pb-2 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200/80'}`} ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Active App
              </span>
              {activeProject?.id && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 font-bold">
                  WORKSPACE
                </span>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAppDropdown(!showAppDropdown)}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  showAppDropdown
                    ? isDark
                      ? 'bg-slate-800/90 border-cyan-500/60 shadow-md ring-2 ring-cyan-500/20'
                      : 'bg-slate-100 border-cyan-500/60 shadow-md ring-2 ring-cyan-500/20'
                    : isDark
                    ? 'bg-slate-950/70 border-slate-800 text-white hover:border-cyan-500/50 shadow-inner'
                    : 'bg-white border-slate-200 text-slate-900 hover:border-cyan-500/60 shadow-2xs'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0">
                  <div
                    className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-xs'
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div className="truncate text-left flex-1 min-w-0">
                    <div className="truncate font-extrabold text-xs leading-tight">
                      {activeProject?.name || 'Select App'}
                    </div>
                    {activeProject?.id && (
                      <div className={`text-[10px] font-mono truncate leading-tight mt-0.5 ${isDark ? 'text-cyan-400' : 'text-cyan-700 font-bold'}`}>
                        {activeProject.id}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 ml-1 transition-transform duration-200 ${showAppDropdown ? 'rotate-180 text-cyan-500' : ''} ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
              </button>

              {/* Ultra-Premium App Dropdown */}
              {showAppDropdown && (
                <div
                  className={`absolute left-0 right-0 mt-2 z-50 rounded-2xl border p-2 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.05)] overflow-hidden animate-fade-in ${
                    isDark
                      ? 'bg-slate-900/98 backdrop-blur-2xl border-slate-800 text-white shadow-black/80 ring-1 ring-white/5'
                      : 'bg-white/98 backdrop-blur-2xl border-slate-200 text-slate-900 ring-1 ring-slate-900/5'
                  }`}
                >
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {projects.map((proj) => {
                      const isActive = proj.id === activeProjectId;
                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            if (!isActive && onSwitchProject) onSwitchProject(proj.id);
                            setShowAppDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                            isActive
                              ? isDark
                                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-xs'
                                : 'bg-gradient-to-r from-cyan-50 via-sky-50/70 to-blue-50/60 text-cyan-900 border border-cyan-200 font-bold shadow-xs'
                              : isDark
                              ? 'text-slate-300 hover:bg-slate-800 border border-transparent'
                              : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0">
                            <div className={`p-1 rounded-lg ${isActive ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                              <Smartphone className="h-3.5 w-3.5 shrink-0" />
                            </div>
                            <div className="truncate flex-1 min-w-0">
                              <div className="truncate font-extrabold">{proj.name}</div>
                              <div className={`text-[9px] font-mono truncate ${isActive ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'text-slate-400'}`}>
                                {proj.id}
                              </div>
                            </div>
                          </div>
                          {isActive && <Check className="h-4 w-4 shrink-0 text-cyan-500 ml-1 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Create App Option */}
                  {onOpenCreateAppModal && (
                    <div className={`p-1 mt-1.5 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAppDropdown(false);
                          onOpenCreateAppModal();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          isDark
                            ? 'text-cyan-400 hover:bg-cyan-500/15 border border-cyan-500/30'
                            : 'text-cyan-800 hover:bg-cyan-50 border border-cyan-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <FolderPlus className="h-4 w-4 shrink-0 text-cyan-500" />
                          <span>+ Create New App</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5">
          {!isCollapsed && (
            <div
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider font-mono transition-opacity ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Navigation
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`relative w-full flex items-center ${
                  isCollapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-3.5 py-2.5'
                } rounded-2xl text-sm font-medium transition-all duration-200 ease-out active:scale-[0.97] cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 font-bold'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border border-cyan-400/50 shadow-md shadow-cyan-500/20 font-extrabold'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-700/50 border border-transparent'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 border border-transparent'
                }`}
              >
                {/* Active Indicator Glow Bar */}
                {isActive && (
                  <span
                    className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full animate-pulse ${
                      isDark ? 'bg-cyan-500 shadow-md shadow-cyan-500/50' : 'bg-cyan-300 shadow-sm'
                    }`}
                  />
                )}

                <Icon
                  className={`h-5 w-5 ${
                    isActive
                      ? isDark
                        ? 'text-cyan-500 scale-110'
                        : 'text-white scale-110'
                      : isDark
                      ? 'text-slate-400 group-hover:text-slate-200'
                      : 'text-slate-500 group-hover:text-slate-800'
                  } shrink-0 transition-transform duration-200`}
                />

                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {/* + Create App Action Button (collapsed mode only / when no apps) */}
          {onOpenCreateAppModal && (isCollapsed || projects.length === 0) && (
            <div className="pt-2 px-1">
              <button
                type="button"
                onClick={onOpenCreateAppModal}
                title={isCollapsed ? 'Create New App' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'space-x-2.5 px-3 py-2.5'
                } rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-md ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white shadow-cyan-600/20'
                }`}
              >
                <FolderPlus className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>+ Create App</span>}
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* Footer Status Indicators */}
      <div className={`p-3 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200/80'} space-y-2`}>
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'
          } rounded-2xl border text-xs transition-all duration-300 ${
            isDark
              ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              : 'bg-white border-emerald-200 text-slate-900 shadow-2xs hover:border-emerald-300'
          }`}
          title={isCollapsed ? 'Netlify Edge: Active & Online' : undefined}
        >
          <Server className="h-4 w-4 text-emerald-600 shrink-0" />
          {!isCollapsed && (
            <div className="truncate">
              <span className={`block text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Netlify Edge
              </span>
              <span className="text-emerald-700 font-extrabold">Active & Online</span>
            </div>
          )}
        </div>

        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'
          } rounded-2xl border text-xs transition-all duration-300 ${
            isDark
              ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              : 'bg-white border-blue-200 text-slate-900 shadow-2xs hover:border-blue-300'
          }`}
          title={isCollapsed ? 'Security: SHA256 Verified' : undefined}
        >
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          {!isCollapsed && (
            <div className="truncate">
              <span className={`block text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Security
              </span>
              <span className="text-blue-700 font-extrabold">SHA256 Verified</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
