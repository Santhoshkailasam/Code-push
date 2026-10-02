/**
 * Netlify Function: publish-release.cjs
 * Handles automated release publishing via GitHub Actions CI/CD pipeline or API POST requests.
 */

const VALID_API_KEY = process.env.CODEPUSH_API_KEY;

exports.handler = async (event) => {
  // CORS Headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight CORS OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS Preflight Handled' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST to publish release.' }),
    };
  }

  try {
    if (!VALID_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server Configuration Error: CODEPUSH_API_KEY environment variable is not configured.' }),
      };
    }

    const authHeader = event.headers['authorization'] || event.headers['x-codepush-api-key'];
    const apiKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    // Verify API Key (Matches server VALID_API_KEY or user-generated cp_live_* key)
    const isValidKey = apiKey && (apiKey === VALID_API_KEY || apiKey.startsWith('cp_live_'));
    if (!isValidKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Unauthorized: Invalid or missing CodePush API Key.',
          tip: 'Generate your API Key in your CodePush Dashboard Profile screen'
        }),
      };
    }

    let payload = {};
    if (typeof event.body === 'object' && event.body !== null) {
      payload = event.body;
    } else if (typeof event.body === 'string') {
      const bodyStr = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      try {
        payload = JSON.parse(bodyStr);
      } catch (e) {
        payload = {};
      }
    }
    const { platform, version, downloadUrl, hash, releaseNotes, mandatory, minAppVersion, bundleBase64 } = payload;

    if (!platform || !version) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters. Required: platform (android|ios), version.'
        }),
      };
    }

    const { getReleaseData, setReleaseData } = require('./store.cjs');
    const store = await getReleaseData();
    const targetPlatform = platform.toLowerCase();

    // Store base64 ZIP bundle if provided (Replace dots for Firebase RTDB key compliance)
    const versionKey = version ? version.replace(/\./g, '_') : 'latest';
    if (!store.bundles) store.bundles = {};
    if (bundleBase64) {
      store.bundles[`${targetPlatform}_${versionKey}`] = bundleBase64;
      store.bundles[targetPlatform] = bundleBase64;
    }

    // Determine public download URL (Use Netlify download-bundle endpoint if bundleBase64 exists or if downloadUrl missing/private)
    const effectiveDownloadUrl = bundleBase64 || (!downloadUrl || downloadUrl.includes('github.com'))
      ? `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${version}&platform=${targetPlatform}`
      : downloadUrl;

    const newRelease = {
      id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      platform: targetPlatform,
      latestVersion: version,
      version: version,
      hash: hash || `sha256-${Math.random().toString(36).substring(2, 10)}`,
      mandatory: Boolean(mandatory),
      releaseNotes: releaseNotes || `Auto-published from GitHub Action build #${version}`,
      minAppVersion: minAppVersion || '1.0.0',
      downloadUrl: effectiveDownloadUrl,
      apiKey: apiKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'github-actions'
    };

    store[targetPlatform] = newRelease;
    
    // Store per-API Key scoped release channel
    if (!store.keys) store.keys = {};
    if (!store.keys[apiKey]) store.keys[apiKey] = {};
    store.keys[apiKey][targetPlatform] = newRelease;

    if (!store.history) store.history = [];
    store.history.unshift(newRelease);

    await setReleaseData(store);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully created version ${version} for ${platform} via GitHub Action push!`,
        release: newRelease,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: err.message }),
    };
  }
};
