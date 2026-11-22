export function getPushNotificationServiceTemplate(): string {
  return `// src/services/PushNotificationService.ts
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
}
