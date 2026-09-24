const versionData = require('../../version.json');

exports.handler = async (event) => {
  const platform = event.queryStringParameters.platform; // 'android' or 'ios'
  const currentVersion = event.queryStringParameters.currentVersion; // e.g. '1.0.0'

  if (!platform || !versionData[platform]) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid or missing platform (android | ios required)" }),
    };
  }

  const targetRelease = versionData[platform];
  const updateAvailable = targetRelease.latestVersion !== currentVersion;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      updateAvailable,
      downloadUrl: updateAvailable ? targetRelease.downloadUrl : null,
      latestVersion: targetRelease.latestVersion,
      mandatory: targetRelease.mandatory,
      hash: targetRelease.hash,
      releaseNotes: targetRelease.releaseNotes,
    }),
  };
};
