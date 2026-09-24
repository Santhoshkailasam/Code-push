import React, { useState } from 'react';
import { Bell, X, CheckCheck, Trash2, ShieldCheck, Smartphone, Apple, CheckCircle2, Clock } from 'lucide-react';
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
      id: 'notif_1',
      title: 'Netlify Edge CDN Active',
      message: 'Self-hosted OTA update endpoints responding with 200 OK.',
      time: 'Just now',
      type: 'system',
      unread: true,
    },
    ...history.slice(0, 4).map((item) => ({
      id: `notif_${item.id}`,
      title: `${item.platform === 'android' ? 'Android' : 'iOS'} v${item.version} Published`,
      message: item.releaseNotes || 'Bundle updated and ready for client fetch',
      time: 'Recent',
      type: 'deploy' as const,
      unread: true,
      platform: item.platform,
    })),
    {
      id: 'notif_sys_2',
      title: 'SHA-256 Web Crypto Verification',
      message: 'Subtle crypto digest integrity checks enforced automatically.',
      time: '15m ago',
      type: 'security',
      unread: false,
    },
  ];

  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'deploy'>('all');

  const unreadCount = notifications.filter((n) => n.unread).length;

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
    return true;
  });

  return (
    <>
      {/* Transparent Click-Outside Overlay (No blur or dimming - screen remains 100% visible) */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-transparent cursor-default"
        />
      )}

      {/* Modern Slide-Over Notification Drawer from Right */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${
          isDark
            ? 'bg-slate-900 border-l border-slate-800 text-slate-100'
            : 'bg-gradient-to-b from-slate-100 via-sky-100 to-indigo-100 border-l border-indigo-300 text-slate-900 backdrop-blur-xl shadow-indigo-500/20'
        }`}
      >
        {/* Drawer Header */}
        <div
          className={`p-5 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-indigo-200 bg-gradient-to-r from-sky-100 via-indigo-100 to-purple-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="relative p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-pink-500 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-slate-900">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                System Notifications
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-indigo-700 font-bold'}`}>
                {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-950 hover:bg-indigo-200/70 border border-indigo-200'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Bar & Quick Actions */}
        <div
          className={`px-5 py-3 border-b flex items-center justify-between gap-2 text-xs ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-indigo-200 bg-sky-100/90'
          }`}
        >
          <div className="flex space-x-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-700 hover:text-slate-950 font-bold'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-700 hover:text-slate-950 font-bold'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('deploy')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'deploy'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-700 hover:text-slate-950 font-bold'
              }`}
            >
              Deploys
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition-all cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
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
                      ? 'bg-slate-800/80 border-cyan-500/40 text-slate-100 shadow-md'
                      : 'bg-gradient-to-r from-cyan-100 via-sky-100 to-indigo-100 border-cyan-300 text-slate-900 shadow-md'
                    : isDark
                    ? 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    : 'bg-indigo-100/80 border-indigo-200 text-slate-900 hover:border-indigo-300 hover:bg-sky-100 shadow-xs'
                }`}
              >
                {/* Unread Indicator Pulsing Dot */}
                {notif.unread && (
                  <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                )}

                {/* Icon based on notification type */}
                <div className="shrink-0 mt-0.5">
                  {notif.type === 'deploy' ? (
                    <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                      {notif.platform === 'android' ? (
                        <Smartphone className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Apple className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  ) : notif.type === 'security' ? (
                    <div className="p-2 rounded-xl bg-purple-500/15 text-purple-500 border border-purple-500/30">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Notification Text Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-xs font-bold truncate ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {notif.title}
                    </h4>
                  </div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {notif.message}
                  </p>
                  <span
                    className={`inline-flex items-center mt-2 text-[10px] font-mono ${
                      isDark ? 'text-slate-500' : 'text-indigo-600 font-semibold'
                    }`}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {notif.time}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="p-4 rounded-full bg-slate-800/40 text-slate-500">
                <Bell className="h-8 w-8 text-slate-400" />
              </div>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                No notifications found
              </p>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div
          className={`p-4 border-t text-center text-[11px] ${
            isDark ? 'border-slate-800 bg-slate-950/60 text-slate-500' : 'border-indigo-100 bg-slate-50 text-indigo-700 font-medium'
          }`}
        >
          <span>CodePush Real-Time Event Sync Channel</span>
        </div>
      </aside>
    </>
  );
};
