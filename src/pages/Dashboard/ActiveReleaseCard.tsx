import React, { useState } from 'react';
import type { Platform, ReleaseInfo } from '../../types';
import {
  Smartphone,
  Apple,
  CheckCircle2,
  AlertCircle,
  Clock,
  Hash,
  Download,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface Props {
  platform: Platform;
  info: ReleaseInfo;
  theme?: 'dark' | 'light';
}

export const ActiveReleaseCard: React.FC<Props> = ({ platform, info, theme = 'dark' }) => {
  const isAndroid = platform === 'android';
  const isDark = theme === 'dark';
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyHash = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!info.hash) return;
    navigator.clipboard.writeText(info.hash).then(() => {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }).catch(() => {});
  };

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '180 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Platform palette configurations
  const accentGlow = isAndroid
    ? 'from-emerald-500/20 via-teal-500/10 to-transparent'
    : 'from-blue-500/20 via-indigo-500/10 to-transparent';

  const topBorderGlow = isAndroid
    ? 'via-emerald-400'
    : 'via-blue-400';

  const versionGradient = isAndroid
    ? 'from-emerald-400 via-teal-300 to-cyan-300 text-emerald-400'
    : 'from-cyan-400 via-blue-400 to-indigo-300 text-blue-400';

  const downloadBtnGradient = isAndroid
    ? 'from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:via-teal-500 hover:to-emerald-500 shadow-emerald-500/25 hover:shadow-emerald-500/40'
    : 'from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 shadow-blue-500/25 hover:shadow-blue-500/40';

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border transition-all duration-500 ${
        isDark
          ? 'bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/95 border-slate-800/80 hover:border-slate-700/80 text-slate-100 shadow-2xl hover:shadow-emerald-500/5'
          : 'bg-white/95 border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/40'
      } backdrop-blur-xl hover:-translate-y-1 p-6 sm:p-7 flex flex-col justify-between`}
    >
      {/* Specular Top Accent Border with Platform Tint */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${topBorderGlow} to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500`}
      />

      {/* Ambient Radial Backlight Glow */}
      <div
        className={`pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl transition-all duration-700 group-hover:scale-125 ${
          isAndroid
            ? isDark
              ? 'bg-emerald-500/10 group-hover:bg-emerald-500/15'
              : 'bg-emerald-500/5'
            : isDark
            ? 'bg-blue-500/10 group-hover:bg-blue-500/15'
            : 'bg-blue-500/5'
        }`}
      />

      <div>
        {/* Header: Platform Branding, Native Target & Live Status */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center space-x-3.5">
            {/* High-Tech Glowing Squircle Icon */}
            <div
              className={`relative p-3.5 rounded-2xl border transition-all duration-300 ${
                isAndroid
                  ? isDark
                    ? 'bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10 group-hover:border-emerald-400/50 group-hover:shadow-emerald-500/20'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                  : isDark
                  ? 'bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/10 group-hover:border-blue-400/50 group-hover:shadow-blue-500/20'
                  : 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
              }`}
            >
              {isAndroid ? <Smartphone className="h-6 w-6" /> : <Apple className="h-6 w-6" />}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accentGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-black capitalize tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {platform} Production
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700/70 text-slate-300'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className={isDark ? 'text-slate-400 font-normal' : 'text-slate-500 font-normal'}>Target:</span>
                  <span className="font-mono font-bold">v{info.minAppVersion}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Badges: Live OTA & Patch Urgency */}
          <div className="flex flex-col items-end gap-1.5">
            {/* Live Serving Pulsing Radar */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide border transition-all ${
                isDark
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE OTA</span>
            </div>

            {/* Mandatory or Optional Patch Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                info.mandatory
                  ? isDark
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                  : isDark
                  ? 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              {info.mandatory ? (
                <>
                  <AlertCircle className="h-3 w-3 text-amber-400" />
                  <span>Mandatory Hotfix</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>Optional Patch</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Hero Block: Active JS Bundle & Release Notes */}
        <div
          className={`relative rounded-2xl p-4 sm:p-5 border transition-all duration-300 mb-4 overflow-hidden ${
            isDark
              ? 'bg-slate-950/70 border-slate-800/80 group-hover:border-slate-700/80'
              : 'bg-slate-50/90 border-slate-200/90 shadow-2xs'
          }`}
        >
          {/* Subtle mesh background line */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Active JS Bundle
              </span>
            </div>
            <span
              className={`text-2xl sm:text-3xl font-black font-mono tracking-tight bg-gradient-to-r ${versionGradient} bg-clip-text text-transparent drop-shadow-xs`}
            >
              v{info.latestVersion}
            </span>
          </div>

          {/* Release Notes Quote Box */}
          <div
            className={`mt-3 rounded-xl p-3 border-l-2 text-xs transition-all ${
              isAndroid ? 'border-l-emerald-400' : 'border-l-blue-400'
            } ${
              isDark
                ? 'bg-slate-900/90 border-y border-r border-slate-800/80 text-slate-300'
                : 'bg-white border-y border-r border-slate-200 text-slate-800 shadow-2xs'
            }`}
          >
            <div className="flex items-start gap-2">
              <p className="font-mono text-xs line-clamp-2 italic leading-relaxed">
                "{info.releaseNotes || 'Initial production release'}"
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Column Telemetry Specs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 text-xs mb-5">
          {/* Deployed Date */}
          <div
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all ${
              isDark
                ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-cyan-500">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Updated
              </span>
            </div>
            <p className={`font-bold truncate text-[11px] sm:text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {new Date(info.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* SHA256 Checksum with One-Click Copy */}
          <div
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all relative group/hash cursor-pointer ${
              isDark
                ? 'bg-slate-950/60 border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-900/80'
                : 'bg-slate-50 border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
            }`}
            onClick={handleCopyHash}
            title="Click to copy full SHA256 Hash"
          >
            <div className="flex items-center justify-between mb-1 text-purple-400">
              <div className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Checksum
                </span>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Copy hash"
              >
                {copiedHash ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3 opacity-60 group-hover/hash:opacity-100" />
                )}
              </button>
            </div>
            <p className={`font-mono font-bold truncate text-[11px] sm:text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {copiedHash ? (
                <span className="text-emerald-400 font-semibold">Copied!</span>
              ) : (
                `${(info.hash || 'e3b0c442').substring(0, 8)}...`
              )}
            </p>
          </div>

          {/* Bundle Size Spec */}
          <div
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all ${
              isDark
                ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-emerald-500">
              <Layers className="h-3.5 w-3.5 shrink-0" />
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Bundle Size
              </span>
            </div>
            <p className={`font-mono font-bold truncate text-[11px] sm:text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {formatSize(info.sizeBytes)}
            </p>
          </div>
        </div>
      </div>

      {/* Premium Download CTA Button */}
      <a
        href={info.downloadUrl || '#'}
        target={info.downloadUrl ? '_blank' : undefined}
        rel="noreferrer"
        onClick={(e) => {
          if (!info.downloadUrl || info.downloadUrl === '#') {
            e.preventDefault();
          }
        }}
        className={`group/btn relative w-full overflow-hidden rounded-2xl py-3.5 px-4 text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
          info.downloadUrl
            ? `bg-gradient-to-r ${downloadBtnGradient} text-white cursor-pointer`
            : isDark
            ? 'bg-slate-800/60 border border-slate-700/60 text-slate-400 cursor-not-allowed'
            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
        }`}
      >
        {/* Shimmer Sheen Sweep Overlay on Hover */}
        {info.downloadUrl && (
          <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        )}

        <Download className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/btn:-translate-y-0.5 group-hover/btn:scale-110" />
        <span className="truncate">Download Active Bundle (.zip)</span>
        {info.downloadUrl && (
          <ArrowUpRight className="h-3.5 w-3.5 opacity-60 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-all" />
        )}
      </a>
    </div>
  );
};

export default ActiveReleaseCard;

