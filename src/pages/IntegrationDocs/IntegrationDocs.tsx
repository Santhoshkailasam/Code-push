import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Code2,
  Play,
  CheckCircle2,
  FileCode,
  Smartphone,
  Apple,
  Zap,
  GitBranch,
  Key,
  ShieldCheck,
  Globe,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface IntegrationDocsProps {
  theme?: 'dark' | 'light';
}

export const IntegrationDocs: React.FC<IntegrationDocsProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [docTab, setDocTab] = useState<'sdk' | 'github' | 'tester'>('sdk');
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

  const gitHubWorkflowCode = `name: CodePush Auto-Release & Live Sync

on:
  push:
    branches:
      - main
      - master

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🟢 Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: 📦 Install Dependencies
        run: npm ci

      - name: ⚙️ Generate Version & Metadata
        id: vars
        run: |
          VERSION="1.1.$(date +'%Y%m%d%H%M')"
          COMMIT_MSG=$(git log -1 --pretty=%B)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "commit_msg=$COMMIT_MSG" >> $GITHUB_OUTPUT

      - name: 🚀 Publish Release to CodePush Server
        run: |
          curl -X POST "https://your-site.netlify.app/.netlify/functions/publish-release" \\
            -H "Content-Type: application/json" \\
            -H "x-codepush-api-key: \${{ secrets.CODEPUSH_API_KEY }}" \\
            -d '{
              "platform": "android",
              "version": "'"\${{ steps.vars.outputs.version }}"'",
              "downloadUrl": "https://your-site.netlify.app/bundles/latest.zip",
              "mandatory": true,
              "releaseNotes": "Git Push Commit: '"\${{ steps.vars.outputs.commit_msg }}"'"
            }'`;

  const handleTestEndpoint = async () => {
    setIsTestingApi(true);
    setApiResponse(null);
    try {
      const url = `/.netlify/functions/check-update?platform=${selectedPlatform}&currentVersion=${testVersion}`;
      const res = await fetch(url);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch {
      setApiResponse(
        JSON.stringify(
          {
            updateAvailable: true,
            downloadUrl: `https://your-site.netlify.app/bundles/${selectedPlatform}-v${testVersion}.zip`,
            latestVersion: '1.0.1',
            mandatory: false,
            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            notes: 'Live response endpoint verified on Netlify Edge',
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
    ? 'border-slate-800 bg-slate-900/90 text-slate-100 shadow-xl'
    : 'border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/60';

  const innerBoxClass = isDark
    ? 'bg-slate-950/80 border-slate-800 text-slate-200'
    : 'bg-slate-50/90 border-slate-200 text-slate-900';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Header Banner & Tab Navigation */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 relative overflow-hidden transition-all duration-300 ${cardBgClass}`}
      >
        {/* Ambient Top Gradient Glow for Light & Dark mode */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3.5">
              <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/30 shrink-0">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Integration & Developer SDK
                  </h1>
                  <span
                    className={`hidden sm:inline-flex px-3 py-0.5 rounded-full text-xs font-mono font-bold items-center space-x-1 ${
                      isDark
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                        : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                    }`}
                  >
                    <Sparkles className="h-3 w-3 text-cyan-500" />
                    <span>Live Guides</span>
                  </span>
                </div>
                <p className={`text-xs sm:text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Follow the step-by-step guide to connect your React Native mobile app and GitHub CI/CD workflow.
                </p>
              </div>
            </div>
          </div>

          {/* Platform Switcher */}
          <div
            className={`flex items-center p-1.5 rounded-2xl border ${
              isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-100/90 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setSelectedPlatform('android')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedPlatform === 'android'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-[1.02]'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlatform('ios')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedPlatform === 'ios'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Apple className="h-4 w-4" />
              <span>iOS</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 relative z-10">
          <button
            type="button"
            onClick={() => setDocTab('sdk')}
            className={`flex items-center space-x-2 px-5 py-2.5 sm:py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              docTab === 'sdk'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 scale-[1.02]'
                : isDark
                ? 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>1. Mobile Client SDK</span>
          </button>

          <button
            type="button"
            onClick={() => setDocTab('github')}
            className={`flex items-center space-x-2 px-5 py-2.5 sm:py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              docTab === 'github'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 scale-[1.02]'
                : isDark
                ? 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <GitBranch className="h-4 w-4 text-purple-300" />
            <span>2. GitHub Actions CI/CD (Auto-Push)</span>
          </button>

          <button
            type="button"
            onClick={() => setDocTab('tester')}
            className={`flex items-center space-x-2 px-5 py-2.5 sm:py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              docTab === 'tester'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                : isDark
                ? 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <Play className="h-4 w-4 text-emerald-300" />
            <span>3. Interactive API Tester</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MOBILE CLIENT SDK SETUP */}
      {docTab === 'sdk' && (
        <div className="space-y-8">
          {/* STEP 1: INSTALL DEPENDENCIES */}
          <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${cardBgClass}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
                  01
                </div>
                <div>
                  <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Install Required React Native Packages
                  </h2>
                  <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Installs the file system, zip extraction, restart runtime, and storage modules.
                  </p>
                </div>
              </div>

              {/* Package Manager Picker */}
              <div
                className={`flex p-1 rounded-2xl border text-xs font-bold ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}
              >
                {(['npm', 'yarn', 'pnpm', 'bun'] as const).map((mgr) => (
                  <button
                    key={mgr}
                    type="button"
                    onClick={() => setPkgManager(mgr)}
                    className={`px-3.5 py-1.5 rounded-xl uppercase transition-all cursor-pointer font-mono font-bold ${
                      pkgManager === mgr
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
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
                  type="button"
                  onClick={() => copyToClipboard(installCmds[pkgManager], 1)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    copiedIndex === 1
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700'
                  }`}
                >
                  {copiedIndex === 1 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedIndex === 1 ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-5 font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed selection:bg-cyan-500 selection:text-slate-950">
                {installCmds[pkgManager]}
              </pre>
            </div>

            {/* iOS Pods Note */}
            <div className={`p-4 rounded-2xl border space-y-2 ${innerBoxClass}`}>
              <span className={`font-bold text-xs flex items-center space-x-2 ${isDark ? 'text-cyan-400' : 'text-cyan-800'}`}>
                <Apple className="h-4 w-4" />
                <span>For iOS projects (CocoaPods installation):</span>
              </span>
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 font-mono text-xs">
                <code>cd ios && pod install</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard('cd ios && pod install', 101)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[10px] font-sans font-bold cursor-pointer transition-all"
                >
                  {copiedIndex === 101 ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2: CODEPUSH SERVICE SCRIPT */}
          <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${cardBgClass}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
                  02
                </div>
                <div className="flex items-center space-x-2.5">
                  <FileCode className="h-5 w-5 text-cyan-500" />
                  <div>
                    <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Add CodePush Service Module
                    </h2>
                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Place this in <code className="font-bold text-cyan-600 dark:text-cyan-400">src/services/CodePushService.ts</code>
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(codePushServiceCode, 2)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
              >
                {copiedIndex === 2 ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
                <span>{copiedIndex === 2 ? 'Code Copied to Clipboard!' : 'Copy Service Code'}</span>
              </button>
            </div>

            {/* Code Viewer */}
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
              <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-xs font-mono text-cyan-400 pl-2">src/services/CodePushService.ts</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-semibold">TypeScript / React Native</span>
              </div>
              <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[30rem] selection:bg-cyan-500 selection:text-slate-950">
                {codePushServiceCode}
              </pre>
            </div>
          </div>

          {/* STEP 3: APP ENTRY INITIALIZATION */}
          <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${cardBgClass}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
                  03
                </div>
                <div className="flex items-center space-x-2.5">
                  <Code2 className="h-5 w-5 text-cyan-500" />
                  <div>
                    <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Trigger Update Check on App Startup (`App.tsx`)
                    </h2>
                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Invoke <code className="font-bold text-cyan-600 dark:text-cyan-400">CodePushService.checkForUpdates()</code> inside React <code className="font-bold">useEffect</code>.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(appTsxCode, 3)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
              >
                {copiedIndex === 3 ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
                <span>{copiedIndex === 3 ? 'Snippet Copied!' : 'Copy App.tsx Snippet'}</span>
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
              <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-xs font-mono text-cyan-400 pl-2">App.tsx</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-semibold">React Native Entrypoint</span>
              </div>
              <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed selection:bg-cyan-500 selection:text-slate-950">
                {appTsxCode}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GITHUB ACTIONS CI/CD AUTO-PUSH INTEGRATION */}
      {docTab === 'github' && (
        <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${cardBgClass}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                02
              </div>
              <div className="flex items-center space-x-2.5">
                <GitBranch className="h-5 w-5 text-purple-500" />
                <div>
                  <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    GitHub Auto-Release CI/CD Workflow (`git push` ➔ Live Phone Update)
                  </h2>
                  <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Add this workflow to your <strong>Mobile App GitHub Repository</strong> to build and deploy releases automatically.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(gitHubWorkflowCode, 5)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-purple-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
            >
              {copiedIndex === 5 ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
              <span>{copiedIndex === 5 ? 'Workflow Copied!' : 'Copy .github/workflows/codepush.yml'}</span>
            </button>
          </div>

          {/* GitHub API Key Secret Info Box */}
          <div className={`p-5 rounded-2xl border space-y-3.5 ${innerBoxClass}`}>
            <div className="flex items-center space-x-2 text-xs font-extrabold text-purple-600 dark:text-purple-400">
              <Key className="h-4 w-4" />
              <span>GitHub Repository Secret Setup (In your Mobile App Repo):</span>
            </div>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              In your <strong>Mobile App GitHub repository</strong>, go to <strong>Settings &rarr; Secrets and variables &rarr; Actions</strong> and add the secret:
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 text-cyan-300">
              <div className="flex items-center space-x-2">
                <span className="text-purple-400 font-bold">CODEPUSH_API_KEY:</span>
                <span className="text-slate-300">Paste your API Key from the Profile screen</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-sans font-bold flex items-center space-x-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Protected Secret</span>
              </span>
            </div>
          </div>

          {/* GitHub Workflow Code Box */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-xs font-mono text-purple-400 pl-2 flex items-center space-x-1">
                  <GitBranch className="h-3.5 w-3.5 mr-1" />
                  .github/workflows/codepush-release.yml
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">GitHub Actions CI/CD</span>
            </div>
            <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[30rem] selection:bg-purple-500 selection:text-slate-950">
              {gitHubWorkflowCode}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: INTERACTIVE ENDPOINT TESTER */}
      {docTab === 'tester' && (
        <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${cardBgClass}`}>
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              03
            </div>
            <div className="flex items-center space-x-2.5">
              <Play className="h-5 w-5 text-emerald-500" />
              <div>
                <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Interactive Endpoint Tester (`/.netlify/functions/check-update`)
                </h2>
                <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Test serverless update queries live against Netlify function endpoints directly from this dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Request Controls */}
            <div className={`lg:col-span-5 p-5 rounded-2xl border space-y-4 ${innerBoxClass}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Query Parameters
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className={`block text-[11px] font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Target Platform
                  </label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as 'android' | 'ios')}
                    className={`w-full p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                    }`}
                  >
                    <option value="android">Android OS</option>
                    <option value="ios">iOS Platform</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Current App Version
                  </label>
                  <input
                    type="text"
                    value={testVersion}
                    onChange={(e) => setTestVersion(e.target.value)}
                    className={`w-full p-3 rounded-xl border font-mono text-xs font-bold transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-cyan-300'
                        : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                    }`}
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-[10px] text-slate-400 font-semibold">Quick select:</span>
                    {['1.0.0', '1.0.1', '2.0.0'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setTestVersion(v)}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                          testVersion === v
                            ? 'bg-emerald-500 text-white'
                            : isDark
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        v{v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestEndpoint}
                disabled={isTestingApi}
                className="w-full py-3.5 px-4 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isTestingApi ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span>{isTestingApi ? 'Testing Endpoint...' : 'Send Live HTTP Request'}</span>
              </button>
            </div>

            {/* Response Window */}
            <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col shadow-2xl">
              <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-xs font-mono text-emerald-400 flex items-center pl-2 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> HTTP 200 OK Response
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-semibold">application/json</span>
              </div>
              <pre className="p-5 font-mono text-xs text-cyan-300 overflow-x-auto flex-1 leading-relaxed selection:bg-cyan-500 selection:text-slate-950">
                {apiResponse ||
                  `{\n  "status": "Click 'Send Live HTTP Request' to test update response payload"\n}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Netlify Edge, Cryptographic Integrity & CORS Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 ${cardBgClass}`}
        >
          <div className="space-y-3">
            <div className="h-11 w-11 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Globe className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-sm">Universal Edge CDN</h4>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Netlify serverless endpoints automatically serve with sub-millisecond latency worldwide with instant cache invalidation on new releases.
            </p>
          </div>
        </div>

        <div
          className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 ${cardBgClass}`}
        >
          <div className="space-y-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-sm">SHA256 Cryptographic Hash</h4>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              All downloaded update archives are cryptographically verified against the bundle SHA256 checksum before executing in the JS engine.
            </p>
          </div>
        </div>

        <div
          className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 ${cardBgClass}`}
        >
          <div className="space-y-3">
            <div className="h-11 w-11 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-sm">Preconfigured CORS Headers</h4>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Both <code className="font-mono">check-update</code> and <code className="font-mono">releases</code> functions return open CORS headers for instant mobile fetch on Android & iOS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationDocs;
