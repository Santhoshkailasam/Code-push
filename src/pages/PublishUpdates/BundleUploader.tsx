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
  UploadCloud,
  X,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Radio,
  Layers,
  ArrowRight,
  ArrowLeft,
  Terminal,
  Info,
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

  // Active Wizard Step (1: Platform & Target, 2: Bundle Upload, 3: Rollout & Deploy)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
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
  const [showCliSnippet, setShowCliSnippet] = useState(false);

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

  const generateMockBundle = async () => {
    const mockFileName = `${platform}-bundle-v${bundleVersion}.zip`;
    const computedHash = await calculateTextHash(`${platform}-v${bundleVersion}-${Date.now()}`);
    setSelectedFile(new File(['mock-bundle-content'], mockFileName, { type: 'application/zip' }));
    setFileHash(computedHash);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    let finalHash: string | undefined = fileHash || undefined;
    const sizeBytes = selectedFile ? selectedFile.size : 1024 * 180;

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
  };

  const resetWizard = () => {
    setPublishedSuccess(false);
    setCurrentStep(1);
  };

  // Ultra-Premium Styling Tokens for Dark & Light Mode
  const mainCardClass = isDark
    ? 'border-slate-800 bg-slate-900/90 text-slate-100 shadow-xl relative overflow-hidden'
    : 'border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/60 relative overflow-hidden';

  const subBoxClass = isDark
    ? 'bg-slate-950/80 border-slate-800 text-slate-200'
    : 'bg-slate-50/90 border-slate-200 text-slate-900';

  const inputClass = isDark
    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-2xs';

  const stepsInfo = [
    { number: 1, title: 'Target & Platform', subtitle: 'OS, Channel & SemVer', icon: Smartphone },
    { number: 2, title: 'Bundle Asset', subtitle: 'Upload Zip & SHA256', icon: UploadCloud },
    { number: 3, title: 'Rollout & Deploy', subtitle: 'Staging & Final Push', icon: Send },
  ];

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Stepper Progress Bar Header Card */}
      <div className={`p-4 rounded-3xl border ${mainCardClass}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
          {stepsInfo.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.number;
            const isActive = currentStep === step.number;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => {
                  if (isCompleted || step.number < currentStep) {
                    setCurrentStep(step.number as 1 | 2 | 3);
                  }
                }}
                disabled={!isCompleted && !isActive && step.number > currentStep}
                className={`flex items-center space-x-3.5 p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                  isActive
                    ? isDark
                      ? 'bg-cyan-500/10 border-cyan-500/80 ring-2 ring-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10'
                      : 'bg-cyan-50/70 border-cyan-400 text-cyan-950 ring-2 ring-cyan-400/20 shadow-md shadow-cyan-500/10'
                    : isCompleted
                    ? isDark
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer'
                      : 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100/70 cursor-pointer shadow-2xs'
                    : isDark
                    ? 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-70'
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                    isActive
                      ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/25'
                      : isCompleted
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xs'
                      : isDark
                      ? 'bg-slate-900 text-slate-400'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5 stroke-[3]" /> : <Icon className="h-4 w-4" />}
                </div>

                <div className="min-w-0">
                  <div
                    className={`text-xs font-black truncate ${
                      isActive
                        ? isDark
                          ? 'text-cyan-400'
                          : 'text-slate-900'
                        : isCompleted
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-900 font-extrabold'
                        : isDark
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  >
                    Step {step.number}: {step.title}
                  </div>
                  <div
                    className={`text-[11px] font-medium truncate ${
                      isActive
                        ? isDark
                          ? 'text-cyan-400/80'
                          : 'text-cyan-700 font-bold'
                        : isCompleted
                        ? isDark
                          ? 'text-emerald-400/80'
                          : 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Celebration Screen */}
      {publishedSuccess ? (
        <div className={`p-8 sm:p-10 rounded-3xl border text-center space-y-6 ${mainCardClass}`}>
          <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/20 animate-bounce">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
              Release Deployed Successfully!
            </h3>
            <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <span className="font-extrabold uppercase font-mono">{platform} v{bundleVersion}</span> has been published to Netlify Edge CDN and is live for connected mobile clients.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border max-w-lg mx-auto space-y-3 text-left text-xs ${subBoxClass}`}>
            <div className="flex justify-between border-b dark:border-slate-800 border-slate-200 pb-2">
              <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Environment:</span>
              <span className="font-black uppercase text-cyan-600 dark:text-cyan-400">{environment}</span>
            </div>
            <div className="flex justify-between border-b dark:border-slate-800 border-slate-200 pb-2">
              <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target Native App:</span>
              <span className="font-mono font-extrabold text-slate-900 dark:text-white">{targetAppVersion}</span>
            </div>
            <div className="flex justify-between border-b dark:border-slate-800 border-slate-200 pb-2">
              <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rollout Coverage:</span>
              <span className="font-mono font-extrabold text-cyan-600 dark:text-cyan-400">{rolloutPercentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mandatory Reload:</span>
              <span className={`font-black ${mandatory ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                {mandatory ? 'Yes (Forced Reload)' : 'No (Background)'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={resetWizard}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 cursor-pointer flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Deploy Another Release</span>
            </button>
          </div>
        </div>
      ) : (
        /* Wizard Steps Content Container */
        <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${mainCardClass}`}>
          {/* STEP 1: TARGET PLATFORM & VERSIONING */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn relative z-10">
              <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800 border-slate-100">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/20">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Step 1: Platform & Environment Selection
                    </h3>
                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Specify the target mobile OS, deployment channel, and binary version target.
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono px-3 py-1 rounded-full border font-bold ${isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'}`}>
                  1 of 3
                </span>
              </div>

              {/* Platform Radio Cards */}
              <div className="space-y-3">
                <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Target Operating System
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPlatform('android')}
                    className={`p-5 rounded-3xl border flex items-center space-x-4 transition-all duration-200 cursor-pointer ${
                      platform === 'android'
                        ? isDark
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/30 shadow-md'
                          : 'bg-emerald-50/50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/30 shadow-md'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    <div className={`p-3 rounded-2xl ${platform === 'android' ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md' : isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <div className={`font-black text-sm ${platform === 'android' ? (isDark ? 'text-emerald-400' : 'text-emerald-950') : (isDark ? 'text-slate-200' : 'text-slate-900')}`}>
                        Android OS
                      </div>
                      <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Targets APK / AAB binary updates
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlatform('ios')}
                    className={`p-5 rounded-3xl border flex items-center space-x-4 transition-all duration-200 cursor-pointer ${
                      platform === 'ios'
                        ? isDark
                          ? 'bg-blue-500/10 border-blue-500 text-blue-400 ring-2 ring-blue-500/30 shadow-md'
                          : 'bg-blue-50/50 border-blue-400 text-blue-950 ring-2 ring-blue-400/30 shadow-md'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    <div className={`p-3 rounded-2xl ${platform === 'ios' ? 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-md' : isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                      <Apple className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <div className={`font-black text-sm ${platform === 'ios' ? (isDark ? 'text-blue-400' : 'text-blue-950') : (isDark ? 'text-slate-200' : 'text-slate-900')}`}>
                        iOS Platform
                      </div>
                      <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Targets main.jsbundle release target
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Environment Channel Switch */}
              <div className="space-y-3">
                <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Deployment Channel
                </label>
                <div className={`grid grid-cols-2 p-1.5 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setEnvironment('production')}
                    className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      environment === 'production'
                        ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/25'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Radio className="h-4 w-4" />
                    <span>Production Channel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvironment('staging')}
                    className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      environment === 'staging'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Staging QA Channel</span>
                  </button>
                </div>
              </div>

              {/* Version Numbers Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className={`block text-xs font-extrabold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Target Native App Version (SemVer)
                  </label>
                  <input
                    type="text"
                    value={targetAppVersion}
                    onChange={(e) => setTargetAppVersion(e.target.value)}
                    placeholder="e.g. 1.0.0 or ^1.0.0"
                    className={`w-full rounded-2xl px-4 py-3.5 text-xs font-mono font-bold transition-all ${inputClass}`}
                  />
                  <p className={`text-[11px] mt-1.5 font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Only native binaries matching this SemVer rule will download this patch.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`block text-xs font-extrabold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      New CodePush Version
                    </label>
                    <div className="flex space-x-1.5">
                      <button
                        type="button"
                        onClick={() => incrementVersion('patch')}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border font-extrabold transition-all cursor-pointer ${
                          isDark ? 'bg-slate-950 border-slate-800 text-cyan-400 hover:bg-slate-800' : 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100'
                        }`}
                      >
                        +Patch
                      </button>
                      <button
                        type="button"
                        onClick={() => incrementVersion('minor')}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border font-extrabold transition-all cursor-pointer ${
                          isDark ? 'bg-slate-950 border-slate-800 text-purple-400 hover:bg-slate-800' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        +Minor
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={bundleVersion}
                    onChange={(e) => setBundleVersion(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-3.5 text-xs font-mono font-bold transition-all ${inputClass}`}
                  />
                  <p className={`text-[11px] mt-1.5 font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Incremental version string attached to the release hash.
                  </p>
                </div>
              </div>

              {/* Step 1 Next Button */}
              <div className="pt-4 border-t dark:border-slate-800 border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
                >
                  <span>Proceed to Bundle Upload</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: BUNDLE ARCHIVE UPLOAD */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn relative z-10">
              <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800 border-slate-100">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/20">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Step 2: Upload Bundle Archive (.zip)
                    </h3>
                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Upload your compiled React Native bundle zip package.
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono px-3 py-1 rounded-full border font-bold ${isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'}`}>
                  2 of 3
                </span>
              </div>

              {/* Dropzone Box */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-cyan-500 bg-cyan-500/10 scale-[1.005]'
                    : selectedFile
                    ? isDark
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-emerald-400 bg-emerald-50/50 text-emerald-950 shadow-sm'
                    : isDark
                    ? 'border-slate-800 hover:border-cyan-500/50 bg-slate-950/50 hover:bg-slate-950/80'
                    : 'border-slate-200 hover:border-cyan-400 bg-slate-50/60 hover:bg-white shadow-xs'
                }`}
              >
                <input {...getInputProps()} />

                {selectedFile ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shrink-0">
                        <FileArchive className="h-8 w-8" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className={`text-sm font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedFile.name}</span>
                        </div>
                        <p className={`text-xs mt-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for deployment
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
                      {fileHash && (
                        <button
                          type="button"
                          onClick={copyHashToClipboard}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
                            isDark ? 'bg-slate-900 border-slate-800 text-cyan-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-cyan-800 hover:bg-slate-50 shadow-2xs'
                          }`}
                        >
                          {copiedHash ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-cyan-600" />}
                          <span>SHA256 Copy</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={clearSelectedFile}
                        className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                        title="Remove File"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 space-y-3">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25">
                      <UploadCloud className="h-7 w-7" />
                    </div>
                    <div>
                      <p className={`text-sm font-extrabold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        Drag & drop React Native compiled <code className="text-cyan-600 dark:text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded text-xs font-bold">.zip</code> archive here
                      </p>
                      <p className={`text-xs mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Includes {platform === 'android' ? 'index.android.bundle' : 'main.jsbundle'} and associated image assets
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="text-xs px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-extrabold inline-block shadow-md hover:scale-105 transition-all">
                        Browse Computer Files
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* CLI Command Generator & Quick Sample Button */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${subBoxClass}`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center space-x-2 text-xs font-extrabold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    <Terminal className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Bundle Generation Helper</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowCliSnippet(!showCliSnippet)}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1 cursor-pointer font-mono font-bold"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span>{showCliSnippet ? 'Hide CLI Command' : 'View CLI Command'}</span>
                    </button>

                    {!selectedFile && (
                      <button
                        type="button"
                        onClick={generateMockBundle}
                        className={`text-[11px] px-3 py-1 rounded-xl border font-bold transition-all cursor-pointer ${
                          isDark
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
                            : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 shadow-2xs'
                        }`}
                      >
                        ⚡ Use Sample Test Bundle
                      </button>
                    )}
                  </div>
                </div>

                {showCliSnippet && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto space-y-1">
                    <div className="text-slate-500">// Run in your React Native project root:</div>
                    <div>
                      {platform === 'android'
                        ? 'npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output index.android.bundle --assets-dest ./build_assets && zip -r bundle.zip index.android.bundle build_assets'
                        : 'npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output main.jsbundle --assets-dest ./build_assets && zip -r bundle.zip main.jsbundle build_assets'}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Actions */}
              <div className="pt-4 border-t dark:border-slate-800 border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                    isDark ? 'bg-slate-950 text-slate-300 hover:bg-slate-900 border border-slate-800' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Target</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedFile) {
                      generateMockBundle();
                    }
                    setCurrentStep(3);
                  }}
                  className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
                >
                  <span>Proceed to Rollout Controls</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ROLLOUT & DEPLOYMENT */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn relative z-10">
              <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800 border-slate-100">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/20">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Step 3: Rollout Strategy & Deployment
                    </h3>
                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Set target device percentage, release notes, and publish to CDN.
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono px-3 py-1 rounded-full border font-bold ${isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'}`}>
                  3 of 3
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: Rollout Slider & Mandatory Switch */}
                <div className="space-y-5">
                  <div className={`p-5 rounded-2xl border space-y-4 ${subBoxClass}`}>
                    <div className="flex items-center space-x-2">
                      <Sliders className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Staged Rollout Coverage
                      </h4>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Rollout Percentage:</span>
                        <span className="font-mono text-cyan-600 dark:text-cyan-400 font-extrabold text-sm">{rolloutPercentage}% Active Devices</span>
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

                      <div className="flex justify-between gap-2 pt-1">
                        {[25, 50, 75, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setRolloutPercentage(pct)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                              rolloutPercentage === pct
                                ? isDark
                                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-600 shadow-xs'
                                : isDark
                                ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 shadow-2xs'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mandatory Switch */}
                  <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? subBoxClass : 'bg-amber-50/70 border-amber-200 text-amber-950 shadow-2xs'}`}>
                    <div className="flex items-center space-x-3 pr-2">
                      <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <span className={`text-xs font-extrabold block ${isDark ? 'text-slate-200' : 'text-slate-950'}`}>Mandatory Update</span>
                        <span className={`text-[11px] font-medium block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Forces immediate JS runtime reload on app restart</span>
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

                  {/* Release Notes */}
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${subBoxClass}`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-extrabold uppercase tracking-wider flex items-center space-x-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        <span>Changelog Notes</span>
                      </label>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => applyTemplate('Critical auth hotfix')}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100 shadow-2xs'}`}
                        >
                          + Auth Fix
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate('UI layout optimizations')}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100 shadow-2xs'}`}
                        >
                          + UI Patch
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={releaseNotes}
                      onChange={(e) => setReleaseNotes(e.target.value)}
                      placeholder="Enter release notes for QA & developers..."
                      rows={3}
                      className={`w-full rounded-xl p-3.5 text-xs font-mono font-medium focus:outline-none transition-all ${inputClass}`}
                    />
                  </div>
                </div>

                {/* Right Side: Pre-Flight Confirmation Card */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${subBoxClass}`}>
                    <div className="flex items-center space-x-2 border-b pb-3 dark:border-slate-800 border-slate-200">
                      <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Release Pre-Flight Verification
                      </h4>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1 border-b dark:border-slate-800/60 border-slate-200">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target OS:</span>
                        <span className={`font-mono font-bold uppercase flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {platform === 'android' ? <Smartphone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Apple className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                          <span>{platform}</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b dark:border-slate-800/60 border-slate-200">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target App SemVer:</span>
                        <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{targetAppVersion}</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b dark:border-slate-800/60 border-slate-200">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CodePush Version:</span>
                        <span className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-sm">v{bundleVersion}</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b dark:border-slate-800/60 border-slate-200">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target Channel:</span>
                        <span className={`font-bold uppercase text-[10px] px-3 py-0.5 rounded-full ${environment === 'production' ? 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-400 border border-cyan-500/30' : 'bg-amber-500/15 text-amber-900 dark:text-amber-400 border border-amber-500/30'}`}>
                          {environment}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b dark:border-slate-800/60 border-slate-200">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Bundle File:</span>
                        <span className={`font-mono font-bold truncate max-w-[180px] ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
                          {selectedFile ? selectedFile.name : `${platform}-bundle-v${bundleVersion}.zip`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SHA256 Signature:</span>
                        <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {fileHash ? `${fileHash.slice(0, 10)}...${fileHash.slice(-6)}` : 'Auto-Calculated'}
                        </span>
                      </div>
                    </div>

                    <div className={`pt-2 border-t dark:border-slate-800 border-slate-200 text-[11px] flex items-center space-x-2 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>WebCrypto SHA256 integrity signature attached</span>
                    </div>
                  </div>

                  {/* Main Deploy Action Button */}
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2.5 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Publishing to Netlify Edge CDN...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Deploy Hotfix Release Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="pt-4 border-t dark:border-slate-800 border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                    isDark ? 'bg-slate-950 text-slate-300 hover:bg-slate-900 border border-slate-800' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Bundle Upload</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BundleUploader;
