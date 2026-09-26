import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { Platform } from '../../types';
import { calculateFileHash, calculateTextHash } from '../../utils/crypto';
import { UploaderSkeleton } from '../../components/SkeletonLoader';
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
  UploadCloud,
  X,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Radio,
  Layers,
  Globe,
  Tag
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
  isLoading?: boolean;
}

export const BundleUploader: React.FC<Props> = ({ onPublish, theme = 'dark', isLoading = false }) => {
  const isDark = theme === 'dark';

  if (isLoading) {
    return <UploaderSkeleton theme={theme} />;
  }
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
  const [copiedHash, setCopiedHash] = useState(false);

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

  const clearSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setFileHash(null);
  };

  const copyHashToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileHash) {
      navigator.clipboard.writeText(fileHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const incrementVersion = (type: 'patch' | 'minor') => {
    const parts = bundleVersion.split('.').map((p) => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);

    if (type === 'patch') {
      parts[2] += 1;
    } else if (type === 'minor') {
      parts[1] += 1;
      parts[2] = 0;
    }
    setBundleVersion(parts.join('.'));
  };

  const applyTemplate = (templateText: string) => {
    setReleaseNotes((prev) => (prev ? `${prev}\n• ${templateText}` : `• ${templateText}`));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalHash: string | undefined = fileHash || undefined;
    let sizeBytes = selectedFile ? selectedFile.size : 1024 * 180;

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
    setTimeout(() => setPublishedSuccess(false), 4500);
  };

  // Styling Tokens
  const mainCardClass = isDark
    ? 'border-slate-800 bg-slate-900/80 backdrop-blur-xl text-slate-100 shadow-2xl shadow-black/40'
    : 'border-slate-200/90 bg-white/95 backdrop-blur-xl text-slate-900 shadow-xl shadow-cyan-950/5';

  const subBoxClass = isDark
    ? 'bg-slate-950/70 border-slate-800/80 text-slate-200'
    : 'bg-slate-50/90 border-slate-200 text-slate-800';

  const inputClass = isDark
    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 shadow-xs';

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Top Banner & Status Header */}
      <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${mainCardClass}`}>
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 shrink-0">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold tracking-tight">OTA Release Control Center</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 font-bold uppercase">
                v2.4 Engine
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Publish zero-downtime React Native JS bundles directly to active mobile devices
            </p>
          </div>
        </div>

        {/* Live Network & Edge Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center space-x-2 text-xs px-3 py-1.5 rounded-xl border ${isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
            <Globe className="h-3.5 w-3.5 text-cyan-500" />
            <span className="font-semibold">CDN Node:</span>
            <span className="font-mono text-cyan-400 font-bold">Netlify Edge</span>
          </div>
          <div className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-xl border ${isDark ? 'bg-slate-950/80 border-slate-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold">24ms Latency</span>
          </div>
        </div>
      </div>

      {/* Main Single-View Console Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Main Build Configuration (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card 1: Platform & Target Environment Cards */}
          <div className={`p-5 rounded-3xl border space-y-4 ${mainCardClass}`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800 border-slate-200">
              <label className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <Smartphone className="h-4 w-4 text-cyan-500" />
                <span>1. Platform & Environment Selection</span>
              </label>
              <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>React Native Core</span>
            </div>

            {/* Platform Visual Radio Cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlatform('android')}
                className={`p-3.5 rounded-2xl border flex items-center space-x-3 transition-all duration-200 cursor-pointer ${
                  platform === 'android'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-500/10'
                    : isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-950'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${platform === 'android' ? 'bg-emerald-500 text-white' : isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs">Android</div>
                  <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target .APK / .AAB</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('ios')}
                className={`p-3.5 rounded-2xl border flex items-center space-x-3 transition-all duration-200 cursor-pointer ${
                  platform === 'ios'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30 shadow-md shadow-blue-500/10'
                    : isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-950'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${platform === 'ios' ? 'bg-blue-500 text-white' : isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                  <Apple className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs">iOS</div>
                  <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target main.jsbundle</div>
                </div>
              </button>
            </div>

            {/* Target Channel Segment Switch */}
            <div className="pt-1">
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Deployment Channel
              </label>
              <div className={`grid grid-cols-2 p-1 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setEnvironment('production')}
                  className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    environment === 'production'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <Radio className="h-3.5 w-3.5" />
                  <span>Production Channel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEnvironment('staging')}
                  className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    environment === 'staging'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-amber-500/20'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Staging QA Channel</span>
                </button>
              </div>
            </div>

            {/* Version Numbers Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Target App Version (SemVer)
                </label>
                <input
                  type="text"
                  value={targetAppVersion}
                  onChange={(e) => setTargetAppVersion(e.target.value)}
                  placeholder="e.g. 1.0.0 or ^1.0.0"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono transition-all ${inputClass}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    New CodePush Version
                  </label>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => incrementVersion('patch')}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 text-cyan-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-cyan-600 hover:bg-slate-200'}`}
                    >
                      +Patch
                    </button>
                    <button
                      type="button"
                      onClick={() => incrementVersion('minor')}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 text-purple-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-purple-600 hover:bg-slate-200'}`}
                    >
                      +Minor
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={bundleVersion}
                  onChange={(e) => setBundleVersion(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono transition-all ${inputClass}`}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Interactive High-Tech Bundle Dropzone */}
          <div className={`p-5 rounded-3xl border space-y-3 ${mainCardClass}`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800 border-slate-200">
              <label className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <UploadCloud className="h-4 w-4 text-cyan-500" />
                <span>2. Upload Bundle Archive (.zip)</span>
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="text-xs text-rose-500 hover:text-rose-600 flex items-center space-x-1 font-semibold cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Remove File</span>
                </button>
              )}
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? 'border-cyan-500 bg-cyan-500/10 scale-[1.005]'
                  : selectedFile
                  ? 'border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10'
                  : isDark
                  ? 'border-slate-800 hover:border-cyan-500/50 bg-slate-950/50 hover:bg-slate-950/80'
                  : 'border-slate-300 hover:border-cyan-500/70 bg-slate-50/80 hover:bg-white'
              }`}
            >
              <input {...getInputProps()} />

              {selectedFile ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-500 shrink-0">
                      <FileArchive className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedFile.name}</span>
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for deployment
                      </p>
                    </div>
                  </div>

                  {fileHash && (
                    <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={copyHashToClipboard}
                        className={`w-full sm:w-auto px-3 py-1.5 rounded-xl border text-[11px] font-mono flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
                          isDark ? 'bg-slate-900 border-slate-800 text-cyan-400 hover:bg-slate-800' : 'bg-white border-slate-300 text-cyan-700 hover:bg-slate-100 shadow-2xs'
                        }`}
                        title="Copy SHA256 Hash"
                      >
                        {copiedHash ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-cyan-500" />}
                        <span>SHA256 Copy</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 py-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 shrink-0">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      Drop React Native compiled <code className="text-cyan-500 font-mono bg-cyan-500/10 px-2 py-0.5 rounded text-[11px]">.zip</code> bundle here
                    </p>
                    <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Includes index.android.bundle / main.jsbundle & assets
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Release Notes & Template Shortcuts */}
          <div className={`p-5 rounded-3xl border space-y-3 ${mainCardClass}`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800 border-slate-200">
              <label className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <FileText className="h-4 w-4 text-cyan-500" />
                <span>3. Release Notes & Changelog</span>
              </label>

              <div className="flex items-center space-x-1.5">
                <Tag className="h-3 w-3 text-slate-400" />
                <button
                  type="button"
                  onClick={() => applyTemplate('Critical bug fix for authentication flow')}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                >
                  + Auth Fix
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('UI layout optimizations')}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                >
                  + UI Patch
                </button>
              </div>
            </div>

            <textarea
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="Provide concise release notes for QA & hotfix tracking..."
              rows={3}
              className={`w-full rounded-2xl p-3 text-xs font-mono focus:outline-none transition-all ${inputClass}`}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Rollout Controls & Sticky Action Button (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Card 4: Rollout Percentage & Mandatory Switch */}
          <div className={`p-5 rounded-3xl border space-y-4 ${mainCardClass}`}>
            <div className="flex items-center space-x-2 border-b pb-3 dark:border-slate-800 border-slate-200">
              <Sliders className="h-4 w-4 text-purple-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Staged Rollout Controls</h3>
            </div>

            {/* Slider */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${subBoxClass}`}>
              <div className="flex justify-between items-center text-xs">
                <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Rollout Coverage:</span>
                <span className="font-mono text-cyan-400 font-extrabold">{rolloutPercentage}% Active Devices</span>
              </div>

              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={rolloutPercentage}
                onChange={(e) => setRolloutPercentage(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
              />

              <div className="flex justify-between gap-1.5 pt-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setRolloutPercentage(pct)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                      rolloutPercentage === pct
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-2xs'
                        : isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Mandatory Hotfix Switch */}
            <div className={`flex items-center justify-between p-4 rounded-2xl border ${subBoxClass}`}>
              <div className="flex items-center space-x-3 pr-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <span className={`text-xs font-bold block ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Mandatory Update</span>
                  <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Forces immediate JS runtime reload</span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={mandatory}
                  onChange={(e) => setMandatory(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Card 5: Deployment Overview Summary */}
          <div className={`p-5 rounded-3xl border space-y-3.5 ${mainCardClass}`}>
            <div className="flex items-center space-x-2 border-b pb-3 dark:border-slate-800 border-slate-200">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Release Pre-Flight Summary</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className={`p-3 rounded-2xl border flex justify-between items-center ${subBoxClass}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Platform & Version:</span>
                <span className={`font-mono font-extrabold uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {platform} v{bundleVersion}
                </span>
              </div>

              <div className={`p-3 rounded-2xl border flex justify-between items-center ${subBoxClass}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Target Channel:</span>
                <span className={`font-bold uppercase text-[10px] px-2.5 py-0.5 rounded-full ${environment === 'production' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'}`}>
                  {environment}
                </span>
              </div>
            </div>

            <div className={`pt-2 border-t text-[11px] flex items-center space-x-2 ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>WebCrypto SHA256 signature calculated automatically</span>
            </div>
          </div>

          {/* Published Celebration Toast */}
          {publishedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-3 shadow-lg shadow-emerald-500/10 animate-bounce">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
              <div>
                <p className="font-extrabold text-sm">Release Deployed Live!</p>
                <p className="text-[11px] opacity-90">{platform.toUpperCase()} v{bundleVersion} deployed to Netlify Edge CDN.</p>
              </div>
            </div>
          )}

          {/* Action CTA Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2.5 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Syncing Bundle to CDN...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Deploy Hotfix Release Now</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
