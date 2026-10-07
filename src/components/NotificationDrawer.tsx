import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  ShieldCheck,
  Smartphone,
  Apple,
  CheckCircle2,
  Clock,
  Radio,
  Sparkles,
} from 'lucide-react';
import type { ReleaseHistoryItem } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  history?: ReleaseHistoryItem[];
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'deploy' | 'security' | 'system';
  unread: boolean;
  platform?: 'android' | 'ios';
  version?: string;
  hash?: string;
  tag?: string;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  theme,
  history = [],
}) => {
  const isDark = theme === 'dark';

  // Initial notifications constructed dynamically from system events & history
  const initialNotifications: NotificationItem[] = [
    {
      id: 'notif_system_cdn',
      title: 'Netlify Edge CDN Active',
      message: 'Global edge cache warm & serving self-hosted OTA manifests with 200 OK.',
      time: 'Just now',
      type: 'system',
      unread: true,
      tag: 'Edge CDN',
    },
    ...history.slice(0, 5).map((item) => ({
      id: `notif_${item.id}`,
      title: `${item.platform === 'android' ? 'Android' : 'iOS'} Bundle v${item.version} Deployed`,
      message: item.releaseNotes || 'OTA update published & ready for client background hydration.',
      time: 'Recent',
      type: 'deploy' as const,
      unread: true,
      platform: item.platform,
      version: item.version,
      hash: item.hash?.slice(0, 8),
      tag: item.platform === 'android' ? 'Android OTA' : 'iOS OTA',
    })),
    {
      id: 'notif_sec_1',
      title: 'SHA-256 Web Crypto Verified',
      message: 'Subtle crypto digest integrity checks enforced across all stored release bundles.',
      time: '15m ago',
      type: 'security',
      unread: false,
      tag: 'Security',
    },
    {
      id: 'notif_sys_backup',
      title: 'Firebase Firestore Realtime Channel',
      message: 'Real-time database sync listener connected and syncing application states.',
      time: '1h ago',
      type: 'system',
      unread: false,
      tag: 'Database',
    },
  ];

  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'deploy' | 'security'>('all');

  const unreadCount = notifications.filter((n) => n.unread).length;
  const deployCount = notifications.filter((n) => n.type === 'deploy').length;
  const securityCount = notifications.filter((n) => n.type === 'security' || n.type === 'system').length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleItemClick = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return n.unread;
    if (filter === 'deploy') return n.type === 'deploy';
    if (filter === 'security') return n.type === 'security' || n.type === 'system';
    return true;
  });

  return (
    <>
      {/* Transparent Click-Outside Overlay (No blur, no darkening - screens & header remain 100% crystal clear) */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-transparent cursor-default"
        />
      )}

      {/* Modern Slide-Over Notification Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${
          isDark
            ? 'bg-slate-900 border-l border-slate-800 text-slate-100 shadow-[0_0_60px_rgba(0,0,0,0.8)]'
            : 'bg-white border-l border-slate-200 text-slate-900 shadow-[0_0_60px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/5'
        }`}
      >
        {/* Drawer Header */}
        <div
          className={`p-5 border-b flex items-center justify-between transition-colors ${
            isDark
              ? 'border-slate-800 bg-slate-950/90'
              : 'border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50/40'
          }`}
        >
          <div className="flex items-center space-x-3.5">
            <div className="relative p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/25 shrink-0">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Notifications
                </h2>
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-black ${
                    isDark
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>LIVE SYNC</span>
                </span>
              </div>
              <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {unreadCount > 0 ? `${unreadCount} unread system alerts` : 'All caught up with latest events'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className={`p-2 rounded-xl transition-all cursor-pointer border ${
                  isDark
                    ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800 border-slate-800'
                    : 'text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 border-slate-200'
                }`}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className={`p-2 rounded-xl transition-all cursor-pointer border ${
                  isDark
                    ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800 border-slate-800'
                    : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200'
                }`}
                title="Clear all notifications"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200 shadow-2xs'
              }`}
              title="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 text-xs ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                filter === 'all'
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-xs'
                    : 'bg-white text-slate-900 border-slate-200 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                filter === 'unread'
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-xs'
                    : 'bg-white text-slate-900 border-slate-200 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              Unread ({unreadCount})
            </button>

            <button
              type="button"
              onClick={() => setFilter('deploy')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                filter === 'deploy'
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-xs'
                    : 'bg-white text-slate-900 border-slate-200 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              Deploys ({deployCount})
            </button>

            <button
              type="button"
              onClick={() => setFilter('security')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                filter === 'security'
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-xs'
                    : 'bg-white text-slate-900 border-slate-200 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              System ({securityCount})
            </button>
          </div>
        </div>

        {/* Notifications Body List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3.5 relative group ${
                  notif.unread
                    ? isDark
                      ? 'bg-gradient-to-br from-slate-900 to-slate-850 border-cyan-500/40 text-slate-100 shadow-md ring-1 ring-cyan-500/20'
                      : 'bg-gradient-to-br from-white via-sky-50/40 to-blue-50/25 border-cyan-400/50 text-slate-900 shadow-sm ring-1 ring-cyan-500/15'
                    : isDark
                    ? 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60'
                    : 'bg-white border-slate-200/90 text-slate-800 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                }`}
              >
                {/* Unread Indicator Pulsing Dot */}
                {notif.unread && (
                  <span className="absolute top-3.5 right-3.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                )}

                {/* Icon based on notification type */}
                <div className="shrink-0 mt-0.5">
                  {notif.type === 'deploy' ? (
                    <div
                      className={`p-2.5 rounded-2xl border ${
                        notif.platform === 'android'
                          ? isDark
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs'
                          : isDark
                          ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                          : 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
                      }`}
                    >
                      {notif.platform === 'android' ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Apple className="h-4 w-4" />
                      )}
                    </div>
                  ) : notif.type === 'security' ? (
                    <div
                      className={`p-2.5 rounded-2xl border ${
                        isDark
                          ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                          : 'bg-purple-50 border-purple-200 text-purple-700 shadow-2xs'
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                  ) : (
                    <div
                      className={`p-2.5 rounded-2xl border ${
                        isDark
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                          : 'bg-cyan-50 border-cyan-200 text-cyan-700 shadow-2xs'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Notification Text Content */}
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center space-x-2">
                    {notif.tag && (
                      <span
                        className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-md uppercase border shrink-0 ${
                          notif.type === 'deploy'
                            ? notif.platform === 'android'
                              ? isDark
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : isDark
                              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                            : notif.type === 'security'
                            ? isDark
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                              : 'bg-purple-100 text-purple-800 border-purple-200'
                            : isDark
                            ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                            : 'bg-cyan-100 text-cyan-800 border-cyan-200'
                        }`}
                      >
                        {notif.tag}
                      </span>
                    )}

                    <span
                      className={`text-xs font-black truncate ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {notif.title}
                    </span>
                  </div>

                  <p
                    className={`text-xs mt-1.5 leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span
                      className={`inline-flex items-center text-[10px] font-mono ${
                        isDark ? 'text-slate-500' : 'text-slate-400 font-medium'
                      }`}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {notif.time}
                    </span>

                    {notif.version && (
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            isDark
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          v{notif.version}
                        </span>
                        {notif.hash && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              isDark
                                ? 'bg-slate-950 text-cyan-400 border-slate-800'
                                : 'bg-slate-50 text-cyan-700 border-slate-200'
                            }`}
                          >
                            #{notif.hash}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div
                className={`p-4 rounded-3xl border ${
                  isDark
                    ? 'bg-slate-800/40 border-slate-800 text-slate-500'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
              >
                <Bell className="h-8 w-8" />
              </div>
              <div>
                <p className={`text-xs font-black ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
                  No notifications in this filter
                </p>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  System events and deployment notifications will appear here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div
          className={`p-3.5 border-t flex items-center justify-between text-[11px] font-mono ${
            isDark
              ? 'border-slate-800 bg-slate-950 text-slate-400'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          <span className="flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
            <span className="font-bold">CodePush Event Stream</span>
          </span>
          <span className="flex items-center space-x-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <Radio className="h-3 w-3 animate-pulse text-emerald-500" />
            <span>Connected</span>
          </span>
        </div>
      </aside>
    </>
  );
};

export default NotificationDrawer;
