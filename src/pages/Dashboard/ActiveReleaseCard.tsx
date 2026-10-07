import React from 'react';
import type { Platform, ReleaseInfo } from '../../types';
import { Smartphone, Apple, CheckCircle2, AlertCircle, Clock, Hash, Download } from 'lucide-react';

interface Props {
  platform: Platform;
  info: ReleaseInfo;
  theme?: 'dark' | 'light';
}

export const ActiveReleaseCard: React.FC<Props> = ({ platform, info, theme = 'dark' }) => {
  const isAndroid = platform === 'android';
  const isDark = theme === 'dark';

  const cardBgClass = isDark
    ? 'border-slate-800 bg-slate-900/90 text-slate-100 shadow-xl hover:border-slate-700'
    : 'border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/60 hover:border-slate-300';

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-6 sm:p-7 transition-all duration-300 group ${cardBgClass}`}
    >
      {/* Top subtle decorative accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          isAndroid
            ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        }`}
      />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3.5">
          <div
            className={`p-3 rounded-2xl border ${
              isAndroid
                ? isDark
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-sm'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs'
                : isDark
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-sm'
                : 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
            }`}
          >
            {isAndroid ? <Smartphone className="h-6 w-6" /> : <Apple className="h-6 w-6" />}
          </div>
          <div>
            <h3 className={`text-lg font-black capitalize tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {platform} Production
            </h3>
            <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Target Native App: v{info.minAppVersion}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            info.mandatory
              ? isDark
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-amber-50 border-amber-200 text-amber-800'
              : isDark
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {info.mandatory ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          <span>{info.mandatory ? 'Mandatory Patch' : 'Optional Patch'}</span>
        </span>
      </div>

      <div className="space-y-4">
        {/* Active JS Bundle info block */}
        <div
          className={`rounded-2xl p-4 border transition-all ${
            isDark
              ? 'bg-slate-950/70 border-slate-800/80'
              : 'bg-slate-50/90 border-slate-200/90'
          }`}
        >
          <div className="flex items-baseline justify-between mb-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Active JS Bundle
            </span>
            <span className={`text-2xl font-black font-mono tracking-tight ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
              v{info.latestVersion}
            </span>
          </div>
          <p
            className={`text-xs line-clamp-2 mt-2 font-mono p-3 rounded-xl border ${
              isDark
                ? 'bg-slate-900 text-slate-300 border-slate-800'
                : 'bg-white text-slate-800 border-slate-200 shadow-2xs'
            }`}
          >
            "{info.releaseNotes || 'Production Bundle'}"
          </p>
        </div>

        {/* Updated Date and SHA-256 Hash Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div
            className={`flex items-center space-x-2.5 p-3 rounded-2xl border ${
              isDark
                ? 'text-slate-400 bg-slate-950/60 border-slate-800'
                : 'text-slate-700 bg-slate-50 border-slate-200'
            }`}
          >
            <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div className="truncate">
              <span className={`block text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Updated
              </span>
              <span className={`font-extrabold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                {new Date(info.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div
            className={`flex items-center space-x-2.5 p-3 rounded-2xl border ${
              isDark
                ? 'text-slate-400 bg-slate-950/60 border-slate-800'
                : 'text-slate-700 bg-slate-50 border-slate-200'
            }`}
          >
            <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <div className="truncate">
              <span className={`block text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                SHA256 Hash
              </span>
              <span
                className={`font-mono truncate block font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}
                title={info.hash}
              >
                {info.hash.substring(0, 8)}...
              </span>
            </div>
          </div>
        </div>

        {/* Download Active Bundle Link */}
        <a
          href={info.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className={`w-full mt-2 inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-98 ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
          }`}
        >
          <Download className="h-4 w-4" />
          <span>Download Active Bundle (.zip)</span>
        </a>
      </div>
    </div>
  );
};

export default ActiveReleaseCard;
