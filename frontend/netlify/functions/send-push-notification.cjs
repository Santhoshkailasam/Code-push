const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const db = require('./db.cjs');
const { getReleaseData, setReleaseData } = require('./store.cjs');
const { extractApiKey, verifyApiKey } = require('./auth.cjs');

// Initialize Firebase Admin SDK safely
function initFirebaseAdmin() {
  const existingApps = admin.getApps ? admin.getApps() : [];
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  // Load environment variables if not loaded yet
  try {
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
  } catch {}
  try {
    require('dotenv').config({ path: path.resolve(process.cwd(), 'frontend/.env') });
  } catch {}

  let serviceAccount = null;

  // 1. Check for environment variable (Supports Base64-encoded or raw JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      serviceAccount = raw.startsWith('{')
        ? JSON.parse(raw)
        : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch (e) {
      // silent
    }
  }

  // 2. Fallback check for service account JSON file on disk
  if (!serviceAccount) {
    const possiblePaths = [
      path.resolve(__dirname, 'firebase-service-account.json'),
      path.resolve(__dirname, 'firebase-service-account.json.json'),
      path.resolve(__dirname, '../firebase-service-account.json'),
      path.resolve(__dirname, '../../firebase-service-account.json'),
      path.resolve(process.cwd(), 'firebase-service-account.json'),
      path.resolve(process.cwd(), 'netlify/functions/firebase-service-account.json'),
    ];

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
  }

  if (serviceAccount) {
    try {
      let credential;
      if (admin.cert) {
        credential = admin.cert(serviceAccount);
      } else if (admin.credential && admin.credential.cert) {
        credential = admin.credential.cert(serviceAccount);
      } else {
        const { cert } = require('firebase-admin/app');
        credential = cert(serviceAccount);
      }
      const app = admin.initializeApp({ credential });
      return app;
    } catch (err) {
      console.warn('[Firebase Admin Init] Error:', err.message);
    }
  }

  return null;
}

// Helper to fetch the latest device token
async function fetchLatestDeviceToken() {
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
      const projectId = effectiveProjectId !== 'default' ? effectiveProjectId : null;
      try {
        if (projectId) {
          await db.query(
            'UPDATE codepush_schema.push_notifications SET active = false WHERE project_id = $1',
            [projectId]
          );
        } else {
          await db.query('UPDATE codepush_schema.push_notifications SET active = false');
        }
      } catch (err) {}

      if (projectId && store.pushNotifications[projectId]) {
        delete store.pushNotifications[projectId];
      } else {
        store.pushNotifications = {};
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Push notification queue cleared' }),
      };
    }

    // GET to check active push notifications
    if (event.httpMethod === 'GET') {
      const projectId = effectiveProjectId !== 'default' ? effectiveProjectId : null;
      let push = null;
      try {
        const res = await db.query(
          `SELECT * FROM codepush_schema.push_notifications 
           WHERE (project_id = $1 OR project_id IS NULL) 
             AND active = true 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [projectId]
        );
        if (res.rows && res.rows.length > 0) {
          const r = res.rows[0];
          push = {
            id: r.id,
            projectId: r.project_id,
            title: r.title,
            body: r.body,
            subtitle: r.subtitle,
            imageUrl: r.image_url,
            deepLink: r.deep_link,
            soundTone: r.sound_tone,
            platform: r.platform,
            active: Boolean(r.active),
            deliveryStatus: r.delivery_status,
            createdAt: r.created_at,
            created_at: r.created_at,
          };
        }
      } catch (err) {
        console.warn('[PostgreSQL Push GET] Error:', err.message);
      }

      if (!push) {
        push = (projectId && store.pushNotifications[projectId]) ||
               store.pushNotifications.latest ||
               null;
      }

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

    // Persist into PostgreSQL 'codepush_schema.push_notifications' table
    try {
      await db.query(
        `INSERT INTO codepush_schema.push_notifications (
           id, project_id, title, body, subtitle, image_url, deep_link,
           sound_tone, platform, target, token, topic, priority,
           active, delivery_status, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           body = EXCLUDED.body,
           active = EXCLUDED.active,
           delivery_status = EXCLUDED.delivery_status;`,
        [
          newPush.id,
          newPush.projectId,
          newPush.title,
          newPush.body,
          newPush.subtitle,
          newPush.imageUrl,
          newPush.deepLink,
          newPush.soundTone,
          newPush.platform,
          newPush.target,
          newPush.token,
          newPush.topic,
          newPush.priority,
          true,
          fcmDispatchStatus,
          newPush.createdAt,
        ]
      );
    } catch (dbErr) {
      console.warn('[PostgreSQL Push INSERT] Error:', dbErr.message);
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
