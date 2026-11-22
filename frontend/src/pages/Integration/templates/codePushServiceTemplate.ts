export function getCodePushServiceTemplate(
  activeAppId: string,
  activeApiKey: string,
  activeAppName: string
): string {
  return `// src/services/CodePushService.ts
import { Platform, Alert, NativeModules } from 'react-native';

const { CodePushNative } = NativeModules;
declare const require: any;

const globalScope: any = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};

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
    fetch(CONFIG.serverUrl + '/.netlify/functions/report-crash?projectId=' + CONFIG.appId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-codepush-api-key': CONFIG.apiKey,
      },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        version: error.version || CONFIG.version,
        platform: Platform.OS,
        device: (Platform.OS === 'ios' ? 'iPhone' : 'Android') + ' Device',
      }),
    }).catch(() => {});
  } catch {}
}

// 2. Global JS unhandled exception listener
if (globalScope.ErrorUtils) {
  const originalHandler = globalScope.ErrorUtils.getGlobalHandler?.();
  globalScope.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
    reportCrashToServer({
      message: error?.message || 'Unhandled JavaScript Exception',
      stack: error?.stack,
    });
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

function displayAlertOnce(alert: {
  id?: string;
  title?: string;
  message?: string;
  active?: boolean;
  actionLabel?: string;
  actionUrl?: string;
  mandatory?: boolean;
}): void {
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
      id: 'ping_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
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

    fetch(CONFIG.serverUrl + '/.netlify/functions/report-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-codepush-api-key': CONFIG.apiKey,
      },
      body: JSON.stringify(ping),
    }).catch(() => {});
  } catch {}
}

export const CodePushService = {
  // Allow optional dynamic overrides (e.g. from local codepush.json)
  configure(customConfig: Partial<typeof CONFIG>): void {
    Object.assign(CONFIG, customConfig);
  },

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

      console.log('[CodePush] Checking updates for ' + platform + ' (Active: v' + currentVersion + ')...');
      // Non-blocking telemetry ping
      sendTelemetryPing('Mobile app active · Checking update (Active: v' + currentVersion + ')', currentVersion);

      const queryParams = new URLSearchParams({
        platform,
        currentVersion,
        country: detectDeviceCountry(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        apiKey: CONFIG.apiKey,
        projectId: CONFIG.appId,
      });

      const response = await fetch(CONFIG.serverUrl + '/.netlify/functions/check-update?' + queryParams.toString(), {
        headers: {
          'x-codepush-api-key': CONFIG.apiKey,
          'Connection': 'keep-alive',
          'Accept-Encoding': 'gzip, br',
        },
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
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
        console.log('⚡ [CodePush] New OTA update v' + data.latestVersion + '. Installing silently...');
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
      sendTelemetryPing('Update v' + version + ' downloading OTA bundle package...', version);
      if (Platform.OS === 'android' && CodePushNative?.downloadAndApplyBundle) {
        await CodePushNative.downloadAndApplyBundle(downloadUrl, version);
        await sendTelemetryPing('Update v' + version + ' installed & autorefreshed', version);
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
        // 1. Primary: Dedicated send-alert endpoint backed by PostgreSQL
        const res = await fetch(CONFIG.serverUrl + '/.netlify/functions/send-alert?projectId=' + CONFIG.appId, {
          headers: {
            'x-codepush-api-key': CONFIG.apiKey,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const alert = data.alert;
          if (alert && alert.active && (alert.message || alert.alertMessage)) {
            displayAlertOnce({
              id: alert.id,
              title: alert.title || alert.alertTitle || 'CodePush Alert',
              message: alert.message || alert.alertMessage,
              actionLabel: alert.actionLabel,
              actionUrl: alert.actionUrl,
              mandatory: alert.mandatory,
            });
            return;
          }
        }
      } catch {}

      // 2. Secondary fallback: check-update endpoint
      try {
        const res = await fetch(CONFIG.serverUrl + '/.netlify/functions/check-update?platform=android&currentVersion=1.0.0&appVersion=' + CONFIG.version, {
          headers: {
            'x-codepush-api-key': CONFIG.apiKey,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const alert = data.alert || (data.alertMessage ? { id: data.alertId, title: data.alertTitle, message: data.alertMessage, active: true } : null);
          if (alert && alert.active && alert.message) {
            displayAlertOnce(alert);
          }
        }
      } catch {}
    };
    checkLiveAlert();
    const interval = setInterval(checkLiveAlert, 2000);
    return () => clearInterval(interval);
  },

  // Real-time listener for Testing Console Push Notifications
  startLivePushNotificationListener(): () => void {
    const shownPushIds = new Set<string>();
    const checkLivePush = async () => {
      try {
        const res = await fetch(CONFIG.serverUrl + '/.netlify/functions/send-push-notification?projectId=' + CONFIG.appId, {
          headers: {
            'x-codepush-api-key': CONFIG.apiKey,
          },
        });
        if (res.ok) {
          const data = await res.json();
          // Support all server response schemas: pushNotification, notification, push, or latest in all[]
          const push =
            data.pushNotification ||
            data.notification ||
            data.push ||
            data.data?.pushNotification ||
            (Array.isArray(data.all) && data.all.length > 0 ? data.all[data.all.length - 1] : null);

          if (push && push.active !== false && (push.title || push.body)) {
            const id =
              push.id ||
              (push.timestamp ? 'push_' + push.timestamp : null) ||
              (push.sentAt ? 'push_' + push.sentAt : null) ||
              (push.createdAt ? 'push_' + new Date(push.createdAt).getTime() : null) ||
              (push.title || '') + ':::' + (push.body || '');

            if (!shownPushIds.has(id)) {
              shownPushIds.add(id);
              try {
                let displayed = false;
                try {
                  const PushService = require('./PushNotificationService')?.PushNotificationService;
                  if (PushService && typeof PushService.displayNativePush === 'function') {
                    await PushService.displayNativePush({
                      title: push.title,
                      body: push.body,
                      soundTone: push.soundTone,
                      route: push.deepLink || push.route,
                      data: { route: push.deepLink || push.route, soundTone: push.soundTone, pushId: id },
                    });
                    displayed = true;
                  }
                } catch (pushErr) {
                  console.warn('⚠️ [CodePush] displayNativePush call failed:', pushErr);
                }
                if (!displayed) {
                  Alert.alert(push.title || 'Push Notification', push.body || '');
                }
              } catch {
                Alert.alert(push.title || 'Push Notification', push.body || '');
              }
            }
          }
        }
      } catch {}
    };
    checkLivePush();
    const interval = setInterval(checkLivePush, 2000);
    return () => clearInterval(interval);
  },

  // Zero-Egress P2P Local Mesh Relay (Enterprise fleets & local LAN distribution)
  enableLocalMeshRelay(options?: { isSeed?: boolean; port?: number; ip?: string }): () => void {
    const peerId = 'device_' + Platform.OS + '_' + Math.random().toString(36).substring(2, 8);
    const port = options?.port || 8443;
    const isSeed = options?.isSeed || false;

    const announcePresence = async () => {
      try {
        let dynamicIp = options?.ip;
        if (!dynamicIp && CodePushNative?.getLocalIpAddress) {
          try {
            dynamicIp = await CodePushNative.getLocalIpAddress();
          } catch {}
        }

        await fetch(CONFIG.serverUrl + '/.netlify/functions/mesh-relay?projectId=' + CONFIG.appId, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-codepush-api-key': CONFIG.apiKey,
          },
          body: JSON.stringify({
            peerId,
            ip: dynamicIp || undefined,
            port,
            isSeed,
            version: CONFIG.version,
            transferSpeedMbps: 195,
          }),
        });
      } catch {}
    };

    announcePresence();
    const meshTimer = setInterval(announcePresence, 30000);
    return () => clearInterval(meshTimer);
  },
};
`;
}
