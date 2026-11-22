import React from 'react';
import { Server } from 'lucide-react';
import { useServerStatus } from '../hooks/useFirebaseStatus';

interface ServerStatusIndicatorProps {
  theme?: 'dark' | 'light';
  className?: string;
}

export const FirebaseStatusIndicator: React.FC<ServerStatusIndicatorProps> = ({
  theme = 'dark',
  className = '',
}) => {
  const { isLive, status, postgres, firebase } = useServerStatus();
  const isDark = theme === 'dark';

  const isConnecting = status === 'connecting';

  // Tooltip details showing health of both PostgreSQL and Firebase
  const tooltip = isLive
    ? 'Server: Live (PostgreSQL & Firebase Online)'
    : isConnecting
    ? 'Server: Connecting...'
    : `Server: Offline (${!postgres ? 'PostgreSQL Offline' : ''}${!postgres && !firebase ? ', ' : ''}${!firebase ? 'Firebase Offline' : ''})`;

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 border ${
        isDark
          ? 'bg-slate-950/80 border-slate-800 text-slate-300 shadow-inner'
          : 'bg-slate-100/90 border border-slate-200/90 text-slate-900 shadow-2xs font-extrabold'
      } ${className}`}
      title={tooltip}
    >
      {/* Server Icon with Live Pulse Beacon */}
      <div className="relative flex items-center justify-center shrink-0">
        <Server
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            isLive
              ? 'text-emerald-400'
              : isConnecting
              ? 'text-amber-400'
              : 'text-rose-400'
          }`}
        />

        {/* Live Pulse Beacon Dot */}
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          {isLive && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          {isConnecting && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isLive
                ? 'bg-emerald-500'
                : isConnecting
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          ></span>
        </span>
      </div>

      {/* Label and Status: "Server: Live" */}
      <span className={`font-semibold hidden sm:inline ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        Server:
      </span>
      <span
        className={`font-black tracking-wide ${
          isLive
            ? 'text-emerald-500 dark:text-emerald-400'
            : isConnecting
            ? 'text-amber-500 dark:text-amber-400'
            : 'text-rose-500 dark:text-rose-400'
        }`}
      >
        {isLive ? 'Live' : isConnecting ? 'Connecting...' : 'Offline'}
      </span>
    </div>
  );
};

export const ServerStatusIndicator = FirebaseStatusIndicator;
export default FirebaseStatusIndicator;
