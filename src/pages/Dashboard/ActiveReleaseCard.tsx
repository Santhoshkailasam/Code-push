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

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 backdrop-blur-md transition-all duration-300 ${isDark
          ? 'border-slate-800 bg-slate-900/40 text-slate-100 hover:border-slate-700 shadow-xl'
          : isAndroid
            ? 'border-emerald-300/90 bg-gradient-to-br from-emerald-100/95 via-teal-100/90 to-sky-100/95 text-slate-900 shadow-xl shadow-emerald-500/10 hover:border-emerald-400'
            : 'border-blue-300/90 bg-gradient-to-br from-sky-100/95 via-indigo-100/90 to-blue-100/95 text-slate-900 shadow-xl shadow-blue-500/10 hover:border-blue-400'
        }`}
    >
      <div
        className={`absolute top-0 right-0 h-36 w-36 rounded-full blur-3xl opacity-20 ${isAndroid ? 'bg-emerald-400' : 'bg-blue-400'
          }`}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2.5 rounded-xl border ${isAndroid
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 shadow-xs'
                : 'bg-blue-500/15 border-blue-500/40 text-blue-700 shadow-xs'
              }`}
          >
            {isAndroid ? <Smartphone className="h-6 w-6" /> : <Apple className="h-6 w-6" />}
          </div>
          <div>
            <h3 className={`text-lg font-bold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {platform} Production
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-700 font-semibold'}`}>
              Target Native App: v{info.minAppVersion}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${info.mandatory
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-800'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800'
            }`}
        >
          {info.mandatory ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {info.mandatory ? 'Mandatory Patch' : 'Optional Patch'}
        </span>
      </div>

      <div className="space-y-4">
        <div
          className={`rounded-xl p-4 border ${isDark
              ? 'bg-slate-950/60 border-slate-800/80'
              : isAndroid
                ? 'bg-emerald-100/80 border-emerald-300 shadow-xs'
                : 'bg-sky-100/80 border-sky-300 shadow-xs'
            }`}
        >
          <div className="flex items-baseline justify-between mb-1">
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              Active JS Bundle
            </span>
            <span className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              v{info.latestVersion}
            </span>
          </div>
          <p
            className={`text-xs line-clamp-2 mt-2 font-mono p-2.5 rounded border ${isDark
                ? 'bg-slate-900/80 text-slate-300 border-slate-800/50'
                : 'bg-slate-200/70 text-slate-900 border-indigo-200'
              }`}
          >
            "{info.releaseNotes}"
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div
            className={`flex items-center space-x-2 p-2.5 rounded-lg border ${isDark
                ? 'text-slate-400 bg-slate-800/30 border-slate-800/50'
                : isAndroid
                  ? 'text-slate-800 bg-emerald-100/80 border-emerald-300 shadow-xs'
                  : 'text-slate-800 bg-sky-100/80 border-sky-300 shadow-xs'
              }`}
          >
            <Clock className="h-4 w-4 text-cyan-600 shrink-0" />
            <div className="truncate">
              <span className={`block text-[10px] uppercase font-bold ${isDark ? 'text-slate-500' : 'text-indigo-600'}`}>
                Updated
              </span>
              <span className={isDark ? 'text-slate-200' : 'text-slate-900 font-extrabold'}>
                {new Date(info.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div
            className={`flex items-center space-x-2 p-2.5 rounded-lg border ${isDark
                ? 'text-slate-400 bg-slate-800/30 border-slate-800/50'
                : isAndroid
                  ? 'text-slate-800 bg-emerald-100/80 border-emerald-300 shadow-xs'
                  : 'text-slate-800 bg-sky-100/80 border-sky-300 shadow-xs'
              }`}
          >
            <Hash className="h-4 w-4 text-purple-600 shrink-0" />
            <div className="truncate">
              <span className={`block text-[10px] uppercase font-bold ${isDark ? 'text-slate-500' : 'text-purple-600'}`}>
                SHA256 Hash
              </span>
              <span
                className={`font-mono truncate block ${isDark ? 'text-slate-200' : 'text-slate-900 font-extrabold'}`}
                title={info.hash}
              >
                {info.hash.substring(0, 8)}...
              </span>
            </div>
          </div>
        </div>

        <a
          href={info.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className={`w-full mt-2 inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/50'
              : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white border-transparent shadow-md shadow-cyan-500/20 hover:scale-[1.01]'
            }`}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download Active Bundle (.zip)</span>
        </a>
      </div>
    </div>
  );
};
