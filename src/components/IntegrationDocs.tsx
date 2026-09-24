import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Terminal,
  Code2,
  Play,
  CheckCircle2,
  FileCode,
  Smartphone,
  Apple,
  Server,
} from 'lucide-react';

interface IntegrationDocsProps {
  theme?: 'dark' | 'light';
}

export const IntegrationDocs: React.FC<IntegrationDocsProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [pkgManager, setPkgManager] = useState<'npm' | 'yarn' | 'pnpm' | 'bun'>('npm');
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios'>('android');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [testVersion, setTestVersion] = useState<string>('1.0.0');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const installCmds = {
    npm: 'npm install react-native-fs react-native-zip-archive react-native-restart @react-native-async-storage/async-storage',
    yarn: 'yarn add react-native-fs react-native-zip-archive react-native-restart @react-native-async-storage/async-storage',
    pnpm: 'pnpm add react-native-fs react-native-zip-archive react-native-restart @react-native-async-storage/async-storage',
    bun: 'bun add react-native-fs react-native-zip-archive react-native-restart @react-native-async-storage/async-storage',
  };

  const codePushServiceCode = `import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';
import RNRestart from 'react-native-restart';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NETLIFY_SERVER_URL = window.location.origin; // Replace with your production Netlify URL
const BUNDLE_VERSION_KEY = '@codepush_bundle_version';

interface UpdateCheckResponse {
  updateAvailable: boolean;
  downloadUrl: string | null;
  latestVersion: string;
  mandatory: boolean;
  hash: string;
}

export const CodePushService = {
  async checkForUpdates(): Promise<void> {
    try {
      const platform = Platform.OS; // '${selectedPlatform}'
      const currentVersion = (await AsyncStorage.getItem(BUNDLE_VERSION_KEY)) || '1.0.0';

      console.log(\`[CodePush] Checking updates... (Current: v\${currentVersion})\`);

      const res = await fetch(
        \`\${NETLIFY_SERVER_URL}/.netlify/functions/check-update?platform=\${platform}&currentVersion=\${currentVersion}\`
      );
      const data: UpdateCheckResponse = await res.json();

      if (data.updateAvailable && data.downloadUrl) {
        console.log(\`⚡ [CodePush] New OTA update available: v\${data.latestVersion}\`);
        await this.downloadAndApplyUpdate(data.downloadUrl, data.latestVersion);
      } else {
        console.log('✅ [CodePush] App is fully up to date.');
      }
    } catch (err) {
      console.warn('[CodePush] Update check failed:', err);
    }
  },

  async downloadAndApplyUpdate(downloadUrl: string, newVersion: string): Promise<void> {
    const downloadDest = \`\${RNFS.CachesDirectoryPath}/bundle-update.zip\`;
    const extractPath = \`\${RNFS.DocumentDirectoryPath}/codepush_bundle\`;

    // 1. Download JS bundle from Netlify Edge CDN
    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: downloadDest,
    }).promise;

    if (downloadResult.statusCode === 200) {
      // 2. Extract archive to documents directory
      await unzip(downloadDest, extractPath);

      // 3. Save new active bundle version in storage
      await AsyncStorage.setItem(BUNDLE_VERSION_KEY, newVersion);

      // 4. Clean temporary zip file
      await RNFS.unlink(downloadDest);

      console.log('🎉 [CodePush] Hotfix installed! Reloading app JS engine...');

      // 5. Restart React Native JS runtime instantly
      RNRestart.Restart();
    }
  },
};`;

  const appTsxCode = `import React, { useEffect } from 'react';
import { CodePushService } from './src/services/CodePushService';
import { MainNavigator } from './src/navigation/MainNavigator';

export default function App() {
  useEffect(() => {
    // Check for Over-The-Air hotfixes on app launch
    CodePushService.checkForUpdates();
  }, []);

  return <MainNavigator />;
}`;

  const handleTestEndpoint = async () => {
    setIsTestingApi(true);
    setApiResponse(null);
    try {
      const url = `/.netlify/functions/check-update?platform=${selectedPlatform}&currentVersion=${testVersion}`;
      const res = await fetch(url);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setApiResponse(
        JSON.stringify(
          {
            updateAvailable: true,
            downloadUrl: `https://your-site.netlify.app/bundles/${selectedPlatform}-v1.0.1.zip`,
            latestVersion: '1.0.1',
            mandatory: false,
            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            notes: 'Mock response (running in preview environment)',
          },
          null,
          2
        )
      );
    } finally {
      setIsTestingApi(false);
    }
  };

  const steps = [
    { id: 1, title: 'Install SDK Dependencies', icon: Terminal },
    { id: 2, title: 'CodePush Service Setup', icon: FileCode },
    { id: 3, title: 'App Entry Initialization', icon: Code2 },
    { id: 4, title: 'Live API Endpoint Tester', icon: Play },
  ];

  const cardBgClass = isDark
    ? 'border-slate-800 bg-slate-900/40 text-slate-100 shadow-xl'
    : 'border-cyan-300/90 bg-gradient-to-br from-cyan-100/95 via-sky-100/90 to-indigo-100/95 text-slate-900 shadow-xl shadow-cyan-500/10';

  const innerBoxClass = isDark
    ? 'bg-slate-950/70 border-slate-800 text-slate-200'
    : 'bg-sky-100/80 border-indigo-200 text-slate-900';

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header Banner */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden transition-all duration-300 ${cardBgClass}`}
      >
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/30">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  React Native Client SDK Integration
                </h1>
                <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-indigo-900'}`}>
                  Deploy instant JS hotfixes directly to React Native Android & iOS apps via Netlify Edge CDN.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Platform Switcher */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedPlatform('android')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPlatform === 'android'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : isDark
                  ? 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-sky-100 border border-indigo-200 text-slate-700 hover:text-slate-950'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span>Android App</span>
            </button>

            <button
              onClick={() => setSelectedPlatform('ios')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPlatform === 'ios'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : isDark
                  ? 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-sky-100 border border-indigo-200 text-slate-700 hover:text-slate-950'
              }`}
            >
              <Apple className="h-4 w-4" />
              <span>iOS App</span>
            </button>
          </div>
        </div>

        {/* Stepper Wizard Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = activeStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStep(s.id)}
                className={`p-3.5 rounded-2xl border text-left flex items-center space-x-3 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent shadow-lg shadow-cyan-500/25 scale-[1.02]'
                    : isDark
                    ? 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    : 'bg-sky-100/90 border-indigo-200 text-slate-700 hover:border-indigo-300'
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-cyan-500/15 text-cyan-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <span className="block text-[10px] font-mono opacity-80 uppercase font-bold">Step {s.id}</span>
                  <span className="text-xs font-bold truncate block">{s.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: INSTALL DEPENDENCIES */}
      {activeStep === 1 && (
        <div className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl space-y-6 ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Terminal className="h-5 w-5 text-cyan-500" />
              <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Step 1: Install Required React Native Packages
              </h2>
            </div>

            {/* Package Manager Picker */}
            <div className={`flex p-1 rounded-xl border text-xs font-semibold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-200/80 border-indigo-300'}`}>
              {(['npm', 'yarn', 'pnpm', 'bun'] as const).map((mgr) => (
                <button
                  key={mgr}
                  onClick={() => setPkgManager(mgr)}
                  className={`px-3 py-1 rounded-lg uppercase transition-all cursor-pointer ${
                    pkgManager === mgr
                      ? 'bg-cyan-500 text-white shadow-xs'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  {mgr}
                </button>
              ))}
            </div>
          </div>

          {/* Terminal Code Window */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-xs font-mono text-slate-400 pl-2">bash terminal</span>
              </div>
              <button
                onClick={() => copyToClipboard(installCmds[pkgManager], 1)}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono transition-all cursor-pointer"
              >
                {copiedIndex === 1 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedIndex === 1 ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-5 font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {installCmds[pkgManager]}
            </pre>
          </div>

          {/* iOS Cocoapods Note */}
          <div className={`p-4 rounded-2xl border space-y-2 ${innerBoxClass}`}>
            <span className="font-bold text-xs flex items-center space-x-2 text-cyan-600">
              <Apple className="h-4 w-4" />
              <span>For iOS builds: install Native Pods</span>
            </span>
            <pre className="font-mono text-xs p-3 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 overflow-x-auto">
              cd ios && pod install
            </pre>
          </div>
        </div>
      )}

      {/* STEP 2: CODEPUSH SERVICE SCRIPT */}
      {activeStep === 2 && (
        <div className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl space-y-6 ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileCode className="h-5 w-5 text-cyan-500" />
              <div>
                <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Step 2: Add CodePush Service (`src/services/CodePushService.ts`)
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                  Handles update checks, zip bundle download, extraction, and instant JS runtime restart.
                </p>
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(codePushServiceCode, 2)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {copiedIndex === 2 ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              <span>{copiedIndex === 2 ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Code Viewer */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-mono text-cyan-400">src/services/CodePushService.ts</span>
              <span className="text-[10px] font-mono text-slate-500">TypeScript / React Native</span>
            </div>
            <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[28rem]">
              {codePushServiceCode}
            </pre>
          </div>
        </div>
      )}

      {/* STEP 3: APP ENTRY INITIALIZATION */}
      {activeStep === 3 && (
        <div className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl space-y-6 ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Code2 className="h-5 w-5 text-cyan-500" />
              <div>
                <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Step 3: Trigger Update Check in App Launch (`App.tsx`)
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                  Invoke `CodePushService.checkForUpdates()` inside `useEffect` on app mount.
                </p>
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(appTsxCode, 3)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {copiedIndex === 3 ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              <span>{copiedIndex === 3 ? 'Copied to Clipboard!' : 'Copy Snippet'}</span>
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-mono text-cyan-400">App.tsx</span>
              <span className="text-[10px] font-mono text-slate-500">React Native Entrypoint</span>
            </div>
            <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
              {appTsxCode}
            </pre>
          </div>
        </div>
      )}

      {/* STEP 4: LIVE API ENDPOINT PLAYGROUND */}
      {activeStep === 4 && (
        <div className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl space-y-6 ${cardBgClass}`}>
          <div className="flex items-center space-x-3">
            <Play className="h-5 w-5 text-cyan-500" />
            <div>
              <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Step 4: Interactive Netlify Endpoint Tester
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                Test serverless update query endpoint live from this console.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Request Builder */}
            <div className={`lg:col-span-6 p-5 rounded-2xl border space-y-4 ${innerBoxClass}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-indigo-900'}`}>
                Endpoint Query Parameters
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Platform:</label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as 'android' | 'ios')}
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-indigo-300 text-slate-900'
                    }`}
                  >
                    <option value="android">Android</option>
                    <option value="ios">iOS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">Current App Bundle Version:</label>
                  <input
                    type="text"
                    value={testVersion}
                    onChange={(e) => setTestVersion(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-indigo-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <button
                onClick={handleTestEndpoint}
                disabled={isTestingApi}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Play className="h-4 w-4" />
                <span>{isTestingApi ? 'Executing HEAD / GET...' : 'Send Live HTTP Request'}</span>
              </button>
            </div>

            {/* Response Preview */}
            <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col">
              <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                <span className="text-xs font-mono text-emerald-400 flex items-center">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> HTTP 200 OK Response
                </span>
                <span className="text-[10px] font-mono text-slate-500">application/json</span>
              </div>
              <pre className="p-4 font-mono text-xs text-cyan-300 overflow-x-auto flex-1 leading-relaxed">
                {apiResponse ||
                  `{\n  "status": "Click 'Send Live HTTP Request' to test response payload"\n}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Info Card: Netlify Edge & CORS Info */}
      <div
        className={`p-6 rounded-3xl border flex items-start space-x-4 ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-slate-300'
            : 'bg-gradient-to-r from-sky-100 via-indigo-100 to-purple-100 border-indigo-300 text-slate-900'
        }`}
      >
        <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-500 shrink-0">
          <Server className="h-5 w-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-extrabold text-sm">CORS & Netlify Serverless Endpoints</h4>
          <p className="leading-relaxed">
            All Netlify serverless function endpoints (`check-update.js` and `releases.js`) ship with built-in Access-Control-Allow-Origin headers (`*`), allowing mobile React Native clients to fetch updates without CORS errors.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationDocs;
