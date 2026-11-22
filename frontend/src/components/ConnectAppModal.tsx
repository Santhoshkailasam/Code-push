import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Copy,
  Check,
  Smartphone,
  Radio,
  ShieldCheck,
  Eye,
  EyeOff,
  Zap,
  Send,
  Loader2,
  FileCode,
} from 'lucide-react';
import type { Project } from '../types';

interface ConnectAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: Project;
  theme?: 'dark' | 'light';
}

interface ConnectionBeacon {
  id?: string;
  time?: string;
  date?: string;
  device?: string;
  platform?: string;
  version?: string;
  action?: string;
  status?: string;
  lastSeen?: string;
  projectId?: string;
}

export const ConnectAppModal: React.FC<ConnectAppModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [latestBeacon, setLatestBeacon] = useState<ConnectionBeacon | null>(null);
  const [testSending, setTestSending] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);

  const fallbackAppId = 'app_rCYp1a_mvdfs5j4_w9dyc';
  const fallbackApiKey = 'cp_live_rCYp1a_mvdfs5j4_live_key';
  const projectId = activeProject?.id || fallbackAppId;
  const apiKey = activeProject?.apiKey || fallbackApiKey;
  const appName = activeProject?.name || 'SkillSwap';
  const serverUrl = 'https://codepushs.netlify.app';

  const codepushJsonContent = {
    serverUrl,
    appId: projectId,
    apiKey: apiKey,
    appName: appName,
    version: '1.0.0',
  };

  const jsonString = JSON.stringify(codepushJsonContent, null, 2);

  // Poll for live device handshake ping
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const checkConnection = async () => {
      try {
        const url = `/.netlify/functions/report-status${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`;
        const telemRes = await fetch(url);
        if (telemRes.ok) {
          const telemData = await telemRes.json();
          const logs: any[] = Array.isArray(telemData) ? telemData : [];
          const match = logs.find(
            (l) => l?.projectId === projectId || l?.apiKey === apiKey
          );
          if (match && isMounted) {
            setLatestBeacon(match);
          }
        }
      } catch (err) {
        console.warn('Connection check failed:', err);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, projectId, apiKey]);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'codepush.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTestPing = async () => {
    setTestSending(true);
    setTestSentSuccess(false);
    try {
      const alertPayload = {
        id: `handshake_${Date.now()}`,
        title: '⚡ CodePush Connection Verified',
        message: `Your app (${appName}) is securely linked to the CodePush Console!`,
        active: true,
        createdAt: new Date().toISOString(),
        projectId,
      };

      // Broadcast alert directly to PostgreSQL alerts table
      await fetch('/.netlify/functions/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload),
      });

      setTestSentSuccess(true);
      setTimeout(() => setTestSentSuccess(false), 4000);
    } catch (e) {
      console.warn('Failed to send test ping:', e);
    } finally {
      setTestSending(false);
    }
  };

  const isDeviceRecentlyActive = Boolean(latestBeacon);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl transition-all duration-300 overflow-hidden my-auto ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-white shadow-slate-950/95 ring-1 ring-white/10'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Header - Always pinned at top */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/20 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 shrink-0">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Connect Mobile App</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Firebase-Style
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Connect <strong className="text-cyan-400">{appName}</strong> to this console in 30 seconds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable with min-h-0 guarantee */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto min-h-0 flex-1">
          {/* STEP 1: Download codepush.json */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2">
                <span className="h-6 w-6 rounded-lg bg-cyan-500 text-white text-xs font-black flex items-center justify-center shadow-xs shrink-0">
                  1
                </span>
                <span className="font-extrabold text-xs sm:text-sm tracking-tight">
                  Download Config File (<code className="text-cyan-400 font-mono">codepush.json</code>)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-white bg-slate-800/80'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-200/80'
                  }`}
                  title={showKey ? 'Mask Secret Key' : 'Reveal Secret Key'}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span className="text-[11px]">{showKey ? 'Hide' : 'Reveal'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : isDark
                      ? 'text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/30'
                      : 'text-blue-600 hover:bg-blue-50 border border-blue-200'
                  }`}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
            </div>

            {/* Big Action Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-cyan-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] cursor-pointer mb-2.5"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download codepush.json</span>
            </button>

            {/* Code Block - Compact preview */}
            <div
              className={`p-2.5 rounded-xl font-mono text-[11px] overflow-x-auto relative border max-h-24 overflow-y-auto ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <pre className="leading-tight">
{`{
  "serverUrl": "${serverUrl}",
  "appId": "${projectId}",
  "apiKey": "${showKey ? apiKey : '••••••••••••••••••••••••••••••••'}",
  "appName": "${appName}",
  "version": "1.0.0"
}`}
              </pre>
            </div>
          </div>

          {/* STEP 2: Drop into App Root */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <span className="h-6 w-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                2
              </span>
              <span className="font-extrabold text-sm tracking-tight">
                Drop in React Native Project Root
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs pl-8">
              <div
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border font-mono font-medium ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <FileCode className="h-3.5 w-3.5 text-cyan-400" />
                <span>./SkillSwap/codepush.json</span>
              </div>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                Next to <code className="font-mono text-cyan-400">package.json</code> & <code className="font-mono text-cyan-400">App.tsx</code>
              </span>
            </div>
          </div>

          {/* STEP 3: Real-Time Handshake Radar & Live Verification */}
          <div
            className={`p-4.5 rounded-2xl border transition-all ${
              isDeviceRecentlyActive
                ? isDark
                  ? 'bg-emerald-950/20 border-emerald-500/30 ring-1 ring-emerald-500/20'
                  : 'bg-emerald-50/60 border-emerald-300/80'
                : isDark
                ? 'bg-slate-950/60 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span
                  className={`h-6 w-6 rounded-lg text-white text-xs font-black flex items-center justify-center shadow-xs ${
                    isDeviceRecentlyActive ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                >
                  3
                </span>
                <span className="font-extrabold text-sm tracking-tight">
                  Real-Time Handshake Status
                </span>
              </div>

              {/* Status Pill */}
              <div className="flex items-center space-x-2">
                {isDeviceRecentlyActive ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Device Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Radio className="h-3 w-3 animate-pulse text-amber-400" />
                    <span>Listening for Pings</span>
                  </span>
                )}
              </div>
            </div>

            {/* Radar / Device Info Card */}
            {isDeviceRecentlyActive ? (
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black flex items-center space-x-1.5">
                      <span>{latestBeacon?.device || 'Android Device'}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/10 text-cyan-400 font-mono">
                        v{latestBeacon?.version || '1.0.0'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[280px]">
                      {latestBeacon?.action || 'Mobile app active · Checking update'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <span className="text-[11px] font-mono text-slate-400 mr-2">
                    {latestBeacon?.time || 'Just now'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSendTestPing}
                    disabled={testSending}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      testSentSuccess
                        ? 'bg-emerald-500 text-white'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-xs'
                    }`}
                  >
                    {testSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : testSentSuccess ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>{testSentSuccess ? 'Alert Delivered!' : 'Ping Device'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`p-4 rounded-xl border text-center ${
                  isDark
                    ? 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex justify-center mb-2">
                  <div className="relative flex items-center justify-center h-10 w-10">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-30"></span>
                    <Radio className="h-6 w-6 text-cyan-400" />
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-300">
                  Waiting for initial mobile app launch...
                </div>
                <div className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Once you place <code className="text-cyan-400">codepush.json</code> in your project and run your app, it will connect automatically.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200/20 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Encrypted edge handshake via Firebase RTDB</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
