const { getReleaseData, setReleaseData } = require('./store.cjs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS Preflight' }) };
  }

  try {
    let payload = {};
    if (typeof event.body === 'string') {
      try {
        payload = JSON.parse(event.body);
      } catch (e) {}
    } else if (typeof event.body === 'object' && event.body !== null) {
      payload = event.body;
    }

    const { platform, version, action, device, apiKey } = payload;

    const store = await getReleaseData();
    if (!store.telemetry) store.telemetry = [];

    const newPing = {
      id: `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toISOString(),
      platform: platform || 'android',
      device: device || (platform === 'ios' ? 'iPhone Mobile' : 'Android Mobile Phone'),
      version: version || '1.0.0',
      action: action || 'Mobile app checked for updates',
      apiKey: apiKey || 'default',
    };

    // Keep latest 20 live pings
    store.telemetry.unshift(newPing);
    if (store.telemetry.length > 20) {
      store.telemetry = store.telemetry.slice(0, 20);
    }

    await setReleaseData(store);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, ping: newPing }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Error', details: err.message }),
    };
  }
};
