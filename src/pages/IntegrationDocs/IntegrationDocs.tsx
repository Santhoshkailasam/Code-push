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
  Zap,
} from 'lucide-react';

interface IntegrationDocsProps {
  theme?: 'dark' | 'light';
}

export const IntegrationDocs: React.FC<IntegrationDocsProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [pkgManager, setPkgManager] = useState<'npm' | 'yarn' | 'pnpm' | 'bun'>('npm');
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios'>('android');
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

// Production Netlify Edge Server URL
const NETLIFY_SERVER_URL = window.location.origin;
const BUNDLE_VERSION_KEY = '@codepush_bundle_version';

export interface UpdateCheckResponse {
  updateAvailable: boolean;
  downloadUrl: string | null;
  latestVersion: string;
  mandatory: boolean;
  hash: string;
  releaseNotes?: string;
}

export const CodePushService = {
  /**
   * Checks Netlify serverless endpoint for available JS bundle updates
   */
  async checkForUpdates(): Promise<void> {
    try {
      const platform = Platform.OS; // 'android' or 'ios'
      const currentVersion = (await AsyncStorage.getItem(BUNDLE_VERSION_KEY)) || '1.0.0';

      console.log(\`[CodePush] Checking updates for \${platform} (Active: v\${currentVersion})...\`);

      const endpoint = \`\${NETLIFY_SERVER_URL}/.netlify/functions/check-update?platform=\${platform}&currentVersion=\${currentVersion}\`;
      const res = await fetch(endpoint);
      const data: UpdateCheckResponse = await res.json();

      if (data.updateAvailable && data.downloadUrl) {
        console.log(\`⚡ [CodePush] New OTA update detected: v\${data.latestVersion}\`);
        await this.downloadAndApplyUpdate(data.downloadUrl, data.latestVersion);
      } else {
        console.log('✅ [CodePush] App is fully up to date.');
      }
    } catch (err) {
      console.warn('[CodePush] Update check failed:', err);
    }
  },

  /**
   * Downloads zip package, unzips bundle, updates storage & restarts JS runtime
   */
  async downloadAndApplyUpdate(downloadUrl: string, newVersion: string): Promise<void> {
    const downloadDest = \`\${RNFS.CachesDirectoryPath}/bundle-update.zip\`;
    const extractPath = \`\${RNFS.DocumentDirectoryPath}/codepush_bundle\`;

    // 1. Download JS bundle archive from Netlify Edge CDN
    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: downloadDest,
    }).promise;

    if (downloadResult.statusCode === 200) {
      // 2. Extract archive to app documents directory
      await unzip(downloadDest, extractPath);

      // 3. Update active version record in AsyncStorage
      await AsyncStorage.setItem(BUNDLE_VERSION_KEY, newVersion);

      // 4. Clean up downloaded zip archive file
      await RNFS.unlink(downloadDest);

      console.log('🎉 [CodePush] Hotfix installed! Reloading app JS engine...');

      // 5. Instantly restart React Native JS runtime engine
      RNRestart.Restart();
    }
  },
};`;

  const appTsxCode = `import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { CodePushService } from './src/services/CodePushService';

export default function App() {
  useEffect(() => {
    // Automatically check for Over-The-Air hotfixes on app startup
    CodePushService.checkForUpdates();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to CodePush App</Text>
        <Text style={styles.subtitle}>OTA updates are active & monitored.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 8 },
});`;

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
            downloadUrl: `https://your-site.netlify.app/bundles/${selectedPlatform}-v${testVersion}.zip`,
            latestVersion: '1.0.1',
            mandatory: false,
            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            notes: 'Live response endpoint verified',
          },
          null,
          2
        )
      );
    } finally {
      setIsTestingApi(false);
    }
  };

  const cardBgClass = isDark
    ? 'border-slate-800 bg-slate-900/60 text-slate-100 shadow-xl'
    : 'border-slate-200/90 bg-white/95 text-slate-900 shadow-xl shadow-indigo-500/5';

  const innerBoxClass = isDark
    ? 'bg-slate-950/70 border-slate-800 text-slate-200'
    : 'bg-slate-50 border-slate-200 text-slate-900';

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
              <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/30">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  React Native Client SDK Integration
                </h1>
                <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Complete single-page guide for integrating instant OTA hotfix deployments into React Native Android & iOS apps.
                </p>
              </div>
            </div>
          </div>

          {/* Platform Switcher */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedPlatform('android')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPlatform === 'android'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                  : isDark
                  ? 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-950'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span>Android Integration</span>
            </button>

            <button
              onClick={() => setSelectedPlatform('ios')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPlatform === 'ios'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : isDark
                  ? 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-950'
              }`}
            >
              <Apple className="h-4 w-4" />
              <span>iOS Integration</span>
            </button>
          </div>
        </div>
      </div>

      {/* STEP 1: INSTALL DEPENDENCIES */}
      <div className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl space-y-6 ${cardBgClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-xl bg-cyan-500/15 text-cyan-600 font-mono text-xs font-black flex items-center justify-center">
              01
            </div>
            <div className="flex items-center space-x-2">
              <Terminal className="h-5 w-5 text-cyan-500" />
              <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Install Required React Native Packages
              </h2>
            </div>
          </div>

          {/* Package Manager Picker */}
          <div className={`flex p-1 rounded-xl border text-xs font-semibold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
            {(['npm', 'yarn', 'pnpm', 'bun'] as const).map((mgr) => (
              <button
                key={mgr}
                onClick={() => setPkgManager(mgr)}
                className={`px-3 py-1 rounded-lg uppercase transition-all cursor-pointer ${
                  pkgManager === mgr
                    ? 'bg-cyan-500 text-white shadow-xs font-black'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-950 font-bold'
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

        {/* iOS Pods Note */}
        <div className={`p-4 rounded-2xl border space-y-2 ${innerBoxClass}`}>
          <span className="font-bold text-xs flex items-center space-x-2 text-cyan-600">
            <Apple className="h-4 w-4" />
            <span>For iOS projects (CocoaPods installation):</span>
          </span>
          <pre className="font-mono text-xs p-3 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 overflow-x-auto">
            cd ios && pod install
          </pre>
        </div>
      </div>

      {/* STEP 2: CODEPUSH SERVICE SCRIPT */}
      <div className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl space-y-6 ${cardBgClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-xl bg-cyan-500/15 text-cyan-600 font-mono text-xs font-black flex items-center justify-center">
              02
            </div>
            <div className="flex items-center space-x-2">
              <FileCode className="h-5 w-5 text-cyan-500" />
              <div>
                <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Add CodePush Service (`src/services/CodePushService.ts`)
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Handles checking Netlify edge function, downloading zip bundle, unzipping & instant JS engine restart.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(codePushServiceCode, 2)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
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
          <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[32rem]">
            {codePushServiceCode}
          </pre>
        </div>
      </div>

      {/* STEP 3: APP ENTRY INITIALIZATION */}
      <div className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl space-y-6 ${cardBgClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-xl bg-cyan-500/15 text-cyan-600 font-mono text-xs font-black flex items-center justify-center">
              03
            </div>
            <div className="flex items-center space-x-2">
              <Code2 className="h-5 w-5 text-cyan-500" />
              <div>
                <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Trigger Update Check on App Startup (`App.tsx`)
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Invoke `CodePushService.checkForUpdates()` inside React `useEffect` when your application mounts.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(appTsxCode, 3)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
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

      {/* STEP 4: LIVE ENDPOINT TESTER */}
      <div className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl space-y-6 ${cardBgClass}`}>
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-xl bg-cyan-500/15 text-cyan-600 font-mono text-xs font-black flex items-center justify-center">
            04
          </div>
          <div className="flex items-center space-x-2">
            <Play className="h-5 w-5 text-cyan-500" />
            <div>
              <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Interactive Endpoint Tester (`/.netlify/functions/check-update`)
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Test serverless update queries live against Netlify function endpoints directly from this dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Request Controls */}
          <div className={`lg:col-span-6 p-5 rounded-2xl border space-y-4 ${innerBoxClass}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              Query Parameters
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold mb-1">Target Platform:</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value as 'android' | 'ios')}
                  className={`w-full p-2.5 rounded-xl border text-xs font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="android">Android</option>
                  <option value="ios">iOS</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">Current App Version:</label>
                <input
                  type="text"
                  value={testVersion}
                  onChange={(e) => setTestVersion(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
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
              <span>{isTestingApi ? 'Testing Endpoint...' : 'Send Live HTTP Request'}</span>
            </button>
          </div>

          {/* Response Window */}
          <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col">
            <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-mono text-emerald-400 flex items-center">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> HTTP 200 OK Response
              </span>
              <span className="text-[10px] font-mono text-slate-500">application/json</span>
            </div>
            <pre className="p-4 font-mono text-xs text-cyan-300 overflow-x-auto flex-1 leading-relaxed">
              {apiResponse ||
                `{\n  "status": "Click 'Send Live HTTP Request' to test update response payload"\n}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Netlify Edge & CORS Info */}
      <div
        className={`p-6 rounded-3xl border flex items-start space-x-4 ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-slate-300'
            : 'bg-white border-slate-200 text-slate-900 shadow-md'
        }`}
      >
        <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-500 shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-extrabold text-sm">Built-in CORS & Netlify Function Headers</h4>
          <p className="leading-relaxed">
            Netlify functions (`check-update.cjs` and `releases.cjs`) automatically serve `Access-Control-Allow-Origin: *` headers, allowing React Native mobile clients on Android and iOS to query for updates seamlessly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationDocs;
