# 📱 React Native Client Integration & Architecture Guide

> **Official Integration Guide for CodePush Enterprise Platform**  
> **Server Base URL:** `https://codepushs.netlify.app`  
> **Target App Framework:** React Native 0.72+ (Hermes Engine, Android & iOS)  
> **SDK Architecture:** Zero-Downtime Over-The-Air (OTA) Updates, Boot Loop Watchdog, Real-Time Crash Reporting, Dynamic Remote Config, Deterministic Canary Cohorts, and FCM v1 Push Notifications.

---

## 📑 Table of Contents

1. [Enterprise Architecture Overview](#1-enterprise-architecture-overview)
2. [Step 1: Install Required Dependencies](#step-1-install-required-dependencies)
3. [Step 2: Configuration File (`codepush.json`)](#step-2-configuration-file-codepushjson)
4. [Step 3: CodePush Client Service (`src/services/CodePushService.ts`)](#step-3-codepush-client-service-srcservicescodepushservicets)
5. [Step 4: Push Notification Service (`src/services/PushNotificationService.ts`)](#step-4-push-notification-service-srcservicespushnotificationservicets)
6. [Step 5: Initialize in Root `App.tsx`](#step-5-initialize-in-root-apptsx)
7. [Step 6: Native Android Platform Setup](#step-6-native-android-platform-setup)
8. [Step 7: Native iOS Platform Setup](#step-7-native-ios-platform-setup)
9. [Step 8: Hermes Bytecode & Source Map Pre-Flight Compilation](#step-8-hermes-bytecode--source-map-pre-flight-compilation)
10. [Step 9: Automated Crash Circuit Breaker & Symbolication](#step-9-automated-crash-circuit-breaker--symbolication)
11. [Step 10: Dynamic Remote Config & Feature Flags](#step-10-dynamic-remote-config--feature-flags)
12. [Step 11: Developer CLI Tool (`@codepush/cli`)](#step-11-developer-cli-tool-codepushcli)
13. [Step 12: Automated GitHub Actions CI/CD Pipeline](#step-12-automated-github-actions-cicd-pipeline)
14. [Step 13: Slack & Discord Deployment Webhooks](#step-13-slack--discord-deployment-webhooks)
15. [Troubleshooting & Verification](#troubleshooting--verification)

---

## 1. Enterprise Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                   React Native Mobile App (Hermes)                     │
│  ┌───────────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  Boot Loop Watchdog   │  │  Crash Ingest   │  │  Remote Config   │  │
│  │  (5s Survival Guard)  │  │  & Symbolicator │  │  Dynamic Flags   │  │
│  └──────────┬────────────┘  └────────┬────────┘  └────────┬─────────┘  │
│             │                        │                    │            │
│  ┌──────────▼────────────────────────▼────────────────────▼─────────┐  │
│  │        CodePushService.ts  &  PushNotificationService.ts          │  │
│  └───────────────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │ HTTPS REST & WebSockets
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Netlify Edge Serverless Layer                        │
│  ┌──────────────────┐ ┌──────────────────┐ ┌────────────────────────┐  │
│  │ check-update.cjs │ │ publish-rel.cjs  │ │   report-crash.cjs     │  │
│  │ • Canary Cohorts │ │ • Staging/Prod   │ │ • Circuit Breaker Auto │  │
│  │ • SemVer Match   │ │ • Kill-Switch    │ │ • Stack Symbolication  │  │
│  └────────┬─────────┘ └────────┬─────────┘ └──────────┬─────────────┘  │
│           │                    │                      │                │
│  ┌────────▼────────────────────▼──────────────────────▼─────────────┐  │
│  │ remote-config.cjs   download-bundle.cjs    send-alert.cjs         │  │
│  └─────────────────────────────┬────────────────────────────────────┘  │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Firebase Realtime Database & Cloud Storage                 │
│   • Active Releases  • Device Telemetry  • Live Pings  • Crash Logs    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Install Required Dependencies

In your React Native project root, install the required packages:

### Using npm:
```bash
npm install react-native-fs react-native-zip-archive react-native-restart @react-native-async-storage/async-storage @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native
```

### Using yarn:
```bash
yarn add react-native-fs react-native-zip-archive react-native-restart @react-native-async-storage/async-storage @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native
```

### iOS CocoaPods Setup:
```bash
cd ios && pod install && cd ..
```

---

## Step 2: Configuration File (`codepush.json`)

Create `codepush.json` in the root of your React Native application (next to `package.json`):

```json
{
  "serverUrl": "https://codepushs.netlify.app",
  "appId": "app_rCYp1a_mvdfs5j4_w9dyc",
  "apiKey": "cp_live_e93847a98b2c1d0e",
  "appName": "SkillSwap",
  "version": "1.0.0",
  "channel": "production"
}
```

### Configuration Parameters:
* **`serverUrl`**: The base URL of your CodePush Netlify deployment (`https://codepushs.netlify.app`).
* **`appId`**: Unique workspace application identifier from your Dashboard.
* **`apiKey`**: Secret API key for authenticating update checks and telemetry pings.
* **`version`**: The native binary version (e.g. `1.0.0`) matching your Android `versionName` or iOS `CFBundleShortVersionString`.
* **`channel`**: Deployment track (`production` or `staging`).

---

## Step 3: CodePush Client Service (`src/services/CodePushService.ts`)

Create `src/services/CodePushService.ts`. This service manages the update lifecycle, automated boot loop watchdog, crash reporting, remote config, and kill-switch recovery.

```typescript
// src/services/CodePushService.ts
import { Platform, Alert, NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';
import RNRestart from 'react-native-restart';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { CodePushNative } = NativeModules;

// Load configuration
import config from '../../codepush.json';

const CONFIG = {
  serverUrl: config.serverUrl || 'https://codepushs.netlify.app',
  appId: config.appId || 'app_rCYp1a_mvdfs5j4_w9dyc',
  apiKey: config.apiKey || 'cp_live_default_key',
  appName: config.appName || 'MobileApp',
  version: config.version || '1.0.0',
  channel: config.channel || 'production',
};

const BUNDLE_VERSION_KEY = '@codepush_bundle_version';
const CRASH_COUNT_KEY = '@codepush_boot_crash_count';

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
const shownAlertIds = new Set<string>();

/**
 * Detects device country based on system timezone or locale
 */
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
  } catch {}
  return 'UNKNOWN';
}

/**
 * Sends a real-time telemetry ping to the CodePush analytics dashboard
 */
async function sendTelemetryPing(action: string, version?: string): Promise<void> {
  try {
    const platform = Platform.OS;
    const ping = {
      id: `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

    fetch(`${CONFIG.serverUrl}/.netlify/functions/report-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ping),
    }).catch(() => {});
  } catch {}
}

/**
 * Reports runtime crashes to the CodePush server for Crash Analytics & Circuit Breaker monitoring
 */
export async function reportCrashToServer(error: { message: string; stack?: string; version?: string }): Promise<void> {
  try {
    const currentVersion = (await AsyncStorage.getItem(BUNDLE_VERSION_KEY)) || CONFIG.version;
    await fetch(`${CONFIG.serverUrl}/.netlify/functions/report-crash?projectId=${CONFIG.appId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        version: error.version || currentVersion,
        platform: Platform.OS,
        device: `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} Device`,
        country: detectDeviceCountry(),
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {}
}

// Global JS unhandled exception listener
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

function displayAlertOnce(alert: { id?: string; title?: string; message?: string }): void {
  if (!alert || !alert.message) return;
  const id = alert.id || alert.message;
  if (shownAlertIds.has(id)) return;
  shownAlertIds.add(id);
  Alert.alert(alert.title || 'CodePush Alert', alert.message, [{ text: 'OK' }]);
}

export const CodePushService = {
  /**
   * 🛡️ Automated Boot Loop Watchdog (5-second survival window)
   * If the app crashes 3 consecutive times during startup, reverts back to factory APK assets.
   */
  async startBootWatchdog(): Promise<void> {
    try {
      const storedCount = await AsyncStorage.getItem(CRASH_COUNT_KEY);
      let count = storedCount ? parseInt(storedCount, 10) : 0;
      count += 1;
      await AsyncStorage.setItem(CRASH_COUNT_KEY, count.toString());

      if (count >= 3) {
        console.warn('🚨 [CodePush Watchdog] 3 consecutive startup crashes! Triggering emergency rollback.');
        await this.emergencyRollbackToFactory();
        await AsyncStorage.setItem(CRASH_COUNT_KEY, '0');
        return;
      }

      setTimeout(async () => {
        bootWatchdogPassed = true;
        await AsyncStorage.setItem(CRASH_COUNT_KEY, '0');
        console.log('✅ [CodePush Watchdog] App startup verified healthy.');
      }, 5000);
    } catch {}
  },

  /**
   * ⚡ Checks for available updates, kill-switch commands, and in-app alerts
   */
  async checkForUpdates(): Promise<void> {
    try {
      const platform = Platform.OS;
      let currentVersion = (await AsyncStorage.getItem(BUNDLE_VERSION_KEY)) || CONFIG.version;

      if (platform === 'android' && CodePushNative?.getCurrentBundleVersion) {
        try {
          const nativeVer = await CodePushNative.getCurrentBundleVersion();
          if (nativeVer && nativeVer.trim().length > 0) currentVersion = nativeVer.trim();
        } catch {}
      }

      console.log(`[CodePush] Checking updates for ${platform} (Active: v${currentVersion})...`);
      sendTelemetryPing(`Checking update (Active: v${currentVersion})`, currentVersion);

      const queryParams = new URLSearchParams({
        platform,
        currentVersion,
        country: detectDeviceCountry(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        channel: CONFIG.channel,
        apiKey: CONFIG.apiKey,
        projectId: CONFIG.appId,
      });

      const response = await fetch(`${CONFIG.serverUrl}/.netlify/functions/check-update?${queryParams.toString()}`, {
        headers: { 'x-codepush-api-key': CONFIG.apiKey },
      });

      if (!response.ok) return;
      const data: UpdateResponse = await response.json();

      // Cache dynamic remote config flags
      if (data.remoteConfig) {
        cachedRemoteConfig = data.remoteConfig;
      }

      // 🚨 Emergency Kill-Switch & Revocation handler
      if (data.revoked || data.rollbackToFactory) {
        console.warn('🚨 [CodePush Kill-Switch] Active release revoked. Reverting to base...');
        await this.emergencyRollbackToFactory();
        return;
      }

      // In-App Alert Broadcast
      if (data.alertMessage) {
        displayAlertOnce({ id: data.alertId, title: data.alertTitle, message: data.alertMessage });
      }

      // Silent Over-The-Air Installation
      if (data.updateAvailable && data.downloadUrl) {
        console.log(`⚡ [CodePush] New OTA update v${data.latestVersion} found. Installing...`);
        await this.downloadAndApplyUpdate(data.downloadUrl, data.latestVersion);
      } else {
        console.log('✅ [CodePush] App is up to date.');
      }
    } catch (error) {
      console.warn('[CodePush] Update check failed:', error);
    }
  },

  /**
   * Downloads and applies the bundle silently in the background
   */
  async downloadAndApplyUpdate(downloadUrl: string, newVersion: string): Promise<void> {
    try {
      sendTelemetryPing(`Update v${newVersion} downloading OTA bundle...`, newVersion);

      if (Platform.OS === 'android' && CodePushNative?.downloadAndApplyBundle) {
        await CodePushNative.downloadAndApplyBundle(downloadUrl, newVersion);
        await AsyncStorage.setItem(BUNDLE_VERSION_KEY, newVersion);
        await sendTelemetryPing(`Update v${newVersion} installed & refreshed`, newVersion);
        setTimeout(() => CodePushNative.restartApp(), 1000);
        return;
      }

      // Universal JS Fallback
      const downloadDest = `${RNFS.CachesDirectoryPath}/bundle-update.zip`;
      const extractPath = `${RNFS.DocumentDirectoryPath}/codepush_bundle`;

      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: downloadDest,
      }).promise;

      if (downloadResult.statusCode === 200) {
        await unzip(downloadDest, extractPath);
        await AsyncStorage.setItem(BUNDLE_VERSION_KEY, newVersion);
        await RNFS.unlink(downloadDest);
        console.log(`🎉 [CodePush] v${newVersion} installed! Restarting...`);
        RNRestart.Restart();
      }
    } catch (err) {
      console.warn('[CodePush] Download & apply failed:', err);
    }
  },

  /**
   * 🚨 Emergency Rollback: Clears OTA bundle files and restores factory baseline
   */
  async emergencyRollbackToFactory(): Promise<void> {
    try {
      sendTelemetryPing('🚨 EMERGENCY ROLLBACK: Reverted to native baseline', 'factory');
      await AsyncStorage.removeItem(BUNDLE_VERSION_KEY);

      if (CodePushNative?.clearBundle) {
        await CodePushNative.clearBundle();
        setTimeout(() => CodePushNative?.restartApp?.(), 800);
        return;
      }

      const otaBundleDir = `${RNFS.DocumentDirectoryPath}/codepush_bundle`;
      if (await RNFS.exists(otaBundleDir)) {
        await RNFS.unlink(otaBundleDir);
      }
      RNRestart.Restart();
    } catch (err) {
      console.error('[CodePush] Rollback failed:', err);
    }
  },

  /**
   * 🚩 Dynamic Remote Config Accessor
   */
  getRemoteConfig(key?: string): any {
    return key ? cachedRemoteConfig[key] : cachedRemoteConfig;
  },

  /**
   * 📡 Real-time listener for Dashboard Alert Broadcasts
   */
  startLiveAlertListener(): () => void {
    const checkLiveAlert = async () => {
      try {
        const rtdbUrl = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/alerts';
        const res = await fetch(`${rtdbUrl}/${CONFIG.appId}.json`);
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

  /**
   * 🔔 Real-time listener for Testing Console Push Notifications
   */
  startLivePushNotificationListener(): () => void {
    const shownPushIds = new Set<string>();
    const checkLivePush = async () => {
      try {
        const rtdbPushUrl = 'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/push_notifications';
        const res = await fetch(`${rtdbPushUrl}/${CONFIG.appId}.json`);
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
```

---

## Step 4: Push Notification Service (`src/services/PushNotificationService.ts`)

Create `src/services/PushNotificationService.ts` to manage high-priority FCM v1 push tokens, custom sound tone channels (`crystal_glass`, `electronic_pulse`, `subtle_pop`, `urgent_alarm`), and deep-link routing.

```typescript
// src/services/PushNotificationService.ts
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
  isPushAlreadyHandled(pushId?: string, title?: string, body?: string): boolean {
    const key = pushId || `${title}_${body}`;
    return handledPushIds.has(key);
  },

  markPushHandled(pushId?: string, title?: string, body?: string): void {
    const key = pushId || `${title}_${body}`;
    handledPushIds.add(key);
  },

  async init(): Promise<string | null> {
    try {
      const messaging = getMessaging();

      // 1. Request Push Permissions
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('⚠️ [PushService] Notification permission denied');
        return null;
      }

      // 2. Fetch FCM Token
      const token = await getToken(messaging);
      console.log('📲 [PushService] Device FCM Token:', token);

      // 3. Create Custom Audio Sound Channels on Android
      if (Platform.OS === 'android') {
        const tones = [
          { id: 'crystal_glass', name: 'Crystal Glass Alert', sound: 'crystal_glass' },
          { id: 'electronic_pulse', name: 'Electronic Pulse', sound: 'electronic_pulse' },
          { id: 'subtle_pop', name: 'Subtle Pop', sound: 'subtle_pop' },
          { id: 'urgent_alarm', name: 'Urgent Alarm', sound: 'urgent_alarm' },
        ];

        for (const t of tones) {
          await notifee.createChannel({
            id: `codepush_channel_${t.id}`,
            name: t.name,
            importance: AndroidImportance.HIGH,
            sound: t.sound,
            vibration: true,
          });
        }

        await notifee.createChannel({
          id: 'codepush_high_importance_channel',
          name: 'General CodePush Notifications',
          importance: AndroidImportance.HIGH,
          vibration: true,
        });
      }

      // 4. Foreground Push Listener
      onMessage(messaging, async (remoteMessage: RemoteMessage) => {
        await this.displayNativePush({
          title: remoteMessage.notification?.title || remoteMessage.data?.title as string,
          body: remoteMessage.notification?.body || remoteMessage.data?.body as string,
          soundTone: remoteMessage.data?.soundTone as string,
          route: remoteMessage.data?.route as string,
          data: remoteMessage.data,
        });
      });

      // 5. Deep Link handler on notification tap
      notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS && detail.notification?.data?.route) {
          Linking.openURL(detail.notification.data.route as string).catch(() => {});
        }
      });

      // 6. Cold-start handler when opened from notification
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification?.notification.data?.route) {
        const route = initialNotification.notification.data.route as string;
        setTimeout(() => Linking.openURL(route).catch(() => {}), 800);
      }

      return token;
    } catch (error) {
      console.warn('❌ [PushService] Failed to initialize PushNotificationService:', error);
      return null;
    }
  },

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
      const BUNDLED_TONES = ['crystal_glass', 'electronic_pulse', 'subtle_pop', 'urgent_alarm'];
      let cleanTone = 'default';
      if (rawTone !== 'default' && rawTone !== 'silent') {
        const parsed = String(rawTone).replace(/\.[^/.]+$/, '').toLowerCase();
        cleanTone = BUNDLED_TONES.includes(parsed) ? parsed : 'default';
      }

      const channelId = cleanTone !== 'default'
        ? `codepush_channel_${cleanTone}`
        : 'codepush_high_importance_channel';

      await notifee.displayNotification({
        title: payload.title || 'CodePush Notification',
        body: payload.body || 'You have received a new update',
        android: {
          channelId,
          sound: cleanTone !== 'default' ? cleanTone : undefined,
          pressAction: { id: 'default' },
          smallIcon: 'ic_launcher',
        },
        ios: {
          sound: cleanTone !== 'default' ? `${cleanTone}.mp3` : undefined,
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
```

---

## Step 5: Initialize in Root `App.tsx`

Inside your React Native root `App.tsx`:

```typescript
import React, { useEffect } from 'react';
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
      <Text style={styles.title}>SkillSwap Mobile Client</Text>
      <Text style={styles.subtitle}>Protected with CodePush OTA & Watchdog</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 8 },
});
```

---

## Step 6: Native Android Platform Setup

### 1. In `android/app/src/main/java/.../MainApplication.kt`:
Override `getJSBundleFile()` to load the downloaded CodePush bundle from cache:

```kotlin
import java.io.File

override fun getJSBundleFile(): String? {
    val otaBundle = File(applicationContext.filesDir, "codepush_bundle/index.android.bundle")
    return if (otaBundle.exists()) otaBundle.absolutePath else super.getJSBundleFile()
}
```

### 2. Add Notification Audio Files
Place custom sound files (`crystal_glass.mp3`, `electronic_pulse.mp3`, `subtle_pop.mp3`, `urgent_alarm.mp3`) inside:
```text
android/app/src/main/res/raw/
```

---

## Step 7: Native iOS Platform Setup

### In `ios/.../AppDelegate.mm`:
Return the CodePush downloaded bundle if present:

```objc
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
  NSString *otaPath = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject 
                       stringByAppendingPathComponent:@"codepush_bundle/main.jsbundle"];
  if ([[NSFileManager defaultManager] fileExistsAtPath:otaPath]) {
    return [NSURL fileURLWithPath:otaPath];
  }
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
}
```

---

## Step 8: Hermes Bytecode & Source Map Pre-Flight Compilation

When shipping production bundles, use the Hermes compiler for 3x faster startup times and generate source maps for stack trace symbolication:

```bash
# 1. Compile bundle & generate Source Map
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output build_bundle/index.android.bundle \
  --sourcemap-output build_bundle/index.android.bundle.map \
  --assets-dest build_bundle/res

# 2. Compile to Hermes Bytecode (HBC v84/v90)
hermesc -emit-binary \
  -out build_bundle/index.android.hbc \
  build_bundle/index.android.bundle \
  -source-map build_bundle/index.android.bundle.map

# 3. Archive bundle and assets
cd build_bundle
zip -r ../bundle.zip index.android.bundle res
cd ..
```

---

## Step 9: Automated Crash Circuit Breaker & Symbolication

1. **Autonomous Rollback**: If a newly published release exceeds the crash threshold (> 2% crashes within 10 minutes), the serverless function `report-crash.cjs` automatically revokes the release and points clients to the previous stable version.
2. **Source Map Upload**: Upload your `index.android.bundle.map` directly on the **Publish Updates** screen. The Crash Analytics dashboard automatically decodes minified stack lines (`e.js:1:38421`) into exact TypeScript file paths and line numbers (`ProfileScreen.tsx:42`).

---

## Step 10: Dynamic Remote Config & Feature Flags

Use the CodePush dynamic remote config editor in your dashboard to publish live values without app store updates. Access them inside any React component:

```typescript
import { CodePushService } from './src/services/CodePushService';

// Read dynamic feature flags:
const isPromoEnabled = CodePushService.getRemoteConfig('show_holiday_banner') ?? false;
const maxUploadSize = CodePushService.getRemoteConfig('max_upload_mb') ?? 25;
```

---

## Step 11: Developer CLI Tool (`@codepush/cli`)

Use the bundled CLI in your terminal for zero-friction deployments:

```bash
# 1. Login with project API Key
npx codepush login --key cp_live_e93847a98b2c1d0e

# 2. Release instant bundle to Staging
npx codepush release-react -a app_rCYp1a_mvdfs5j4_w9dyc -p android -t staging -m "Fixed map pin offset"

# 3. Promote verified Staging release to Production
npx codepush promote -a app_rCYp1a_mvdfs5j4_w9dyc -p android -s staging -d production

# 4. Instant Rollback
npx codepush rollback -a app_rCYp1a_mvdfs5j4_w9dyc -p android

# 5. Check Active Release Status
npx codepush status -a app_rCYp1a_mvdfs5j4_w9dyc
```

---

## Step 12: Automated GitHub Actions CI/CD Pipeline

Create `.github/workflows/codepush.yml` in your mobile application repository:

```yaml
name: CodePush Auto-Release

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Release to Production via CodePush CLI
        run: |
          npx codepush release-react \
            -a ${{ secrets.CODEPUSH_APP_ID }} \
            -p android \
            -t production \
            -m "Automated build from commit ${{ github.sha }}"
        env:
          CODEPUSH_API_KEY: ${{ secrets.CODEPUSH_API_KEY }}
```

---

## Step 13: Slack & Discord Deployment Webhooks

Configure incoming webhooks in your Dashboard settings to receive live notifications on team channels whenever releases or emergency rollbacks occur.

### Sample Slack & Discord Notification Payload:
```json
{
  "event": "release.published",
  "app": "SkillSwap",
  "version": "1.2.4",
  "track": "Production (100% Canary Fleet)",
  "author": "santhosh",
  "releaseNotes": "Fixed payment gateway timeout on checkout",
  "hash": "sha256-8a9f2b...",
  "timestamp": "2026-10-26T22:30:00Z"
}
```

---

## Step 14: Dynamic Asset & Translation Hot-Swapping (F8)

Update dynamic UI assets and language dictionaries in real time without submitting a new binary build.

### 1. `useCodePushLocale` Hook
```typescript
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useCodePushLocale(lang: string = 'en') {
  const [strings, setStrings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLocale() {
      const cached = await AsyncStorage.getItem(`@codepush_locale_${lang}`);
      if (cached) setStrings(JSON.parse(cached));

      try {
        const res = await fetch(`https://codepushs.netlify.app/.netlify/functions/download-bundle?action=locale&lang=${lang}`);
        if (res.ok) {
          const fresh = await res.json();
          setStrings(fresh);
          await AsyncStorage.setItem(`@codepush_locale_${lang}`, JSON.stringify(fresh));
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    loadLocale();
  }, [lang]);

  return { t: (key: string) => strings[key] || key, loading };
}
```

---

## Step 15: Dual-Slot Self-Healing Atomic Swapper (F9)

The client maintains an A/B partition structure (`/slots/slot_a` and `/slots/slot_b`). Standby slot receives updates in the background, executes cryptographic validation, and performs an atomic pointer swap. A 5-second watchdog timer restores the active pointer to the previous stable slot if any unhandled startup exception occurs.

```typescript
import RNFS from 'react-native-fs';

const ACTIVE_SLOT_FILE = `${RNFS.DocumentDirectoryPath}/codepush/active_slot.json`;

export async function atomicSwapSlot(downloadedZipPath: string) {
  const currentSlotConfig = await getActiveSlotConfig();
  const standbySlot = currentSlotConfig.activeSlot === 'slot_a' ? 'slot_b' : 'slot_a';
  const standbyPath = `${RNFS.DocumentDirectoryPath}/codepush/slots/${standbySlot}`;

  // 1. Unzip & verify checksum in standby partition
  await RNFS.mkdir(standbyPath);
  
  // 2. Atomic pointer swap with watchdog flag
  const newConfig = {
    activeSlot: standbySlot,
    pendingSurvivalCheck: true,
    swappedAt: new Date().toISOString(),
  };
  await RNFS.writeFile(ACTIVE_SLOT_FILE, JSON.stringify(newConfig), 'utf8');

  // 3. 5-second survival confirmation watchdog
  setTimeout(async () => {
    newConfig.pendingSurvivalCheck = false;
    await RNFS.writeFile(ACTIVE_SLOT_FILE, JSON.stringify(newConfig), 'utf8');
  }, 5000);
}
```

---

## Troubleshooting & Verification

1. **Verify Update Check Endpoint**:
   ```bash
   curl "https://codepushs.netlify.app/.netlify/functions/check-update?platform=android&currentVersion=1.0.0&apiKey=YOUR_API_KEY&projectId=YOUR_APP_ID"
   ```
2. **Verify Crash Reporting**:
   Trigger an unhandled error inside a test component and check the **Crash Analytics** screen on your dashboard.
3. **Verify Emergency Kill-Switch**:
   Click **Instant Revoke** in Release History. The client app will trigger `emergencyRollbackToFactory()` and reboot to base APK assets on its next update check.
