/**
 * Netlify Function: publish-release.cjs
 * Handles automated release publishing via GitHub Actions CI/CD pipeline or API POST requests.
 */

const { extractApiKey, verifyApiKey } = require('./auth.cjs');

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

    const apiKey = extractApiKey(event, payload);
    const auth = await verifyApiKey(apiKey, payload.projectId || null);
    if (!auth.valid) {
      return {
        statusCode: auth.statusCode,
        headers,
        body: JSON.stringify({
          error: auth.error,
          tip: 'Generate or copy your Project API Key from your CodePush Dashboard',
        }),
      };
    }

    const {
      platform,
      version,
      downloadUrl,
      hash,
      releaseNotes,
      mandatory,
      minAppVersion,
      targetBinaryVersion,
      track = 'production',
      rolloutPercentage = 100,
      bundleBase64,
      userId: bodyUserId,
      projectId: payloadProjectId,
      action,
      releaseId,
      canarySchedule,
      targetingRules,
      deltaUpdate,
      assetManifest,
      signature,
      signatureAlgorithm,
      detectedNativeModules,
      driftStatus,
      experiment,
      aiGuardianReport,
      dualSlotStatus,
    } = payload;
    const projectId = payloadProjectId || auth.projectId || null;
    const userId = bodyUserId || event.headers['x-user-id'] || auth.userId || null;

    const { getReleaseData, setReleaseData } = require('./store.cjs');
    const store = await getReleaseData();

    // ⚡ ACTION: REVOKE RELEASE (Instant Kill-Switch)
    if (action === 'revoke' || payload.revoke === true) {
      const targetId = releaseId || payload.id;
      if (!store.history) store.history = [];
      let found = false;
      store.history = store.history.map((r) => {
        if (r.id === targetId || (version && r.version === version && r.platform === platform)) {
          found = true;
          return { ...r, revoked: true, revokedAt: new Date().toISOString() };
        }
        return r;
      });

      // Also revoke active channel if it matches
      const targetPlat = (platform || 'android').toLowerCase();
      if (store[targetPlat] && (store[targetPlat].id === targetId || store[targetPlat].version === version)) {
        store[targetPlat].revoked = true;
        store[targetPlat].revokedAt = new Date().toISOString();
      }
      if (projectId && store.projects?.[projectId]?.[targetPlat]) {
        store.projects[projectId][targetPlat].revoked = true;
        store.projects[projectId][targetPlat].revokedAt = new Date().toISOString();
      }

      await setReleaseData(store);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Release ${targetId || version} successfully revoked!`, revoked: true }),
      };
    }

    // ⚡ ACTION: PROMOTE STAGING RELEASE TO PRODUCTION (1-Click Promote)
    if (action === 'promote') {
      const targetId = releaseId || payload.id;
      if (!store.history) store.history = [];
      const itemToPromote = store.history.find((r) => r.id === targetId);
      if (!itemToPromote) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Release not found to promote' }) };
      }

      const promotedRelease = {
        ...itemToPromote,
        id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        track: 'production',
        updatedAt: new Date().toISOString(),
        promotedFrom: itemToPromote.id,
      };

      const targetPlat = itemToPromote.platform.toLowerCase();
      store[targetPlat] = promotedRelease;
      if (itemToPromote.projectId) {
        if (!store.projects) store.projects = {};
        if (!store.projects[itemToPromote.projectId]) store.projects[itemToPromote.projectId] = {};
        store.projects[itemToPromote.projectId][targetPlat] = promotedRelease;
      }

      store.history.unshift(promotedRelease);
      await setReleaseData(store);

      // Dispatch webhook if available
      const webhook = payload.webhookUrl || process.env.CODEPUSH_WEBHOOK_URL;
      if (webhook) {
        await dispatchWebhookNotification(promotedRelease, webhook);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Release v${promotedRelease.version} promoted to Production!`, release: promotedRelease }),
      };
    }

    // ⚡ ACTION: PROMOTE WINNING A/B EXPERIMENT VARIANT TO 100% PRODUCTION
    if (action === 'promote-experiment') {
      const targetId = releaseId || payload.id;
      if (!store.history) store.history = [];
      const itemToPromote = store.history.find((r) => r.id === targetId);
      if (!itemToPromote) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Release not found for experiment promotion' }) };
      }

      const winningVariant = payload.winningVariant || 'variant_b';
      const variantData = itemToPromote.experiment?.[winningVariant] || itemToPromote.experiment?.variantB;

      const promotedRelease = {
        ...itemToPromote,
        id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        version: variantData?.version || itemToPromote.version,
        hash: variantData?.hash || itemToPromote.hash,
        downloadUrl: variantData?.downloadUrl || itemToPromote.downloadUrl,
        rolloutPercentage: 100,
        track: 'production',
        releaseNotes: `[Experiment Winner Promoted] ${variantData?.label || winningVariant} won and is now serving 100% of production traffic.`,
        experiment: itemToPromote.experiment ? {
          ...itemToPromote.experiment,
          winner: winningVariant,
          splitPercentage: winningVariant === 'variant_b' ? 100 : 0,
        } : null,
        updatedAt: new Date().toISOString(),
      };

      const targetPlat = (itemToPromote.platform || 'android').toLowerCase();
      store[targetPlat] = promotedRelease;
      if (itemToPromote.projectId) {
        if (!store.projects) store.projects = {};
        if (!store.projects[itemToPromote.projectId]) store.projects[itemToPromote.projectId] = {};
        store.projects[itemToPromote.projectId][targetPlat] = promotedRelease;
      }

      store.history.unshift(promotedRelease);
      await setReleaseData(store);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Experiment variant '${winningVariant}' promoted to 100% Production!`,
          release: promotedRelease,
        }),
      };
    }

    if (!platform || !version) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters. Required: platform (android|ios), version.'
        }),
      };
    }

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

    const effectiveTargetBinary = targetBinaryVersion || minAppVersion || '1.0.0';
    const parsedRollout = Math.min(100, Math.max(1, parseInt(rolloutPercentage, 10) || 100));

    const newRelease = {
      id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      platform: targetPlatform,
      latestVersion: version,
      version: version,
      hash: hash || `sha256-${Math.random().toString(36).substring(2, 10)}`,
      mandatory: Boolean(mandatory),
      releaseNotes: releaseNotes || `Auto-published release v${version}`,
      minAppVersion: effectiveTargetBinary,
      targetBinaryVersion: effectiveTargetBinary,
      track: track === 'staging' ? 'staging' : 'production',
      rolloutPercentage: parsedRollout,
      revoked: false,
      downloadUrl: effectiveDownloadUrl,
      apiKey: apiKey,
      userId: userId,
      projectId: projectId || null,
      canarySchedule: canarySchedule && canarySchedule.enabled ? {
        enabled: true,
        stages: Array.isArray(canarySchedule.stages) && canarySchedule.stages.length > 0 ? canarySchedule.stages : [5, 25, 50, 100],
        intervalMinutes: parseInt(canarySchedule.intervalMinutes, 10) || 30,
        currentStageIndex: 0,
        startedAt: new Date().toISOString(),
        autoHaltOnSpike: canarySchedule.autoHaltOnSpike !== false,
      } : null,
      targetingRules: targetingRules || null,
      deltaUpdate: deltaUpdate || null,
      assetManifest: assetManifest || null,
      signature: signature || null,
      signatureAlgorithm: signatureAlgorithm || (signature ? 'ed25519' : null),
      detectedNativeModules: detectedNativeModules || null,
      driftStatus: driftStatus || 'passed',
      experiment: experiment || null,
      aiGuardianReport: aiGuardianReport || null,
      dualSlotStatus: dualSlotStatus || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: payload.source || 'codepush-dashboard'
    };

    // Only update global platform pointer when using master key or no projectId
    if (newRelease.track === 'production' && (auth.isMaster || !projectId)) {
      store[targetPlatform] = newRelease;
    }

    // Store per-project scoped release channel
    if (projectId) {
      if (!store.projects) store.projects = {};
      if (!store.projects[projectId]) store.projects[projectId] = {};
      if (newRelease.track === 'production') {
        store.projects[projectId][targetPlatform] = newRelease;
      }
      // Track-specific store
      if (!store.tracks) store.tracks = {};
      if (!store.tracks[projectId]) store.tracks[projectId] = {};
      if (!store.tracks[projectId][targetPlatform]) store.tracks[projectId][targetPlatform] = {};
      store.tracks[projectId][targetPlatform][newRelease.track] = newRelease;
    }
    
    // Store per-API Key and per-User ID scoped release channel
    if (apiKey) {
      if (!store.keys) store.keys = {};
      if (!store.keys[apiKey]) store.keys[apiKey] = {};
      store.keys[apiKey][targetPlatform] = newRelease;
    }

    if (userId) {
      if (!store.users) store.users = {};
      if (!store.users[userId]) store.users[userId] = {};
      store.users[userId][targetPlatform] = newRelease;
    }

    if (!store.history) store.history = [];
    store.history.unshift(newRelease);

    await setReleaseData(store);

    // 📢 Optional: Dispatch Slack / Discord Webhook Notification to Team Channels
    const webhookUrl = payload.webhookUrl || payload.slackWebhook || payload.discordWebhook || process.env.CODEPUSH_WEBHOOK_URL;
    let webhookDispatched = false;
    if (webhookUrl) {
      try {
        await dispatchWebhookNotification(newRelease, webhookUrl);
        webhookDispatched = true;
      } catch (webhookErr) {
        // Silently continue so webhook network issues never fail release publication
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully created version ${version} for ${platform} via GitHub Action push!`,
        release: newRelease,
        webhookDispatched,
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

/**
 * Dispatches automated formatted notification to Slack or Discord webhook channels
 */
async function dispatchWebhookNotification(release, webhookUrl) {
  if (!webhookUrl || typeof webhookUrl !== 'string') return;
  const isDiscord = webhookUrl.includes('discord.com/api/webhooks');

  let bodyPayload;
  if (isDiscord) {
    // Discord Rich Embed
    bodyPayload = {
      username: 'CodePush Deployer',
      avatar_url: 'https://codepushs.netlify.app/favicon.ico',
      embeds: [
        {
          title: `🚀 CodePush OTA Update: v${release.version} (${release.platform.toUpperCase()})`,
          url: 'https://codepushs.netlify.app',
          description: release.releaseNotes || 'New Over-The-Air bundle deployed live to devices.',
          color: release.mandatory ? 15158332 : 3447003, // Red if mandatory, Blue if background
          fields: [
            { name: 'App ID', value: `\`${release.projectId || 'Default'}\``, inline: true },
            { name: 'Platform', value: release.platform === 'ios' ? '🍎 iOS' : '🤖 Android', inline: true },
            { name: 'Update Type', value: release.mandatory ? '🚨 Mandatory (Immediate)' : '🟢 Silent Background', inline: true },
            { name: 'SHA256 Hash', value: `\`${(release.hash || '').substring(0, 16)}...\``, inline: true },
            { name: 'Deployment Source', value: release.source || 'CI/CD Pipeline', inline: true },
          ],
          footer: { text: 'CodePush Platform · Automated Release Alert' },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  } else {
    // Slack Block Kit
    bodyPayload = {
      text: `🚀 [CodePush] New OTA Update Released: v${release.version} (${release.platform.toUpperCase()})`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚀 CodePush OTA Update: v${release.version} (${release.platform.toUpperCase()})`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Project ID:*\n\`${release.projectId || 'Default'}\`` },
            { type: 'mrkdwn', text: `*Platform:*\n${release.platform === 'ios' ? '🍎 iOS' : '🤖 Android'}` },
            { type: 'mrkdwn', text: `*Update Type:*\n${release.mandatory ? '🚨 Mandatory OTA' : '🟢 Silent Background'}` },
            { type: 'mrkdwn', text: `*SHA256 Hash:*\n\`${(release.hash || '').substring(0, 16)}...\`` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Release Notes:*\n${release.releaseNotes || 'No notes specified.'}`,
          },
        },
      ],
    };
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
    signal: AbortSignal.timeout(5000),
  });
}

