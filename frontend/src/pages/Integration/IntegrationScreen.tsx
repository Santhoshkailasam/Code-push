import React, { useState, useEffect } from 'react';
import {
  Code2,
  Download,
  Copy,
  Check,
  Smartphone,
  Apple,
  GitBranch,
  BellRing,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  BookOpen,
  FileCode2,
  Terminal,
  ArrowRight,
  ArrowLeft,
  Sliders,
  Cpu,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { Project } from '../../types';
import { getCodePushServiceTemplate } from './templates/codePushServiceTemplate';
import { getPushNotificationServiceTemplate } from './templates/pushNotificationServiceTemplate';
import { getAndroidManifestTemplate, getAndroidManifestPermissionsSnippet } from './templates/androidManifestTemplate';

interface IntegrationScreenProps {
  theme?: 'dark' | 'light';
  currentProject?: Project;
  onNavigateToDocs?: () => void;
}

export const IntegrationScreen: React.FC<IntegrationScreenProps> = ({
  theme = 'dark',
  currentProject,
  onNavigateToDocs,
}) => {
  const isDark = theme === 'dark';

  // Wizard Step: 0 = Intro, 1 = Install, 2 = Config, 3 = Services, 4 = App.tsx, 5 = Verify
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Key masking visibility states (hidden by default to prevent credentials being openly visible)
  const [showAppId, setShowAppId] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Settings & Toggles
  const [pkgManager, setPkgManager] = useState<'npm' | 'yarn' | 'pnpm' | 'bun'>('npm');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Interactive Checklist (persisted per project)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
  });

  const activeApiKey = currentProject?.apiKey || 'cp_live_rCYp1a_mvdfs5j4_live_key';
  const activeAppId = currentProject?.id || 'app_rCYp1a_mvdfs5j4_w9dyc';
  const activeAppName = currentProject?.name || 'SkillSwap';

  // Load checklist from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`codepush_checklist_${activeAppId}`);
      if (saved) {
        setChecklist(JSON.parse(saved));
      }
    } catch {}
  }, [activeAppId]);

  const toggleChecklist = (key: string) => {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);
    try {
      localStorage.setItem(`codepush_checklist_${activeAppId}`, JSON.stringify(updated));
    } catch {}
  };

  const markStepDone = (key: string) => {
    if (checklist[key]) return;
    const updated = { ...checklist, [key]: true };
    setChecklist(updated);
    try {
      localStorage.setItem(`codepush_checklist_${activeAppId}`, JSON.stringify(updated));
    } catch {}
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const downloadFile = (filename: string, content: string, contentType: string = 'text/plain') => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCodepushJson = () => {
    const jsonContent = JSON.stringify(
      {
        serverUrl: 'https://codepushs.netlify.app',
        appId: activeAppId,
        apiKey: activeApiKey,
        appName: activeAppName,
        version: '1.0.0',
      },
      null,
      2
    );
    downloadFile('codepush.json', jsonContent, 'application/json');
  };

  const codePushServiceCode = getCodePushServiceTemplate(activeAppId, activeApiKey, activeAppName);
  const pushNotificationServiceCode = getPushNotificationServiceTemplate();
  const androidManifestCode = getAndroidManifestTemplate(activeAppName);
  const androidManifestSnippet = getAndroidManifestPermissionsSnippet();

  const handleDownloadCodePushService = () => {
    downloadFile('CodePushService.ts', codePushServiceCode, 'text/typescript');
  };

  const handleDownloadPushNotificationService = () => {
    downloadFile('PushNotificationService.ts', pushNotificationServiceCode, 'text/typescript');
  };

  const handleDownloadAndroidManifest = () => {
    downloadFile('AndroidManifest.xml', androidManifestCode, 'application/xml');
  };

  const appTsxExampleCode = `import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CodePushService } from './src/services/CodePushService';
import { PushNotificationService } from './src/services/PushNotificationService';

export default function App() {
  useEffect(() => {
    // 1. Arm Boot Watchdog
    CodePushService.startBootWatchdog();

    // 2. Check updates in background after launch
    const checkTimer = setTimeout(() => {
      CodePushService.checkForUpdates();
    }, 1200);

    // 3. Live alert & push listeners
    const stopAlertListener = CodePushService.startLiveAlertListener();
    const stopPushListener = CodePushService.startLivePushNotificationListener();

    // 4. Init Push permissions
    PushNotificationService.init();

    return () => {
      clearTimeout(checkTimer);
      stopAlertListener();
      stopPushListener();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to ${activeAppName}!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },
});`;

  const handleDownloadAppTsx = () => {
    downloadFile('App.tsx', appTsxExampleCode, 'text/typescript');
  };

  const githubWorkflowYaml = `name: 🚀 CodePush Enterprise Auto-Release

on:
  push:
    branches:
      - main
      - master
    paths:
      - 'src/**'
      - 'App.tsx'
      - 'package.json'
      - 'package-lock.json'
      - 'codepush.json'

concurrency:
  group: codepush-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  security-audit:
    name: 🛡️ Security Audit & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci --prefer-offline
      - run: npm audit --audit-level=high || true

  bundle-and-deploy:
    name: ⚡ Build & Ship (\${{ matrix.platform }})
    needs: [security-audit]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        platform: [android, ios]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: ⚡ Restore Metro Cache (Fast Builds)
        uses: actions/cache@v4
        with:
          path: |
            ~/.metro/cache
            node_modules/.cache
          key: metro-\${{ matrix.platform }}-\${{ hashFiles('package-lock.json') }}-\${{ github.sha }}
          restore-keys: |
            metro-\${{ matrix.platform }}-\${{ hashFiles('package-lock.json') }}-

      - run: npm ci --prefer-offline

      - name: ⚙️ Version Metadata
        id: meta
        run: |
          echo "version=1.0.\$(date +'%Y%m%d%H%M')" >> \$GITHUB_OUTPUT
          echo "commit_msg=\$(git log -1 --pretty=%B | tr '\\n' ' ')" >> \$GITHUB_OUTPUT

      - name: 🔨 Package Bundle & Assets
        run: |
          mkdir -p build_output/assets
          ENTRY_FILE="index.js"
          [ -f "index.ts" ] && ENTRY_FILE="index.ts"
          [ -f "index.tsx" ] && ENTRY_FILE="index.tsx"
          BUNDLE_NAME="\${{ matrix.platform == 'android' && 'index.android.bundle' || 'main.jsbundle' }}"

          npx react-native bundle \\
            --platform \${{ matrix.platform }} \\
            --dev false \\
            --entry-file "\$ENTRY_FILE" \\
            --bundle-output "build_output/\$BUNDLE_NAME" \\
            --assets-dest build_output/

      - name: 🔒 Compute SHA-256 Checksum & ZIP
        id: crypto
        run: |
          cd build_output
          zip -r ../release-\${{ matrix.platform }}.zip .
          cd ..
          HASH=\$(sha256sum release-\${{ matrix.platform }}.zip | cut -d ' ' -f 1)
          echo "hash=\$HASH" >> \$GITHUB_OUTPUT

      - name: 🚀 Deploy Live to CodePush Server
        run: |
          node bin/codepush.mjs release-react \\
            --app "\${{ secrets.CODEPUSH_APP_ID }}" \\
            --key "\${{ secrets.CODEPUSH_API_KEY }}" \\
            --platform \${{ matrix.platform }} \\
            --version "\${{ steps.meta.outputs.version }}" \\
            --bundle "release-\${{ matrix.platform }}.zip" \\
            --track production \\
            --rollout 25 \\
            --canary 30 \\
            --notes "\${{ steps.meta.outputs.commit_msg }}"
`;

  const handleDownloadWorkflowYaml = () => {
    downloadFile('codepush-release.yml', githubWorkflowYaml, 'text/yaml');
  };

  const handleDownloadAllStarterFiles = () => {
    handleDownloadCodepushJson();
    setTimeout(handleDownloadCodePushService, 250);
    setTimeout(handleDownloadPushNotificationService, 500);
    setTimeout(handleDownloadAndroidManifest, 750);
  };

  const installCmds = {
    npm: 'npm install @react-native-async-storage/async-storage @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native',
    yarn: 'yarn add @react-native-async-storage/async-storage @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native',
    pnpm: 'pnpm add @react-native-async-storage/async-storage @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native',
    bun: 'bun add @react-native-async-storage/async-storage @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native',
  };

  const completedStepsCount = Object.values(checklist).filter(Boolean).length;

  const cardBgClass = isDark
    ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl backdrop-blur-md'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  const subCardBgClass = isDark
    ? 'bg-slate-950/80 border-slate-800/80 text-slate-300 shadow-inner'
    : 'bg-slate-50 border-slate-200 text-slate-700 shadow-2xs';

  const goToNextStep = (stepDoneKey?: string) => {
    if (stepDoneKey) {
      markStepDone(stepDoneKey);
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Concise Step definitions for sidebar
  const stepsMeta = [
    { id: 0, label: 'Overview', subtitle: 'Project credentials', icon: BookOpen },
    { id: 1, label: 'Dependencies', subtitle: 'npm packages', icon: Terminal, key: 'step1' },
    { id: 2, label: 'Config File', subtitle: 'codepush.json', icon: FileCode2, key: 'step2' },
    { id: 3, label: 'Services & Manifest', subtitle: 'Code & Permissions', icon: Zap, key: 'step3' },
    { id: 4, label: 'App.tsx', subtitle: 'Root hook', icon: Code2, key: 'step4' },
    { id: 5, label: 'CI/CD YAML', subtitle: 'codepush-release.yml', icon: GitBranch, key: 'step5' },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-fade-in font-sans">
      {/* 2-COLUMN LAYOUT: SIDEBAR STEPS ON LEFT + ACTIVE STEP ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: STEPS SIDEBAR */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-4">
          <div className={`p-4 sm:p-5 rounded-3xl border ${cardBgClass} space-y-4 shadow-xl`}>
            {/* Target App Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="truncate pr-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Project
                </span>
                <span className="font-extrabold text-sm text-cyan-400 truncate block">
                  {activeAppName}
                </span>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                  {showAppId ? activeAppId : '••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAppId(!showAppId)}
                  className="p-1 rounded text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                  title={showAppId ? 'Hide App ID' : 'Reveal App ID'}
                >
                  {showAppId ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Progress Bar & Header */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Steps</span>
                <span className={`font-mono font-bold ${completedStepsCount === 5 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {completedStepsCount} / 5 Done
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    completedStepsCount === 5
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                  }`}
                  style={{ width: `${(completedStepsCount / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Vertical Steps Navigation List */}
            <div className="space-y-1 pt-1">
              {stepsMeta.map((s) => {
                const isCurrent = currentStep === s.id;
                const isCompleted = s.id === 0 ? currentStep > 0 : checklist[s.key || ''];

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setCurrentStep(s.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                        : isCompleted
                        ? isDark
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 text-emerald-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800'
                        : isDark
                        ? 'bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800/80 text-slate-400 hover:text-white'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <div
                        className={`h-5 w-5 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                          isCurrent
                            ? 'bg-white/20 text-white'
                            : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isCompleted && !isCurrent ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <span>{s.id}</span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className={`text-xs font-bold leading-tight truncate ${isCurrent ? 'text-white' : ''}`}>
                          {s.label}
                        </div>
                        <div
                          className={`text-[10px] leading-tight truncate ${
                            isCurrent
                              ? 'text-cyan-100'
                              : isCompleted
                              ? 'text-emerald-400/80'
                              : 'text-slate-500'
                          }`}
                        >
                          {s.subtitle}
                        </div>
                      </div>
                    </div>

                    {isCurrent && (
                      <ArrowRight className="h-3.5 w-3.5 text-white shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Download Starter Files Button */}
            <div className="pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={handleDownloadAllStarterFiles}
                className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Starter Files</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: ACTIVE STEP CONTENT */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* ---------------------------------------------------- */}
          {/* STEP 0: INTRODUCTION & ROADMAP */}
          {/* ---------------------------------------------------- */}
          {currentStep === 0 && (
            <div className={`p-5 sm:p-6 rounded-3xl border space-y-5 ${cardBgClass} animate-fade-in`}>
              <div className="space-y-1.5">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-[11px] font-bold">
                  <Sparkles className="h-3 w-3" />
                  <span>Introduction · ~3 Mins Setup</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  CodePush SDK Integration
                </h2>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Deploy silent JS updates and push alerts directly to your React Native app without App Store reviews.
                </p>
              </div>

              {/* Project Credentials Card */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${subCardBgClass}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Project Credentials
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 flex items-center space-x-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    <span>Masked for security</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">App Name</span>
                    <div className="text-xs font-bold text-cyan-400 truncate">{activeAppName}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5 flex items-center justify-between">
                    <div className="truncate mr-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">App ID</span>
                      <span className="text-xs font-mono text-white truncate block">
                        {showAppId ? activeAppId : '••••••••••••••••••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowAppId(!showAppId)}
                        className="p-1 rounded text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                        title={showAppId ? 'Hide App ID' : 'Reveal App ID'}
                      >
                        {showAppId ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeAppId, 'app_id')}
                        className="p-1 rounded text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                        title="Copy App ID"
                      >
                        {copiedKey === 'app_id' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5 flex items-center justify-between">
                    <div className="truncate mr-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">API Key</span>
                      <span className="text-xs font-mono text-cyan-300 truncate block">
                        {showApiKey ? activeApiKey : '••••••••••••••••••••••••••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1 rounded text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                        title={showApiKey ? 'Hide API Key' : 'Reveal API Key'}
                      >
                        {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeApiKey, 'api_key')}
                        className="p-1 rounded text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                        title="Copy API Key"
                      >
                        {copiedKey === 'api_key' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border ${subCardBgClass} space-y-1`}>
                  <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                    <span>Silent OTA Updates</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Instantly refreshes JS bundle in background.</p>
                </div>
                <div className={`p-3 rounded-xl border ${subCardBgClass} space-y-1`}>
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>Auto Rollback</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Reverts to factory baseline on crash.</p>
                </div>
                <div className={`p-3 rounded-xl border ${subCardBgClass} space-y-1`}>
                  <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                    <BellRing className="h-3.5 w-3.5 shrink-0" />
                    <span>Push Notifications</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Remote FCM v1 alerts with custom audio.</p>
                </div>
                <div className={`p-3 rounded-xl border ${subCardBgClass} space-y-1`}>
                  <div className="flex items-center space-x-1.5 text-indigo-400 font-bold">
                    <Layers className="h-3.5 w-3.5 shrink-0" />
                    <span>Pre-Configured</span>
                  </div>
                  <p className="text-[11px] text-slate-400">App ID and Key pre-inserted in code.</p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">~3 mins setup</span>
                <button
                  type="button"
                  onClick={() => goToNextStep()}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
                >
                  <span>Start Setup</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* STEP 1: INSTALL DEPENDENCIES */}
          {/* ---------------------------------------------------- */}
          {currentStep === 1 && (
            <div className={`p-5 sm:p-6 rounded-3xl border space-y-5 ${cardBgClass} animate-fade-in`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Step 1 of 5
                  </span>
                  <h2 className="text-xl font-black tracking-tight">Install Dependencies</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Add AsyncStorage, Firebase messaging, and Notifee packages.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleChecklist('step1')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    checklist.step1
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700'
                  }`}
                >
                  {checklist.step1 ? <Check className="h-3.5 w-3.5" /> : <div className="h-3 w-3 rounded border border-slate-500" />}
                  <span>{checklist.step1 ? 'Done' : 'Mark Done'}</span>
                </button>
              </div>

              {/* Package Manager Selector & Command */}
              <div className="space-y-2.5">
                <div className="flex items-center space-x-1.5">
                  {(['npm', 'yarn', 'pnpm', 'bun'] as const).map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => setPkgManager(pkg)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                        pkgManager === pkg
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isDark
                          ? 'bg-slate-800 text-slate-400 hover:text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pkg}
                    </button>
                  ))}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-xs text-cyan-300">
                  <span className="truncate pr-3">{installCmds[pkgManager]}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(installCmds[pkgManager], 'install_cmd')}
                    className="text-slate-400 hover:text-cyan-400 cursor-pointer shrink-0 p-1 rounded-lg bg-slate-800/60"
                    title="Copy command"
                  >
                    {copiedKey === 'install_cmd' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* iOS CocoaPods Instruction */}
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${subCardBgClass}`}>
                  <div className="flex items-center space-x-2">
                    <Apple className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    <span>iOS CocoaPods</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('cd ios && pod install && cd ..', 'pod_cmd')}
                    className="font-mono text-xs text-cyan-400 hover:underline flex items-center space-x-1 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800"
                  >
                    <span>cd ios && pod install</span>
                    {copiedKey === 'pod_cmd' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Stepper Navigation Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevStep}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => goToNextStep('step1')}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
                >
                  <span>Next: Config</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* STEP 2: ADD CONFIG FILE (codepush.json) */}
          {/* ---------------------------------------------------- */}
          {currentStep === 2 && (
            <div className={`p-5 sm:p-6 rounded-3xl border space-y-5 ${cardBgClass} animate-fade-in`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Step 2 of 5
                  </span>
                  <h2 className="text-xl font-black tracking-tight">Add Config File</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Place <code className="text-cyan-400 font-mono">codepush.json</code> in your project root.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleChecklist('step2')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    checklist.step2
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700'
                  }`}
                >
                  {checklist.step2 ? <Check className="h-3.5 w-3.5" /> : <div className="h-3 w-3 rounded border border-slate-500" />}
                  <span>{checklist.step2 ? 'Done' : 'Mark Done'}</span>
                </button>
              </div>

              {/* File Card & Actions */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${subCardBgClass}`}>
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 shrink-0">
                    <FileCode2 className="h-5 w-5" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-bold text-white">codepush.json</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        Project Root
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      Save to: <span className="font-mono text-slate-300">./codepush.json</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleDownloadCodepushJson}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(
                          {
                            serverUrl: 'https://codepushs.netlify.app',
                            appId: activeAppId,
                            apiKey: activeApiKey,
                            appName: activeAppName,
                            version: '1.0.0',
                          },
                          null,
                          2
                        ),
                        'codepush_json_code'
                      )
                    }
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                  >
                    {copiedKey === 'codepush_json_code' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step Instructions */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${subCardBgClass}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span>Instructions</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  <li>Click <strong className="text-white">Download</strong> to get the generated <code className="text-cyan-400 font-mono">codepush.json</code> file.</li>
                  <li>Save this file directly in the <strong className="text-white">root folder</strong> of your React Native project (next to <code className="text-cyan-400 font-mono">package.json</code>).</li>
                  <li>Your credentials (App ID and API Key) are automatically pre-configured.</li>
                </ol>
              </div>

              {/* Stepper Navigation Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevStep}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => goToNextStep('step2')}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                >
                  <span>Next: Services</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* STEP 3: DROP IN CLIENT SERVICES & ANDROID MANIFEST */}
          {/* ---------------------------------------------------- */}
          {currentStep === 3 && (
            <div className={`p-5 sm:p-6 rounded-3xl border space-y-5 ${cardBgClass} animate-fade-in`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    Step 3 of 5
                  </span>
                  <h2 className="text-xl font-black tracking-tight">Add Services & Android Manifest</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Save both services into <code className="text-cyan-400 font-mono">src/services/</code> and update <code className="text-cyan-400 font-mono">AndroidManifest.xml</code>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleChecklist('step3')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    checklist.step3
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700'
                  }`}
                >
                  {checklist.step3 ? <Check className="h-3.5 w-3.5" /> : <div className="h-3 w-3 rounded border border-slate-500" />}
                  <span>{checklist.step3 ? 'Done' : 'Mark Done'}</span>
                </button>
              </div>

              {/* Service & Manifest Files as Clean Cards */}
              <div className="space-y-3">
                {/* File 1: CodePushService.ts */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${subCardBgClass}`}>
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shrink-0">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold text-white">CodePushService.ts</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          OTA Engine
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Save to: <span className="font-mono text-slate-300">src/services/CodePushService.ts</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Silent background downloads, update checks, and crash watchdog.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={handleDownloadCodePushService}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(codePushServiceCode, 'codepush_service_code')}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                    >
                      {copiedKey === 'codepush_service_code' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* File 2: PushNotificationService.ts */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${subCardBgClass}`}>
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0">
                      <BellRing className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold text-white">PushNotificationService.ts</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          FCM Alerts
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Save to: <span className="font-mono text-slate-300">src/services/PushNotificationService.ts</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Push permissions, FCM token registration, and background alerts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={handleDownloadPushNotificationService}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(pushNotificationServiceCode, 'push_service_code')}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                    >
                      {copiedKey === 'push_service_code' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* File 3: AndroidManifest.xml Permissions */}
                <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${subCardBgClass}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shrink-0">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm font-bold text-white">AndroidManifest.xml</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Android 13+ Permissions
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Configure in: <span className="font-mono text-slate-300">android/app/src/main/AndroidManifest.xml</span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Critical: Android 13+ requires <code className="text-emerald-400 font-mono">POST_NOTIFICATIONS</code> to display push alerts in notification shade.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={handleDownloadAndroidManifest}
                        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download XML</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(androidManifestSnippet, 'manifest_snippet')}
                        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                      >
                        {copiedKey === 'manifest_snippet' ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-400" />
                            <span>Copy Permissions</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Embedded Code Snippet Box */}
                  <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{androidManifestSnippet}</pre>
                  </div>
                </div>
              </div>

              {/* Instructions Card */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${subCardBgClass}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>Instructions</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  <li>Create a directory named <code className="text-cyan-400 font-mono">src/services/</code> in your project.</li>
                  <li>Click <strong className="text-white">Download</strong> on both services above and place them into <code className="text-cyan-400 font-mono">src/services/</code>.</li>
                  <li>In your <code className="text-white font-mono">android/app/src/main/AndroidManifest.xml</code>, paste the permissions block inside the <code className="text-emerald-400 font-mono">&lt;manifest&gt;</code> tag to enable Android 13+ push notifications, high-importance audio channels, and watchdog boot survival.</li>
                </ol>
              </div>

              {/* Stepper Navigation Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevStep}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => goToNextStep('step3')}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
                >
                  <span>Next: App.tsx</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* STEP 4: INITIALIZE IN APP.TSX */}
          {/* ---------------------------------------------------- */}
          {currentStep === 4 && (
            <div className={`p-5 sm:p-6 rounded-3xl border space-y-5 ${cardBgClass} animate-fade-in`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    Step 4 of 5
                  </span>
                  <h2 className="text-xl font-black tracking-tight">Hook into App.tsx</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Initialize the watchdog and check for updates on launch.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleChecklist('step4')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    checklist.step4
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700'
                  }`}
                >
                  {checklist.step4 ? <Check className="h-3.5 w-3.5" /> : <div className="h-3 w-3 rounded border border-slate-500" />}
                  <span>{checklist.step4 ? 'Done' : 'Mark Done'}</span>
                </button>
              </div>

              {/* File Card & Actions */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${subCardBgClass}`}>
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 shrink-0">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-bold text-white">App.tsx</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Root Component
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      Save to: <span className="font-mono text-slate-300">./App.tsx</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleDownloadAppTsx}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-500/20 active:scale-95 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(appTsxExampleCode, 'app_init_code')}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                  >
                    {copiedKey === 'app_init_code' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Integration Instructions */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${subCardBgClass}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  <span>Instructions</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
                  <li>
                    <strong className="text-white">Import Services:</strong> Import <code className="text-cyan-400 font-mono">CodePushService</code> and <code className="text-cyan-400 font-mono">PushNotificationService</code> into your root <code className="text-cyan-400 font-mono">App.tsx</code>.
                  </li>
                  <li>
                    <strong className="text-white">Arm Watchdog:</strong> Inside your root <code className="text-cyan-400 font-mono">useEffect</code>, call <code className="text-cyan-400 font-mono">CodePushService.startBootWatchdog()</code> immediately to guard against crash loops.
                  </li>
                  <li>
                    <strong className="text-white">Background Checks:</strong> Trigger <code className="text-cyan-400 font-mono">CodePushService.checkForUpdates()</code> after app launch to silently download releases.
                  </li>
                  <li>
                    <strong className="text-white">Register FCM:</strong> Call <code className="text-cyan-400 font-mono">PushNotificationService.init()</code> to request permissions and capture push tokens.
                  </li>
                </ol>
              </div>

              {/* Stepper Navigation Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevStep}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => goToNextStep('step4')}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-500/20 active:scale-95 cursor-pointer"
                >
                  <span>Next: Release</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* STEP 5: CI/CD AUTOMATION (codepush-release.yml) */}
          {/* ---------------------------------------------------- */}
          {currentStep === 5 && (
            <div className={`p-5 sm:p-6 rounded-3xl border space-y-5 ${cardBgClass} animate-fade-in`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Step 5 of 5
                  </span>
                  <h2 className="text-xl font-black tracking-tight">CI/CD Automation</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Automate OTA releases on GitHub push using <code className="text-cyan-400 font-mono">codepush-release.yml</code>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleChecklist('step5')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    checklist.step5
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700'
                  }`}
                >
                  {checklist.step5 ? <Check className="h-3.5 w-3.5" /> : <div className="h-3 w-3 rounded border border-slate-500" />}
                  <span>{checklist.step5 ? 'Done' : 'Mark Done'}</span>
                </button>
              </div>

              {/* File Card & Actions */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${subCardBgClass}`}>
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shrink-0">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-bold text-white">codepush-release.yml</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        GitHub Actions
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      Save to: <span className="font-mono text-slate-300">.github/workflows/codepush-release.yml</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleDownloadWorkflowYaml}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(githubWorkflowYaml, 'github_workflow_yaml')}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                  >
                    {copiedKey === 'github_workflow_yaml' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${subCardBgClass}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Instructions</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
                  <li>
                    Click <strong className="text-white">Download</strong> to get <code className="text-cyan-400 font-mono">codepush-release.yml</code>.
                  </li>
                  <li>
                    Place it inside the <code className="text-cyan-400 font-mono">.github/workflows/</code> folder in your repository.
                  </li>
                  <li>
                    In your GitHub Repository <strong>Settings → Secrets and variables → Actions</strong>, add the two secret keys: <code className="text-cyan-300 font-mono">CODEPUSH_APP_ID</code> and <code className="text-cyan-300 font-mono">CODEPUSH_API_KEY</code>.
                  </li>
                  <li>
                    Every time you push commits to <code className="text-cyan-400 font-mono">main</code>, GitHub Actions builds and publishes the OTA release automatically.
                  </li>
                </ol>
              </div>

              {/* Stepper Navigation Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevStep}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => markStepDone('step5')}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Finish</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationScreen;
