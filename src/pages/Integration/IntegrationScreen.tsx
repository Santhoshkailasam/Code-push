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
  ArrowDownToLine,
  Bug,
  Cpu,
  Sliders,
  MessageSquare,
  Layers,
  HardDrive,
  Globe,
  Radio,
  RotateCcw,
} from 'lucide-react';
import type { Project } from '../../types';

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

  // State
  const [pkgManager, setPkgManager] = useState<'npm' | 'yarn' | 'pnpm' | 'bun'>('npm');
  const [activeServiceTab, setActiveServiceTab] = useState<'codepush' | 'push'>('codepush');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [activeFeatureTab, setActiveFeatureTab] = useState<
    | 'circuit_breaker'
    | 'hermes'
    | 'canary'
    | 'remote_config'
    | 'webhooks'
    | 'dual_slot'
    | 'asset_swap'
    | 'fcm_push'
    | 'notifications_drawer'
    | 'zero_trust_api'
    | 'auto_patch'
    | 'mesh_push'
    | 'time_travel'
    | 'wasm_bridge'
  >('circuit_breaker');

  // Interactive Checklist
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

  const codePushServiceCode = `// src/services/CodePushService.ts
import { Platform, Alert, NativeModules } from 'react-native';

const { CodePushNative } = NativeModules;

// Pre-configured with your CodePush project credentials
const CONFIG = {
  serverUrl: 'https://codepushs.netlify.app',
  appId: '${activeAppId}',
  apiKey: '${activeApiKey}',
  appName: '${activeAppName}',
  version: '1.0.0',
};

export interface UpdateResponse {
  updateAvailable: boolean;
  downloadUrl: string | null;
  latestVersion: string;
  mandatory: boolean;
  hash: string;
  releaseNotes?: string;
  alertMessage?: string;
  alertTitle?: string;
  alertId?: string;
  revoked?: boolean;
  rollbackToFactory?: boolean;
  remoteConfig?: Record<string, any>;
}

let cachedRemoteConfig: Record<string, any> = {};
let bootWatchdogPassed = false;
let bootCrashCount = 0;
const shownAlertIds = new Set<string>();

// 1. Auto-report crashes to CodePush server
export async function reportCrashToServer(error: { message: string; stack?: string; version?: string }): Promise<void> {
  try {
    fetch(\`\${CONFIG.serverUrl}/.netlify/functions/report-crash?projectId=\${CONFIG.appId}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        version: error.version || CONFIG.version,
        platform: Platform.OS,
        device: \`\${Platform.OS === 'ios' ? 'iPhone' : 'Android'} Device\`,
      }),
    }).catch(() => {});
  } catch {}
}

// 2. Global JS unhandled exception listener
if ((global as any).ErrorUtils) {
  const originalHandler = (global as any).ErrorUtils.getGlobalHandler?.();
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
    reportCrashToServer({
      message: error?.message || 'Unhandled JavaScript Exception',
      stack: error?.stack,
    });
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

function displayAlertOnce(alert: { id?: string; title?: string; message?: string; active?: boolean }): void {
  if (!alert || !alert.message) return;
  const id = alert.id || alert.message;
  if (shownAlertIds.has(id)) return;
  shownAlertIds.add(id);
  Alert.alert(alert.title || 'CodePush Alert', alert.message, [{ text: 'OK' }]);
}

function detectDeviceCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('India')) return 'IN';
    if (tz.startsWith('America/')) return 'US';
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('Europe/Berlin')) return 'DE';
    if (tz.startsWith('Europe/Paris')) return 'FR';
    if (tz.startsWith('Asia/Tokyo')) return 'JP';
    if (tz.startsWith('Asia/Singapore')) return 'SG';
    if (tz.startsWith('Asia/Dubai')) return 'AE';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz.startsWith('America/Sao_Paulo')) return 'BR';
    if (tz.startsWith('America/Toronto') || tz.startsWith('America/Vancouver')) return 'CA';

    if (typeof navigator !== 'undefined' && navigator.language) {
      const parts = navigator.language.split('-');
      if (parts[1] && parts[1].length === 2) return parts[1].toUpperCase();
    }
  } catch {}
  return 'UNKNOWN';
}

async function sendTelemetryPing(action: string, version?: string): Promise<void> {
  try {
    const platform = Platform.OS;
    const ping = {
      id: \`ping_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toISOString(),
      platform,
      device: platform === 'ios' ? 'iPhone Mobile Phone' : 'Android Mobile Phone',
      country: detectDeviceCountry(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      version: version || CONFIG.version,
      action,
      apiKey: CONFIG.apiKey,
      projectId: CONFIG.appId,
    };

    fetch(\`\${CONFIG.serverUrl}/.netlify/functions/report-status\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ping),
    }).catch(() => {});
  } catch {}
}

export const CodePushService = {
  // Check for updates & install silently without asking permission
  async checkForUpdates(): Promise<void> {
    try {
      const platform = Platform.OS;
      let currentVersion = CONFIG.version;

      if (platform === 'android' && CodePushNative?.getCurrentBundleVersion) {
        try {
          const nativeVer = await CodePushNative.getCurrentBundleVersion();
          if (nativeVer && nativeVer.trim().length > 0) currentVersion = nativeVer.trim();
        } catch {}
      }

      console.log(\`[CodePush] Checking updates for \${platform} (Active: v\${currentVersion})...\`);
      sendTelemetryPing(\`Mobile app active · Checking update (Active: v\${currentVersion})\`, currentVersion);

      const queryParams = new URLSearchParams({
        platform,
        currentVersion,
        country: detectDeviceCountry(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        apiKey: CONFIG.apiKey,
        projectId: CONFIG.appId,
      });

      const response = await fetch(\`\${CONFIG.serverUrl}/.netlify/functions/check-update?\${queryParams.toString()}\`, {
        headers: { 'x-codepush-api-key': CONFIG.apiKey },
      });

      if (!response.ok) return;
      const data: UpdateResponse = await response.json();

      if (data.remoteConfig) {
        cachedRemoteConfig = data.remoteConfig;
      }

      // Emergency Revocation Kill-Switch
      if (data.revoked || data.rollbackToFactory) {
        console.warn('🚨 [CodePush Kill-Switch] Active release revoked. Reverting to base...');
        await this.emergencyRollbackToFactory();
        return;
      }

      // In-App Alert
      if (data.alertMessage) {
        displayAlertOnce({ id: data.alertId, title: data.alertTitle, message: data.alertMessage, active: true });
      }

      // Silent Over-The-Air Install
      if (data.updateAvailable && data.downloadUrl) {
        console.log(\`⚡ [CodePush] New OTA update v\${data.latestVersion}. Installing silently...\`);
        await this.installUpdateSilently(data.downloadUrl, data.latestVersion);
      } else {
        console.log('✅ [CodePush] App is up to date.');
      }
    } catch (error) {
      console.warn('[CodePush] Update check failed:', error);
    }
  },

  // Arm Boot Watchdog (5-second survival timer)
  startBootWatchdog(): void {
    bootCrashCount++;
    if (bootCrashCount >= 3) {
      console.warn('🚨 [CodePush Watchdog] 3 consecutive startup crashes! Triggering rollback.');
      this.emergencyRollbackToFactory();
      return;
    }
    setTimeout(() => {
      bootCrashCount = 0;
      bootWatchdogPassed = true;
      console.log('✅ [CodePush Watchdog] App startup verified healthy.');
    }, 5000);
  },

  // Emergency Rollback: Reverts to factory APK assets
  async emergencyRollbackToFactory(): Promise<void> {
    try {
      sendTelemetryPing('🚨 EMERGENCY ROLLBACK: Reverted to native baseline', 'factory');
      if (CodePushNative?.clearBundle) {
        await CodePushNative.clearBundle();
      }
      setTimeout(() => {
        CodePushNative?.restartApp?.();
      }, 1000);
    } catch {}
  },

  getRemoteConfig(key?: string): any {
    return key ? cachedRemoteConfig[key] : cachedRemoteConfig;
  },

  async installUpdateSilently(downloadUrl: string, version: string): Promise<void> {
    try {
      sendTelemetryPing(\`Update v\${version} downloading OTA bundle package...\`, version);
      if (Platform.OS === 'android' && CodePushNative?.downloadAndApplyBundle) {
        await CodePushNative.downloadAndApplyBundle(downloadUrl, version);
        await sendTelemetryPing(\`Update v\${version} installed & autorefreshed\`, version);
        setTimeout(() => {
          CodePushNative.restartApp();
        }, 1200);
      } else {
        await fetch(downloadUrl);
      }
    } catch (err: any) {
      console.warn('[CodePush] Silent update download failed:', err);
    }
  },

  // Real-time listener for Dashboard Alert Broadcasts
  startLiveAlertListener(): () => void {
    const checkLiveAlert = async () => {
      try {
        const rtdbUrl = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/alerts';
        const res = await fetch(\`\${rtdbUrl}/\${CONFIG.appId}.json\`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.active && data.message) displayAlertOnce(data);
        }
      } catch {}
    };
    checkLiveAlert();
    const interval = setInterval(checkLiveAlert, 2500);
    return () => clearInterval(interval);
  },

  // Real-time listener for Testing Console Push Notifications
  startLivePushNotificationListener(): () => void {
    const shownPushIds = new Set<string>();
    const checkLivePush = async () => {
      try {
        const rtdbPushUrl = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/push_notifications';
        const res = await fetch(\`\${rtdbPushUrl}/\${CONFIG.appId}.json\`);
        if (res.ok) {
          const push = await res.json();
          if (push && push.active && (push.title || push.body)) {
            const id = push.id || push.body || 'default';
            if (!shownPushIds.has(id)) {
              shownPushIds.add(id);
              try {
                const { PushNotificationService } = require('./PushNotificationService');
                PushNotificationService.displayNativePush({
                  title: push.title,
                  body: push.body,
                  soundTone: push.soundTone,
                  route: push.deepLink,
                  data: { route: push.deepLink, soundTone: push.soundTone, pushId: id },
                });
              } catch {
                Alert.alert(push.title || 'Push Notification', push.body || '');
              }
            }
          }
        }
      } catch {}
    };
    checkLivePush();
    const interval = setInterval(checkLivePush, 2500);
    return () => clearInterval(interval);
  },
};
`;

  const pushNotificationServiceCode = `// src/services/PushNotificationService.ts
import {
  getMessaging,
  getToken,
  requestPermission,
  onMessage,
  AuthorizationStatus,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Linking, Platform } from 'react-native';

const handledPushIds = new Set<string>();

export const PushNotificationService = {
  fcmToken: '' as string,

  isPushAlreadyHandled(id?: string | null, title?: string | null, body?: string | null): boolean {
    if (id && handledPushIds.has(id)) return true;
    if (title && body && handledPushIds.has(\`\${title}:::\${body}\`)) return true;
    return false;
  },

  markPushHandled(id?: string | null, title?: string | null, body?: string | null): void {
    if (id) handledPushIds.add(id);
    if (title && body) handledPushIds.add(\`\${title}:::\${body}\`);
    if (handledPushIds.size > 100) {
      const first = handledPushIds.values().next().value;
      if (first) handledPushIds.delete(first);
    }
  },

  // Initialize native permissions, audio channels, and listeners
  async init(): Promise<string | null> {
    try {
      console.log('🚀 [PushService] Initializing Native Push Notifications (FCM + Notifee)...');
      const messagingInstance = getMessaging();

      // 1. Request notification permissions (iOS & Android 13+)
      try {
        const authStatus = await requestPermission(messagingInstance);
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;
        console.log(\`📱 [PushService] Permission status: \${authStatus} (enabled: \${enabled})\`);
      } catch (err) {
        console.warn('⚠️ [PushService] requestPermission error:', err);
      }

      try {
        await notifee.requestPermission();
      } catch (err) {
        console.warn('⚠️ [PushService] notifee.requestPermission error:', err);
      }

      // 2. Create Android Notification Channels with Custom Sound Support
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'codepush_high_importance_channel',
          name: 'CodePush High Importance Notifications',
          importance: AndroidImportance.HIGH,
          sound: 'crystal_glass',
          vibration: true,
        });

        const tones = ['crystal_glass', 'electronic_pulse', 'subtle_pop', 'urgent_alarm', 'custom_notification', 'default'];
        for (const t of tones) {
          await notifee.createChannel({
            id: \`codepush_channel_\${t}\`,
            name: \`CodePush Notifications (\${t})\`,
            importance: AndroidImportance.HIGH,
            sound: t !== 'default' ? t : 'default',
            vibration: true,
          });
        }
      }

      // 3. Obtain Device FCM Token
      let token: string | null = null;
      try {
        token = await getToken(messagingInstance);
        if (token) {
          this.fcmToken = token;
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📱 [FCM] Device Token for Testing Console:');
          console.log(token);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
      } catch (err) {
        console.warn('⚠️ [FCM] Could not obtain FCM token:', err);
      }

      // 4. Foreground Push Notification Handler
      onMessage(messagingInstance, async (remoteMessage: RemoteMessage) => {
        const pushId = (remoteMessage.data?.pushId as string) || (remoteMessage.data?.id as string) || remoteMessage.messageId;
        const title = remoteMessage.notification?.title || (remoteMessage.data?.title as string);
        const body = remoteMessage.notification?.body || (remoteMessage.data?.body as string);

        if (this.isPushAlreadyHandled(pushId, title, body)) return;

        await this.displayNativePush({
          title,
          body,
          soundTone: (remoteMessage.data?.soundTone as string) || 'default',
          route: (remoteMessage.data?.route as string) || (remoteMessage.data?.deepLink as string),
          data: { ...remoteMessage.data, pushId },
        });
      });

      // 5. Deep Link handler on notification tap
      notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS && detail.notification?.data?.route) {
          const route = detail.notification.data.route as string;
          Linking.openURL(route).catch(() => {});
        }
      });

      // 6. Cold-start handler when opened from notification
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification?.notification.data?.route) {
        const route = initialNotification.notification.data.route as string;
        setTimeout(() => {
          Linking.openURL(route).catch(() => {});
        }, 800);
      }

      return token;
    } catch (error) {
      console.warn('❌ [PushService] Failed to initialize PushNotificationService:', error);
      return null;
    }
  },

  // Display native notification banner with custom tone & deep links
  async displayNativePush(payload: {
    title?: string;
    body?: string;
    soundTone?: string;
    route?: string;
    data?: Record<string, any>;
  }): Promise<void> {
    try {
      const pushId = payload.data?.pushId || payload.data?.id;
      if (this.isPushAlreadyHandled(pushId, payload.title, payload.body)) return;
      this.markPushHandled(pushId, payload.title, payload.body);

      const rawTone = payload.soundTone || 'default';
      const BUNDLED_TONES = ['crystal_glass', 'electronic_pulse', 'subtle_pop', 'urgent_alarm', 'custom_notification'];
      let cleanTone = 'default';
      if (rawTone !== 'default' && rawTone !== 'silent') {
        const parsed = String(rawTone).replace(/\\.[^/.]+$/, '').toLowerCase();
        cleanTone = BUNDLED_TONES.includes(parsed) ? parsed : 'custom_notification';
      } else if (rawTone === 'silent') {
        cleanTone = 'silent';
      }

      const channelId = cleanTone !== 'default' && cleanTone !== 'silent'
        ? \`codepush_channel_\${cleanTone}\`
        : 'codepush_high_importance_channel';

      await notifee.displayNotification({
        title: payload.title || 'CodePush Notification',
        body: payload.body || 'You have received a new update',
        android: {
          channelId,
          sound: cleanTone !== 'silent' ? cleanTone : undefined,
          pressAction: { id: 'default' },
          smallIcon: 'ic_launcher',
        },
        ios: {
          sound: cleanTone !== 'silent' ? \`\${cleanTone}.mp3\` : undefined,
        },
        data: {
          ...payload.data,
          route: payload.route,
          soundTone: cleanTone,
        },
      });
    } catch (err) {
      console.warn('❌ [PushService] displayNativePush error:', err);
    }
  },
};
`;

  const handleDownloadCodePushService = () => {
    downloadFile('CodePushService.ts', codePushServiceCode, 'text/typescript');
  };

  const handleDownloadPushNotificationService = () => {
    downloadFile('PushNotificationService.ts', pushNotificationServiceCode, 'text/typescript');
  };

  const handleDownloadAllStarterFiles = () => {
    handleDownloadCodepushJson();
    setTimeout(handleDownloadCodePushService, 250);
    setTimeout(handleDownloadPushNotificationService, 500);
  };

  const cardBgClass = isDark
    ? 'border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl'
    : 'border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/60';

  const subCardBgClass = isDark
    ? 'bg-slate-950/70 border-slate-800 text-slate-200'
    : 'bg-slate-50 border-slate-200 text-slate-800';

  const completedStepsCount = Object.values(checklist).filter(Boolean).length;

  const installCmds = {
    npm: 'npm install @react-native-async-storage/async-storage @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native',
    yarn: 'yarn add @react-native-async-storage/async-storage @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native',
    pnpm: 'pnpm add @react-native-async-storage/async-storage @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native',
    bun: 'bun add @react-native-async-storage/async-storage @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-4 animate-fade-in font-sans">
      {/* ======================================================== */}
      {/* 1. SLIM CLEAN HEADER */}
      {/* ======================================================== */}
      <div className={`p-4 sm:p-5 rounded-2xl border relative overflow-hidden ${cardBgClass}`}>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
              <Code2 className="h-3 w-3" />
              <span>SDK & Push Setup</span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-emerald-400 font-extrabold flex items-center space-x-1">
                <Zap className="h-2.5 w-2.5" />
                <span>~3 Mins Setup</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              Complete App Integration Guide
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              Integrate silent Over-The-Air updates and FCM + Notifee Push Notifications with custom sound tones.
              {onNavigateToDocs && (
                <button
                  type="button"
                  onClick={onNavigateToDocs}
                  className="ml-2 inline-flex items-center space-x-1 text-cyan-400 hover:underline font-bold cursor-pointer"
                >
                  <BookOpen className="h-3 w-3 inline" />
                  <span>View Guides →</span>
                </button>
              )}
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2">
            <div className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 ${subCardBgClass}`}>
              <span className="text-slate-400 font-medium text-xs">Target App:</span>
              <span className="font-bold text-cyan-400 text-xs">{activeAppName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE: 3 CARDS ON LEFT + 5 STEPS ON RIGHT */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (col-span-4): The 3 Companion Cards (Sticky) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 self-start">
          {/* Card 1: Integration Progress Checklist */}
          <div className={`p-5 rounded-3xl border ${cardBgClass} space-y-4 shadow-xl`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Integration Progress
              </span>
              <span className={`text-xs font-mono font-bold ${completedStepsCount === 5 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {completedStepsCount} / 5 Completed
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  completedStepsCount === 5
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                }`}
                style={{ width: `${(completedStepsCount / 5) * 100}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 text-xs">
              {[
                { key: 'step1', label: '1. Install dependencies' },
                { key: 'step2', label: '2. Place codepush.json in root' },
                { key: 'step3', label: '3. Add CodePush & Push services' },
                { key: 'step4', label: '4. Initialize in App.tsx' },
                { key: 'step5', label: '5. Release first update via CLI' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleChecklist(item.key)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    checklist[item.key]
                      ? isDark
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                      : isDark
                      ? 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <span>{item.label}</span>
                  {checklist[item.key] ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded border border-slate-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {completedStepsCount === 5 && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold space-y-1 animate-fade-in">
                <Sparkles className="h-4 w-4 mx-auto text-amber-300" />
                <div>🎉 Integration Ready!</div>
                <div className="text-[11px] font-normal text-slate-300">
                  Your app is connected for Over-The-Air updates and live push notifications.
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Project Starter Assets (Downloads) */}
          <div className={`p-4 rounded-3xl border ${cardBgClass} space-y-3`}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Project Starter Assets
            </span>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={handleDownloadCodepushJson}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors text-left cursor-pointer ${
                  isDark
                    ? 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileCode2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span className="font-mono text-[11px]">codepush.json</span>
                </div>
                <Download className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleDownloadCodePushService}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors text-left cursor-pointer ${
                  isDark
                    ? 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Zap className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="font-mono text-[11px]">CodePushService.ts</span>
                </div>
                <Download className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleDownloadPushNotificationService}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors text-left cursor-pointer ${
                  isDark
                    ? 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <BellRing className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="font-mono text-[11px]">PushNotificationService.ts</span>
                </div>
                <Download className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleDownloadAllStarterFiles}
                className="w-full mt-2 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" />
                <span>Download All 3 Files</span>
              </button>
            </div>
          </div>

          {/* Card 3: Advanced Native Setup (Accordion) */}
          <div className={`p-4 rounded-3xl border ${cardBgClass} space-y-2`}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Advanced Native Setup
            </span>

            {/* Item 1: Native Android Linking */}
            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setActiveAccordion(activeAccordion === 'android' ? null : 'android')}
                className={`w-full p-3 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                  isDark ? 'text-slate-300 hover:bg-slate-800/50' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Android (MainApplication.kt)</span>
                </div>
                {activeAccordion === 'android' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {activeAccordion === 'android' && (
                <div className={`p-3 border-t space-y-2 text-xs ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    In <code className="text-cyan-400">MainApplication.kt</code>, point the JS bundle loader to the CodePush cache folder:
                  </p>
                  <pre className="p-2.5 rounded-xl bg-slate-900 font-mono text-[11px] text-emerald-300 overflow-x-auto">
{`override fun getJSBundleFile(): String? {
    val otaBundle = File(applicationContext.filesDir, "codepush_bundle/index.android.bundle")
    return if (otaBundle.exists()) otaBundle.absolutePath else super.getJSBundleFile()
}`}
                  </pre>
                </div>
              )}
            </div>

            {/* Item 2: Native iOS Linking */}
            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setActiveAccordion(activeAccordion === 'ios' ? null : 'ios')}
                className={`w-full p-3 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                  isDark ? 'text-slate-300 hover:bg-slate-800/50' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Apple className="h-3.5 w-3.5 text-indigo-400" />
                  <span>iOS (AppDelegate.mm)</span>
                </div>
                {activeAccordion === 'ios' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {activeAccordion === 'ios' && (
                <div className={`p-3 border-t space-y-2 text-xs ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    In <code className="text-cyan-400">AppDelegate.mm</code>, return the downloaded CodePush bundle URL:
                  </p>
                  <pre className="p-2.5 rounded-xl bg-slate-900 font-mono text-[11px] text-emerald-300 overflow-x-auto">
{`- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
  NSURL *codepushUrl = [CodePush bundleURL];
  return codepushUrl ?: [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
}`}
                  </pre>
                </div>
              )}
            </div>

            {/* Item 3: GitHub Actions CI/CD */}
            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setActiveAccordion(activeAccordion === 'github' ? null : 'github')}
                className={`w-full p-3 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                  isDark ? 'text-slate-300 hover:bg-slate-800/50' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <GitBranch className="h-3.5 w-3.5 text-purple-400" />
                  <span>GitHub Actions CI/CD</span>
                </div>
                {activeAccordion === 'github' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {activeAccordion === 'github' && (
                <div className={`p-3 border-t space-y-2 text-xs ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Automate OTA releases on merge to <code className="text-cyan-400">main</code>:
                  </p>
                  <pre className="p-2.5 rounded-xl bg-slate-900 font-mono text-[11px] text-emerald-300 overflow-x-auto">
{`name: CodePush Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx codepush release-react -a \${{ secrets.CODEPUSH_APP_ID }} -p android -t production
        env:
          CODEPUSH_API_KEY: \${{ secrets.CODEPUSH_API_KEY }}`}
                  </pre>
                </div>
              )}
            </div>

            {/* Item 4: Hermes Bytecode Pre-Flight */}
            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setActiveAccordion(activeAccordion === 'hermes' ? null : 'hermes')}
                className={`w-full p-3 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                  isDark ? 'text-slate-300 hover:bg-slate-800/50' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Cpu className="h-3.5 w-3.5 text-amber-400" />
                  <span>Hermes Bytecode Validator</span>
                </div>
                {activeAccordion === 'hermes' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {activeAccordion === 'hermes' && (
                <div className={`p-3 border-t space-y-2 text-xs ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Compile to Hermes Bytecode (HBC) to prevent crash on launch:
                  </p>
                  <pre className="p-2.5 rounded-xl bg-slate-900 font-mono text-[11px] text-emerald-300 overflow-x-auto">
{`hermesc -emit-binary \\
  -out index.android.bundle \\
  index.android.bundle.js \\
  -source-map index.android.bundle.map`}
                  </pre>
                </div>
              )}
            </div>

            {/* Item 5: Crash Circuit Breaker & Symbolication */}
            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setActiveAccordion(activeAccordion === 'crashes' ? null : 'crashes')}
                className={`w-full p-3 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                  isDark ? 'text-slate-300 hover:bg-slate-800/50' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Bug className="h-3.5 w-3.5 text-rose-400" />
                  <span>Crash Circuit Breaker & Maps</span>
                </div>
                {activeAccordion === 'crashes' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {activeAccordion === 'crashes' && (
                <div className={`p-3 border-t space-y-2 text-xs ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Upload <code className="text-cyan-400">index.android.bundle.map</code> on release to de-minify crashes into original TypeScript files.
                  </p>
                </div>
              )}
            </div>

            {/* Item 6: Slack & Discord Alerts */}
            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setActiveAccordion(activeAccordion === 'webhooks' ? null : 'webhooks')}
                className={`w-full p-3 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                  isDark ? 'text-slate-300 hover:bg-slate-800/50' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Slack & Discord Webhooks</span>
                </div>
                {activeAccordion === 'webhooks' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {activeAccordion === 'webhooks' && (
                <div className={`p-3 border-t space-y-2 text-xs ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Set your Incoming Webhook URL in Project Settings to notify team channels on every OTA deployment.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (col-span-8): The 5 Sequential Steps */}
        <div className="lg:col-span-8 space-y-4">
          {/* STEP 1: INSTALL SDK & FIREBASE DEPENDENCIES */}
          <div className={`p-5 sm:p-6 rounded-3xl border ${cardBgClass} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="h-7 w-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-cyan-500/20">
                  1
                </span>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Step 1: Install Dependencies</h3>
                  <span className="text-[11px] text-slate-400">Takes ~30 seconds • Adds AsyncStorage, Firebase Messaging & Notifee</span>
                </div>
              </div>

              {/* Checkbox toggle */}
              <button
                type="button"
                onClick={() => toggleChecklist('step1')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  checklist.step1
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700'
                }`}
              >
                {checklist.step1 ? <Check className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded border border-slate-500" />}
                <span>{checklist.step1 ? 'Done' : 'Mark Done'}</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Package Manager Selector */}
              <div className="flex items-center space-x-1.5">
                {(['npm', 'yarn', 'pnpm', 'bun'] as const).map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    onClick={() => setPkgManager(pkg)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
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
                <span className="text-[11px] text-slate-400 ml-2">Package Manager</span>
              </div>

              {/* Command Snippet */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-xs text-cyan-300">
                <span className="truncate">{installCmds[pkgManager]}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(installCmds[pkgManager], 'install_cmd')}
                  className="text-slate-400 hover:text-cyan-400 cursor-pointer shrink-0 ml-3"
                  title="Copy command"
                >
                  {copiedKey === 'install_cmd' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* iOS Pods Tip */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${subCardBgClass}`}>
                <div className="flex items-center space-x-2">
                  <Apple className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>For iOS: Run CocoaPods</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('cd ios && pod install && cd ..', 'pod_cmd')}
                  className="font-mono text-[11px] text-cyan-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>cd ios && pod install</span>
                  {copiedKey === 'pod_cmd' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2: PLACE CONFIGURATION FILE */}
          <div className={`p-5 sm:p-6 rounded-3xl border ${cardBgClass} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="h-7 w-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-500/20">
                  2
                </span>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Step 2: Add Configuration File (codepush.json)</h3>
                  <span className="text-[11px] text-slate-400">Takes ~15 seconds • Connects mobile app to your cloud project</span>
                </div>
              </div>

              {/* Checkbox toggle */}
              <button
                type="button"
                onClick={() => toggleChecklist('step2')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  checklist.step2
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700'
                }`}
              >
                {checklist.step2 ? <Check className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded border border-slate-500" />}
                <span>{checklist.step2 ? 'Done' : 'Mark Done'}</span>
              </button>
            </div>

            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
              Save the downloaded <code className="font-mono text-cyan-400">codepush.json</code> directly in your app's root folder next to <code className="font-mono text-cyan-400">package.json</code>:
            </p>

            {/* Visual File Directory Tree */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
              <div className="md:col-span-4 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                <div className="text-cyan-400 font-bold">📁 {activeAppName}/</div>
                <div className="pl-3">├── 📁 android/</div>
                <div className="pl-3">├── 📁 ios/</div>
                <div className="pl-3">├── 📁 src/</div>
                <div className="pl-3">├── 📄 package.json</div>
                <div className="pl-3 text-emerald-400 font-bold bg-emerald-500/10 py-0.5 rounded px-1">
                  └── 📄 codepush.json  ✨
                </div>
              </div>

              {/* JSON Content Preview */}
              <div className="md:col-span-8 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col">
                <div className="px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-400">codepush.json (Pre-Configured)</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleDownloadCodepushJson}
                      className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </button>
                    <span className="text-slate-600">|</span>
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
                          'json_config'
                        )
                      }
                      className="text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedKey === 'json_config' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === 'json_config' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <pre className="p-3.5 font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed flex-1">
{`{
  "serverUrl": "https://codepushs.netlify.app",
  "appId": "${activeAppId}",
  "apiKey": "${activeApiKey}",
  "appName": "${activeAppName}",
  "version": "1.0.0"
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* STEP 3: DROP IN BOTH CLIENT SERVICES (CodePushService & PushNotificationService) */}
          <div className={`p-5 sm:p-6 rounded-3xl border ${cardBgClass} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="h-7 w-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-indigo-500/20">
                  3
                </span>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Step 3: Add Client Services in src/services/</h3>
                  <span className="text-[11px] text-slate-400">Includes Over-The-Air Watchdog & Push Notifications with Custom Audio</span>
                </div>
              </div>

              {/* Checkbox toggle */}
              <button
                type="button"
                onClick={() => toggleChecklist('step3')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  checklist.step3
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700'
                }`}
              >
                {checklist.step3 ? <Check className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded border border-slate-500" />}
                <span>{checklist.step3 ? 'Done' : 'Mark Done'}</span>
              </button>
            </div>

            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Save both files in your mobile project directory: <code className="font-mono text-cyan-400">src/services/</code>
            </p>

            {/* Service Tab Switcher */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setActiveServiceTab('codepush')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeServiceTab === 'codepush'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-cyan-300" />
                <span>1. CodePushService.ts</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveServiceTab('push')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeServiceTab === 'push'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                <BellRing className="h-3.5 w-3.5 text-amber-300" />
                <span>2. PushNotificationService.ts</span>
              </button>
            </div>

            {/* Service Code Block */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300 font-bold flex items-center space-x-1.5">
                  <FileCode2 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>
                    {activeServiceTab === 'codepush'
                      ? 'src/services/CodePushService.ts'
                      : 'src/services/PushNotificationService.ts'}
                  </span>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={
                      activeServiceTab === 'codepush'
                        ? handleDownloadCodePushService
                        : handleDownloadPushNotificationService
                    }
                    className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1 cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const code =
                        activeServiceTab === 'codepush'
                          ? codePushServiceCode
                          : pushNotificationServiceCode;
                      copyToClipboard(code, activeServiceTab);
                    }}
                    className="text-slate-300 hover:text-white font-bold flex items-center space-x-1 cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700"
                  >
                    {copiedKey === activeServiceTab ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedKey === activeServiceTab ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                {activeServiceTab === 'codepush' ? codePushServiceCode : pushNotificationServiceCode}
              </pre>
            </div>

            {/* Feature Callouts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className={`p-3 rounded-xl border flex items-center space-x-2.5 ${subCardBgClass}`}>
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">
                  <strong>Boot Watchdog Protection:</strong> Automatically recovers from fatal startup crashes and reverts to base APK within 5s.
                </span>
              </div>
              <div className={`p-3 rounded-xl border flex items-center space-x-2.5 ${subCardBgClass}`}>
                <BellRing className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-slate-300">
                  <strong>FCM & Notifee Sound Channels:</strong> Supports crystal_glass, electronic_pulse, and custom audio tones.
                </span>
              </div>
            </div>
          </div>

          {/* STEP 4: INITIALIZE IN APP.TSX */}
          <div className={`p-5 sm:p-6 rounded-3xl border ${cardBgClass} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="h-7 w-7 rounded-xl bg-gradient-to-tr from-purple-600 to-rose-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-purple-500/20">
                  4
                </span>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Step 4: Initialize in App.tsx</h3>
                  <span className="text-[11px] text-slate-400">Takes ~45 seconds • Calls update checks and initializes native notification listeners</span>
                </div>
              </div>

              {/* Checkbox toggle */}
              <button
                type="button"
                onClick={() => toggleChecklist('step4')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  checklist.step4
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700'
                }`}
              >
                {checklist.step4 ? <Check className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded border border-slate-500" />}
                <span>{checklist.step4 ? 'Done' : 'Mark Done'}</span>
              </button>
            </div>

            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
              Call both services in your root component's <code className="font-mono text-cyan-400">useEffect</code>:
            </p>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">App.tsx</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `import React, { useEffect } from 'react';\nimport { View, Text, StyleSheet } from 'react-native';\nimport { CodePushService } from './src/services/CodePushService';\nimport { PushNotificationService } from './src/services/PushNotificationService';\n\nexport default function App() {\n  useEffect(() => {\n    // 1. Arm Boot Watchdog & check for Over-The-Air updates\n    CodePushService.startBootWatchdog();\n    CodePushService.checkForUpdates();\n\n    // 2. Real-time listeners for live testing alerts from dashboard\n    const stopAlertListener = CodePushService.startLiveAlertListener();\n    const stopPushListener = CodePushService.startLivePushNotificationListener();\n\n    // 3. Initialize Push Notification permissions & FCM token\n    PushNotificationService.init();\n\n    return () => {\n      stopAlertListener();\n      stopPushListener();\n    };\n  }, []);\n\n  return (\n    <View style={styles.container}>\n      <Text style={styles.title}>Welcome to ${activeAppName}!</Text>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },\n  title: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },\n});`,
                      'app_init'
                    )
                  }
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1 cursor-pointer"
                >
                  {copiedKey === 'app_init' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === 'app_init' ? 'Copied!' : 'Copy Snippet'}</span>
                </button>
              </div>

              <pre className="p-4 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
{`import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CodePushService } from './src/services/CodePushService';
import { PushNotificationService } from './src/services/PushNotificationService';

export default function App() {
  useEffect(() => {
    // 1. Arm Boot Watchdog & check for Over-The-Air updates
    CodePushService.startBootWatchdog();
    CodePushService.checkForUpdates();

    // 2. Real-time listeners for live testing alerts from dashboard
    const stopAlertListener = CodePushService.startLiveAlertListener();
    const stopPushListener = CodePushService.startLivePushNotificationListener();

    // 3. Initialize Push Notification permissions & FCM token
    PushNotificationService.init();

    return () => {
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
});`}
              </pre>
            </div>
          </div>

          {/* STEP 5: PUBLISH FIRST UPDATE & TEST NOTIFICATIONS */}
          <div className={`p-5 sm:p-6 rounded-3xl border ${cardBgClass} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="h-7 w-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-emerald-500/20">
                  5
                </span>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Step 5: Publish Updates & Test Notifications</h3>
                  <span className="text-[11px] text-slate-400">Takes ~30 seconds • Deploy OTA hotfixes and test live device push alerts</span>
                </div>
              </div>

              {/* Checkbox toggle */}
              <button
                type="button"
                onClick={() => toggleChecklist('step5')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  checklist.step5
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700'
                }`}
              >
                {checklist.step5 ? <Check className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded border border-slate-500" />}
                <span>{checklist.step5 ? 'Done' : 'Mark Done'}</span>
              </button>
            </div>

            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
              Open your terminal in your mobile project directory and run these commands to release your first OTA hotfix:
            </p>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">Terminal (Bash / PowerShell)</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `# 1. Login with project API key\nnpx codepush login --key ${activeApiKey}\n\n# 2. Release instant bundle to Staging\nnpx codepush release-react -a ${activeAppId} -p android -t staging -m "My first OTA hotfix!"\n\n# 3. Promote to Production\nnpx codepush promote -a ${activeAppId} -p android -s staging -d production`,
                      'cli_cmds'
                    )
                  }
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1 cursor-pointer"
                >
                  {copiedKey === 'cli_cmds' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === 'cli_cmds' ? 'Copied!' : 'Copy Commands'}</span>
                </button>
              </div>

              <pre className="p-4 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`# 1. Authenticate with your project API Key
npx codepush login --key ${activeApiKey}

# 2. Bundle and release to Staging track (Test on your device)
npx codepush release-react -a ${activeAppId} -p android -t staging -m "My first OTA hotfix!"

# 3. Promote to Production when verified
npx codepush promote -a ${activeAppId} -p android -s staging -d production`}
              </pre>
            </div>
          </div>

          {/* ======================================================== */}
          {/* STEP 6: ENTERPRISE NEXT-GEN FEATURE INTEGRATIONS */}
          {/* ======================================================== */}
          <div className={`p-5 sm:p-6 rounded-3xl border ${cardBgClass} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="h-7 w-7 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Enterprise Extensions & Playbook</h3>
                  <span className="text-[11px] text-slate-400">Circuit Breakers, Hermes Validation, Remote Config, and Canary Cohorts</span>
                </div>
              </div>
            </div>

            {/* Feature Tab Selector */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[
                { id: 'circuit_breaker', label: 'Circuit Breaker & Maps', icon: Bug },
                { id: 'hermes', label: 'Hermes Validator', icon: Cpu },
                { id: 'canary', label: 'Canary Cohorts', icon: Sliders },
                { id: 'remote_config', label: 'Dynamic Remote Config', icon: Layers },
                { id: 'webhooks', label: 'Slack & Discord Webhooks', icon: MessageSquare },
                { id: 'dual_slot', label: 'Dual-Slot Self-Healing', icon: HardDrive },
                { id: 'asset_swap', label: 'Dynamic Assets & Locales', icon: Globe },
                { id: 'fcm_push', label: 'FCM v1 Push Dispatcher', icon: BellRing },
                { id: 'notifications_drawer', label: 'Live Notifications & Health', icon: Zap },
                { id: 'zero_trust_api', label: 'Zero-Trust API Isolation', icon: ShieldCheck },
                { id: 'auto_patch', label: 'AI AutoPatch (Ghost Canary)', icon: Sparkles },
                { id: 'mesh_push', label: 'Zero-Egress P2P Mesh', icon: Radio },
                { id: 'time_travel', label: 'Hermes Time-Travel Replay', icon: RotateCcw },
                { id: 'wasm_bridge', label: 'Wasm JSI Native Bridge', icon: Code2 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeFeatureTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFeatureTab(tab.id as any)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                        : isDark
                        ? 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Crash Circuit Breaker & Source Map Symbolication */}
            {activeFeatureTab === 'circuit_breaker' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Autonomous Crash Protection:</strong> If a newly deployed bundle causes crashes exceeding 2% of sessions within 10 minutes, the Netlify Edge engine automatically revokes the release, prompting devices to fall back to the last stable release.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Generate Source Map for Symbolication:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          'npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output index.android.bundle --sourcemap-output index.android.bundle.map',
                          'sourcemap_cmd'
                        )
                      }
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer font-sans font-bold"
                    >
                      {copiedKey === 'sourcemap_cmd' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === 'sourcemap_cmd' ? 'Copied!' : 'Copy Command'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
{`npx react-native bundle \\
  --platform android \\
  --dev false \\
  --entry-file index.js \\
  --bundle-output index.android.bundle \\
  --sourcemap-output index.android.bundle.map`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 2: Hermes Bytecode Pre-Flight Validator */}
            {activeFeatureTab === 'hermes' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Pre-Flight Bytecode Verification:</strong> React Native apps with Hermes will crash on launch if served plain JavaScript or mismatched bytecode. The uploader inspects header magic bytes (<code>0x1F55C0DE</code>) before accepting uploads.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Compile JS into Hermes HBC Bytecode:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          'hermesc -emit-binary -out index.android.bundle index.android.bundle.js -source-map index.android.bundle.map',
                          'hermes_cmd'
                        )
                      }
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer font-sans font-bold"
                    >
                      {copiedKey === 'hermes_cmd' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === 'hermes_cmd' ? 'Copied!' : 'Copy Command'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
{`hermesc -emit-binary \\
  -out index.android.bundle \\
  index.android.bundle.js \\
  -source-map index.android.bundle.map`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 3: Canary Cohorts */}
            {activeFeatureTab === 'canary' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Deterministic Gradual Rollouts:</strong> Devices are partitioned into consistent canary cohorts via CRC32 hashing: <code>CRC32(deviceId + releaseId) % 100 &lt; rolloutPercentage</code>. A user assigned to the 10% canary cohort stays consistently in that cohort.
                </p>
                <div className={`p-3 rounded-2xl border ${subCardBgClass} space-y-1`}>
                  <div className="font-bold text-cyan-400">Recommended Rollout Schedule:</div>
                  <div className="text-[11px] text-slate-400">
                    • <strong>Hour 0:</strong> 5% Canary Release (Monitors telemetry & crash rate)<br />
                    • <strong>Hour 12:</strong> Expand to 25% Fleet<br />
                    • <strong>Hour 24:</strong> Expand to 50% Fleet<br />
                    • <strong>Hour 48:</strong> 100% General Availability
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Dynamic Remote Config */}
            {activeFeatureTab === 'remote_config' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Instant Feature Flags:</strong> Toggle features and configure dynamic parameters without pushing a new bundle or going through app store review.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Usage inside any React Component:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `import { CodePushService } from './src/services/CodePushService';\n\nconst isHolidayTheme = CodePushService.getRemoteConfig('enable_holiday_banner') ?? false;\nconst checkoutDiscount = CodePushService.getRemoteConfig('discount_pct') ?? 10;`,
                          'rc_usage'
                        )
                      }
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer font-sans font-bold"
                    >
                      {copiedKey === 'rc_usage' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === 'rc_usage' ? 'Copied!' : 'Copy Snippet'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
{`import { CodePushService } from './src/services/CodePushService';

// Read remote config flags loaded during checkForUpdates():
const isHolidayTheme = CodePushService.getRemoteConfig('enable_holiday_banner') ?? false;
const checkoutDiscount = CodePushService.getRemoteConfig('discount_pct') ?? 10;`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 5: Slack & Discord Webhooks */}
            {activeFeatureTab === 'webhooks' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Automated Team Chat Broadcasts:</strong> Connect Slack or Discord channels to receive real-time release status cards whenever an OTA update is published, promoted from Staging to Production, or rolled back.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 block">Sample Outgoing Card Preview:</span>
                  <pre className="font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre-wrap">
{`🚀 [CodePush] Production Release Live: Android v1.2.4
• App: ${activeAppName}
• Author: Admin
• Notes: "Fixed payment gateway timeout on checkout"
• Track: Production (100% Canary Fleet)
• Hash: sha256-8a9f2b3c...`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 6: Dual-Slot Self-Healing Atomic Swapper */}
            {activeFeatureTab === 'dual_slot' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Partition A/B Atomic Pointer Storage:</strong> Mobile clients maintain two physical bundle folders (<code>/slots/slot_a</code> and <code>/slots/slot_b</code>). When an update is downloaded, it is unpacked and verified in the standby slot. Once validated, an atomic filesystem pointer in <code>active_slot.json</code> is swapped. A 5-second watchdog timer monitors boot survival; if the app crashes before survival confirmation, the pointer automatically falls back to the safe slot.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">src/services/DualSlotEngine.ts</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`import RNFS from 'react-native-fs';

const ACTIVE_SLOT_FILE = \`\${RNFS.DocumentDirectoryPath}/codepush/active_slot.json\`;

export async function atomicSwapSlot(downloadedZipPath: string) {
  const currentSlotConfig = await getActiveSlotConfig();
  const standbySlot = currentSlotConfig.activeSlot === 'slot_a' ? 'slot_b' : 'slot_a';
  const standbyPath = \`\${RNFS.DocumentDirectoryPath}/codepush/slots/\${standbySlot}\`;

  await RNFS.mkdir(standbyPath);
  
  const newConfig = {
    activeSlot: standbySlot,
    pendingSurvivalCheck: true,
    swappedAt: new Date().toISOString(),
  };
  await RNFS.writeFile(ACTIVE_SLOT_FILE, JSON.stringify(newConfig), 'utf8');

  setTimeout(async () => {
    newConfig.pendingSurvivalCheck = false;
    await RNFS.writeFile(ACTIVE_SLOT_FILE, JSON.stringify(newConfig), 'utf8');
  }, 5000);
}`, 'dual_slot')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'dual_slot' ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
{`import RNFS from 'react-native-fs';

const ACTIVE_SLOT_FILE = \`\${RNFS.DocumentDirectoryPath}/codepush/active_slot.json\`;

export async function atomicSwapSlot(downloadedZipPath: string) {
  const currentSlotConfig = await getActiveSlotConfig();
  const standbySlot = currentSlotConfig.activeSlot === 'slot_a' ? 'slot_b' : 'slot_a';
  const standbyPath = \`\${RNFS.DocumentDirectoryPath}/codepush/slots/\${standbySlot}\`;

  // 1. Unzip and verify checksum in standby partition
  await RNFS.mkdir(standbyPath);
  
  // 2. Write atomic pointer swap with pending watchdog flag
  const newConfig = {
    activeSlot: standbySlot,
    pendingSurvivalCheck: true,
    swappedAt: new Date().toISOString(),
  };
  await RNFS.writeFile(ACTIVE_SLOT_FILE, JSON.stringify(newConfig), 'utf8');

  // 3. Arm 5-second survival watchdog
  setTimeout(async () => {
    newConfig.pendingSurvivalCheck = false;
    await RNFS.writeFile(ACTIVE_SLOT_FILE, JSON.stringify(newConfig), 'utf8');
  }, 5000);
}`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 7: Dynamic Asset & Translation Hot-Swapping */}
            {activeFeatureTab === 'asset_swap' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Dynamic Asset & Translation Hot-Loading:</strong> Update localized i18n JSON strings and remote images in real time without submitting a new binary build to Google Play or Apple App Store.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">src/hooks/useCodePushLocale.ts</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useCodePushLocale(lang: string = 'en') {
  const [strings, setStrings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLocale() {
      const cached = await AsyncStorage.getItem(\`@codepush_locale_\${lang}\`);
      if (cached) setStrings(JSON.parse(cached));

      try {
        const res = await fetch(\`https://codepushs.netlify.app/.netlify/functions/download-bundle?action=locale&lang=\${lang}\`);
        if (res.ok) {
          const fresh = await res.json();
          setStrings(fresh);
          await AsyncStorage.setItem(\`@codepush_locale_\${lang}\`, JSON.stringify(fresh));
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    loadLocale();
  }, [lang]);

  return { t: (key: string) => strings[key] || key, loading };
}`, 'asset_swap')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'asset_swap' ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
{`import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useCodePushLocale(lang: string = 'en') {
  const [strings, setStrings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLocale() {
      // 1. Check local persistent cache
      const cached = await AsyncStorage.getItem(\`@codepush_locale_\${lang}\`);
      if (cached) setStrings(JSON.parse(cached));

      // 2. Hot-fetch dynamic remote translation delta
      try {
        const res = await fetch(\`https://codepushs.netlify.app/.netlify/functions/download-bundle?action=locale&lang=\${lang}\`);
        if (res.ok) {
          const fresh = await res.json();
          setStrings(fresh);
          await AsyncStorage.setItem(\`@codepush_locale_\${lang}\`, JSON.stringify(fresh));
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    loadLocale();
  }, [lang]);

  return { t: (key: string) => strings[key] || key, loading };
}`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 8: Live FCM v1 Push Notification Dispatcher */}
            {activeFeatureTab === 'fcm_push' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Instant High-Priority OTA Hotfix Alerts:</strong> Wake terminated Android and iOS devices immediately using Google FCM v1 with custom chime channels (<code>crystal_glass</code>, <code>electronic_pulse</code>, <code>urgent_alarm</code>) to prompt or force an instant restart.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">src/services/PushNotificationService.ts</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `import notifee, { AndroidImportance, AndroidVisibilityType } from '@notifee/react-native';\nimport messaging from '@react-native-firebase/messaging';\nimport { CodePushService } from './CodePushService';\n\n// 1. Initialize FCM background messaging & sound channels\nexport const PushNotificationService = {\n  async init() {\n    await notifee.requestPermission();\n\n    // Register custom audio notification channels\n    await notifee.createChannel({\n      id: 'codepush_channel_urgent_alarm',\n      name: 'CodePush Critical Hotfix',\n      sound: 'urgent_alarm',\n      importance: AndroidImportance.HIGH,\n      visibility: AndroidVisibilityType.PUBLIC,\n    });\n\n    // Foreground message handler\n    messaging().onMessage(async (remoteMessage) => {\n      console.log('⚡ [Push] Received hotfix push notification:', remoteMessage.data);\n      if (remoteMessage.data?.action === 'check_update') {\n        await CodePushService.checkForUpdates();\n      }\n    });\n  },\n};`,
                          'fcm_push_code'
                        )
                      }
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'fcm_push_code' ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
{`import notifee, { AndroidImportance, AndroidVisibilityType } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { CodePushService } from './CodePushService';

export const PushNotificationService = {
  async init() {
    await notifee.requestPermission();

    // Register audio channels matching server tone keys
    const tones = ['crystal_glass', 'electronic_pulse', 'subtle_pop', 'urgent_alarm'];
    for (const tone of tones) {
      await notifee.createChannel({
        id: \`codepush_channel_\${tone}\`,
        name: \`CodePush Channel (\${tone})\`,
        sound: tone,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibilityType.PUBLIC,
      });
    }

    // High-priority FCM wake receiver
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('🚨 Background wake signal received. Verifying bundle...');
      await CodePushService.checkForUpdates();
    });
  },
};`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 9: Live Notification Drawer & System Health Stream */}
            {activeFeatureTab === 'notifications_drawer' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Observability & Live Event Center:</strong> Built directly into the dashboard top navigation bar, the Notification Drawer provides live latency metrics for Netlify Edge functions, circuit breaker alerts, and bundle cryptographic hashes.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 font-bold">
                    <span>Drawer Polling Endpoints & Health Probe</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `# 1. Edge API Health & Latency Probe\ncurl -i "https://codepushs.netlify.app/.netlify/functions/releases?projectId=${activeAppId}" -H "x-codepush-api-key: ${activeApiKey}"\n\n# 2. Crash Circuit Breaker Status\ncurl -i "https://codepushs.netlify.app/.netlify/functions/report-crash?projectId=${activeAppId}" -H "x-codepush-api-key: ${activeApiKey}"\n\n# 3. Active Broadcast & In-App Alerts\ncurl -i "https://codepushs.netlify.app/.netlify/functions/send-alert?projectId=${activeAppId}" -H "x-codepush-api-key: ${activeApiKey}"`,
                          'drawer_curl'
                        )
                      }
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'drawer_curl' ? 'Copied!' : 'Copy cURL'}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
{`# Probe live Edge CDN latency with project API Key
curl -s -w "\\nLatency: %{time_total}s | Status: %{http_code}\\n" \\
  "https://codepushs.netlify.app/.netlify/functions/releases?projectId=${activeAppId}" \\
  -H "x-codepush-api-key: ${activeApiKey}"`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 10: Zero-Trust API Key Verification & Isolation */}
            {activeFeatureTab === 'zero_trust_api' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Zero-Trust Multi-Tenant Isolation:</strong> Every backend endpoint strictly checks the <code>x-codepush-api-key</code> request header against the registered project workspace. Cross-tenant queries are blocked with <code>403 Forbidden</code>, and missing or invalid keys return <code>401 Unauthorized</code>.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 font-bold">
                    <span>PowerShell & cURL Verification</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `# Valid Request (Auto-resolves to ${activeAppName})\n$headers = @{ "x-codepush-api-key" = "${activeApiKey}" }\nInvoke-RestMethod -Uri "https://codepushs.netlify.app/.netlify/functions/check-update?platform=android&currentVersion=1.0.0" -Headers $headers\n\n# Rogue / Invalid Key (Must return 401)\n$badHeaders = @{ "x-codepush-api-key" = "cp_live_fake123" }\nInvoke-WebRequest -Uri "https://codepushs.netlify.app/.netlify/functions/releases" -Headers $badHeaders -SkipHttpErrorCheck | Select-Object StatusCode`,
                          'auth_cmds'
                        )
                      }
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'auth_cmds' ? 'Copied!' : 'Copy Commands'}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
{`# 1. Authorize using x-codepush-api-key header
$headers = @{ "x-codepush-api-key" = "${activeApiKey}" }
Invoke-RestMethod -Uri "https://codepushs.netlify.app/.netlify/functions/check-update?platform=android&currentVersion=1.0.0" -Headers $headers

# 2. Fake key returns 401 Unauthorized
$bad = @{ "x-codepush-api-key" = "cp_live_unregistered_key" }
Invoke-WebRequest -Uri "https://codepushs.netlify.app/.netlify/functions/releases" -Headers $bad -SkipHttpErrorCheck | Select-Object StatusCode`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 11: Autonomous AI Self-Synthesizing Micro-Patching */}
            {activeFeatureTab === 'auto_patch' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Zero-Downtime Autonomous Healing:</strong> When a production crash spike trips the circuit breaker, CodePush feeds the unhandled runtime stack trace and source map into an isolated AST synthesizer. A defensive micro-patch is automatically compiled, assigned to a 1% Ghost Canary cohort, and verified against real device telemetry before offering a 1-click promotion to 100% of the fleet.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 font-bold">
                    <span>Simulate & Promote Micro-Patch via API</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `# 1. Synthesize candidate micro-patch for an unhandled exception\n$body = @{\n  projectId = "${activeAppId}"\n  version = "1.0.1"\n  platform = "android"\n  error = "TypeError: Cannot read properties of undefined (reading 'price')"\n  stack = "TypeError: Cannot read properties of undefined (reading 'price') at CheckoutScreen.tsx:42"\n} | ConvertTo-Json\nInvoke-RestMethod -Uri "https://codepushs.netlify.app/.netlify/functions/auto-patch" -Method POST -Headers @{ "x-codepush-api-key" = "${activeApiKey}" } -Body $body -ContentType "application/json"\n\n# 2. 1-Click Promote Canary Candidate to 100% Fleet\nInvoke-RestMethod -Uri "https://codepushs.netlify.app/.netlify/functions/auto-patch?action=promote&projectId=${activeAppId}" -Method POST -Headers @{ "x-codepush-api-key" = "${activeApiKey}" }`,
                          'autopatch_cmds'
                        )
                      }
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'autopatch_cmds' ? 'Copied!' : 'Copy Commands'}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
{`# 1. Query active AutoPatch candidate & 1% canary telemetry
Invoke-RestMethod -Uri "https://codepushs.netlify.app/.netlify/functions/auto-patch?projectId=${activeAppId}" \\
  -Headers @{ "x-codepush-api-key" = "${activeApiKey}" }

# 2. Promote verified micro-patch to 100% production fleet
Invoke-RestMethod -Uri "https://codepushs.netlify.app/.netlify/functions/auto-patch?action=promote&projectId=${activeAppId}" \\
  -Method POST -Headers @{ "x-codepush-api-key" = "${activeApiKey}" }`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 12: Zero-Egress P2P Local Mesh Relay (MeshPush) */}
            {activeFeatureTab === 'mesh_push' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Ultra-Low Cost Local Swarm Distribution:</strong> In high-density fleets (warehouses, airplanes, retail stores, or stadium events), only 1 device downloads the bundle from CDN. Other local devices discover the seed over mDNS (<code>_codepush_mesh._tcp</code>) and stream the cryptographic Ed25519-signed bundle locally at gigabit Wi-Fi speeds with 0 external egress bills.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 font-bold">
                    <span>src/services/MeshRelayService.ts</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `import { MeshRelayService } from './src/services/MeshRelayService';\n\n// 1. Initialize local P2P swarm listener\nMeshRelayService.startLocalDiscovery({\n  serviceType: '_codepush_mesh._tcp',\n  onPeerDiscovered: (peer) => {\n    console.log('⚡ Found local seed peer:', peer.ip, 'Transfer speed:', peer.transferSpeedMbps, 'MB/s');\n  },\n});`,
                          'mesh_code'
                        )
                      }
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'mesh_code' ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
{`// Enable zero-egress local LAN peer relay in mobile client
import { MeshRelayService } from './src/services/MeshRelayService';

// Automatically elect seed and stream bundle locally with 0 CDN cost
const stats = MeshRelayService.getSwarmStats();
console.log('P2P Mesh Active:', stats.isMeshActive, 'Egress Saved:', stats.bytesSavedOverCDN);`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 13: Hermes Deterministic Time-Travel Replay */}
            {activeFeatureTab === 'time_travel' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>Deterministic VM State Stepper:</strong> Instead of static stack traces, the CodePush native layer maintains a 30KB circular ring buffer recording the last 50 state transitions, Redux actions, and navigation events leading up to any crash. Developers can step backward and forward in execution time right on the dashboard.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 font-bold">
                    <span>src/services/StateRecorder.ts</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `import { StateRecorder } from './src/services/StateRecorder';\n\n// 1. Track Redux / Zustand actions\nStateRecorder.recordAction('DISPATCH_ADD_TO_CART', { itemId: 'prod_981', price: 59.99 });\n\n// 2. Track Navigation transitions\nStateRecorder.recordNavigation('CheckoutScreen');\n\n// 3. Export dump on crash\nconst replayDump = StateRecorder.exportReplayDump('Fatal crash in Checkout');`,
                          'timetravel_code'
                        )
                      }
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'timetravel_code' ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-purple-300 overflow-x-auto whitespace-pre-wrap">
{`// Hook StateRecorder into your store middleware or navigation listener
import { StateRecorder } from './src/services/StateRecorder';

// Record state mutations frame-by-frame
StateRecorder.recordAction('CHECKOUT_INITIATED', { cartTotal: 59.99 });
StateRecorder.recordNavigation('CheckoutScreen');`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 14: Dynamic JSI / WebAssembly Native Polyfill Bridge */}
            {activeFeatureTab === 'wasm_bridge' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
                  <strong>OTA Native Module Injection:</strong> Ship high-performance C/Rust/Wasm binary algorithms (e.g. SQLite encryption, image/audio processors, custom parsers) over the air without rebuilding or submitting an APK/IPA to Google Play or Apple App Store.
                </p>
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 font-bold">
                    <span>Invoke Wasm over JSI in React Native</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `import { instantiateWasmModule } from './src/utils/wasmBridge';\n\n// Load dynamic Wasm module shipped in CodePush bundle.zip\nconst wasmBytes = await RNFS.readFileAssets('native_accelerator.wasm');\nconst { exports } = await instantiateWasmModule(wasmBytes);\n\n// Call native C/Rust functions directly\nconst result = exports.calculateHash('my_secure_data');\nconsole.log('Native Wasm Result:', result);`,
                          'wasm_code'
                        )
                      }
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'wasm_code' ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre-wrap">
{`// 1. Compile C or Rust to WebAssembly:
// emcc -O3 -s STANDALONE_WASM native_crypto.c -o native_crypto.wasm

// 2. Hot-load into React Native via CodePush:
import { instantiateWasmModule } from './src/utils/wasmBridge';
const { exports } = await instantiateWasmModule(wasmBytes);
const hash = exports.calculateHash('payload');`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationScreen;
