import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { Platform } from '../types';
import { calculateFileHash, calculateTextHash } from '../utils/crypto';
import {
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  Send,
  Smartphone,
  Apple,
  Sliders,
  FileText,
  ShieldCheck,
  Zap,
  Radio,
  Sparkles,
  Layers
} from 'lucide-react';

interface Props {
  onPublish: (releaseData: {
    platform: Platform;
    version: string;
    mandatory: boolean;
    releaseNotes: string;
    fileName: string;
    hash?: string;
    sizeBytes?: number;
  }) => void;
  theme?: 'dark' | 'light';
}

export const BundleUploader: React.FC<Props> = ({ onPublish, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [activePublishTab, setActivePublishTab] = useState<'quick' | 'advanced' | 'channels'>('quick');
  const [platform, setPlatform] = useState<Platform>('android');
  const [targetAppVersion, setTargetAppVersion] = useState('1.0.0');
  const [bundleVersion, setBundleVersion] = useState('1.0.1');
  const [environment, setEnvironment] = useState<'production' | 'staging'>('production');
  const [rolloutPercentage, setRolloutPercentage] = useState<number>(100);
  const [mandatory, setMandatory] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      try {
        const computedHash = await calculateFileHash(file);
        setFileHash(computedHash);
      } catch (err) {
        console.error('Failed to calculate SHA256:', err);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/zip': ['.zip'] },
    maxFiles: 1,
  });

  const applyTemplate = (templateText: string) => {
    setReleaseNotes((prev) => (prev ? `${prev}\n• ${templateText}` : `• ${templateText}`));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalHash: string | undefined = fileHash || undefined;
    let sizeBytes = selectedFile ? selectedFile.size : 1024 * 150; // default ~150KB for generated bundle

    if (!finalHash) {
      if (selectedFile) {
        finalHash = await calculateFileHash(selectedFile);
      } else {
        finalHash = await calculateTextHash(`${platform}-v${bundleVersion}-${Date.now()}`);
      }
    }

    onPublish({
      platform,
      version: bundleVersion,
      mandatory,
      releaseNotes: releaseNotes || 'Hotfix patch deployed via CodePush Console',
      fileName: selectedFile ? selectedFile.name : `${platform}-bundle-v${bundleVersion}.zip`,
      hash: finalHash,
      sizeBytes,
    });

    setIsSubmitting(false);
    setPublishedSuccess(true);
    setSelectedFile(null);
    setFileHash(null);
    setReleaseNotes('');
    setTimeout(() => setPublishedSuccess(false), 3500);
  };

  const cardBgClass = isDark
    ? 'border-slate-800 bg-slate-900/40 text-slate-100 shadow-xl'
    : 'border-cyan-300/90 bg-gradient-to-br from-cyan-100/95 via-sky-100/90 to-indigo-100/95 text-slate-900 shadow-xl shadow-cyan-500/10';

  const subBoxClass = isDark
    ? 'bg-slate-950/60 border-slate-800'
    : 'bg-sky-100/80 border-indigo-200';

  const inputBgClass = isDark
    ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500'
    : 'bg-sky-100/90 border-indigo-300 text-slate-900 focus:border-cyan-600 focus:bg-sky-50 shadow-xs';

  return (
    <div className="space-y-6">
      {/* Workspace Sub-Navigation Tabs */}
      <div className={`flex flex-wrap items-center justify-between border-b pb-4 gap-4 ${isDark ? 'border-slate-800' : 'border-indigo-200'}`}>
        <div className={`flex p-1.5 rounded-2xl border backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-gradient-to-r from-sky-100 via-indigo-100 to-purple-100 border-indigo-300 shadow-xs'}`}>
          <button
            type="button"
            onClick={() => setActivePublishTab('quick')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activePublishTab === 'quick'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-700 hover:text-slate-950 font-bold'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Quick Release</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePublishTab('advanced')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activePublishTab === 'advanced'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-700 hover:text-slate-950 font-bold'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Advanced Rollouts</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePublishTab('channels')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activePublishTab === 'channels'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-700 hover:text-slate-950 font-bold'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Deployment Channels</span>
          </button>
        </div>

        {/* Live Status Pill */}
        <div className={`flex items-center space-x-2 text-xs px-3 py-1.5 rounded-xl border ${isDark ? 'text-slate-400 bg-slate-900/50 border-slate-800' : 'text-slate-800 bg-sky-100 border-indigo-300 shadow-xs'}`}>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>CDN Target: <strong className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>Netlify Edge (Global)</strong></span>
        </div>
      </div>

      {/* TAB 1: QUICK RELEASE WORKSPACE */}
      {activePublishTab === 'quick' && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Card: Dropzone & Target Specs */}
          <div className={`lg:col-span-8 rounded-2xl border p-6 backdrop-blur-md space-y-6 ${cardBgClass}`}>
            {/* Platform Selector Cards */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-indigo-900'}`}>
                1. Select Platform
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPlatform('android')}
                  className={`p-4 rounded-xl border flex items-center space-x-3 transition-all ${
                    platform === 'android'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-700 shadow-lg shadow-emerald-500/10'
                      : isDark
                      ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      : 'bg-sky-100/80 border-indigo-200 text-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <Smartphone className="h-5 w-5" />
                  <div className="text-left">
                    <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Android</div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Target .APK / .AAB</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('ios')}
                  className={`p-4 rounded-xl border flex items-center space-x-3 transition-all ${
                    platform === 'ios'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-700 shadow-lg shadow-blue-500/10'
                      : isDark
                      ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      : 'bg-sky-100/80 border-indigo-200 text-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <Apple className="h-5 w-5" />
                  <div className="text-left">
                    <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>iOS</div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Target .IPA</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Drag & Drop Archive Area */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-indigo-900'}`}>
                2. Upload Bundle (.zip)
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-cyan-500 bg-cyan-500/10 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : isDark
                    ? 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                    : 'border-indigo-300 hover:border-indigo-400 bg-indigo-100/70'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <FileArchive className={`h-8 w-8 ${selectedFile ? 'text-emerald-500' : 'text-cyan-500'}`} />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-semibold text-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        <span>{selectedFile.name}</span>
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — Ready to sync
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        Drop compiled bundle <code className="text-cyan-500 font-mono">.zip</code> file here
                      </p>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>or click to browse from file system</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Version Numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Target App Version</label>
                <input
                  type="text"
                  value={targetAppVersion}
                  onChange={(e) => setTargetAppVersion(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none ${inputBgClass}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>New Bundle Version</label>
                <input
                  type="text"
                  value={bundleVersion}
                  onChange={(e) => setBundleVersion(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none ${inputBgClass}`}
                />
              </div>
            </div>

            {publishedSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center space-x-2 animate-bounce">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Published {platform.toUpperCase()} v{bundleVersion} to Netlify Edge!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl text-sm font-bold bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-xl shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-5 w-5" />
              <span>{isSubmitting ? 'Syncing to Netlify Edge...' : 'Deploy Hotfix Now'}</span>
            </button>
          </div>

          {/* Right Card: Quick Release Summary */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`rounded-2xl border p-6 backdrop-blur-md space-y-4 ${cardBgClass}`}>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-cyan-500" />
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Release Overview</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className={`p-3 rounded-xl border flex justify-between items-center ${subBoxClass}`}>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Target Platform:</span>
                  <span className={`font-bold uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>{platform}</span>
                </div>

                <div className={`p-3 rounded-xl border flex justify-between items-center ${subBoxClass}`}>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>New Version:</span>
                  <span className="font-mono text-cyan-500 font-bold">v{bundleVersion}</span>
                </div>

                <div className={`p-3 rounded-xl border flex justify-between items-center ${subBoxClass}`}>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Environment:</span>
                  <div className={`flex space-x-1 p-1 rounded-lg border text-[10px] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                    <button
                      type="button"
                      onClick={() => setEnvironment('production')}
                      className={`px-2 py-0.5 rounded font-semibold ${environment === 'production' ? 'bg-cyan-500 text-white' : isDark ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                      PROD
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnvironment('staging')}
                      className={`px-2 py-0.5 rounded font-semibold ${environment === 'staging' ? 'bg-amber-500 text-slate-950' : isDark ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                      STAGE
                    </button>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex justify-between items-center ${subBoxClass}`}>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Rollout Coverage:</span>
                  <span className="text-purple-500 font-semibold">{rolloutPercentage}% Devices</span>
                </div>
              </div>

              <div className={`pt-3 border-t text-[11px] flex items-center space-x-1.5 ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>SHA256 signature calculated automatically on upload.</span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: ADVANCED ROLLOUT WORKSPACE */}
      {activePublishTab === 'advanced' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rollout Slider & Target Environment */}
            <div className={`rounded-2xl border p-6 backdrop-blur-md space-y-4 ${cardBgClass}`}>
              <h3 className={`text-sm font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Sliders className="h-4 w-4 text-purple-500" />
                <span>Staged Rollout & Controls</span>
              </h3>

              <div className={`p-4 rounded-xl border space-y-2 ${subBoxClass}`}>
                <div className="flex justify-between text-xs">
                  <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Rollout Coverage</span>
                  <span className="font-mono text-cyan-500 font-bold">{rolloutPercentage}% of Users</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={rolloutPercentage}
                  onChange={(e) => setRolloutPercentage(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className={`flex items-center justify-between p-4 rounded-xl border ${subBoxClass}`}>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <span className={`text-xs font-semibold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Mandatory Patch</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Forces immediate app reload</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={mandatory}
                  onChange={(e) => setMandatory(e.target.checked)}
                  className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Release Notes & Templates */}
            <div className={`rounded-2xl border p-6 backdrop-blur-md space-y-4 ${cardBgClass}`}>
              <h3 className={`text-sm font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <FileText className="h-4 w-4 text-cyan-500" />
                <span>Release Notes & Changelog Templates</span>
              </h3>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('Critical bug fix for authentication flow')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}
                >
                  + Auth Fix
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('UI layout optimizations')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}
                >
                  + UI Patch
                </button>
              </div>

              <textarea
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="Enter custom release notes..."
                rows={4}
                className={`w-full rounded-xl p-3 text-sm font-mono focus:outline-none ${inputBgClass}`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl text-sm font-bold bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/20 cursor-pointer"
          >
            {isSubmitting ? 'Syncing Advanced Rollout...' : 'Deploy Advanced Staged Rollout'}
          </button>
        </form>
      )}

      {/* TAB 3: DEPLOYMENT CHANNELS */}
      {activePublishTab === 'channels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Production Channel Card */}
          <div className={`rounded-2xl border p-6 backdrop-blur-md space-y-4 ${cardBgClass}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radio className="h-5 w-5 text-emerald-500" />
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Production Channel</h3>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-semibold px-2 py-1 rounded border border-emerald-500/20">
                LIVE
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className={`p-3 rounded-xl border flex justify-between ${subBoxClass}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Android Active:</span>
                <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>v{bundleVersion}</span>
              </div>
              <div className={`p-3 rounded-xl border flex justify-between ${subBoxClass}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>iOS Active:</span>
                <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>v{bundleVersion}</span>
              </div>
            </div>
          </div>

          {/* Staging Channel Card */}
          <div className={`rounded-2xl border p-6 backdrop-blur-md space-y-4 ${cardBgClass}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="h-5 w-5 text-amber-500" />
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Staging Channel</h3>
              </div>
              <span className="text-[10px] bg-amber-500/10 text-amber-500 font-semibold px-2 py-1 rounded border border-amber-500/20">
                TESTING
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className={`p-3 rounded-xl border flex justify-between ${subBoxClass}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Android Staging:</span>
                <span className="font-mono text-amber-500 font-bold">v1.0.2-beta</span>
              </div>
              <div className={`p-3 rounded-xl border flex justify-between ${subBoxClass}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>iOS Staging:</span>
                <span className="font-mono text-amber-500 font-bold">v1.0.2-beta</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
