import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, RefreshCw, LogOut, Clock } from 'lucide-react';

export interface SessionExpiryModalProps {
  isOpen: boolean;
  expiresAt: number;
  onContinue: () => Promise<void> | void;
  onRelogin: () => void;
  theme?: 'dark' | 'light';
}

export const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  isOpen,
  expiresAt,
  onContinue,
  onRelogin,
  theme = 'dark',
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [isOpen, expiresAt]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleContinueClick = async () => {
    setIsRefreshing(true);
    try {
      await onContinue();
    } finally {
      setIsRefreshing(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in pointer-events-auto">
      {/* Centered Modal Card */}
      <div
        className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl relative z-10 transition-all transform scale-100 ${
          isDark
            ? 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-amber-500/10'
            : 'bg-white/95 border-amber-400 text-slate-900 shadow-2xl shadow-amber-500/20'
        }`}
      >
        {/* Pulsing Warning Icon */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="p-4 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <ShieldAlert className="h-10 w-10 text-amber-500 animate-bounce" />
            </div>
            <div className="absolute -inset-1 rounded-3xl border border-amber-500/30 animate-ping pointer-events-none" />
          </div>
        </div>

        {/* Modal Title */}
        <div className="text-center mb-4">
          <h3 className={`text-xl font-black tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Session Expiring Soon!
          </h3>
          <span className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="h-3.5 w-3.5 animate-spin" />
            <span>Expires in {secondsRemaining}s</span>
          </span>
        </div>

        {/* Informative Body Text */}
        <p className={`text-xs leading-relaxed text-center mb-6 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Your active Access Token is about to expire based on your configured timeout (1 min).
          Would you like to <strong>Continue Session</strong> to auto-refresh your token, or <strong>Re-login</strong>?
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onRelogin}
            className={`px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              isDark
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white'
                : 'bg-rose-100 border border-rose-300 text-rose-700 hover:bg-rose-500 hover:text-white'
            }`}
          >
            <LogOut className="h-4 w-4" />
            <span>Re-login</span>
          </button>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleContinueClick}
            className="px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Continue'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SessionExpiryModal;
