const { getReleaseData } = require('./store.cjs');

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
  const activeAlert = (store.alerts && (
    (projectId && store.alerts[projectId]) ||
    (apiKey && store.alerts[apiKey]) ||
    (platform && store.alerts[platform]) ||
    store.alerts.global ||
    store.alerts.latest
  )) || (testMessage ? {
    message: testMessage,
    title: testTitle || 'CodePush Alert Testing',
    id: `alert_test_${Date.now()}`,
    type: 'info'
  } : null);

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
      alertMessage: activeAlert && activeAlert.active !== false ? activeAlert.message : null,
      alertTitle: activeAlert && activeAlert.active !== false ? (activeAlert.title || 'CodePush Alert Testing') : null,
      alertId: activeAlert && activeAlert.active !== false ? activeAlert.id : null,
      alertType: activeAlert && activeAlert.active !== false ? (activeAlert.type || 'info') : null,
    }),
  };
};

