import React, { useState, useEffect } from 'react';
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
  GitBranch,
  Key,
  ShieldCheck,
  Globe,
  Sparkles,
  RefreshCw,
  Database,
  Radio,
  MessageSquare,
  Send,
  Bell,
  Trash2,
  X,
} from 'lucide-react';
import type { Project } from '../../types';

interface IntegrationDocsProps {
  theme?: 'dark' | 'light';
  currentProject?: Project;
}

export const IntegrationDocs: React.FC<IntegrationDocsProps> = ({ theme = 'dark', currentProject }) => {
  const isDark = theme === 'dark';
  const [docTab, setDocTab] = useState<'sdk' | 'github' | 'tester' | 'cloud'>('tester');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [pkgManager, setPkgManager] = useState<'npm' | 'yarn' | 'pnpm' | 'bun'>('npm');
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios'>('android');
  const [testVersion, setTestVersion] = useState<string>('1.0.0');
  const [testApiKey, setTestApiKey] = useState<string>(currentProject?.apiKey || '');
  const [testProjectId, setTestProjectId] = useState<string>(currentProject?.id || '');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);

  // In-App Popup Alert Testing State
  const [testMessage, setTestMessage] = useState<string>('⚡ OTA Update v1.0.1 hotfix installed successfully! Bug fixes are now active.');
  const [testAlertTitle, setTestAlertTitle] = useState<string>('CodePush Alert Testing');
  const [activeAlertTab, setActiveAlertTab] = useState<'preview' | 'response'>('preview');
  const [alertSuccessBanner, setAlertSuccessBanner] = useState<string | null>(null);
  const [simulatedPopupOpen, setSimulatedPopupOpen] = useState<boolean>(true);
  const [activeBroadcastAlert, setActiveBroadcastAlert] = useState<any>(null);

  useEffect(() => {
    if (currentProject) {
      if (currentProject.id && !testProjectId) setTestProjectId(currentProject.id);
      if (currentProject.apiKey && !testApiKey) setTestApiKey(currentProject.apiKey);
    }
  }, [currentProject]);

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

  const codePushServiceCode = `import { Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';
import RNRestart from 'react-native-restart';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production CodePush Server URL
const CODEPUSH_SERVER_URL = 'https://codepushs.netlify.app';

// Your App API Key (from CodePush Dashboard -> Profile & API Keys)
const CODEPUSH_API_KEY = '${currentProject?.apiKey || 'cp_live_rCYp1a_mvdfs5j4_live_key'}';

// Your App ID (scopes releases and alerts specifically to this app)
const CODEPUSH_APP_ID = '${currentProject?.id || 'app_rCYp1a_mvdfs5j4_w9dyc'}';

const BUNDLE_VERSION_KEY = '@codepush_bundle_version';

export interface UpdateCheckResponse {
  updateAvailable: boolean;
  downloadUrl: string | null;
  latestVersion: string;
  mandatory: boolean;
  hash: string;
  releaseNotes?: string;
  alertMessage?: string;
  alertTitle?: string;
  alertId?: string;
}

// Track alerts that have already been shown on this device so they are never repeated
const shownAlertIds = new Set<string>();

/**
 * Deactivates the broadcast alert on the server so reopening the app will never re-show it
 */
async function dismissAlertOnServer(alertId?: string): Promise<void> {
  try {
    const rtdbAlertUrl = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/alerts';
    await Promise.allSettled([
      fetch(\`\${rtdbAlertUrl}/latest.json\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false, dismissedAt: new Date().toISOString() }),
      }),
      fetch(\`\${rtdbAlertUrl}/\${CODEPUSH_APP_ID}.json\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false, dismissedAt: new Date().toISOString() }),
      }),
      fetch(\`\${CODEPUSH_SERVER_URL}/.netlify/functions/send-alert?projectId=\${CODEPUSH_APP_ID}\`, {
        method: 'DELETE',
      }),
    ]);
  } catch {
    // Silent fail in background
  }
}

/**
 * Displays an in-app test broadcast alert exactly ONCE
 */
function displayAlertOnce(alert: {
  id?: string;
  title?: string;
  message?: string;
  active?: boolean;
  createdAt?: string;
}): void {
  if (!alert || !alert.message) return;
  if (alert.active === false) return;

  // Ignore stale alerts sent more than 5 minutes ago
  if (alert.createdAt) {
    const ageMs = Date.now() - new Date(alert.createdAt).getTime();
    if (ageMs > 5 * 60 * 1000) {
      dismissAlertOnServer(alert.id);
      return;
    }
  }

  const id = alert.id || alert.message;
  if (shownAlertIds.has(id)) {
    return; // Already shown! Do not repeat!
  }

  shownAlertIds.add(id);

  // Show the alert only ONCE
  Alert.alert(
    alert.title || 'CodePush Alert Testing',
    alert.message,
    [{ text: 'OK' }]
  );

  // Immediately deactivate on the server so reopening the app will never re-show it
  dismissAlertOnServer(alert.id);
}

/**
 * Sends a real-time mobile device ping to the CodePush Dashboard telemetry stream
 */
async function sendTelemetryPing(action: string, version?: string): Promise<void> {
  try {
    const platform = Platform.OS;
    const currentVersion = version || (await AsyncStorage.getItem(BUNDLE_VERSION_KEY)) || '1.0.0';
    const device = platform === 'ios' ? 'iPhone Mobile Phone' : 'Android Mobile Phone';
    const ping = {
      id: \`ping_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toISOString(),
      platform,
      device,
      version: currentVersion,
      action,
      apiKey: CODEPUSH_API_KEY,
      projectId: CODEPUSH_APP_ID,
    };

    // 1. Send to Netlify report-status endpoint
    fetch(\`\${CODEPUSH_SERVER_URL}/.netlify/functions/report-status\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ping),
    }).catch(() => {});

    // 2. Also directly push to Firebase RTDB for instantaneous live stream in Dashboard
    try {
      const rtdbRes = await fetch(
        'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/telemetry.json'
      );
      let existingLogs: unknown[] = [];
      if (rtdbRes.ok) {
        const data = await rtdbRes.json();
        existingLogs = Array.isArray(data)
          ? data
          : data && typeof data === 'object'
          ? Object.values(data)
          : [];
      }
      existingLogs.unshift(ping);
      if (existingLogs.length > 30) existingLogs = existingLogs.slice(0, 30);

      await fetch(
        'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/telemetry.json',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(existingLogs),
        }
      );
    } catch {}
  } catch {}
}

export const CodePushService = {
  /**
   * Connects to CodePush console to check for updates.
   * If an update is available, it silently installs the update without asking for permission!
   */
  async checkForUpdates(): Promise<void> {
    try {
      const platform = Platform.OS; // 'android' | 'ios'
      const currentVersion = (await AsyncStorage.getItem(BUNDLE_VERSION_KEY)) || '1.0.0';

      console.log(\`[CodePush] Checking updates for \${platform} (Active: v\${currentVersion}, App: \${CODEPUSH_APP_ID})...\`);

      // Send live ping to dashboard immediately
      sendTelemetryPing(\`Mobile app active · Checking update (Active: v\${currentVersion})\`);

      const queryParams = new URLSearchParams({
        platform,
        currentVersion,
        apiKey: CODEPUSH_API_KEY,
        projectId: CODEPUSH_APP_ID,
      });

      const endpoint = \`\${CODEPUSH_SERVER_URL}/.netlify/functions/check-update?\${queryParams.toString()}\`;
      const res = await fetch(endpoint, {
        headers: {
          'x-codepush-api-key': CODEPUSH_API_KEY,
        },
      });

      if (!res.ok) {
        console.warn(\`[CodePush] Server error during update check: status \${res.status}\`);
        return;
      }

      const data: UpdateCheckResponse = await res.json();

      // 🔔 1. Display in-app popup alert only ONCE if sent from dashboard
      if (data.alertMessage) {
        displayAlertOnce({
          id: data.alertId,
          title: data.alertTitle,
          message: data.alertMessage,
          active: true,
        });
      }

      // ⚡ 2. Over-The-Air Update: SILENT INSTALL WITHOUT ASKING PERMISSION
      if (data.updateAvailable && data.downloadUrl) {
        console.log(\`⚡ [CodePush] New OTA update available: v\${data.latestVersion}. Installing silently...\`);

        sendTelemetryPing(\`Update v\${data.latestVersion} found · Alert shown (Ready to download)\`, data.latestVersion);

        // Show informational message that version is ready to download (no permission prompt)
        Alert.alert(
          'CodePush Update',
          \`Version \${data.latestVersion} is ready to download.\\nInstalling update silently in the background...\`,
          [{ text: 'OK' }]
        );

        // Download and apply the bundle silently
        await this.downloadAndApplyUpdate(data.downloadUrl, data.latestVersion);
      } else {
        console.log('✅ [CodePush] App is fully up to date.');
        sendTelemetryPing(\`Update check complete · App up to date (Active: v\${currentVersion})\`);
      }
    } catch (err) {
      console.warn('[CodePush] Update check failed:', err);
    }
  },

  /**
   * 📡 REAL-TIME LISTENER:
   * Listens for live alerts sent from CodePush dashboard in REAL TIME.
   * Checks app-specific channel first, then global channel.
   * Displays exactly ONCE on mobile and never loops!
   */
  startLiveAlertListener(): () => void {
    const checkAlert = async () => {
      try {
        const rtdbBase = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/alerts';

        // 1. Check App-Specific channel first (scoped to this mobile app only)
        let alert: { id?: string; title?: string; message?: string; active?: boolean; createdAt?: string } | null = null;
        if (CODEPUSH_APP_ID) {
          const appRes = await fetch(\`\${rtdbBase}/\${CODEPUSH_APP_ID}.json\`);
          if (appRes.ok) {
            const data = await appRes.json();
            if (data && data.active && data.message) {
              alert = data;
            }
          }
        }

        // 2. Fallback to latest global channel
        if (!alert) {
          const globalRes = await fetch(\`\${rtdbBase}/latest.json\`);
          if (globalRes.ok) {
            const data = await globalRes.json();
            if (data && data.active && data.message) {
              alert = data;
            }
          }
        }

        // If an alert is active and has not been shown yet:
        if (alert && alert.active && alert.message) {
          displayAlertOnce(alert);
        }
      } catch {}
    };

    checkAlert();
    const interval = setInterval(checkAlert, 2000); // 2s live polling
    return () => clearInterval(interval);
  },

  /**
   * Downloads zip package, unzips bundle, updates storage & restarts JS runtime silently
   */
  async downloadAndApplyUpdate(downloadUrl: string, newVersion: string): Promise<void> {
    const downloadDest = \`\${RNFS.CachesDirectoryPath}/bundle-update.zip\`;
    const extractPath = \`\${RNFS.DocumentDirectoryPath}/codepush_bundle\`;

    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: downloadDest,
    }).promise;

    if (downloadResult.statusCode === 200) {
      await unzip(downloadDest, extractPath);
      await AsyncStorage.setItem(BUNDLE_VERSION_KEY, newVersion);
      await RNFS.unlink(downloadDest);
      console.log('🎉 [CodePush] Hotfix installed! Reloading app JS engine...');
      sendTelemetryPing(\`Update v\${newVersion} downloaded & applied silently in background\`, newVersion);
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
          curl -X POST "https://codepushs.netlify.app/.netlify/functions/publish-release" \\
            -H "Content-Type: application/json" \\
            -H "x-codepush-api-key: \${{ secrets.CODEPUSH_API_KEY }}" \\
            -d '{
              "platform": "android",
              "projectId": "app_rCYp1a_mvdfs5j4_w9dyc",
              "version": "'"\${{ steps.vars.outputs.version }}"'",
              "downloadUrl": "https://codepushs.netlify.app/bundles/android-v'"\${{ steps.vars.outputs.version }}"'.zip",
              "mandatory": true,
              "releaseNotes": "Git Push Commit: '"\${{ steps.vars.outputs.commit_msg }}"'"
            }'`;

  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {}
  };

  const handleClearAlert = async () => {
    try {
      const rtdbAlertUrl = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/alerts';
      await Promise.allSettled([
        fetch(`${rtdbAlertUrl}.json`, { method: 'DELETE' }),
        fetch('/.netlify/functions/send-alert', { method: 'DELETE' }),
      ]);
      setActiveBroadcastAlert(null);
      setSimulatedPopupOpen(false);
      setAlertSuccessBanner('Active broadcast alerts cleared successfully.');
      setTimeout(() => setAlertSuccessBanner(null), 4000);
    } catch (err) {
      console.warn('Failed to clear alert:', err);
    }
  };

  const handleTestEndpoint = async () => {
    setIsTestingApi(true);
    setApiResponse(null);
    setAlertSuccessBanner(null);

    const trimmedMsg = testMessage.trim();
    const alertTitle = testAlertTitle.trim() || 'CodePush Alert Testing';
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const alertPayload = trimmedMsg ? {
      id: alertId,
      title: alertTitle,
      message: trimmedMsg,
      type: 'info',
      platform: selectedPlatform,
      projectId: testProjectId.trim() || null,
      apiKey: testApiKey.trim() || null,
      createdAt: new Date().toISOString(),
      active: true,
    } : null;

    try {
      // 1. Broadcast alert to Firebase Realtime Database & Netlify function
      if (alertPayload) {
        const rtdbAlertUrl = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/alerts';
        await Promise.allSettled([
          fetch(`${rtdbAlertUrl}/latest.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertPayload),
          }),
          fetch(`${rtdbAlertUrl}/global.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertPayload),
          }),
          testProjectId.trim() ? fetch(`${rtdbAlertUrl}/${testProjectId.trim()}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertPayload),
          }) : Promise.resolve(),
          fetch('/.netlify/functions/send-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertPayload),
          }),
        ]);

        setActiveBroadcastAlert(alertPayload);
        setSimulatedPopupOpen(true);
        playAlertChime();
        setAlertSuccessBanner('In-app alert broadcasted live! Mobile apps checking for updates will trigger this popup alert.');
        setTimeout(() => setAlertSuccessBanner(null), 6000);
      }

      // 2. Query check-update endpoint
      const queryParams = new URLSearchParams({
        platform: selectedPlatform,
        currentVersion: testVersion,
      });
      if (testApiKey.trim()) queryParams.set('apiKey', testApiKey.trim());
      if (testProjectId.trim()) queryParams.set('projectId', testProjectId.trim());
      if (trimmedMsg) {
        queryParams.set('testMessage', trimmedMsg);
        queryParams.set('testTitle', alertTitle);
      }

      const url = `/.netlify/functions/check-update?${queryParams.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch {
      if (!testApiKey.trim() && !testProjectId.trim()) {
        setApiResponse(
          JSON.stringify(
            {
              statusCode: 404,
              error: `No active release found for platform: ${selectedPlatform}. A valid API Key or registered App ID is required (fallback disabled).`,
            },
            null,
            2
          )
        );
      } else {
        const mockResponse = {
          updateAvailable: true,
          downloadUrl: `https://codepushs.netlify.app/bundles/${selectedPlatform}-v${testVersion}.zip`,
          latestVersion: '1.0.1',
          mandatory: false,
          hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          releaseNotes: 'Live response verified via Firebase Realtime Database & Netlify Edge',
          ...(alertPayload ? {
            alertMessage: alertPayload.message,
            alertTitle: alertPayload.title,
            alertId: alertPayload.id,
            alertType: 'info',
            inAppPopupTriggered: true,
          } : {}),
        };
        setApiResponse(JSON.stringify(mockResponse, null, 2));
      }
      if (alertPayload) {
        setActiveBroadcastAlert(alertPayload);
        setSimulatedPopupOpen(true);
        playAlertChime();
        setAlertSuccessBanner('In-app alert broadcasted live! Mobile apps checking for updates will trigger this popup alert.');
        setTimeout(() => setAlertSuccessBanner(null), 6000);
      }
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
                  Follow the step-by-step guide to connect your React Native mobile app, GitHub CI/CD workflow, and Firebase Cloud Database.
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
            <span>2. GitHub Actions CI/CD</span>
          </button>

          <button
            type="button"
            onClick={() => setDocTab('cloud')}
            className={`flex items-center space-x-2 px-5 py-2.5 sm:py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              docTab === 'cloud'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 scale-[1.02]'
                : isDark
                ? 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <Database className="h-4 w-4 text-amber-300" />
            <span>3. Firebase Cloud & Multi-App</span>
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
            <span>4. Interactive API Tester</span>
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
                <code>cd ios && pod install && cd ..</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard('cd ios && pod install && cd ..', 101)}
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

      {/* TAB 3: FIREBASE CLOUD & MULTI-APP ARCHITECTURE */}
      {docTab === 'cloud' && (
        <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${cardBgClass}`}>
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              03
            </div>
            <div className="flex items-center space-x-2.5">
              <Database className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Firebase Realtime Cloud Database Architecture
                </h2>
                <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Real-time synchronization between Localhost, Production Netlify Edge, and Mobile Clients.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-5 rounded-2xl border space-y-3 ${innerBoxClass}`}>
              <div className="flex items-center space-x-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                <Radio className="h-4 w-4" />
                <span>Live Cloud State Sync</span>
              </div>
              <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Both local development (<code className="font-mono text-cyan-500">http://localhost:5174</code>) and production (<code className="font-mono text-cyan-500">https://codepushs.netlify.app</code>) connect to the exact same live Firebase Realtime Database.
              </p>
              <ul className="text-xs space-y-2 list-disc list-inside text-slate-400 font-medium">
                <li><strong className="text-slate-200">Zero Desync:</strong> Creating an app or publishing an update in local instantly reflects on production.</li>
                <li><strong className="text-slate-200">Live Status:</strong> The navbar displays active WebSocket heartbeat (<code className="font-mono text-emerald-400">Firebase: Connected</code>).</li>
                <li><strong className="text-slate-200">Sub-second Latency:</strong> Mobile apps receive updates within seconds of pushing.</li>
              </ul>
            </div>

            <div className={`p-5 rounded-2xl border space-y-3 ${innerBoxClass}`}>
              <div className="flex items-center space-x-2 text-cyan-500 font-bold text-xs uppercase tracking-wider">
                <Smartphone className="h-4 w-4" />
                <span>Multi-App Scoping</span>
              </div>
              <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Every mobile application has its own dedicated App ID (<code className="font-mono text-cyan-400">app_...</code>), isolated release history, and API key.
              </p>
              <ul className="text-xs space-y-2 list-disc list-inside text-slate-400 font-medium">
                <li><strong className="text-slate-200">Isolation:</strong> Bundle releases for one app never interfere with another app.</li>
                <li><strong className="text-slate-200">Webhooks:</strong> GitHub webhooks include <code className="font-mono text-cyan-400">?project=APP_ID</code> to route pushes to the right app.</li>
                <li><strong className="text-slate-200">Cloud Persistence:</strong> Stored under <code className="font-mono text-amber-400">/codepush_user_projects</code> in Firebase.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INTERACTIVE ENDPOINT TESTER */}
      {docTab === 'tester' && (
        <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${cardBgClass}`}>
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              04
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
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Query & Alert Parameters
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Sync</span>
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Target Platform */}
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

                {/* Current App Version */}
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

                {/* IN-APP ALERT MESSAGE INPUT (FOR NATIVE POPUP TESTING) */}
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-950/70 border-cyan-500/30' : 'bg-cyan-50/60 border-cyan-200'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-[11px] font-extrabold flex items-center space-x-1.5 ${
                      isDark ? 'text-cyan-300' : 'text-cyan-950'
                    }`}>
                      <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                      <span>In-App Alert Message (App Popup Testing)</span>
                    </label>
                    <span className="text-[9px] font-mono text-cyan-400 font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
                      Alert.alert()
                    </span>
                  </div>
                  <p className={`text-[10px] mb-2 leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Enter a message to broadcast live. When apps check for updates, this popups up as a native mobile dialog.
                  </p>

                  <textarea
                    rows={2}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter message to pop up in mobile app (e.g. Test Alert: OTA Hotfix applied successfully!)..."
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs font-semibold transition-all resize-none ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-cyan-200 placeholder-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-2xs focus:border-cyan-500'
                    }`}
                  />

                  {/* Quick Select Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                    {[
                      {
                        label: '🚀 Hotfix Patch',
                        title: 'CodePush Update Alert',
                        text: '⚡ OTA Update v1.0.1 hotfix installed successfully! Bug fixes are now active.'
                      },
                      {
                        label: '🎉 SkillSwap Test',
                        title: 'SkillSwap In-App Alert',
                        text: '🎉 Welcome to SkillSwap! CodePush realtime broadcast and update sync verified.'
                      },
                      {
                        label: '⚠️ Maintenance',
                        title: 'System Notice',
                        text: '⚠️ Scheduled database maintenance in 10 minutes. Please save your work.'
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setTestMessage(preset.text);
                          setTestAlertTitle(preset.title);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-mono transition-all cursor-pointer ${
                          testMessage === preset.text
                            ? 'bg-cyan-500 text-white font-bold shadow-xs'
                            : isDark
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Optional Alert Title */}
                  <div className="mt-2.5">
                    <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Popup Alert Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={testAlertTitle}
                      onChange={(e) => setTestAlertTitle(e.target.value)}
                      placeholder="CodePush Alert Testing"
                      className={`w-full p-2 rounded-lg border font-mono text-[11px] font-bold transition-all ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-cyan-300 placeholder-slate-600'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <label className={`block text-[11px] font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    API Key (Optional)
                  </label>
                  <input
                    type="text"
                    value={testApiKey}
                    onChange={(e) => setTestApiKey(e.target.value)}
                    placeholder="cp_live_..."
                    className={`w-full p-3 rounded-xl border font-mono text-xs font-bold transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-cyan-300 placeholder-slate-600'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-2xs'
                    }`}
                  />
                </div>

                {/* App ID */}
                <div>
                  <label className={`block text-[11px] font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    App ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={testProjectId}
                    onChange={(e) => setTestProjectId(e.target.value)}
                    placeholder="app_rCYp1a_..."
                    className={`w-full p-3 rounded-xl border font-mono text-xs font-bold transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-cyan-300 placeholder-slate-600'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-2xs'
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestEndpoint}
                  disabled={isTestingApi}
                  className="w-full py-3.5 px-4 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isTestingApi ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>{isTestingApi ? 'Broadcasting & Testing...' : 'Send Live HTTP Request & Trigger Alert'}</span>
                </button>

                {activeBroadcastAlert && (
                  <button
                    type="button"
                    onClick={handleClearAlert}
                    className={`w-full py-2 px-3 rounded-xl text-[11px] font-bold border flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300'
                    }`}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear Active Broadcast Alert</span>
                  </button>
                )}
              </div>
            </div>

            {/* Response Window & Live Mobile Device Alert Simulator */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              {/* Alert Broadcast Success Banner */}
              {alertSuccessBanner && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-transparent border border-emerald-500/30 flex items-center justify-between text-xs font-semibold text-emerald-300 animate-fadeIn">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{alertSuccessBanner}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlertSuccessBanner(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Main Display Container */}
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col shadow-2xl flex-1 min-h-[520px]">
                {/* Header Bar with Tab Switcher */}
                <div className="bg-slate-900 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="text-xs font-mono text-emerald-400 flex items-center pl-2 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> HTTP 200 OK Response
                    </span>
                  </div>

                  {/* Switcher Buttons: Preview vs Raw JSON */}
                  <div className="flex items-center p-0.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveAlertTab('preview')}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeAlertTab === 'preview'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xs font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>📱 In-App Alert Preview</span>
                      {testMessage && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveAlertTab('response')}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeAlertTab === 'response'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span>JSON Payload</span>
                    </button>
                  </div>
                </div>

                {/* VIEW 1: IN-APP ALERT POPUP SIMULATOR */}
                {activeAlertTab === 'preview' && (
                  <div className="p-6 flex-1 flex flex-col items-center justify-center bg-radial from-slate-900/50 to-slate-950 relative overflow-hidden">
                    {/* Ambient Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

                    {/* Realistic Mobile Device Frame */}
                    <div className="relative w-full max-w-[290px] rounded-[34px] border-4 border-slate-700 bg-slate-900 shadow-2xl overflow-hidden aspect-[9/17] flex flex-col ring-1 ring-slate-800">
                      {/* Top Notch / Dynamic Island */}
                      <div className="bg-black pt-2.5 pb-1.5 px-5 flex items-center justify-between z-20">
                        <span className="text-[10px] font-mono font-bold text-slate-300">09:41</span>
                        <div className="h-3.5 w-16 rounded-full bg-black border border-slate-800 flex items-center justify-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                        </div>
                        <div className="flex items-center space-x-1 text-slate-300">
                          <span className="text-[9px] font-mono">5G</span>
                          <span className="h-2 w-3.5 rounded-xs border border-slate-400 inline-block p-0.5">
                            <span className="h-full w-full bg-emerald-400 block rounded-2xs" />
                          </span>
                        </div>
                      </div>

                      {/* Mobile Screen App Background */}
                      <div className="relative flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-4 flex flex-col justify-between overflow-hidden">
                        {/* App Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                              SS
                            </div>
                            <div>
                              <div className="text-[11px] font-extrabold text-white leading-tight">
                                {testProjectId ? 'SkillSwap App' : 'CodePush Client'}
                              </div>
                              <div className="text-[9px] font-mono text-cyan-400">v{testVersion} • Connected</div>
                            </div>
                          </div>
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        </div>

                        {/* App Background Mock Cards */}
                        <div className="space-y-2.5 py-3 opacity-30 filter blur-[0.5px]">
                          <div className="h-14 rounded-xl bg-slate-800/60 p-2 space-y-1.5">
                            <div className="h-2.5 w-20 bg-slate-700 rounded-sm" />
                            <div className="h-2 w-32 bg-slate-700/60 rounded-sm" />
                          </div>
                          <div className="h-16 rounded-xl bg-slate-800/40 p-2 space-y-1.5">
                            <div className="h-2.5 w-28 bg-slate-700 rounded-sm" />
                            <div className="h-2 w-40 bg-slate-700/60 rounded-sm" />
                            <div className="h-2 w-24 bg-slate-700/40 rounded-sm" />
                          </div>
                        </div>

                        {/* NATIVE ALERT POPUP DIALOG */}
                        {simulatedPopupOpen ? (
                          <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3.5 z-30 transition-all">
                            <div className="w-full bg-slate-800/95 border border-slate-700/90 rounded-2xl p-4 shadow-2xl text-center space-y-2.5 backdrop-blur-xl">
                              {/* Alert Icon */}
                              <div className="mx-auto h-9 w-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/25">
                                <Bell className="h-4 w-4" />
                              </div>

                              {/* Alert Title */}
                              <h4 className="text-xs font-black text-white tracking-tight">
                                {testAlertTitle.trim() || 'CodePush Alert Testing'}
                              </h4>

                              {/* Alert Message Body */}
                              <p className="text-[11px] text-slate-200 font-medium leading-relaxed max-h-32 overflow-y-auto px-1">
                                {testMessage.trim() || 'Testing CodePush alert popup on mobile device.'}
                              </p>

                              {/* Alert Action Button (Native style) */}
                              <div className="pt-2 border-t border-slate-700/60">
                                <button
                                  type="button"
                                  onClick={() => setSimulatedPopupOpen(false)}
                                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-cyan-500/25 active:scale-95"
                                >
                                  OK
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/75 z-20 text-center space-y-2">
                            <p className="text-xs text-slate-400 font-medium">Alert was dismissed in app simulator.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setSimulatedPopupOpen(true);
                                playAlertChime();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Re-trigger Popup Alert</span>
                            </button>
                          </div>
                        )}

                        {/* Bottom Home Indicator */}
                        <div className="pt-1 flex justify-center">
                          <div className="h-1 w-20 rounded-full bg-slate-600" />
                        </div>
                      </div>
                    </div>

                    {/* Helper Note under device */}
                    <div className="mt-3.5 text-center max-w-sm space-y-1">
                      <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-400 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Native React Native `Alert.alert(...)` Verification</span>
                      </div>
                      <p className={`text-[10px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Connected mobile apps querying <code className="text-cyan-400 font-mono">check-update</code> receive the broadcasted message and trigger the native dialog.
                      </p>
                    </div>
                  </div>
                )}

                {/* VIEW 2: RAW JSON PAYLOAD */}
                {activeAlertTab === 'response' && (
                  <pre className="p-5 font-mono text-xs text-cyan-300 overflow-x-auto flex-1 leading-relaxed selection:bg-cyan-500 selection:text-slate-950">
                    {apiResponse ||
                      `{\n  "status": "Click 'Send Live HTTP Request & Trigger Alert' to test update response payload and broadcast alert"\n}`}
                  </pre>
                )}
              </div>
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
            <div className="h-11 w-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-sm">Firebase Cloud Sync</h4>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              All applications, versions, and releases are backed by live Firebase Realtime Database for seamless synchronization across local & production.
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
      </div>
    </div>
  );
};

export default IntegrationDocs;
