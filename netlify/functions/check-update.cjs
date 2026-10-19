const { getReleaseData, setReleaseData } = require('./store.cjs');

exports.handler = async (event) => {
  const platform = event.queryStringParameters ? event.queryStringParameters.platform : null; // 'android' or 'ios'
  const currentVersion = event.queryStringParameters ? event.queryStringParameters.currentVersion : null; // e.g. '1.0.0'
  const headers = event.headers || {};
  const apiKey = (event.queryStringParameters ? event.queryStringParameters.apiKey : null) || headers['x-codepush-api-key'] || headers['X-CodePush-Api-Key'];

  const projectId = event.queryStringParameters ? event.queryStringParameters.projectId : null;
  const testMessage = event.queryStringParameters ? event.queryStringParameters.testMessage : null;
  const testTitle = event.queryStringParameters ? event.queryStringParameters.testTitle : null;

  const store = await getReleaseData();

  if (!platform) {
    return {
      statusCode: 400,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: "Invalid or missing platform (android | ios required)" }),
    };
  }

  // Lookup release strictly by scoped API key or project ID (No fallback to global platform release)
  let targetRelease = null;
  if (apiKey && store.keys && store.keys[apiKey] && store.keys[apiKey][platform]) {
    targetRelease = store.keys[apiKey][platform];
  } else if (projectId && store.projects && store.projects[projectId] && store.projects[projectId][platform]) {
    targetRelease = store.projects[projectId][platform];
  }

  if (!targetRelease) {
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ 
        error: `No active release found for platform: ${platform}. A valid API Key or registered App ID is required.` 
      }),
    };
  }

  const latestVersion = targetRelease.latestVersion || targetRelease.version;
  const updateAvailable = latestVersion !== currentVersion;

  // Retrieve active alert from store (scoped by projectId, apiKey, platform, global, or query param)
  const candidateAlert = (store.alerts && (
    (projectId && store.alerts[projectId]) ||
    (apiKey && store.alerts[apiKey]) ||
    (platform && store.alerts[platform]) ||
    store.alerts.global ||
    store.alerts.latest
  )) || (testMessage ? {
    message: testMessage,
    title: testTitle || 'CodePush Alert Testing',
    id: `alert_test_${Date.now()}`,
    type: 'info',
    createdAt: new Date().toISOString(),
    active: true,
  } : null);

  const isAlertExpired = candidateAlert && candidateAlert.createdAt && 
    (Date.now() - new Date(candidateAlert.createdAt).getTime() > 10 * 60 * 1000);
  const activeAlert = candidateAlert && candidateAlert.active !== false && !isAlertExpired ? candidateAlert : null;

  // Automatically record live mobile phone ping in telemetry stream
  try {
    if (!store.telemetry) store.telemetry = [];
    const deviceName = platform === 'ios' ? 'iPhone Mobile Phone' : 'Android Mobile Phone';
    const statusAction = updateAvailable 
      ? `Mobile connected → Update v${latestVersion} ready to download`
      : `Mobile connected → App up to date (Active: v${currentVersion || latestVersion})`;
    
    const newPing = {
      id: `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toISOString(),
      platform: platform || 'android',
      device: deviceName,
      version: currentVersion || latestVersion || '1.0.0',
      action: statusAction,
      apiKey: apiKey || projectId || 'mobile-app',
      projectId: projectId || null,
    };

    store.telemetry.unshift(newPing);
    if (store.telemetry.length > 30) {
      store.telemetry = store.telemetry.slice(0, 30);
    }
    setReleaseData(store).catch(() => {});
    fetch(
      'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/telemetry.json',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(store.telemetry),
      }
    ).catch(() => {});
  } catch {}

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      updateAvailable,
      downloadUrl: updateAvailable ? targetRelease.downloadUrl : null,
      latestVersion: latestVersion,
      mandatory: targetRelease.mandatory,
      hash: targetRelease.hash,
      releaseNotes: targetRelease.releaseNotes,
      alertMessage: activeAlert ? activeAlert.message : null,
      alertTitle: activeAlert ? (activeAlert.title || 'CodePush Alert Testing') : null,
      alertId: activeAlert ? activeAlert.id : null,
      alertType: activeAlert ? (activeAlert.type || 'info') : null,
    }),
  };
};

