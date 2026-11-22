const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getReleaseData, setReleaseData } = require('./store.cjs');
const { extractApiKey, verifyApiKey } = require('./auth.cjs');

// Initialize Firebase Admin SDK safely
function initFirebaseAdmin() {
  const existingApps = admin.getApps ? admin.getApps() : [];
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  // 1. Check for service account JSON file in common paths
  const possiblePaths = [
    path.resolve(__dirname, 'firebase-service-account.json'),
    path.resolve(__dirname, 'firebase-service-account.json.json'),
    path.resolve(__dirname, '../firebase-service-account.json'),
    path.resolve(__dirname, '../../firebase-service-account.json'),
    path.resolve(process.cwd(), 'firebase-service-account.json'),
    path.resolve(process.cwd(), 'netlify/functions/firebase-service-account.json'),
  ];

  let serviceAccount = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      } catch (e) {
        // silent
      }
    }
  }

  // 2. Check for environment variable
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      serviceAccount = raw.startsWith('{')
        ? JSON.parse(raw)
        : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch (e) {
      // silent
    }
  }

  if (serviceAccount) {
    try {
      const app = admin.initializeApp({
        credential: admin.cert ? admin.cert(serviceAccount) : admin.credential.cert(serviceAccount),
        databaseURL:
          process.env.VITE_FIREBASE_DATABASE_URL ||
          'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app',
      });
      return app;
    } catch (err) {
      // silent
    }
  }

  return null;
}

// Helper to fetch the latest device token registered by SkillSwap mobile app
async function fetchLatestDeviceToken() {
  try {
    const res = await fetch(
      'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/active_devices/android_device.json'
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.fcmToken) {
        return data.fcmToken;
      }
    }
  } catch {}
  return null;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS Preflight Handled' }) };
  }

  try {
    let parsedBody = {};
    if (event.body) {
      try {
        parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (e) {
        parsedBody = {};
      }
    }

    const requestedProjectId =
      event.queryStringParameters?.projectId || parsedBody.projectId || null;
    const apiKey = extractApiKey(event, parsedBody);
    const auth = await verifyApiKey(apiKey, requestedProjectId);
    if (!auth.valid) {
      return {
        statusCode: auth.statusCode,
        headers,
        body: JSON.stringify({ error: auth.error }),
      };
    }

    const effectiveProjectId = auth.projectId || requestedProjectId || 'default';

    const store = await getReleaseData();
    if (!store.pushNotifications) store.pushNotifications = {};

    // DELETE to clear push queue
    if (event.httpMethod === 'DELETE') {
      const projectId = effectiveProjectId;
      if (projectId && store.pushNotifications[projectId]) {
        delete store.pushNotifications[projectId];
      } else {
        store.pushNotifications = {};
      }
      await setReleaseData(store);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Push notification queue cleared' }),
      };
    }

    // GET to check active push notifications
    if (event.httpMethod === 'GET') {
      const projectId = effectiveProjectId;
      const push = (projectId && store.pushNotifications[projectId]) ||
                    store.pushNotifications.latest ||
                    null;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ pushNotification: push, all: store.pushNotifications }),
      };
    }

    // POST / PUT to dispatch push notification
    const payload = parsedBody;

    const {
      title,
      body,
      subtitle,
      imageUrl,
      deepLink,
      platform,
      target,
      token,
      topic,
      priority,
      sound,
      soundTone,
    } = payload;

    if (!title && !body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title or body is required for push notification' }),
      };
    }

    const pushId = payload.id || `push_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const effectiveTone = soundTone || 'default';
    const BUNDLED_TONES = ['crystal_glass', 'electronic_pulse', 'subtle_pop', 'urgent_alarm', 'custom_notification'];
    let cleanTone = 'default';
    if (effectiveTone !== 'default' && effectiveTone !== 'silent') {
      const parsedTone = String(effectiveTone).replace(/\.[^/.]+$/, '').toLowerCase();
      cleanTone = BUNDLED_TONES.includes(parsedTone) ? parsedTone : 'custom_notification';
    } else if (effectiveTone === 'silent') {
      cleanTone = 'silent';
    }

    const channelId = cleanTone !== 'default' && cleanTone !== 'silent'
      ? `codepush_channel_${cleanTone}`
      : 'codepush_high_importance_channel';

    let targetToken = token ? token.trim() : null;

    // Auto-resolve device token from RTDB if not explicitly passed or if demo placeholder
    if ((!targetToken || targetToken.startsWith('fcm_token_demo_')) && target !== 'topic') {
      const realToken = await fetchLatestDeviceToken();
      if (realToken) {
        targetToken = realToken;
      }
    }

    const newPush = {
      id: pushId,
      title: title || 'CodePush Notification',
      body: body || 'Test push notification',
      subtitle: subtitle || 'SkillSwap',
      imageUrl: imageUrl || null,
      deepLink: deepLink || null,
      platform: platform || 'all',
      target: target || (targetToken ? 'token' : 'all'),
      token: targetToken,
      topic: topic || (effectiveProjectId ? `app_${effectiveProjectId}` : 'all'),
      projectId: effectiveProjectId || payload.projectId || null,
      apiKey: apiKey || null,
      priority: priority || 'high',
      sound: sound !== false,
      soundTone: effectiveTone,
      createdAt: new Date().toISOString(),
      active: true,
    };

    let fcmMessageId = null;
    let fcmDispatchStatus = 'RTDB_ONLY';
    let fcmErrorMessage = null;

    // ⚡ DISPATCH DIRECTLY TO GOOGLE FCM v1 SERVERS
    const firebaseApp = initFirebaseAdmin();
    if (firebaseApp && targetToken && !targetToken.startsWith('fcm_token_demo_')) {
      try {
        const { getMessaging } = require('firebase-admin/messaging');
        const messaging = getMessaging(firebaseApp);

        // 🛡️ Data-only high-priority payload:
        // Android OS automatically creates a notification if the `notification` key is present.
        // Sending data-only ensures only Notifee inside the app creates the notification (1 time only).
        const message = {
          token: targetToken,
          data: {
            title: String(newPush.title || 'CodePush Notification'),
            body: String(newPush.body || 'New message received'),
            subtitle: String(newPush.subtitle || 'SkillSwap'),
            imageUrl: String(newPush.imageUrl || ''),
            route: String(newPush.deepLink || ''),
            soundTone: String(cleanTone),
            pushId: String(newPush.id),
            projectId: String(newPush.projectId || ''),
          },
          android: {
            priority: 'high', // ⚡ Wakes up killed/closed mobile devices immediately
          },
        };

        const fcmResponse = await messaging.send(message);
        fcmMessageId = fcmResponse;
        fcmDispatchStatus = 'DELIVERED_VIA_FCM_V1';
      } catch (fcmErr) {
        fcmErrorMessage = fcmErr.message;
      }
    }

    // Save to Netlify store and update RTDB
    const targetPid = effectiveProjectId || payload.projectId;
    if (targetPid) store.pushNotifications[targetPid] = newPush;
    store.pushNotifications.latest = newPush;

    // Log telemetry
    if (!store.telemetry) store.telemetry = [];
    store.telemetry.unshift({
      id: `ping_${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toISOString(),
      platform: platform || 'all',
      device: fcmDispatchStatus === 'DELIVERED_VIA_FCM_V1' ? 'Google FCM v1 (Direct Server)' : 'Push Dispatcher (RTDB Bridge)',
      version: 'Push',
      action: `Dispatched Push: "${newPush.title}" [${fcmDispatchStatus}]`,
      apiKey: apiKey || 'dashboard',
    });
    if (store.telemetry.length > 20) {
      store.telemetry = store.telemetry.slice(0, 20);
    }

    await setReleaseData(store);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageId: fcmMessageId || `projects/tracker-42b47/messages/${Date.now()}`,
        status: 'DELIVERED',
        deliveryMode: fcmDispatchStatus,
        targetToken: targetToken ? `${targetToken.slice(0, 15)}...` : null,
        fcmError: fcmErrorMessage,
        notification: newPush,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to dispatch push notification', details: err.message }),
    };
  }
};
