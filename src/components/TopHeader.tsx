import React, { useState, useEffect, useRef } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Clock,
  Sun,
  Folder,
  GitBranch,
  ChevronDown,
  ShieldCheck,
  KeyRound,
  LogOut,
  Layers,
  UploadCloud,
  History,
  BookOpen,
  ChevronRight,
  User as UserIcon,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { Project } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  activeTab: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onToggleNotifications?: () => void;
  user?: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL?: string | null;
  } | null;
  onSignOut?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToDocs?: () => void;
  activeProject?: Project;
  onOpenEditProjectModal?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleSidebar,
  isSidebarCollapsed,
  activeTab,
  theme,
  onToggleTheme,
  onToggleNotifications,
  user,
  onSignOut,
  onNavigateToProfile,
  onNavigateToDocs,
  activeProject,
  onOpenEditProjectModal,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  const handleThemeClick = () => {
    setIsSpinning(true);
    onToggleTheme();
    setTimeout(() => setIsSpinning(false), 600);
  };

  const tabTitleMap: Record<string, { label: string; icon: React.ElementType }> = {
    dashboard: { label: 'Dashboard Overview', icon: Layers },
    publish: { label: 'Publish OTA Update', icon: UploadCloud },
    history: { label: 'Release History & Rollbacks', icon: History },
    profile: { label: 'Profile & API Keys', icon: KeyRound },
    docs: { label: 'Integration Documentation', icon: BookOpen },
  };

  const isDark = theme === 'dark';
  const currentTabMeta = tabTitleMap[activeTab] || { label: 'Dashboard Overview', icon: Layers };
  const TabIcon = currentTabMeta.icon;

  return (
    <header
      className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-2xl transition-all duration-300 ${
        isDark
          ? 'bg-slate-900/90 border-b border-slate-800 text-slate-100 shadow-lg'
          : 'bg-white/95 border-b border-slate-200 text-slate-900 shadow-xs'
      }`}
    >
      {/* Left Section: Sidebar Toggle & Ultra-Premium Title */}
      <div className="flex items-center space-x-3.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl transition-all active:scale-95 focus:outline-none cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
              : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 border border-slate-200/90 shadow-2xs'
          }`}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className={`h-5 w-5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
          ) : (
            <PanelLeftClose className={`h-5 w-5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
          )}
        </button>

        {/* Dynamic Title with Gradient Icon Container */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/20 shrink-0">
            <TabIcon className="h-4.5 w-4.5" />
          </div>

          <div className="flex items-center space-x-2">
            <h1 className={`font-black text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {currentTabMeta.label}
            </h1>

            {activeProject && Boolean(activeProject.githubRepo?.trim()) && (
              <button
                type="button"
                onClick={onOpenEditProjectModal}
                title="Click to edit project repository or settings"
                className={`hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer ml-2 ${
                  isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-200/90 text-slate-800 shadow-2xs'
                }`}
              >
                <Folder className="h-3.5 w-3.5 text-cyan-500" />
                <span>{activeProject.name}</span>
                <span className="text-[10px] font-mono opacity-70 border-l dark:border-slate-800 border-slate-300 pl-1.5 ml-0.5">
                  {activeProject.githubRepo}
                </span>
                {activeProject.branch && (
                  <span className="text-[10px] text-cyan-500 flex items-center font-mono font-extrabold">
                    <GitBranch className="h-3 w-3 ml-1 mr-0.5" />
                    {activeProject.branch}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Section: Time, Theme Switcher, Notifications, User Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Live Clock Pill with Status Pulse */}
        <div
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
            isDark
              ? 'bg-slate-950/80 border border-slate-800 text-slate-300 shadow-inner'
              : 'bg-slate-100/90 border border-slate-200/90 text-slate-900 font-extrabold shadow-2xs'
          }`}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <Clock className={`h-3.5 w-3.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'} shrink-0`} />
          <span>{currentTime || '12:15:33 PM'}</span>
        </div>

        {/* Theme Switcher Button */}
        <button
          type="button"
          onClick={handleThemeClick}
          className={`p-2 rounded-xl transition-all active:scale-95 focus:outline-none flex items-center justify-center cursor-pointer ${
            isDark
              ? 'bg-slate-950/80 border border-slate-800 text-amber-400 hover:bg-slate-800 hover:border-slate-700'
              : 'bg-amber-500/10 border border-amber-300/80 text-amber-600 hover:bg-amber-500/20 shadow-2xs'
          }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <div className={isSpinning ? 'animate-theme-spin' : 'transition-transform duration-300'}>
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Sun className="h-4 w-4 text-amber-600 fill-amber-400" />
            )}
          </div>
        </button>

        {/* Notifications Icon Button */}
        <button
          type="button"
          onClick={onToggleNotifications}
          className={`relative p-2 rounded-xl transition-all active:scale-95 focus:outline-none cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
              : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 border border-slate-200/90 shadow-2xs'
          }`}
          title="Open Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center ring-2 ring-white">
            7
          </span>
        </button>

        {/* User Profile & Dropdown Trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className={`flex items-center space-x-2.5 p-1.5 rounded-2xl cursor-pointer transition-all border ${
              showUserDropdown
                ? isDark
                  ? 'bg-slate-800/90 border-cyan-500/50 shadow-md ring-2 ring-cyan-500/20'
                  : 'bg-slate-100 border-cyan-500/60 shadow-md ring-2 ring-cyan-500/20'
                : isDark
                ? 'border-transparent hover:bg-slate-800/60'
                : 'border-transparent hover:bg-slate-100/80'
            }`}
          >
            <div className="relative">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-xl object-cover border-2 border-cyan-400 shadow-sm"
                />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4 text-white" />}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-xs" />
            </div>

            <div className="hidden md:block text-left pr-1">
              <div className={`text-xs font-black leading-tight flex items-center space-x-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>{user?.displayName || 'Developer Account'}</span>
              </div>
              <div className={`text-[10px] font-medium leading-tight truncate max-w-[140px] font-mono ${isDark ? 'text-cyan-400' : 'text-slate-500'}`}>
                {user?.email || 'developer@codepush.io'}
              </div>
            </div>

            <ChevronDown className={`h-4 w-4 text-slate-400 hidden sm:block transition-transform duration-200 ${showUserDropdown ? 'rotate-180 text-cyan-500' : ''}`} />
          </button>

          {/* Ultra-Premium User Dropdown Menu */}
          {showUserDropdown && (
            <div
              className={`absolute right-0 mt-3 w-80 rounded-3xl border p-3 z-50 animate-fade-in transition-all duration-200 ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white shadow-2xl shadow-black/80 ring-1 ring-white/5'
                  : 'bg-white border-slate-200 text-slate-900 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5'
              }`}
            >
              {/* Identity Header Card */}
              <div
                className={`p-3.5 rounded-2xl border mb-2.5 transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800/80 shadow-inner'
                    : 'bg-slate-50 border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="h-11 w-11 rounded-2xl object-cover border-2 border-cyan-400 shadow-md shrink-0"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-cyan-500/20 shrink-0">
                      {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-5 w-5 text-white" />}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-sm font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {user?.displayName || 'Developer Account'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-extrabold uppercase border shrink-0 ${
                        isDark
                          ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                          : 'bg-cyan-100 text-cyan-800 border-cyan-200'
                      }`}>
                        Admin
                      </span>
                    </div>
                    <div className={`text-[11px] truncate font-mono mt-0.5 ${isDark ? 'text-cyan-400' : 'text-slate-600'}`}>
                      {user?.email || 'developer@codepush.io'}
                    </div>
                  </div>
                </div>

                {/* Session Status Pill Row */}
                <div className={`flex items-center justify-between mt-3 pt-2.5 border-t ${
                  isDark ? 'border-slate-800/80' : 'border-slate-200'
                }`}>
                  <span
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      isDark
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <ShieldCheck className={`h-3.5 w-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>Session Authenticated</span>
                  </span>

                  <span className={`text-[10px] font-mono font-bold flex items-center space-x-1 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <Zap className="h-3 w-3 text-cyan-500" />
                    <span>Ed25519</span>
                  </span>
                </div>
              </div>

              {/* Active Project Pill if selected */}
              {activeProject && (
                <div
                  className={`px-3 py-2 rounded-xl border mb-2.5 flex items-center justify-between text-xs ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Folder className={`h-3.5 w-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'} shrink-0`} />
                    <span className={`font-black truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{activeProject.name}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold shrink-0 pl-2 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                    {activeProject.id}
                  </span>
                </div>
              )}

              {/* Menu Actions */}
              <div className="space-y-1">
                {onNavigateToProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onNavigateToProfile();
                    }}
                    className={`w-full text-left p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer group border border-transparent ${
                      isDark
                        ? 'hover:bg-slate-800/80 hover:border-slate-700/60 text-slate-200 hover:text-white'
                        : 'hover:bg-slate-100 hover:border-slate-200 text-slate-800 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-xl transition-all group-hover:scale-105 border ${
                          isDark
                            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white'
                            : 'bg-cyan-50 border-cyan-200 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white'
                        }`}
                      >
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Profile & API Keys</div>
                        <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Manage credentials & secrets</div>
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'} group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-transform`} />
                  </button>
                )}

                {onNavigateToDocs && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onNavigateToDocs();
                    }}
                    className={`w-full text-left p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer group border border-transparent ${
                      isDark
                        ? 'hover:bg-slate-800/80 hover:border-slate-700/60 text-slate-200 hover:text-white'
                        : 'hover:bg-slate-100 hover:border-slate-200 text-slate-800 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-xl transition-all group-hover:scale-105 border ${
                          isDark
                            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}
                      >
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Integration Docs</div>
                        <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mobile SDK & CI/CD guides</div>
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'} group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-transform`} />
                  </button>
                )}

                <div className={`my-1.5 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`} />

                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      setIsSignOutConfirmOpen(true);
                    }}
                    className={`w-full text-left p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer group border border-transparent ${
                      isDark
                        ? 'hover:bg-rose-500/15 hover:border-rose-500/30 text-rose-400'
                        : 'hover:bg-rose-50 hover:border-rose-200 text-rose-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-xl transition-all group-hover:scale-105 border ${
                          isDark
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 group-hover:bg-rose-600 group-hover:text-white'
                            : 'bg-rose-50 border-rose-200 text-rose-700 group-hover:bg-rose-600 group-hover:text-white'
                        }`}
                      >
                        <LogOut className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-black ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>Sign Out</div>
                        <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>End active session</div>
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'} group-hover:text-rose-500 group-hover:translate-x-0.5 transition-transform`} />
                  </button>
                )}
              </div>

              {/* Status Footer */}
              <div className={`mt-2 pt-2 px-1 flex items-center justify-between text-[10px] font-mono border-t ${
                isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'
              }`}>
                <span className="flex items-center space-x-1">
                  <Sparkles className="h-3 w-3 text-cyan-500" />
                  <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>CodePush Console v2.4</span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  🟢 Edge CDN
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {onSignOut && (
        <ConfirmModal
          isOpen={isSignOutConfirmOpen}
          title="Sign Out of CodePush?"
          message="Are you sure you want to sign out? You will need to log back in to access your deployment dashboard and API keys."
          confirmLabel="Yes, Sign Out"
          variant="danger"
          onConfirm={onSignOut}
          onClose={() => setIsSignOutConfirmOpen(false)}
          theme={theme}
        />
      )}
    </header>
  );
};

export default TopHeader;
