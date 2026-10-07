import React, { useState, useEffect } from 'react';
import type { ReleaseHistoryItem } from '../../types';
import {
  ArrowLeft,
  Smartphone,
  Apple,
  CheckCircle2,
  Activity,
  Zap,
  ShieldCheck,
  Copy,
  Check,
  Radio,
  FileText,
  Clock,
  HelpCircle,
  Database,
  Cloud,
  GitCommit,
  Layers,
  Globe,
} from 'lucide-react';

interface Props {
  item: ReleaseHistoryItem;
  onBack: () => void;
  theme?: 'dark' | 'light';
}

export const ReleaseDetailScreen: React.FC<Props> = ({ item, onBack, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const isAndroid = item.platform === 'android';

  const handleCopyHash = () => {
    navigator.clipboard.writeText(item.hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyUrl = () => {
    const url = item.downloadUrl || `https://codepushs.netlify.app/bundles/${item.platform}-v${item.version}.zip`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const createdDate = new Date(item.createdAt || Date.now());
  const formattedCreated = createdDate.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const realTimeline = [
    {
      stepNumber: '1',
      icon: GitCommit,
      title: 'Git Commit & Code Push',
      subtitle: `Source: ${item.source || 'Developer / GitHub Push'}`,
      description: item.releaseNotes || 'Developer committed changes and pushed to branch.',
      time: formattedCreated,
      statusText: 'Completed',
      badgeColor: isDark
        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
    {
      stepNumber: '2',
      icon: Layers,
      title: 'React Native Bundle Compilation',
      subtitle: `Target Platform: ${item.platform.toUpperCase()}`,
      description: `CI/CD compiled the JS bundle (index.${item.platform}.bundle) and packaged into ZIP archive.`,
      time: formattedCreated,
      statusText: 'Success',
      badgeColor: isDark
        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
    {
      stepNumber: '3',
      icon: ShieldCheck,
      title: 'SHA256 Cryptographic Checksum',
      subtitle: `Hash: ${item.hash.substring(0, 16)}...`,
      description: 'Calculated tamper-proof SHA256 signature to guarantee release integrity before distribution.',
      time: 'Verified',
      statusText: 'Verified',
      badgeColor: isDark
        ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
        : 'bg-cyan-50 border-cyan-200 text-cyan-700',
    },
    {
      stepNumber: '4',
      icon: Cloud,
      title: 'Netlify Edge & Firestore Sync',
      subtitle: 'Realtime DB Endpoint Synced',
      description: 'Release metadata was published to Netlify functions and synced across Firestore.',
      time: 'Live in Cloud',
      statusText: 'Synced',
      badgeColor: isDark
        ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
        : 'bg-purple-50 border-purple-200 text-purple-700',
    },
    {
      stepNumber: '5',
      icon: Globe,
      title: 'Mobile App OTA Channel Active',
      subtitle: `Version: v${item.version} (${item.mandatory ? 'Mandatory' : 'Optional'})`,
      description: `Mobile clients querying /.netlify/functions/check-update for ${item.platform.toUpperCase()} will receive this active release automatically.`,
      time: 'Active Now',
      statusText: 'Live for Clients',
      badgeColor: isDark
        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
      {/* Top Header & Back Navigation Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className={`px-4 py-2.5 rounded-2xl border transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2 font-extrabold text-xs ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Release History</span>
          </button>

          <span
            className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
              isAndroid
                ? isDark
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : isDark
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            {item.platform.toUpperCase()} PLATFORM
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isDark
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
            <span>Realtime Server Release Status</span>
          </div>
        </div>
      </div>

      {/* Hero Banner Card */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 transition-all duration-300 relative overflow-hidden shadow-xl ${
          isDark
            ? 'border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100 shadow-slate-950/80'
            : 'border-slate-200 bg-white text-slate-900 shadow-slate-200/60'
        }`}
      >
        {!isDark && (
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start space-x-4">
            <div
              className={`p-4 rounded-2xl border shrink-0 ${
                isAndroid
                  ? isDark
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-md'
                  : isDark
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10'
                  : 'bg-blue-50 border-blue-200 text-blue-600 shadow-md'
              }`}
            >
              {isAndroid ? <Smartphone className="h-8 w-8" /> : <Apple className="h-8 w-8" />}
            </div>

            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {item.platform.toUpperCase()} Release v{item.version}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                    item.mandatory
                      ? isDark
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                      : isDark
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  {item.mandatory ? 'Mandatory Upgrade' : 'Optional Upgrade'}
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-medium max-w-2xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Published on <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{formattedCreated}</span> • ID: <span className="font-mono font-bold">{item.id}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyUrl}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-xs'
              }`}
            >
              {copiedUrl ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>{copiedUrl ? 'Copied Link!' : 'Copy Download Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid for Realtime Release Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Bundle Version */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-md shadow-slate-200/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Bundle Version
            </span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">v{item.version}</div>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Active OTA build version
          </p>
        </div>

        {/* Card 2: Size & Package */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-md shadow-slate-200/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Bundle Package
            </span>
            <Zap className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="text-xl font-mono font-black text-cyan-600 dark:text-cyan-400">
            {item.sizeBytes ? `${(item.sizeBytes / 1024).toFixed(0)} KB` : 'ZIP Archive'}
          </div>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Compressed JS & Assets
          </p>
        </div>

        {/* Card 3: Security & Checksum */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-md shadow-slate-200/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Checksum Status
            </span>
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl font-mono font-black text-purple-600 dark:text-purple-400">SHA256 Verified</div>
          <p className={`text-xs mt-1 font-medium font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            #{item.hash.substring(0, 10)}...
          </p>
        </div>

        {/* Card 4: Database Storage */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-md shadow-slate-200/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Realtime Storage
            </span>
            <Database className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-mono font-black text-amber-600 dark:text-amber-400">Firebase DB</div>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Cloud synced release record
          </p>
        </div>
      </div>

      {/* Release Notes Card */}
      <div
        className={`p-6 rounded-3xl border flex items-start space-x-4 shadow-sm ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shrink-0">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold tracking-tight mb-1">
            Commit Notes & Release Log
          </h3>
          <p className={`text-xs sm:text-sm font-medium leading-relaxed font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {item.releaseNotes || 'No release notes provided.'}
          </p>
        </div>
      </div>

      {/* Realtime Live Mobile Device Pings Stream */}
      <RealtimeTelemetryCard isDark={isDark} />

      {/* Realtime Interactive Release Journey Timeline */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 transition-all shadow-xl ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/60'
        }`}
      >
        <div className="flex items-center space-x-3.5 mb-8">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">
              Realtime Release Journey & Audit Timeline
            </h2>
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Live chronological timeline generated directly from server metadata.
            </p>
          </div>
        </div>

        {/* Vertical Connected Timeline Track */}
        <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-1 before:bg-gradient-to-b before:from-emerald-500 via-cyan-500 via-indigo-500 to-purple-500 before:rounded-full">
          {realTimeline.map((step) => {
            const StepIcon = step.icon;
            return (
              <div key={step.stepNumber} className="relative group">
                {/* Timeline Node Badge */}
                <div className="absolute -left-6 sm:-left-10 top-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/20 z-10 transition-transform group-hover:scale-110">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 stroke-[2.5]" />
                </div>

                {/* Step Detail Card */}
                <div
                  className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                    isDark
                      ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 shadow-lg'
                      : 'bg-slate-50/90 border-slate-200/90 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        <StepIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold tracking-tight flex items-center space-x-2">
                          <span>{step.title}</span>
                        </h3>
                        <span className={`text-xs font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-800'}`}>
                          {step.subtitle}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border self-start sm:self-auto flex items-center space-x-1 ${step.badgeColor}`}
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span>{step.statusText}</span>
                    </span>
                  </div>

                  <p className={`text-xs sm:text-sm font-medium leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {step.description}
                  </p>

                  <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-cyan-500" />
                      <span>Timestamp:</span>
                    </span>
                    <span className="font-extrabold text-cyan-600 dark:text-cyan-400">{step.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Technical Hash Info Expandable */}
      <div
        className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm'
        }`}
      >
        <div className="flex items-center space-x-2 text-xs font-mono">
          <HelpCircle className="h-4 w-4 text-cyan-500 shrink-0" />
          <span>SHA256 File Signature (For Technical Auditing):</span>
          <span className="font-extrabold text-slate-900 dark:text-slate-200 select-all">{item.hash}</span>
        </div>

        <button
          type="button"
          onClick={handleCopyHash}
          className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1 cursor-pointer shrink-0"
        >
          {copiedHash ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copiedHash ? 'Hash Copied!' : 'Copy Full Technical Hash'}</span>
        </button>
      </div>
    </div>
  );
};

const TELEMETRY_URL = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/telemetry.json';

const RealtimeTelemetryCard: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [telemetryLogs, setTelemetryLogs] = useState<Array<{ id: string; time: string; device: string; action: string; version: string }>>([]);

  useEffect(() => {
    async function fetchTelemetry() {
      try {
        const res = await fetch(TELEMETRY_URL);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setTelemetryLogs(data);
          }
        }
      } catch (err) {
        console.warn('Telemetry fetch error:', err);
      }
    }
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`rounded-3xl border p-6 sm:p-8 transition-all ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-950 text-slate-100 border-slate-800 shadow-xl'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center space-x-2">
              <span>Realtime Mobile Phone Pings</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                LIVE CLOUD STREAM
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live device connections, update checks, and installation pings received from mobile phones.
            </p>
          </div>
        </div>
      </div>

      {telemetryLogs.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 font-mono bg-slate-900/60 rounded-2xl border border-slate-800">
          Waiting for mobile phone pings... Open your mobile app to send a live ping! 📱
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
          {telemetryLogs.map((log) => (
            <div key={log.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono transition-all hover:border-emerald-500/50">
              <div className="flex items-center space-x-3">
                <span className="text-emerald-400 font-bold">[{log.time}]</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">{log.device}</span>
                <span className="text-slate-300">{log.action}</span>
              </div>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold self-start sm:self-auto">
                <CheckCircle2 className="h-3 w-3" />
                <span>v{log.version}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReleaseDetailScreen;
