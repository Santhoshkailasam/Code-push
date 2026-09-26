/**
 * Netlify Function: publish-release.cjs
 * Handles automated release publishing via GitHub Actions CI/CD pipeline or API POST requests.
 */

const VALID_API_KEY = process.env.CODEPUSH_API_KEY || 'cp_live_sec_key_demo_2026';

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
    const authHeader = event.headers['authorization'] || event.headers['x-codepush-api-key'];
    const apiKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    // Verify API Key
    if (!apiKey || apiKey !== VALID_API_KEY) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Unauthorized: Invalid or missing CodePush API Key.',
          tip: 'Set your secret in GitHub Secrets as CODEPUSH_API_KEY'
        }),
      };
    }

    const payload = JSON.parse(event.body || '{}');
    const { platform, version, downloadUrl, hash, releaseNotes, mandatory, minAppVersion } = payload;

    if (!platform || !version || !downloadUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters. Required: platform (android|ios), version, downloadUrl.'
        }),
      };
    }

    const newRelease = {
      id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      platform: platform.toLowerCase(),
      version,
      hash: hash || `sha256-${Math.random().toString(36).substring(2, 10)}`,
      mandatory: Boolean(mandatory),
      releaseNotes: releaseNotes || `Auto-published from GitHub Action build #${version}`,
      minAppVersion: minAppVersion || '1.0.0',
      downloadUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'github-actions'
    };

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
