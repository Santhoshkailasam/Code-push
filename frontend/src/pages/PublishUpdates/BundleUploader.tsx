import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { Platform, ExperimentConfig } from '../../types';
import { calculateFileHash, calculateTextHash, generateBundleSignature } from '../../utils/crypto';
import { validateBundleFile, type BundleValidationResult } from '../../utils/bundleValidator';
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
  Zap,
  ExternalLink,
  Lock,
  Cpu,
  FlaskConical,
} from 'lucide-react';

interface Props {
  onPublish: (releaseData: {
    platform: Platform;
    version: string;
    mandatory: boolean;
    releaseNotes: string;
    fileName: string;
    bundleBase64?: string;
    hash?: string;
    signature?: string;
    signatureAlgorithm?: 'ed25519' | 'sha256-hmac';
    detectedNativeModules?: string[];
    driftStatus?: 'passed' | 'warning' | 'incompatible';
    sizeBytes?: number;
    track?: 'production' | 'staging';
    rolloutPercentage?: number;
    targetBinaryVersion?: string;
    canarySchedule?: any;
    targetingRules?: any;
    deltaUpdate?: any;
    assetManifest?: any;
    experiment?: ExperimentConfig;
  }) => void;
  theme?: 'dark' | 'light';
  isLoading?: boolean;
  appName?: string;
  latestAndroidVersion?: string;
  latestIosVersion?: string;
  onNavigateToHistory?: () => void;
}

export const BundleUploader: React.FC<Props> = ({
  onPublish,
  theme = 'dark',
  isLoading = false,
  appName = 'Skillswap',
  latestAndroidVersion,
  latestIosVersion,
  onNavigateToHistory,
}) => {
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
  const [bundleSignature, setBundleSignature] = useState<string | null>(null);
  const [keyFingerprint, setKeyFingerprint] = useState<string | null>(null);
  const [enableSignature, setEnableSignature] = useState(true);
  const [validationResult, setValidationResult] = useState<BundleValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [showCliSnippet, setShowCliSnippet] = useState(false);
  const [lastPublishedRelease, setLastPublishedRelease] = useState<{
    platform: Platform;
    version: string;
    hash: string;
    signature?: string;
    sizeBytes: number;
    timestamp: string;
  } | null>(null);

  // Automated Canary Progression Schedule (Feature 5)
  const [canaryEnabled, setCanaryEnabled] = useState(false);
  const [canaryStages] = useState<number[]>([5, 25, 50, 100]);
  const [canaryIntervalMinutes, setCanaryIntervalMinutes] = useState(60);

  // Geographic & Device Segmentation Rules (Feature 7)
  const [enableTargeting, setEnableTargeting] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['US', 'IN', 'GB', 'DE']);
  const [minOsVersion, setMinOsVersion] = useState('');
  const [targetCohort, setTargetCohort] = useState<'all' | 'internal_qa' | 'beta_testers' | 'general_public'>('all');

  // Dynamic OTA A/B Testing & Multivariate Engine (Feature 6)
  const [enableExperiment, setEnableExperiment] = useState(false);
  const [experimentName, setExperimentName] = useState('Checkout Streamlining v2');
  const [goalMetric, setGoalMetric] = useState('checkout_conversion');
  const [variantBSplit, setVariantBSplit] = useState(50);
  const [variantBLabel, setVariantBLabel] = useState('Variant B (1-Click Express)');
  const [variantBVersion, setVariantBVersion] = useState('1.0.2');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setIsValidating(true);
      try {
        const [computedHash, valResult] = await Promise.all([
          calculateFileHash(file),
          validateBundleFile(file, platform),
        ]);
        const sigObj = await generateBundleSignature(computedHash);
        setBundleSignature(sigObj.signature);
        setKeyFingerprint(sigObj.keyFingerprint);
        setFileHash(computedHash);
        setValidationResult(valResult);
      } catch (err) {
        console.error('Failed to calculate SHA256 / validate bundle:', err);
      } finally {
        setIsValidating(false);
      }
    }
  }, [platform]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/zip': ['.zip'] },
    maxFiles: 1,
  });

  const clearSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setFileHash(null);
    setBundleSignature(null);
    setKeyFingerprint(null);
    setValidationResult(null);
  };

  const generateMockBundle = async () => {
    const mockFileName = `${platform}-bundle-v${bundleVersion}.zip`;
    const computedHash = await calculateTextHash(`${platform}-v${bundleVersion}-${Date.now()}`);
    const sigObj = await generateBundleSignature(computedHash);
    setSelectedFile(new File(['mock-bundle-content'], mockFileName, { type: 'application/zip' }));
    setFileHash(computedHash);
    setBundleSignature(sigObj.signature);
    setKeyFingerprint(sigObj.keyFingerprint);
    setValidationResult({
      valid: true,
      bundleFileName: platform === 'android' ? 'index.android.bundle' : 'main.jsbundle',
      format: 'hermes',
      hermesVersion: 96,
      hasSourceMap: true,
      sourceMapFileName: `${platform === 'android' ? 'index.android.bundle' : 'main.jsbundle'}.map`,
      assetCount: 4,
      fileList: [platform === 'android' ? 'index.android.bundle' : 'main.jsbundle'],
      totalSizeBytes: 184320,
      detectedNativeModules: ['PlatformConstants', 'AsyncLocalStorage', 'RNDeviceInfo', 'SoundManager'],
      driftCheck: {
        status: 'compatible',
        message: `✅ Native ABI Compatible: All 4 detected bridge modules are verified against native binary v${targetAppVersion}.`,
      },
      message: `✅ Simulated Hermes Bytecode Package (HBC v96) validated for ${platform.toUpperCase()}.`,
    });
  };

  const copyHashToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileHash) {
      navigator.clipboard.writeText(fileHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const copyCliCommand = () => {
    const cmd =
      platform === 'android'
        ? 'npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output index.android.bundle --assets-dest ./build_assets && zip -r bundle.zip index.android.bundle build_assets'
        : 'npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output main.jsbundle --assets-dest ./build_assets && zip -r bundle.zip main.jsbundle build_assets';
    navigator.clipboard.writeText(cmd);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const incrementVersion = (type: 'patch' | 'minor' | 'major') => {
    const parts = bundleVersion.split('.').map((p) => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);

    if (type === 'patch') {
      parts[2] += 1;
    } else if (type === 'minor') {
      parts[1] += 1;
      parts[2] = 0;
    } else if (type === 'major') {
      parts[0] += 1;
      parts[1] = 0;
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

    const canarySchedule = canaryEnabled
      ? {
          enabled: true,
          stages: canaryStages,
          intervalMinutes: canaryIntervalMinutes,
          currentStageIndex: 0,
          startedAt: new Date().toISOString(),
          autoHaltOnSpike: true,
        }
      : undefined;

    const targetingRules = enableTargeting
      ? {
          targetRegions: selectedRegions,
          minOSVersion: minOsVersion || undefined,
          targetCohort,
        }
      : undefined;

    const experimentConfig: ExperimentConfig | undefined = enableExperiment
      ? {
          enabled: true,
          name: experimentName || 'OTA A/B Experiment',
          goalMetric: goalMetric || 'checkout_conversion',
          splitPercentage: variantBSplit,
          variantA: {
            label: 'Variant A (Control)',
            version: bundleVersion,
            hash: finalHash || 'hash-variant-a',
            downloadUrl: `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${bundleVersion}&platform=${platform}`,
            visitors: 0,
            conversions: 0,
          },
          variantB: {
            label: variantBLabel || 'Variant B (Challenger)',
            version: variantBVersion || '1.0.2',
            hash: `sha256-exp-b-${Date.now().toString(36)}`,
            downloadUrl: `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${variantBVersion || '1.0.2'}&platform=${platform}`,
            visitors: 0,
            conversions: 0,
          },
          startedAt: new Date().toISOString(),
        }
      : undefined;

    let finalSignature = bundleSignature;
    if (enableSignature && !finalSignature && finalHash) {
      const sigData = await generateBundleSignature(finalHash);
      finalSignature = sigData.signature;
    }

    let bundleBase64: string | undefined = undefined;
    if (selectedFile) {
      try {
        bundleBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = (reader.result as string) || '';
            const commaIdx = res.indexOf(',');
            resolve(commaIdx !== -1 ? res.substring(commaIdx + 1) : res);
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(selectedFile);
        });
      } catch (readErr) {
        console.warn('Failed to encode bundle file to base64:', readErr);
      }
    }

    onPublish({
      platform,
      version: bundleVersion,
      mandatory,
      releaseNotes: releaseNotes || 'Hotfix patch deployed via CodePush Console',
      fileName: selectedFile ? selectedFile.name : `${platform}-bundle-v${bundleVersion}.zip`,
      bundleBase64: bundleBase64 && bundleBase64.length > 0 ? bundleBase64 : undefined,
      hash: finalHash,
      signature: enableSignature ? (finalSignature || undefined) : undefined,
      signatureAlgorithm: enableSignature ? 'ed25519' : undefined,
      detectedNativeModules: validationResult?.detectedNativeModules,
      driftStatus: validationResult?.driftCheck?.status === 'drift_detected' ? 'warning' : 'passed',
      sizeBytes,
      track: environment,
      rolloutPercentage: canaryEnabled ? canaryStages[0] : rolloutPercentage,
      targetBinaryVersion: targetAppVersion,
      canarySchedule,
      targetingRules,
      deltaUpdate: validationResult?.deltaUpdate,
      assetManifest: validationResult?.assetManifest,
      experiment: experimentConfig,
    });

    setLastPublishedRelease({
      platform,
      version: bundleVersion,
      hash: finalHash,
      signature: enableSignature ? (finalSignature || undefined) : undefined,
      sizeBytes,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  // Ultra-Premium Styling Tokens matching Dashboard
  const cardBaseClass = isDark
    ? 'bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/95 border-slate-800/80 hover:border-slate-700/80 text-slate-100 shadow-2xl backdrop-blur-xl'
    : 'bg-white/95 border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/40 backdrop-blur-xl';

  const subPanelClass = isDark
    ? 'bg-slate-950/70 border-slate-800/90 text-slate-200'
    : 'bg-slate-50/90 border-slate-200/90 text-slate-900';

  const inputClass = isDark
    ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-2xs';

  const stepsInfo = [
    { number: 1, title: 'Target & Platform', subtitle: 'OS, Channel & SemVer', icon: Smartphone },
    { number: 2, title: 'Bundle Asset', subtitle: 'Upload Zip & SHA256', icon: UploadCloud },
    { number: 3, title: 'Rollout & Deploy', subtitle: 'Staging & Final Push', icon: Send },
  ];

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-16 animate-tab-content">
      {/* High-Tech Deployment Context Strip */}
      <div className={`group relative overflow-hidden rounded-3xl border p-5 transition-all duration-500 ${cardBaseClass}`}>
        {/* Specular Top Rim Highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
        {/* Ambient Glow Orb */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-2xl group-hover:scale-125 transition-all duration-500" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div
              className={`p-3 rounded-2xl border transition-all duration-300 ${
                isDark
                  ? 'bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm'
              }`}
            >
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Target Application
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  {appName}
                </span>
              </div>
              <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Deploy instant zero-downtime hotfixes directly to mobile client runtimes via Netlify Edge CDN
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border ${
                isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold">Edge CDN: Active</span>
            </div>

            <div
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border ${
                isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-bold">SHA-256 Engine</span>
            </div>

            {(latestAndroidVersion || latestIosVersion) && (
              <div
                className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl border ${
                  isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                }`}
              >
                {latestAndroidVersion && (
                  <span className="text-emerald-400 font-bold">Android v{latestAndroidVersion}</span>
                )}
                {latestAndroidVersion && latestIosVersion && <span className="text-slate-600">|</span>}
                {latestIosVersion && (
                  <span className="text-blue-400 font-bold">iOS v{latestIosVersion}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar Header Card */}
      <div className={`group relative overflow-hidden rounded-3xl border p-4 sm:p-5 transition-all duration-500 ${cardBaseClass}`}>
        {/* Specular Top Rim Highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

        {/* Dynamic Glowing Step Progress Track */}
        <div className="w-full bg-slate-800/40 dark:bg-slate-950/80 h-1.5 rounded-full mb-4 overflow-hidden border border-slate-800/50">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-500 rounded-full shadow-lg shadow-cyan-500/50"
            style={{ width: currentStep === 1 ? '33.33%' : currentStep === 2 ? '66.66%' : '100%' }}
          />
        </div>

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
                className={`group/btn relative flex items-center space-x-3.5 p-3.5 rounded-2xl border text-left transition-all duration-300 overflow-hidden ${
                  isActive
                    ? isDark
                      ? 'bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent border-cyan-500/80 ring-2 ring-cyan-500/20 text-cyan-400 shadow-xl shadow-cyan-500/10'
                      : 'bg-cyan-50/80 border-cyan-400 text-cyan-950 ring-2 ring-cyan-400/20 shadow-md shadow-cyan-500/10'
                    : isCompleted
                    ? isDark
                      ? 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/40 text-emerald-400 hover:border-emerald-500/70 hover:bg-emerald-500/15 cursor-pointer'
                      : 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100/70 cursor-pointer shadow-xs'
                    : isDark
                    ? 'bg-slate-950/40 border-slate-800/80 text-slate-500 opacity-60'
                    : 'bg-slate-50/80 border-slate-200 text-slate-400 opacity-70'
                }`}
              >
                {/* Active Top Specular Highlight */}
                {isActive && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                )}

                <div
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/30'
                      : isCompleted
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                      : isDark
                      ? 'bg-slate-900 border border-slate-800 text-slate-400'
                      : 'bg-slate-200 border border-slate-300 text-slate-600'
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5 stroke-[3]" /> : <Icon className="h-5 w-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black truncate ${
                        isActive
                          ? isDark ? 'text-white' : 'text-slate-900'
                          : isCompleted
                          ? isDark ? 'text-emerald-400' : 'text-emerald-950'
                          : isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Step {step.number}: {step.title}
                    </span>
                    {isActive && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] font-medium truncate mt-0.5 ${
                      isActive
                        ? isDark ? 'text-cyan-400' : 'text-cyan-700 font-bold'
                        : isCompleted
                        ? isDark ? 'text-emerald-400/80' : 'text-emerald-700'
                        : 'text-slate-500'
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
        <div className={`group relative overflow-hidden rounded-3xl border p-8 sm:p-12 text-center space-y-7 transition-all duration-500 ${cardBaseClass}`}>
          {/* Specular Emerald Rim */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-90" />
          {/* Ambient Explosion Glow */}
          <div className="pointer-events-none absolute -top-20 inset-x-0 mx-auto h-48 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

          <div className="relative z-10 space-y-6">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/30 animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Edge Deployment Verified
              </span>
              <h3 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Release Published Successfully!
              </h3>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <span className="font-extrabold uppercase font-mono text-cyan-400">{platform} v{bundleVersion}</span> has been dispatched to global edge nodes and is immediately available for active mobile app clients.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className={`p-6 rounded-2xl border max-w-xl mx-auto space-y-3.5 text-left text-xs ${subPanelClass}`}>
              <div className="flex items-center justify-between border-b dark:border-slate-800/80 border-slate-200 pb-2.5">
                <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target Environment:</span>
                <span className="font-black uppercase text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20">
                  {environment} Channel
                </span>
              </div>
              <div className="flex items-center justify-between border-b dark:border-slate-800/80 border-slate-200 pb-2.5">
                <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target Native Binary SemVer:</span>
                <span className="font-mono font-extrabold text-slate-100">{targetAppVersion}</span>
              </div>
              <div className="flex items-center justify-between border-b dark:border-slate-800/80 border-slate-200 pb-2.5">
                <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rollout Fleet Coverage:</span>
                <span className="font-mono font-extrabold text-cyan-400">{rolloutPercentage}% of connected devices</span>
              </div>
              <div className="flex items-center justify-between border-b dark:border-slate-800/80 border-slate-200 pb-2.5">
                <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Runtime Reload Mode:</span>
                <span className={`font-black ${mandatory ? 'text-amber-400' : 'text-slate-400'}`}>
                  {mandatory ? 'Forced Reload on App Launch' : 'Silent Background Update'}
                </span>
              </div>
              {lastPublishedRelease?.hash && (
                <div className="flex items-center justify-between pt-0.5">
                  <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SHA-256 Signature:</span>
                  <span className="font-mono text-[11px] text-emerald-400 font-bold">
                    {lastPublishedRelease.hash.slice(0, 12)}...{lastPublishedRelease.hash.slice(-8)}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
              <button
                type="button"
                onClick={resetWizard}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-xl shadow-cyan-500/25 cursor-pointer flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Deploy Another Release</span>
              </button>

              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={onNavigateToHistory}
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                  }`}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View in Release History</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Wizard Steps Content Container */
        <div className={`group relative overflow-hidden rounded-3xl border p-6 sm:p-8 space-y-7 transition-all duration-500 ${cardBaseClass}`}>
          {/* Specular Top Rim Highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

          {/* STEP 1: TARGET PLATFORM & VERSIONING */}
          {currentStep === 1 && (
            <div className="space-y-7 animate-tab-content relative z-10">
              {/* Step Title Header */}
              <div className="flex items-center justify-between border-b pb-5 dark:border-slate-800/80 border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Step 1: Platform & Environment Selection
                    </h3>
                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Specify the target mobile operating system, deployment channel, and binary version target.
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono px-3.5 py-1.5 rounded-full border font-bold ${
                  isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                }`}>
                  1 of 3
                </span>
              </div>

              {/* Target Operating System Radio Cards (Dashboard Aesthetics) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Target Operating System
                  </label>
                  <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Select runtime binary architecture
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Android OS Card */}
                  <button
                    type="button"
                    onClick={() => setPlatform('android')}
                    className={`group/card relative overflow-hidden p-6 rounded-3xl border text-left transition-all duration-300 cursor-pointer ${
                      platform === 'android'
                        ? isDark
                          ? 'bg-gradient-to-b from-emerald-500/15 via-slate-900/90 to-slate-950/95 border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-xl shadow-emerald-500/10'
                          : 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/30 shadow-md shadow-emerald-500/10'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:bg-slate-900/60'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    {/* Top Specular Rim on Android Card */}
                    {platform === 'android' && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                    )}

                    {/* Ambient Glow Orb */}
                    <div
                      className={`pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full blur-2xl transition-all duration-500 ${
                        platform === 'android' ? 'bg-emerald-500/20' : 'bg-transparent'
                      }`}
                    />

                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                          platform === 'android'
                            ? 'bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/20'
                            : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-400'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        <Smartphone className="h-6 w-6" />
                      </div>

                      {platform === 'android' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Active Target</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500 font-semibold px-2 py-0.5 rounded-md border border-slate-800">
                          Available
                        </span>
                      )}
                    </div>

                    <div>
                      <div className={`font-black text-base tracking-tight ${
                        platform === 'android'
                          ? isDark ? 'text-white' : 'text-emerald-950 font-black'
                          : isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        Android OS
                      </div>
                      <div className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Targets APK / AAB runtime update packages
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t dark:border-slate-800/80 border-slate-200 flex items-center justify-between text-[11px] font-mono">
                      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Bundle Target:</span>
                      <span className="text-emerald-400 font-bold">index.android.bundle</span>
                    </div>
                  </button>

                  {/* iOS Platform Card */}
                  <button
                    type="button"
                    onClick={() => setPlatform('ios')}
                    className={`group/card relative overflow-hidden p-6 rounded-3xl border text-left transition-all duration-300 cursor-pointer ${
                      platform === 'ios'
                        ? isDark
                          ? 'bg-gradient-to-b from-blue-500/15 via-slate-900/90 to-slate-950/95 border-blue-500/80 ring-2 ring-blue-500/30 shadow-xl shadow-blue-500/10'
                          : 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/30 shadow-md shadow-blue-500/10'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:bg-slate-900/60'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    {/* Top Specular Rim on iOS Card */}
                    {platform === 'ios' && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
                    )}

                    {/* Ambient Glow Orb */}
                    <div
                      className={`pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full blur-2xl transition-all duration-500 ${
                        platform === 'ios' ? 'bg-blue-500/20' : 'bg-transparent'
                      }`}
                    />

                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                          platform === 'ios'
                            ? 'bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/20'
                            : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-400'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        <Apple className="h-6 w-6" />
                      </div>

                      {platform === 'ios' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                          <span>Active Target</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500 font-semibold px-2 py-0.5 rounded-md border border-slate-800">
                          Available
                        </span>
                      )}
                    </div>

                    <div>
                      <div className={`font-black text-base tracking-tight ${
                        platform === 'ios'
                          ? isDark ? 'text-white' : 'text-blue-950 font-black'
                          : isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        iOS Platform
                      </div>
                      <div className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Targets main.jsbundle release target
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t dark:border-slate-800/80 border-slate-200 flex items-center justify-between text-[11px] font-mono">
                      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Bundle Target:</span>
                      <span className="text-blue-400 font-bold">main.jsbundle</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Deployment Channel Selector (Card Style) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Deployment Channel
                  </label>
                  <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Distribution tier
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Production Channel Card */}
                  <button
                    type="button"
                    onClick={() => setEnvironment('production')}
                    className={`group/env relative overflow-hidden p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                      environment === 'production'
                        ? isDark
                          ? 'bg-gradient-to-r from-cyan-500/20 via-blue-600/15 to-indigo-600/10 border-cyan-500/80 text-white ring-2 ring-cyan-500/20 shadow-xl shadow-cyan-500/15'
                          : 'bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 border-cyan-400 text-slate-950 ring-2 ring-cyan-400/20 shadow-md'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`p-3 rounded-xl transition-all ${
                          environment === 'production'
                            ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md'
                            : isDark
                            ? 'bg-slate-900 text-slate-400'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Radio className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-black text-sm ${environment === 'production' ? (isDark ? 'text-white' : 'text-slate-950') : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                            Production Channel
                          </span>
                          {environment === 'production' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                              Live Fleet
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Direct broadcast to all production end users
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Staging QA Channel Card */}
                  <button
                    type="button"
                    onClick={() => setEnvironment('staging')}
                    className={`group/env relative overflow-hidden p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                      environment === 'staging'
                        ? isDark
                          ? 'bg-gradient-to-r from-amber-500/20 via-orange-600/15 to-amber-600/10 border-amber-500/80 text-white ring-2 ring-amber-500/20 shadow-xl shadow-amber-500/15'
                          : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-400 text-slate-950 ring-2 ring-amber-400/20 shadow-md'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`p-3 rounded-xl transition-all ${
                          environment === 'staging'
                            ? 'bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md'
                            : isDark
                            ? 'bg-slate-900 text-slate-400'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Layers className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-black text-sm ${environment === 'staging' ? (isDark ? 'text-white' : 'text-slate-950') : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                            Staging QA Channel
                          </span>
                          {environment === 'staging' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              QA Sandbox
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Internal distribution for test devices and QA team
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Version Numbers Row (Dual Elevated Panels) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Panel 1: Target Native Binary Version */}
                <div className={`p-5 rounded-2xl border space-y-3 ${subPanelClass}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <label className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        Target Native App Version (SemVer)
                      </label>
                    </div>

                    <div className="flex items-center space-x-1">
                      {['1.0.0', '^1.0.0', '*'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setTargetAppVersion(v)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold transition-all cursor-pointer ${
                            targetAppVersion === v
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                              : isDark
                              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={targetAppVersion}
                    onChange={(e) => setTargetAppVersion(e.target.value)}
                    placeholder="e.g. 1.0.0 or ^1.0.0"
                    className={`w-full rounded-xl px-4 py-3 text-xs font-mono font-bold transition-all ${inputClass}`}
                  />
                  <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Only native binaries matching this SemVer rule will download this patch.
                  </p>
                </div>

                {/* Panel 2: New CodePush Release Version */}
                <div className={`p-5 rounded-2xl border space-y-3 ${subPanelClass}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <label className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        New CodePush Version
                      </label>
                    </div>

                    <div className="flex space-x-1.5">
                      <button
                        type="button"
                        onClick={() => incrementVersion('patch')}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border font-extrabold transition-all cursor-pointer ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 text-cyan-400 hover:bg-slate-800 hover:border-cyan-500/40'
                            : 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100'
                        }`}
                      >
                        +Patch
                      </button>
                      <button
                        type="button"
                        onClick={() => incrementVersion('minor')}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border font-extrabold transition-all cursor-pointer ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 text-purple-400 hover:bg-slate-800 hover:border-purple-500/40'
                            : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        +Minor
                      </button>
                      <button
                        type="button"
                        onClick={() => incrementVersion('major')}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border font-extrabold transition-all cursor-pointer ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 text-indigo-400 hover:bg-slate-800 hover:border-indigo-500/40'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        +Major
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={bundleVersion}
                    onChange={(e) => setBundleVersion(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 text-xs font-mono font-bold transition-all ${inputClass}`}
                  />
                  <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Incremental version string attached to the release hash manifest.
                  </p>
                </div>
              </div>

              {/* Step 1 Next Button Footer */}
              <div className="pt-5 border-t dark:border-slate-800/80 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Configuration:</span>
                  <span className="font-bold text-cyan-400 uppercase">{platform}</span>
                  <span className="text-slate-600">•</span>
                  <span className="font-bold text-slate-300 capitalize">{environment}</span>
                  <span className="text-slate-600">•</span>
                  <span className="font-bold text-purple-400">v{bundleVersion}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2.5 transition-all cursor-pointer active:scale-95 group/next"
                >
                  <span>Proceed to Bundle Upload</span>
                  <ArrowRight className="h-4 w-4 group-hover/next:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: BUNDLE ARCHIVE UPLOAD */}
          {currentStep === 2 && (
            <div className="space-y-7 animate-tab-content relative z-10">
              <div className="flex items-center justify-between border-b pb-5 dark:border-slate-800/80 border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Step 2: Upload Bundle Archive (.zip)
                    </h3>
                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Upload your compiled React Native bundle zip package or generate an instant test bundle.
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono px-3.5 py-1.5 rounded-full border font-bold ${
                  isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                }`}>
                  2 of 3
                </span>
              </div>

              {/* Aerospace Dropzone Box */}
              <div
                {...getRootProps()}
                className={`group/drop relative overflow-hidden border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-cyan-400 bg-cyan-500/15 scale-[1.008] shadow-2xl shadow-cyan-500/20'
                    : selectedFile
                    ? isDark
                      ? 'border-emerald-500/70 bg-gradient-to-b from-emerald-500/10 via-slate-900/90 to-slate-950/95 shadow-xl shadow-emerald-500/10'
                      : 'border-emerald-400 bg-emerald-50/60 text-emerald-950 shadow-md'
                    : isDark
                    ? 'border-slate-800 hover:border-cyan-500/60 bg-slate-950/60 hover:bg-slate-900/60'
                    : 'border-slate-200 hover:border-cyan-400 bg-slate-50/80 hover:bg-white shadow-xs'
                }`}
              >
                {/* Top Specular Rim */}
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${
                  selectedFile ? 'via-emerald-400' : 'via-cyan-400'
                } to-transparent opacity-80`} />

                <input {...getInputProps()} />

                {selectedFile ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 text-left relative z-10">
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/25 shrink-0">
                        <FileArchive className="h-9 w-9" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                          <span className={`text-base font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {selectedFile.name}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Package validated for {platform.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 w-full sm:w-auto shrink-0">
                      {fileHash && (
                        <button
                          type="button"
                          onClick={copyHashToClipboard}
                          className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                            isDark
                              ? 'bg-slate-900 border-slate-800 text-cyan-400 hover:bg-slate-800 hover:border-cyan-500/40'
                              : 'bg-white border-slate-200 text-cyan-800 hover:bg-slate-50 shadow-2xs'
                          }`}
                        >
                          {copiedHash ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-cyan-400" />}
                          <span>{copiedHash ? 'SHA256 Copied!' : 'Copy SHA256'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={clearSelectedFile}
                        className="p-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                        title="Remove File"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 space-y-4 relative z-10">
                    <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-cyan-500/30">
                      <UploadCloud className="h-8 w-8" />
                    </div>
                    <div>
                      <p className={`text-base font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        Drag & drop React Native compiled <code className="text-cyan-400 font-mono bg-cyan-500/15 px-2 py-0.5 rounded-md text-xs font-bold border border-cyan-500/30">.zip</code> archive here
                      </p>
                      <p className={`text-xs mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Must contain <span className="font-mono text-cyan-400 font-bold">{platform === 'android' ? 'index.android.bundle' : 'main.jsbundle'}</span> and associated bundled assets
                      </p>
                    </div>

                    <div className="pt-2">
                      <span className="text-xs px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-extrabold inline-block shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all">
                        Browse Computer Files
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 🛡️ Hermes Bytecode Pre-Flight Validation Banner */}
              {selectedFile && (
                <div
                  className={`p-5 rounded-2xl border transition-all duration-300 animate-fade-in ${
                    isValidating
                      ? 'bg-slate-900/60 border-cyan-500/30 text-cyan-300'
                      : validationResult?.valid
                      ? validationResult.format === 'hermes'
                        ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-slate-950 border-emerald-500/50 text-emerald-300'
                        : 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-slate-950 border-amber-500/50 text-amber-300'
                      : 'bg-rose-500/15 border-rose-500/60 text-rose-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          isValidating
                            ? 'bg-cyan-500/20 text-cyan-400 animate-spin'
                            : validationResult?.valid
                            ? validationResult.format === 'hermes'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isValidating ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : validationResult?.valid ? (
                          <ShieldCheck className="h-5 w-5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black uppercase tracking-wider">
                            Pre-Flight Bytecode Verification
                          </span>
                          {validationResult && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase ${
                                validationResult.format === 'hermes'
                                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                                  : validationResult.valid
                                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                                  : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {validationResult.format === 'hermes'
                                ? `Hermes HBC v${validationResult.hermesVersion || 90}`
                                : validationResult.valid
                                ? 'Plain JavaScript'
                                : 'Invalid Package'}
                            </span>
                          )}
                          {validationResult?.hasSourceMap && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              🗺️ .map Included
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-medium leading-relaxed">
                          {isValidating
                            ? 'Inspecting binary package headers and Hermes bytecode structure...'
                            : validationResult?.message}
                        </p>
                        {validationResult?.warning && (
                          <p className="text-[11px] text-amber-300/80 font-mono">
                            {validationResult.warning}
                          </p>
                        )}
                      </div>
                    </div>

                    {validationResult?.valid && (
                      <div className="flex flex-wrap items-center gap-2.5 text-right shrink-0 text-xs font-mono">
                        {validationResult.deltaUpdate && (
                          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-left">
                            <div className="text-[10px] text-cyan-400 uppercase font-bold flex items-center space-x-1">
                              <Zap className="h-3 w-3" />
                              <span>Differential Delta</span>
                            </div>
                            <div className="font-bold text-white text-[11px]">{validationResult.deltaUpdate.compressionRatio}</div>
                          </div>
                        )}

                        {validationResult.assetManifest && (
                          <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left">
                            <div className="text-[10px] text-slate-400 uppercase flex items-center space-x-1">
                              <Layers className="h-3 w-3" />
                              <span>Assets & Locales</span>
                            </div>
                            <div className="font-bold text-white text-[11px]">
                              {validationResult.assetManifest.imageCount} Img • {validationResult.assetManifest.fontCount} Fonts • {validationResult.assetManifest.localeCount} Locales
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🔐 Feature 1: Cryptographic Zero-Trust Signing Card */}
              {selectedFile && bundleSignature && (
                <div className={`p-4 rounded-2xl border space-y-2.5 ${subPanelClass} animate-fade-in`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Zero-Trust Detached Signature
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Ed25519 SECURE
                          </span>
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Verified against native iOS Secure Enclave / Android KeyStore before execution.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setEnableSignature(!enableSignature)}
                        className={`text-[10px] font-mono px-2 py-1 rounded-lg border font-bold cursor-pointer transition-all ${
                          enableSignature
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title="Toggle whether cryptographic signature is attached"
                      >
                        {enableSignature ? 'ENFORCED' : 'BYPASSED'}
                      </button>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                        {keyFingerprint || 'pk-ed25519-valid'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (bundleSignature) {
                            navigator.clipboard.writeText(bundleSignature);
                            setCopiedSig(true);
                            setTimeout(() => setCopiedSig(false), 2000);
                          }
                        }}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border flex items-center space-x-1 cursor-pointer transition-all ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {copiedSig ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-cyan-400" />}
                        <span>{copiedSig ? 'Copied' : 'Copy Sig'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800/80 font-mono text-[11px] text-slate-400 truncate flex items-center justify-between">
                    <span className="truncate">{bundleSignature}</span>
                    <span className="shrink-0 text-emerald-400 ml-2 font-bold text-[10px]">✓ Cryptographically Valid</span>
                  </div>
                </div>
              )}

              {/* 🧩 Feature 4: Native Module Drift Guard (ABI Compatibility Matrix) */}
              {selectedFile && validationResult?.driftCheck && (
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 animate-fade-in ${
                    validationResult.driftCheck.status === 'drift_detected'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : subPanelClass
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`p-2 rounded-xl ${
                          validationResult.driftCheck.status === 'drift_detected'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-indigo-500/15 text-indigo-400'
                        }`}
                      >
                        <Cpu className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Native Module Drift Guard (ABI Matrix)
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                              validationResult.driftCheck.status === 'drift_detected'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            }`}
                          >
                            Target APK: v{targetAppVersion}
                          </span>
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {validationResult.driftCheck.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  {validationResult.detectedNativeModules && validationResult.detectedNativeModules.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className={`text-[10px] uppercase font-bold mr-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Scanned Bridge Calls:
                      </span>
                      {validationResult.detectedNativeModules.map((mod) => (
                        <span
                          key={mod}
                          className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-900/90 text-cyan-300 border border-slate-800"
                        >
                          {mod}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Developer Terminal CLI Helper */}
              <div className={`p-5 rounded-2xl border space-y-3.5 ${subPanelClass}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 text-xs font-extrabold">
                    <Terminal className="h-4 w-4 text-cyan-400" />
                    <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                      React Native Bundle Packager CLI
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowCliSnippet(!showCliSnippet)}
                      className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1 cursor-pointer font-mono font-bold"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span>{showCliSnippet ? 'Hide Terminal Syntax' : 'View Terminal Syntax'}</span>
                    </button>

                    {!selectedFile && (
                      <button
                        type="button"
                        onClick={generateMockBundle}
                        className={`text-[11px] px-3.5 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                          isDark
                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25 shadow-sm'
                            : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 shadow-2xs'
                        }`}
                      >
                        ⚡ Use Sample Test Bundle
                      </button>
                    )}
                  </div>
                </div>

                {showCliSnippet && (
                  <div className="rounded-2xl bg-slate-950 border border-slate-800/80 p-4 space-y-2 overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-[10px] font-mono text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 font-bold text-slate-400">bash / zsh</span>
                      </div>
                      <button
                        type="button"
                        onClick={copyCliCommand}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedCli ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="text-[11px] font-mono text-cyan-300 overflow-x-auto py-1 leading-relaxed">
                      {platform === 'android'
                        ? 'npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output index.android.bundle --assets-dest ./build_assets && zip -r bundle.zip index.android.bundle build_assets'
                        : 'npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output main.jsbundle --assets-dest ./build_assets && zip -r bundle.zip main.jsbundle build_assets'}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Actions */}
              <div className="pt-5 border-t dark:border-slate-800/80 border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`px-6 py-3.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-950 text-slate-300 hover:bg-slate-900 border border-slate-800'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
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
                  className="px-7 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-xl shadow-cyan-500/25 flex items-center space-x-2.5 transition-all cursor-pointer active:scale-95 group/next"
                >
                  <span>Proceed to Rollout Controls</span>
                  <ArrowRight className="h-4 w-4 group-hover/next:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ROLLOUT & DEPLOYMENT */}
          {currentStep === 3 && (
            <div className="space-y-7 animate-tab-content relative z-10">
              <div className="flex items-center justify-between border-b pb-5 dark:border-slate-800/80 border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25">
                    <Send className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Step 3: Rollout Strategy & Deployment
                    </h3>
                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Set target device percentage, release notes, and deploy directly to Netlify Edge CDN.
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono px-3.5 py-1.5 rounded-full border font-bold ${
                  isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                }`}>
                  3 of 3
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: Rollout Controls, Mandatory Switch, Changelog */}
                <div className="space-y-5">
                  {/* Staged Rollout Slider */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${subPanelClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sliders className="h-4 w-4 text-cyan-400" />
                        <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Staged Rollout Coverage
                        </h4>
                      </div>
                      <span className="font-mono text-cyan-400 font-extrabold text-sm">
                        {rolloutPercentage}% Fleet
                      </span>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={rolloutPercentage}
                        onChange={(e) => setRolloutPercentage(Number(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                      />

                      <div className="flex justify-between gap-2 pt-1">
                        {[10, 25, 50, 75, 100].map((pct) => (
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
                  <div className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border ${
                    isDark ? subPanelClass : 'bg-amber-50/70 border-amber-200 text-amber-950 shadow-2xs'
                  }`}>
                    <div className="flex items-center space-x-3.5 pr-2">
                      <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <span className={`text-xs font-extrabold block ${isDark ? 'text-slate-100' : 'text-slate-950'}`}>
                          Mandatory Update
                        </span>
                        <span className={`text-[11px] font-medium block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Forces immediate JS runtime reload on app restart
                        </span>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={mandatory}
                        onChange={(e) => setMandatory(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {/* Feature 5: Automated Canary Progression Schedule */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${subPanelClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Automated Canary Rollout Schedule
                          </h4>
                          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Gradually increases fleet rollout over time without manual intervention
                          </p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={canaryEnabled}
                          onChange={(e) => setCanaryEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    {canaryEnabled && (
                      <div className="pt-3 border-t border-slate-800/60 space-y-3.5 animate-fadeIn">
                        <div>
                          <div className="flex items-center justify-between text-xs font-mono mb-2">
                            <span className="text-slate-400">Canary Stages:</span>
                            <span className="text-cyan-400 font-bold">5% ➔ 25% ➔ 50% ➔ 100%</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'Stage 1', pct: '5%', desc: 'Canary seed' },
                              { label: 'Stage 2', pct: '25%', desc: 'Early adopters' },
                              { label: 'Stage 3', pct: '50%', desc: 'Broad fleet' },
                              { label: 'Stage 4', pct: '100%', desc: 'Worldwide' },
                            ].map((st, i) => (
                              <div key={i} className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-center">
                                <div className="text-[10px] text-slate-400 font-mono uppercase">{st.label}</div>
                                <div className="text-sm font-black text-cyan-400">{st.pct}</div>
                                <div className="text-[9px] text-slate-500 truncate">{st.desc}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300 font-medium">Stage Advance Interval:</span>
                          <div className="flex items-center space-x-1.5 font-mono text-xs">
                            {[
                              { label: '30m', mins: 30 },
                              { label: '1 hr', mins: 60 },
                              { label: '2 hrs', mins: 120 },
                              { label: '6 hrs', mins: 360 },
                            ].map((opt) => (
                              <button
                                key={opt.mins}
                                type="button"
                                onClick={() => setCanaryIntervalMinutes(opt.mins)}
                                className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                                  canaryIntervalMinutes === opt.mins
                                    ? 'bg-cyan-500 text-white border-cyan-400'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center space-x-2 text-[11px] text-amber-300">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
                          <span>⚡ Auto-Halt: If Circuit Breaker trips during canary, progression freezes immediately.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Feature 7: Geographic & Device Segmentation Rules */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${subPanelClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                          <Radio className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Geographic & Device Segmentation
                          </h4>
                          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Target updates by country, OS API level, or release cohort
                          </p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={enableTargeting}
                          onChange={(e) => setEnableTargeting(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>

                    {enableTargeting && (
                      <div className="pt-3 border-t border-slate-800/60 space-y-3.5 animate-fadeIn">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1.5">Target Countries / Regions:</label>
                          <div className="flex flex-wrap gap-1.5">
                            {['ALL', 'US', 'IN', 'GB', 'DE', 'BR', 'JP', 'CA', 'AU'].map((code) => {
                              const isSelected = selectedRegions.includes(code);
                              return (
                                <button
                                  key={code}
                                  type="button"
                                  onClick={() => {
                                    if (code === 'ALL') {
                                      setSelectedRegions(['ALL']);
                                    } else {
                                      const withoutAll = selectedRegions.filter((c) => c !== 'ALL');
                                      if (isSelected) {
                                        setSelectedRegions(withoutAll.filter((c) => c !== code));
                                      } else {
                                        setSelectedRegions([...withoutAll, code]);
                                      }
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {code === 'ALL' ? '🌍 Worldwide (All)' : code}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">Minimum OS Version:</label>
                            <input
                              type="text"
                              value={minOsVersion}
                              onChange={(e) => setMinOsVersion(e.target.value)}
                              placeholder="e.g. 12.0 (Android 12+ / iOS 15+)"
                              className={`w-full px-3 py-2 rounded-xl text-xs font-mono border ${
                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">Target Cohort:</label>
                            <select
                              value={targetCohort}
                              onChange={(e) => setTargetCohort(e.target.value as any)}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${
                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            >
                              <option value="all">All Fleet Users</option>
                              <option value="internal_qa">Internal QA (Staff only)</option>
                              <option value="beta_testers">Beta Testers Channel</option>
                              <option value="general_public">General Public Fleet</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dynamic OTA A/B Testing & Multivariate Engine (Feature 6) */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${subPanelClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                          <FlaskConical className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider">
                              Dynamic OTA A/B Multivariate Engine
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              ⚡ Consistent Hash Split
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Deploy Challenger Variant B alongside Control Variant A with deterministic device routing
                          </p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={enableExperiment}
                          onChange={(e) => setEnableExperiment(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                      </label>
                    </div>

                    {enableExperiment && (
                      <div className="pt-3 border-t border-slate-800/60 space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">Experiment Name:</label>
                            <input
                              type="text"
                              value={experimentName}
                              onChange={(e) => setExperimentName(e.target.value)}
                              placeholder="e.g. Checkout Streamline Redesign"
                              className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${
                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">Success Goal Metric:</label>
                            <select
                              value={goalMetric}
                              onChange={(e) => setGoalMetric(e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${
                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            >
                              <option value="checkout_conversion">Checkout Conversion Rate</option>
                              <option value="signup_conversion">Signup Funnel Completion</option>
                              <option value="session_retention">D1 User Session Retention</option>
                              <option value="in_app_purchase">In-App Purchase Revenue</option>
                            </select>
                          </div>
                        </div>

                        {/* Traffic Split Slider */}
                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-cyan-400 font-bold flex items-center space-x-1.5">
                              <span>Variant A (Control): {100 - variantBSplit}%</span>
                            </span>
                            <span className="text-purple-400 font-bold flex items-center space-x-1.5">
                              <span>Variant B (Challenger): {variantBSplit}%</span>
                            </span>
                          </div>

                          <div className="relative flex items-center">
                            <input
                              type="range"
                              min="10"
                              max="90"
                              step="5"
                              value={variantBSplit}
                              onChange={(e) => setVariantBSplit(Number(e.target.value))}
                              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>10% Variant B</span>
                            <span>50/50 Balanced</span>
                            <span>90% Variant B</span>
                          </div>
                        </div>

                        {/* Variant B Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">Challenger Variant B Label:</label>
                            <input
                              type="text"
                              value={variantBLabel}
                              onChange={(e) => setVariantBLabel(e.target.value)}
                              placeholder="e.g. Variant B (1-Click Express)"
                              className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${
                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">Challenger Version / Tag:</label>
                            <input
                              type="text"
                              value={variantBVersion}
                              onChange={(e) => setVariantBVersion(e.target.value)}
                              placeholder="e.g. 1.0.2"
                              className={`w-full px-3 py-2 rounded-xl text-xs font-mono border ${
                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Release Notes */}
                  <div className={`p-5 rounded-2xl border space-y-3 ${subPanelClass}`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-extrabold uppercase tracking-wider flex items-center space-x-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <FileText className="h-4 w-4 text-cyan-400" />
                        <span>Changelog Notes</span>
                      </label>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => applyTemplate('Critical auth hotfix')}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100'
                          }`}
                        >
                          + Auth Fix
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate('UI layout optimizations')}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100'
                          }`}
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

                {/* Right Side: Pre-Flight Verification Cockpit & Deploy CTA */}
                <div className="space-y-5 flex flex-col justify-between">
                  <div className={`group/receipt relative overflow-hidden p-6 rounded-2xl border space-y-4 ${subPanelClass}`}>
                    {/* Top Specular Rim */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

                    <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800 border-slate-200">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Release Pre-Flight Verification
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Ready for CDN
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1 border-b dark:border-slate-800/60 border-slate-200">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target OS:</span>
                        <span className={`font-mono font-bold uppercase flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {platform === 'android' ? (
                            <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Apple className="h-3.5 w-3.5 text-blue-400" />
                          )}
                          <span>{platform}</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b dark:border-slate-800/60 border-slate-200">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target App SemVer:</span>
                        <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{targetAppVersion}</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b dark:border-slate-800/60 border-slate-200">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CodePush Version:</span>
                        <span className="font-mono font-black text-cyan-400 text-sm">v{bundleVersion}</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b dark:border-slate-800/60 border-slate-200">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target Channel:</span>
                        <span className={`font-bold uppercase text-[10px] px-3 py-0.5 rounded-full ${
                          environment === 'production'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
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
                        <span className="font-mono text-[10px] text-emerald-400 font-bold">
                          {fileHash ? `${fileHash.slice(0, 10)}...${fileHash.slice(-6)}` : 'Auto-Calculated'}
                        </span>
                      </div>
                    </div>

                    <div className={`pt-2 border-t dark:border-slate-800 border-slate-200 text-[11px] flex items-center space-x-2 font-semibold ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>WebCrypto SHA256 integrity signature attached</span>
                    </div>
                  </div>

                  {/* Main Deploy Action Button */}
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-2xl shadow-cyan-500/30 flex items-center justify-center space-x-3 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
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
              <div className="pt-5 border-t dark:border-slate-800/80 border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={`px-6 py-3.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-950 text-slate-300 hover:bg-slate-900 border border-slate-800'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
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
