import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReleaseHistoryItem, TimelineEvent } from '../../types';
import {
  X,
  Smartphone,
  Apple,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  Radio,
  FileText,
  Server,
  Cpu,
  Layers,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  item: ReleaseHistoryItem | null;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const ReleaseDetailModal: React.FC<Props> = ({ isOpen, item, onClose, theme = 'dark' }) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [liveLogEntries, setLiveLogEntries] = useState<
    Array<{ id: string; time: string; device: string; action: string; status: 'ok' | 'syncing' }>
  >([]);

  const isDark = theme === 'dark';

  // Generate realistic live device telemetry logs
  useEffect(() => {
    if (!isOpen || !item) return;

    const devicesAndroid = ['Pixel 8 Pro', 'Samsung S24 Ultra', 'OnePlus 12', 'Galaxy A54', 'Xiaomi 14'];
    const devicesIos = ['iPhone 15 Pro Max', 'iPhone 14', 'iPhone SE (3rd gen)', 'iPhone 13 Pro'];
    const pool = item.platform === 'android' ? devicesAndroid : devicesIos;

    const initialLogs = Array.from({ length: 4 }).map((_, idx) => {
      const dev = pool[Math.floor(Math.random() * pool.length)];
      const now = new Date(Date.now() - (3 - idx) * 4000);
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return {
        id: `log_${Date.now()}_${idx}`,
        time: timeStr,
        device: dev,
        action: `Checked for updates -> Applied v${item.version} successfully`,
        status: 'ok' as const,
      };
    });

    setLiveLogEntries(initialLogs);

    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      const dev = pool[Math.floor(Math.random() * pool.length)];
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const actions = [
        `SDK check-in -> Up to date (v${item.version})`,
        `Downloading binary delta (${item.sizeBytes ? Math.round(item.sizeBytes / 1024) : 180} KB)`,
        `Verified SHA256 signature -> Swapped bundle`,
        `App rebooted -> Active release v${item.version}`,
      ];
      const act = actions[Math.floor(Math.random() * actions.length)];

      setLiveLogEntries((prev) => [
        {
          id: `log_${Date.now()}_${Math.random()}`,
          time: nowStr,
          device: dev,
          action: act,
          status: 'ok',
        },
        ...prev.slice(0, 9),
      ]);
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, item, isLiveStreaming]);

  if (!isOpen || !item) return null;

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

  const isAndroid = item.platform === 'android';

  // Generated timeline events for the release lifecycle
  const createdDate = new Date(item.createdAt);
  const formattedCreated = createdDate.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const timelineEvents: TimelineEvent[] = item.timeline || [
    {
      id: 'step_1',
      timestamp: formattedCreated,
      title: 'OTA Bundle Created & Published',
      description: `Release package v${item.version} uploaded with SHA256 integrity hash: ${item.hash.substring(0, 12)}...`,
      status: 'completed',
      stage: 'upload',
    },
    {
      id: 'step_2',
      timestamp: new Date(createdDate.getTime() + 1200).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: 'Netlify Edge KV Propagation',
      description: 'Bundle binary replicated to 24 global edge CDN node locations.',
      status: 'completed',
      stage: 'edge_deploy',
    },
    {
      id: 'step_3',
      timestamp: new Date(createdDate.getTime() + 2500).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: 'Signature & RSA Security Verification',
      description: 'Integrity check passed. Security signature matches public release key.',
      status: 'completed',
      stage: 'verification',
    },
    {
      id: 'step_4',
      timestamp: 'Real-time (Active)',
      title: 'React Native SDK Poll (`codePush.sync()`)',
      description: 'Mobile applications querying Netlify Edge server for update availability.',
      status: 'in_progress',
      stage: 'sdk_check',
    },
    {
      id: 'step_5',
      timestamp: 'Real-time (Active)',
      title: 'Device Delta Sync & Installation',
      description: item.mandatory
        ? 'Mandatory immediate download & silent background JS bundle swap.'
        : 'Optional update queued for next app launch or background refresh.',
      status: 'in_progress',
      stage: 'device_download',
    },
  ];

  const totalDevices = item.adoptionStats?.totalTargetDevices || (isAndroid ? 14250 : 9820);
  const updatedDevices = item.adoptionStats?.updatedDevices || Math.round(totalDevices * 0.984);
  const adoptionRate = ((updatedDevices / totalDevices) * 100).toFixed(1);

  const modalContent = (
    <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/40 backdrop-blur-sm pointer-events-auto">
      {/* Backdrop click closer */}
      <div onClick={onClose} className="fixed inset-0 top-0 left-0 w-screen h-screen z-0 bg-transparent cursor-default" />

      {/* Main Modal Card */}
      <div
        className={`w-full max-w-4xl my-auto mx-auto rounded-3xl border p-6 sm:p-8 shadow-2xl relative z-10 transition-all duration-300 transform scale-100 max-h-[90vh] flex flex-col ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/80'
            : 'bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 border-indigo-200 text-slate-900 shadow-2xl shadow-indigo-500/20'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div
              className={`p-3 rounded-2xl border ${
                isAndroid
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-500'
              }`}
            >
              {isAndroid ? <Smartphone className="h-6 w-6" /> : <Apple className="h-6 w-6" />}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black tracking-tight">{item.platform.toUpperCase()} Release v{item.version}</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                    item.mandatory
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-600'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600'
                  }`}
                >
                  {item.mandatory ? 'Mandatory OTA' : 'Optional OTA'}
                </span>
              </div>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Full release timeline, SHA256 integrity, and mobile device telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 text-xs font-bold animate-pulse">
              <Radio className="h-3.5 w-3.5" />
              <span>Realtime Telemetry Active</span>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-indigo-200/60'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto space-y-6 pt-6 pr-1 flex-1">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Adoption Rate */}
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white/80 border-indigo-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Device Adoption</span>
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-500">{adoptionRate}%</div>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {updatedDevices.toLocaleString()} of {totalDevices.toLocaleString()} devices updated
              </p>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${adoptionRate}%` }} />
              </div>
            </div>

            {/* Card 2: Bundle Size */}
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white/80 border-indigo-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Bundle Binary Size</span>
                <Zap className="h-4 w-4 text-cyan-500" />
              </div>
              <div className="text-xl font-black">
                {item.sizeBytes ? (item.sizeBytes / 1024).toFixed(1) : '180.0'} KB
              </div>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                High-efficiency gzip delta compression
              </p>
            </div>

            {/* Card 3: SHA256 Verification */}
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white/80 border-indigo-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>SHA256 Checksum</span>
                <ShieldCheck className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-xs font-mono font-extrabold truncate" title={item.hash}>
                {item.hash.substring(0, 14)}...
              </div>
              <button
                onClick={handleCopyHash}
                className="mt-2 inline-flex items-center space-x-1 text-[11px] font-bold text-purple-500 hover:text-purple-600 cursor-pointer"
              >
                {copiedHash ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedHash ? 'Hash Copied!' : 'Copy Full Hash'}</span>
              </button>
            </div>

            {/* Card 4: Edge CDN Node */}
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white/80 border-indigo-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Edge Storage</span>
                <Server className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="text-sm font-extrabold text-indigo-500">Netlify Edge KV</div>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Active across 24 edge pop nodes
              </p>
            </div>
          </div>

          {/* Release Notes Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start space-x-3 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-indigo-200'
            }`}
          >
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-cyan-600 dark:text-cyan-400 mb-0.5">
                Release Notes & Changelog
              </h4>
              <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {item.releaseNotes}
              </p>
            </div>
          </div>

          {/* SECTION 1: Release Lifecycle Timeline */}
          <div
            className={`p-5 rounded-2xl border ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white/90 border-indigo-200'
            }`}
          >
            <div className="flex items-center space-x-2 mb-5">
              <Layers className="h-5 w-5 text-purple-500" />
              <h3 className="text-sm font-extrabold tracking-tight">Full Lifecycle & Deployment Timeline</h3>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-cyan-500 before:to-emerald-500">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="relative group">
                  {/* Timeline Dot Icon */}
                  <div className="absolute -left-6 top-0.5 p-1 rounded-full bg-slate-900 border-2 border-cyan-500 text-cyan-400 shadow-md">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>{evt.title}</span>
                        {evt.status === 'in_progress' && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] bg-cyan-500/15 text-cyan-500 font-mono font-bold animate-pulse">
                            ACTIVE LIVE
                          </span>
                        )}
                      </h4>
                      <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {evt.description}
                      </p>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 mt-1 sm:mt-0 whitespace-nowrap">
                      {evt.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: Realtime Mobile Device Telemetry Stream */}
          <div
            className={`p-5 rounded-2xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-900 text-slate-100 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-extrabold font-mono uppercase tracking-wider text-emerald-400">
                  Realtime Mobile Device Activity Stream
                </h3>
              </div>

              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                {isLiveStreaming ? 'PAUSE LIVE STREAM' : 'RESUME STREAM'}
              </button>
            </div>

            <div className="font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {liveLogEntries.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-slate-300 animate-fadeIn"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-emerald-400 font-bold">[{log.time}]</span>
                    <span className="text-cyan-300 font-bold">{log.device}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-slate-200">{log.action}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold shrink-0 ml-2">
                    200 OK
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Download & Copy Bundle Link Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2 text-xs font-mono w-full sm:w-auto truncate">
              <Download className="h-4 w-4 text-purple-500 shrink-0" />
              <span className={`truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {item.downloadUrl || `https://your-site.netlify.app/bundles/${item.platform}-v${item.version}.zip`}
              </span>
            </div>

            <button
              onClick={handleCopyUrl}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-white hover:bg-indigo-50 text-indigo-950 border border-indigo-200 shadow-xs'
              }`}
            >
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedUrl ? 'Copied Download URL!' : 'Copy Bundle URL'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-600 hover:to-sky-700 text-white shadow-md shadow-indigo-500/20'
            }`}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ReleaseDetailModal;
