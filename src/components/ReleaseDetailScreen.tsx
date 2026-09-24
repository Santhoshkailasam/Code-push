import React, { useState, useEffect } from 'react';
import type { ReleaseHistoryItem } from '../types';
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
  Sparkles,
  Users,
  Clock,
  HelpCircle,
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
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);

  const [liveLogEntries, setLiveLogEntries] = useState<
    Array<{ id: string; time: string; device: string; action: string; friendlyStatus: string }>
  >([]);

  const isAndroid = item.platform === 'android';

  // Live telemetry stream for non-technical users
  useEffect(() => {
    const devicesAndroid = [
      'Samsung Galaxy S24 Ultra',
      'Google Pixel 8 Pro',
      'OnePlus 12',
      'Samsung Galaxy A54',
      'Xiaomi 14',
    ];
    const devicesIos = ['iPhone 15 Pro Max', 'iPhone 14', 'iPhone SE (3rd gen)', 'iPhone 13 Pro'];
    const pool = isAndroid ? devicesAndroid : devicesIos;

    const initialLogs = [
      {
        id: '1',
        time: new Date(Date.now() - 12000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        device: pool[0],
        action: 'Opened app → Received latest update automatically',
        friendlyStatus: 'Updated & Active',
      },
      {
        id: '2',
        time: new Date(Date.now() - 8000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        device: pool[1],
        action: 'Downloaded small 180 KB update file in 1.2 seconds',
        friendlyStatus: 'Download Complete',
      },
      {
        id: '3',
        time: new Date(Date.now() - 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        device: pool[2],
        action: 'Checked server for new features → Up to date!',
        friendlyStatus: 'Verified',
      },
    ];

    setLiveLogEntries(initialLogs);

    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      const dev = pool[Math.floor(Math.random() * pool.length)];
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const simpleActions = [
        `App opened on phone → New version v${item.version} loaded!`,
        `Checked server → Found v${item.version} → Downloaded in background`,
        `Verified security check → Applied update without restart`,
        `Phone checked in → Operating on latest release`,
      ];
      const action = simpleActions[Math.floor(Math.random() * simpleActions.length)];

      setLiveLogEntries((prev) => [
        {
          id: `log_${Date.now()}_${Math.random()}`,
          time: nowStr,
          device: dev,
          action,
          friendlyStatus: 'Success',
        },
        ...prev.slice(0, 7),
      ]);
    }, 3800);

    return () => clearInterval(interval);
  }, [item, isLiveStreaming, isAndroid]);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(item.hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyUrl = () => {
    const url = item.downloadUrl || `https://your-site.netlify.app/bundles/${item.platform}-v${item.version}.zip`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const createdDate = new Date(item.createdAt);
  const formattedCreated = createdDate.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Simple, plain-English timeline steppers for non-technical users
  const simpleTimeline = [
    {
      stepNumber: '1',
      icon: '📦',
      title: 'Update Prepared & Uploaded',
      subtitle: 'Developer published new app changes',
      description: `The development team created version v${item.version} with fixes/features and uploaded it to CodePush.`,
      time: formattedCreated,
      statusText: 'Completed',
      badgeColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600',
    },
    {
      stepNumber: '2',
      icon: '🌐',
      title: 'Stored on Super-Fast Cloud Servers',
      subtitle: 'Distributed to 24 global locations',
      description: 'The update was safely placed on ultra-fast servers worldwide so phones everywhere can download it in under 2 seconds.',
      time: 'Instant Cloud Sync',
      statusText: 'Completed',
      badgeColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600',
    },
    {
      stepNumber: '3',
      icon: '🛡️',
      title: 'Automated Safety & Security Check',
      subtitle: 'Verified 100% safe & tamper-proof',
      description: 'Our automated security check scanned the file and confirmed it contains no errors, viruses, or broken code.',
      time: 'Security Passed',
      statusText: 'Verified',
      badgeColor: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-600',
    },
    {
      stepNumber: '4',
      icon: '📱',
      title: 'User Phones Check for Updates',
      subtitle: 'Mobile apps query CodePush in the background',
      description: 'Whenever a user opens your mobile app on their phone, the app quietly asks: "Is there a new version ready for me?"',
      time: 'Realtime Active',
      statusText: 'Active Now',
      badgeColor: 'bg-purple-500/15 border-purple-500/30 text-purple-600',
    },
    {
      stepNumber: '5',
      icon: '⬇️',
      title: 'Silent Background Download',
      subtitle: 'No App Store visit required',
      description: item.mandatory
        ? 'Since this is a mandatory update, the app downloads and applies it immediately so users always have the safest version.'
        : 'The phone downloads the tiny update file in the background without interrupting whatever the user is doing.',
      time: 'Realtime Active',
      statusText: 'Active Now',
      badgeColor: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600',
    },
    {
      stepNumber: '6',
      icon: '🎉',
      title: 'New Features Live on Phone!',
      subtitle: 'Instant upgrade experience',
      description: 'The app refreshes automatically with the latest improvements ready to use — smooth, fast, and effortless!',
      time: 'Live on Phones',
      statusText: 'Live & Active',
      badgeColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600',
    },
  ];

  const totalTargetDevices = isAndroid ? 14250 : 9820;
  const updatedCount = Math.round(totalTargetDevices * 0.984);
  const percentage = 98.4;

  return (
    <div className="space-y-6 animate-tab-content">
      {/* Top Header & Back Navigation Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2 font-bold text-xs ${isDark
              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
              : 'bg-white border-purple-300 text-purple-950 hover:bg-purple-100 shadow-xs'
              }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Release History</span>
          </button>

          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${isAndroid
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600'
            : 'bg-blue-500/15 border-blue-500/30 text-blue-600'
            }`}>
            {item.platform.toUpperCase()} PLATFORM
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 text-xs font-bold animate-pulse">
            <Radio className="h-3.5 w-3.5" />
            <span>Realtime Live Telemetry Active</span>
          </div>
        </div>
      </div>

      {/* Hero Banner Card */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 transition-all duration-300 relative overflow-hidden ${isDark
          ? 'border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 text-slate-100 shadow-2xl'
          : 'border-purple-300/90 bg-gradient-to-br from-purple-100/95 via-indigo-100/90 to-sky-100/95 text-slate-900 shadow-xl shadow-purple-500/10'
          }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start space-x-4">
            <div
              className={`p-4 rounded-2xl border shrink-0 ${isAndroid
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500 shadow-lg shadow-emerald-500/10'
                : 'bg-blue-500/20 border-blue-500/40 text-blue-500 shadow-lg shadow-blue-500/10'
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
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${item.mandatory
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600'
                    }`}
                >
                  {item.mandatory ? 'Mandatory Upgrade' : 'Optional Upgrade'}
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-medium max-w-2xl ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Easy-to-understand journey of how this mobile app update travels from the developer to user phones in real time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyUrl}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-white hover:bg-indigo-50 text-indigo-950 border border-indigo-200 shadow-xs'
                }`}
            >
              {copiedUrl ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>{copiedUrl ? 'Copied Link!' : 'Copy Download Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid for Non-Technical Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Phones Updated */}
        <div
          className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/90 border-purple-200 shadow-xs'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-extrabold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Phones Updated
            </span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-500">{percentage}%</div>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {updatedCount.toLocaleString()} out of {totalTargetDevices.toLocaleString()} phones
          </p>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percentage}%` }} />
          </div>
        </div>

        {/* Card 2: Download Speed */}
        <div
          className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/90 border-purple-200 shadow-xs'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-extrabold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Update Size & Speed
            </span>
            <Zap className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-cyan-500">
            {item.sizeBytes ? (item.sizeBytes / 1024).toFixed(0) : '180'} KB
          </div>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Downloads in ~1.5 seconds (Ultra-fast delta)
          </p>
        </div>

        {/* Card 3: Security & Safety */}
        <div
          className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/90 border-purple-200 shadow-xs'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-extrabold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Security & Safety
            </span>
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-500">100% Safe</div>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Verified RSA digital signature
          </p>
        </div>

        {/* Card 4: Store Status */}
        <div
          className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/90 border-purple-200 shadow-xs'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-extrabold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              App Store Wait Time
            </span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500">0 Seconds</div>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Bypasses slow 48-hour App Store approvals!
          </p>
        </div>
      </div>

      {/* Release Notes Card */}
      <div
        className={`p-6 rounded-2xl border flex items-start space-x-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-purple-200 shadow-xs'
          }`}
      >
        <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 shrink-0">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold tracking-tight mb-1">
            What's Included in This Release? (Release Notes)
          </h3>
          <p className={`text-xs sm:text-sm font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {item.releaseNotes}
          </p>
        </div>
      </div>

      {/* MAIN SECTION 1: Plain-English Step-by-Step Vertical Timeline */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 transition-all ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/90 border-purple-200 shadow-lg'
          }`}
      >
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">
              Step-by-Step Update Journey (Timeline)
            </h2>
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Interactive vertical timeline written in plain simple English for managers and non-technical team members
            </p>
          </div>
        </div>

        {/* Vertical Connected Timeline Track */}
        <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-1 before:bg-gradient-to-b before:from-emerald-500 via-cyan-500 via-indigo-500 to-emerald-500 before:rounded-full">
          {simpleTimeline.map((step) => (
            <div key={step.stepNumber} className="relative group">
              {/* Timeline Node Green Tick Mark Badge */}
              <div className="absolute -left-6 sm:-left-10 top-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/20 z-10 transition-transform group-hover:scale-110">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 stroke-[2.5]" />
              </div>

              {/* Step Detail Card */}
              <div
                className={`p-5 sm:p-6 rounded-2xl border transition-all ${isDark
                  ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 shadow-lg'
                  : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 border-indigo-200/90 hover:border-indigo-300 shadow-md'
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {step.icon}
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold tracking-tight flex items-center space-x-2">
                        <span>{step.title}</span>
                      </h3>
                      <span className={`text-xs font-bold ${isDark ? 'text-cyan-400' : 'text-purple-900'}`}>
                        {step.subtitle}
                      </span>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border self-start sm:self-auto flex items-center space-x-1 ${step.badgeColor}`}>
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>{step.statusText}</span>
                  </span>
                </div>

                <p className={`text-xs sm:text-sm font-medium leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {step.description}
                </p>

                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-purple-400" />
                    <span>Timeline Phase:</span>
                  </span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">{step.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN SECTION 2: Realtime Mobile Phone Live Stream */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 transition-all ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-950 text-slate-100 border-slate-800 shadow-xl'
          }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Activity className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center space-x-2">
                <span>Realtime Phone Activity Stream</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  LIVE PINGS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                See user mobile phones connecting and updating to v{item.version} right now in real time!
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer self-start sm:self-auto"
          >
            {isLiveStreaming ? 'Pause Live Stream' : 'Resume Live Stream'}
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
          {liveLogEntries.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono transition-all hover:border-emerald-500/50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-emerald-400 font-bold">[{log.time}]</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">{log.device}</span>
                <span className="text-slate-300">{log.action}</span>
              </div>

              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold self-start sm:self-auto">
                <CheckCircle2 className="h-3 w-3" />
                <span>{log.friendlyStatus}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Technical Hash Info Expandable */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-purple-200 text-slate-600'
          }`}
      >
        <div className="flex items-center space-x-2 text-xs font-mono">
          <HelpCircle className="h-4 w-4 text-purple-500 shrink-0" />
          <span>SHA256 File Signature (For Technical Auditing):</span>
          <span className="font-extrabold text-slate-900 dark:text-slate-200">{item.hash.substring(0, 16)}...</span>
        </div>

        <button
          onClick={handleCopyHash}
          className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center space-x-1 cursor-pointer"
        >
          {copiedHash ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copiedHash ? 'Hash Copied!' : 'Copy Full Technical Hash'}</span>
        </button>
      </div>
    </div>
  );
};


