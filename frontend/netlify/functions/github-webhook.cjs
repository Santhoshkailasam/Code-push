/**
 * Netlify Function: github-webhook.cjs
 * Handles incoming GitHub Push Webhook events automatically without requiring manual action YAML files!
 */

const { getReleaseData, setReleaseData } = require('./store.cjs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-GitHub-Event, X-Hub-Signature-256',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS Preflight' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    let payload = {};
    if (typeof event.body === 'string') {
      try {
        payload = JSON.parse(event.body);
      } catch (e) {
        // Form URL-encoded fallback
        const params = new URLSearchParams(event.body);
        if (params.has('payload')) {
          payload = JSON.parse(params.get('payload'));
        }
      }
    } else if (typeof event.body === 'object' && event.body !== null) {
      payload = event.body;
    }

    const githubEvent = event.headers['x-github-event'] || 'push';
    const repository = payload.repository ? payload.repository.full_name : 'unknown/repo';
    const ref = payload.ref || 'refs/heads/main';
    const branch = ref.replace('refs/heads/', '');
    const headCommit = payload.head_commit || (payload.commits && payload.commits[0]) || {};
    const commitMessage = headCommit.message || 'Auto-pushed code update from GitHub Webhook';
    const commitHash = (headCommit.id || Math.random().toString(36).substring(2, 10)).substring(0, 8);
    const author = headCommit.author ? headCommit.author.name : (payload.sender ? payload.sender.login : 'Developer');

    const store = await getReleaseData();

    // Auto-generate version timestamp tag
    const versionDate = new Date();
    const versionStr = `1.0.${versionDate.getFullYear()}${(versionDate.getMonth() + 1).toString().padStart(2, '0')}${versionDate.getDate().toString().padStart(2, '0')}${versionDate.getHours().toString().padStart(2, '0')}${versionDate.getMinutes().toString().padStart(2, '0')}`;

    const newRelease = {
      id: `rel_gh_${Date.now()}_${commitHash}`,
      platform: 'android',
      latestVersion: versionStr,
      version: versionStr,
      hash: `sha256-${commitHash}`,
      mandatory: false,
      releaseNotes: `[Git Push (${branch})] ${commitMessage} (by ${author})`,
      minAppVersion: '1.0.0',
      downloadUrl: `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${versionStr}&platform=android`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: `GitHub Webhook (${repository}#${branch})`,
      commitHash,
      author,
    };

    store.android = newRelease;
    if (!store.history) store.history = [];
    store.history.unshift(newRelease);

    // Save build log entry
    if (!store.buildLogs) store.buildLogs = [];
    const logItem = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level: 'success',
      message: `⚡ Webhook triggered on branch '${branch}'! Published OTA Release v${versionStr} (${commitMessage})`,
      commitHash,
      author,
      repository,
    };
    store.buildLogs.unshift(logItem);
    if (store.buildLogs.length > 30) store.buildLogs = store.buildLogs.slice(0, 30);

    await setReleaseData(store);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `GitHub Webhook event '${githubEvent}' processed successfully for ${repository}#${branch}`,
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
