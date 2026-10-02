const { getReleaseData } = require('./store.cjs');

exports.handler = async (event) => {
  const platform = event.queryStringParameters ? event.queryStringParameters.platform : null; // 'android' or 'ios'
  const currentVersion = event.queryStringParameters ? event.queryStringParameters.currentVersion : null; // e.g. '1.0.0'
  const apiKey = (event.queryStringParameters ? event.queryStringParameters.apiKey : null) || event.headers['x-codepush-api-key'];

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

  // Lookup release by scoped API key if available, otherwise fallback to standard platform release
  let targetRelease = null;
  if (apiKey && store.keys && store.keys[apiKey] && store.keys[apiKey][platform]) {
    targetRelease = store.keys[apiKey][platform];
  } else if (store[platform]) {
    targetRelease = store[platform];
  }

  if (!targetRelease) {
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: `No active release found for platform: ${platform}` }),
    };
  }
  const latestVersion = targetRelease.latestVersion || targetRelease.version;
  const updateAvailable = latestVersion !== currentVersion;

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
    }),
  };
};
