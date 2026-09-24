import React, { useState, useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen, Bell, User, Clock, ChevronDown, Sun, Moon } from 'lucide-react';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  activeTab: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onToggleNotifications?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleSidebar,
  isSidebarCollapsed,
  activeTab,
  theme,
  onToggleTheme,
  onToggleNotifications,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState(false);

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

  const handleThemeClick = () => {
    setIsSpinning(true);
    onToggleTheme();
    setTimeout(() => setIsSpinning(false), 600);
  };

  const tabTitleMap: Record<string, string> = {
    dashboard: 'Dashboard Overview',
    publish: 'Publish OTA Update',
    history: 'Release History & Rollbacks',
    docs: 'Integration Documentation',
  };

  const isDark = theme === 'dark';

  return (
    <header
      className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl transition-all duration-300 ${
        isDark
          ? 'bg-slate-900/80 border-b border-slate-800 text-slate-100'
          : 'bg-gradient-to-r from-slate-100/95 via-sky-100/90 to-indigo-100/95 border-b border-indigo-200/90 text-slate-900 shadow-md shadow-indigo-500/10'
      }`}
    >
      {/* Left Section: Dynamic Hamburger Icon & Breadcrumb */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl transition-all active:scale-95 focus:outline-none ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-indigo-50 border border-indigo-100 shadow-xs'
          }`}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-5 w-5 text-cyan-500" />
          ) : (
            <PanelLeftClose className="h-5 w-5 text-cyan-500" />
          )}
        </button>

        <div
          className={`hidden sm:flex items-center space-x-2 text-xs font-medium ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span className={isDark ? 'text-slate-300' : 'text-slate-700 font-semibold'}>CodePush</span>
          <span>/</span>
          <span className="text-cyan-600 font-bold">{tabTitleMap[activeTab] || 'Dashboard'}</span>
        </div>
      </div>

      {/* Right Section: Time, Animated Theme Toggle, Notifications, User Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Live Clock */}
        <div
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
            isDark
              ? 'bg-slate-950/70 border border-slate-800/80 text-slate-300 shadow-inner'
              : 'bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border border-indigo-100/90 text-indigo-950 font-bold shadow-xs'
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
          <span>{currentTime || '00:00:00'}</span>
        </div>

        {/* Animated Light/Dark Mode Toggle Icon Button (AFTER TIME) */}
        <button
          onClick={handleThemeClick}
          className={`p-2 rounded-xl transition-all active:scale-95 focus:outline-none flex items-center justify-center cursor-pointer ${
            isDark
              ? 'bg-slate-950/70 border border-slate-800 text-amber-400 hover:bg-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-amber-500/10'
              : 'bg-gradient-to-tr from-amber-400 via-orange-400 to-pink-500 text-white border border-amber-300 shadow-md shadow-orange-500/25 hover:scale-105'
          }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <div className={isSpinning ? 'animate-theme-spin' : 'transition-transform duration-300'}>
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-white drop-shadow-xs" />
            )}
          </div>
        </button>

        {/* Notifications Icon with Badge */}
        <button
          onClick={onToggleNotifications}
          className={`relative p-2 rounded-xl transition-all active:scale-95 focus:outline-none cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-indigo-50 border border-indigo-100 shadow-xs'
          }`}
          title="Open Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-slate-900 animate-pulse" />
        </button>

        {/* User Profile */}
        <div
          className={`flex items-center space-x-2.5 pl-2 border-l ${
            isDark ? 'border-slate-800/80' : 'border-indigo-100'
          }`}
        >
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-cyan-500/25">
              <User className="h-5 w-5 text-white" />
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ${
                isDark ? 'ring-slate-900' : 'ring-white'
              }`}
            />
          </div>

          <div className="hidden md:block text-left">
            <div className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Admin User
            </div>
            <div className="text-[10px] text-cyan-600 font-semibold leading-tight">DevOps Lead</div>
          </div>

          <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
        </div>
      </div>
    </header>
  );
};
