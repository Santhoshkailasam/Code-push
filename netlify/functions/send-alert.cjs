const { getReleaseData, setReleaseData } = require('./store.cjs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS Preflight Handled' }) };
  }

  try {
    const store = await getReleaseData();
    if (!store.alerts) store.alerts = {};

    // Handle DELETE to clear alerts
    if (event.httpMethod === 'DELETE') {
      const projectId = event.queryStringParameters ? event.queryStringParameters.projectId : null;
      if (projectId) {
        if (store.alerts[projectId]) delete store.alerts[projectId];
        if (store.alerts.latest && (!store.alerts.latest.projectId || store.alerts.latest.projectId === projectId)) {
          delete store.alerts.latest;
        }
        if (store.alerts.global && (!store.alerts.global.projectId || store.alerts.global.projectId === projectId)) {
          delete store.alerts.global;
        }
      } else {
        store.alerts = {};
      }
      await setReleaseData(store);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Alerts cleared successfully' }),
      };
    }

    // Handle GET to check active alerts
    if (event.httpMethod === 'GET') {
      const projectId = event.queryStringParameters ? event.queryStringParameters.projectId : null;
      const platform = event.queryStringParameters ? event.queryStringParameters.platform : null;
      const alert = (projectId && store.alerts[projectId]) ||
                    (platform && store.alerts[platform]) ||
                    store.alerts.global ||
                    store.alerts.latest ||
                    null;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ alert, allAlerts: store.alerts }),
      };
    }

    // Handle POST or PUT to broadcast alert
    let payload = {};
    if (typeof event.body === 'string') {
      try {
        payload = JSON.parse(event.body);
      } catch (e) {
        payload = {};
      }
    } else if (typeof event.body === 'object' && event.body !== null) {
      payload = event.body;
    }

    const { message, title, projectId, platform, apiKey, type, isGlobal, targetAppOnly } = payload;

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required to broadcast an in-app alert' }),
      };
    }

    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newAlert = {
      id: alertId,
      message: message.trim(),
      title: (title && title.trim()) || 'CodePush Alert Testing',
      type: type || 'info',
      platform: platform || 'all',
      projectId: projectId || null,
      apiKey: apiKey || null,
      createdAt: new Date().toISOString(),
      active: true,
      targetAppOnly: Boolean(targetAppOnly || (projectId && isGlobal === false)),
    };

    // Scoped storage:
    if (projectId) store.alerts[projectId] = newAlert;
    if (platform && platform !== 'all') store.alerts[platform] = newAlert;
    if (apiKey) store.alerts[apiKey] = newAlert;

    // Only broadcast to latest/global if explicitly global or no projectId is specified
    const shouldBroadcastGlobally = isGlobal !== false && !targetAppOnly;
    if (shouldBroadcastGlobally) {
      store.alerts.latest = newAlert;
      store.alerts.global = newAlert;
    }

    // Log telemetry ping for this broadcast
    if (!store.telemetry) store.telemetry = [];
    store.telemetry.unshift({
      id: `ping_${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toISOString(),
      platform: platform || 'all',
      device: 'CodePush Dashboard Dispatcher',
      version: 'Broadcast',
      action: `Broadcasted In-App Alert: "${newAlert.title} - ${newAlert.message.slice(0, 40)}"`,
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
        message: 'Alert broadcasted successfully. Mobile clients checking updates will receive this popup alert.',
        alert: newAlert,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process alert', details: err.message }),
    };
  }
};
