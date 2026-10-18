import React from 'react';
import { useFirebaseStatus } from '../hooks/useFirebaseStatus';

interface FirebaseStatusIndicatorProps {
  theme?: 'dark' | 'light';
  className?: string;
}

export const FirebaseStatusIndicator: React.FC<FirebaseStatusIndicatorProps> = ({
  theme = 'dark',
  className = '',
}) => {
  const { status } = useFirebaseStatus();
  const isDark = theme === 'dark';

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div
      className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 border ${
        isDark
          ? 'bg-slate-950/80 border-slate-800 text-slate-300 shadow-inner'
          : 'bg-slate-100/90 border border-slate-200/90 text-slate-900 shadow-2xs font-extrabold'
      } ${className}`}
      title={`Firebase Status: ${isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}`}
    >
      {/* Firebase Vector Flame Logo with Live Status Dot */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.654 18.927l5.98-11.233a.75.75 0 011.366 0l2.096 3.938-7.85 7.295a.75.75 0 01-1.592 0z"
            fill="#FFA000"
          />
          <path
            d="M13.628 3.51a.75.75 0 00-1.32-.239L3.58 17.514l7.684-7.14 2.364-6.864z"
            fill="#F57C00"
          />
          <path
            d="M19.346 18.927L14.09 9.062l-9.986 9.27c-.47.436-.164 1.22.464 1.22h14.308c.628 0 .934-.784.47-1.225z"
            fill="#FFCA28"
          />
        </svg>

        {/* Live Pulse Beacon Dot */}
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          {isConnecting && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isConnected
                ? 'bg-emerald-500'
                : isConnecting
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          ></span>
        </span>
      </div>

      {/* Label and Status */}
      <span className={`font-semibold hidden sm:inline ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        Firebase:
      </span>
      <span
        className={`font-black ${
          isConnected
            ? 'text-emerald-500 dark:text-emerald-400'
            : isConnecting
            ? 'text-amber-500 dark:text-amber-400'
            : 'text-rose-500 dark:text-rose-400'
        }`}
      >
        {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
      </span>
    </div>
  );
};

export default FirebaseStatusIndicator;
