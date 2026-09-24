import React from 'react';
import { Layers, UploadCloud, History, BookOpen, Server, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  theme?: 'dark' | 'light';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'publish', label: 'Publish Update', icon: UploadCloud },
    { id: 'history', label: 'Release History', icon: History },
    { id: 'docs', label: 'Integration Docs', icon: BookOpen },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } ${
        isDark
          ? 'bg-slate-900/90 border-r border-slate-800'
          : 'bg-gradient-to-b from-slate-100/95 via-sky-100/90 to-indigo-100/95 border-r border-indigo-200/90 text-slate-900 shadow-xl shadow-indigo-500/10'
      } flex flex-col justify-between shrink-0 h-screen sticky top-0 backdrop-blur-xl transition-all duration-300 ease-in-out z-30`}
    >
      <div>
        {/* Brand Header */}
        <div
          className={`p-4 ${isCollapsed ? 'flex justify-center' : 'p-6'} border-b ${
            isDark ? 'border-slate-800/80' : 'border-indigo-100/80'
          } transition-all duration-300`}
        >
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/30 shrink-0 border border-cyan-500/30 transform transition-transform hover:scale-105 bg-slate-900 flex items-center justify-center">
              <img src="/logo.png" alt="CodePush Logo" className="h-full w-full object-cover" />
            </div>
            {!isCollapsed && (
              <div className="truncate transition-all duration-300">
                <div className="flex items-center space-x-2">
                  <span className={`font-black text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    CodePush
                  </span>
                </div>
                <span className="inline-block bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                  Self-Hosted OTA
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5">
          {!isCollapsed && (
            <div
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider font-mono transition-opacity ${
                isDark ? 'text-slate-500' : 'text-indigo-400'
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
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`relative w-full flex items-center ${
                  isCollapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-3.5 py-2.5'
                } rounded-xl text-sm font-medium transition-all duration-200 ease-out active:scale-[0.97] cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 font-semibold'
                      : 'bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-indigo-500/10 text-cyan-700 border border-cyan-500/30 shadow-md shadow-cyan-500/10 font-bold'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-700/50 border border-transparent'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-gradient-to-r hover:from-sky-50 hover:to-indigo-50 border border-transparent'
                }`}
              >
                {/* Active Indicator Glow Bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-500 rounded-r-full shadow-md shadow-cyan-500/50 animate-pulse" />
                )}

                <Icon
                  className={`h-5 w-5 ${
                    isActive
                      ? 'text-cyan-500 scale-110'
                      : isDark
                      ? 'text-slate-400 group-hover:text-slate-200'
                      : 'text-slate-500 group-hover:text-slate-800'
                  } shrink-0 transition-transform duration-200`}
                />

                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Status Indicators */}
      <div
        className={`p-3 border-t ${
          isDark ? 'border-slate-800/80' : 'border-indigo-100/80'
        } space-y-2`}
      >
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'
          } rounded-xl border text-xs transition-all duration-300 ${
            isDark
              ? 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
              : 'bg-gradient-to-br from-emerald-100/90 to-teal-100/90 border-emerald-300 text-slate-900 shadow-xs'
          }`}
          title={isCollapsed ? 'Netlify Edge: Active & Online' : undefined}
        >
          <Server className="h-4 w-4 text-emerald-600 shrink-0" />
          {!isCollapsed && (
            <div className="truncate">
              <span className={`block text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                Netlify Edge
              </span>
              <span className="text-emerald-700 font-extrabold">Active & Online</span>
            </div>
          )}
        </div>

        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'
          } rounded-xl border text-xs transition-all duration-300 ${
            isDark
              ? 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
              : 'bg-gradient-to-br from-blue-100/90 to-sky-100/90 border-blue-300 text-slate-900 shadow-xs'
          }`}
          title={isCollapsed ? 'Security: SHA256 Verified' : undefined}
        >
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          {!isCollapsed && (
            <div className="truncate">
              <span className={`block text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
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
