export function getIndexJsTemplate(): string {
  return `/**
 * @format
 */

import { AppRegistry, Linking } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { PushNotificationService } from './src/services/PushNotificationService';

// 1. Handle background FCM notifications when app is closed / killed
try {
  const messagingInstance = getMessaging();
  setBackgroundMessageHandler(messagingInstance, async (remoteMessage) => {
    console.log('🌙 [FCM] Background push notification received:', remoteMessage);
    const pushId = remoteMessage.data?.pushId || remoteMessage.data?.id || remoteMessage.messageId;
    const title = remoteMessage.notification?.title || remoteMessage.data?.title;
    const body = remoteMessage.notification?.body || remoteMessage.data?.body;

    if (PushNotificationService.isPushAlreadyHandled(pushId, title, body)) return;

    await PushNotificationService.displayNativePush({
      title,
      body,
      soundTone: (remoteMessage.data?.soundTone as string) || 'default',
      route: (remoteMessage.data?.route as string) || (remoteMessage.data?.deepLink as string),
      data: { ...remoteMessage.data, pushId },
    });
  });
} catch (e) {
  console.warn('⚠️ [FCM] setBackgroundMessageHandler registration notice:', e);
}

// 2. Handle background interaction events (e.g., tap on notification while app is killed)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data?.route) {
    const route = detail.notification.data.route as string;
    try {
      await Linking.openURL(route);
    } catch {}
  }
});

AppRegistry.registerComponent(appName, () => App);
`;
}
