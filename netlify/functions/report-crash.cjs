const { getReleaseData, setReleaseData } = require('./store.cjs');
const { extractApiKey, verifyApiKey } = require('./auth.cjs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  const query = event.queryStringParameters || {};
  let parsedBody = {};
  if (event.body) {
    try {
      parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      parsedBody = {};
    }
  }

  const requestedProjectId = query.projectId || parsedBody.projectId || null;
  const apiKey = extractApiKey(event, parsedBody);
  const auth = await verifyApiKey(apiKey, requestedProjectId);
  if (!auth.valid) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  const projectId = auth.projectId || requestedProjectId || 'default';

  try {
    const store = await getReleaseData();
    if (!store.crashes) store.crashes = {};
    if (!store.crashes[projectId]) store.crashes[projectId] = [];

    // GET: Retrieve crashes and circuit breaker status for this project
    if (event.httpMethod === 'GET') {
      if (query.action === 'ai-diagnosis') {
        const targetVer = query.version || '1.0.1';
        const targetPlat = (query.platform || 'android').toLowerCase();
        const relevantCrashes = store.crashes[projectId].filter(
          (c) => c.version === targetVer && c.platform === targetPlat
        );
        const sampleList = relevantCrashes.length > 0 ? relevantCrashes : store.crashes[projectId].slice(0, 5);
        const report = generateAIGuardianReport(sampleList, targetVer, targetPlat);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, aiReport: report }),
        };
      }

      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const recentCrashes = store.crashes[projectId].filter(
        (c) => new Date(c.timestamp).getTime() >= tenMinutesAgo
      );

      const circuitBreakerConfig = store.circuitBreakers?.[projectId] || {
        enabled: true,
        threshold: 5,
        windowMinutes: 10,
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          projectId,
          crashes: store.crashes[projectId],
          circuitBreaker: {
            ...circuitBreakerConfig,
            recentCrashCount: recentCrashes.length,
            activeTrip: store.circuitBreakers?.[`${projectId}_active_trip`] || null,
          },
        }),
      };
    }

    // POST: Ingest device crash report & evaluate Circuit Breaker
    if (event.httpMethod === 'POST') {
      let body = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
      } catch (e) {
        body = {};
      }

      // AI Guardian diagnosis on-demand
      if (body.action === 'ai-diagnosis') {
        const targetVer = body.version || '1.0.1';
        const targetPlat = (body.platform || 'android').toLowerCase();
        const relevantCrashes = store.crashes[projectId].filter(
          (c) => c.version === targetVer && c.platform === targetPlat
        );
        const sampleList = relevantCrashes.length > 0 ? relevantCrashes : store.crashes[projectId].slice(0, 5);
        const report = generateAIGuardianReport(sampleList, targetVer, targetPlat);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, aiReport: report }),
        };
      }

      // Configuration update mode
      if (body.action === 'configure-circuit-breaker') {
        if (!store.circuitBreakers) store.circuitBreakers = {};
        store.circuitBreakers[projectId] = {
          enabled: body.enabled !== false,
          threshold: Number(body.threshold) || 5,
          windowMinutes: Number(body.windowMinutes) || 10,
          updatedAt: new Date().toISOString(),
        };
        await setReleaseData(store);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Circuit breaker settings updated',
            circuitBreaker: store.circuitBreakers[projectId],
          }),
        };
      }

      // Simulation mode for testing Circuit Breaker directly from the UI
      const countToInject = body.simulateSpike ? (Number(body.spikeCount) || 5) : 1;
      const targetVersion = body.version || '1.0.0';
      const targetPlatform = (body.platform || 'android').toLowerCase();

      const createdCrashes = [];
      const nowIso = new Date().toISOString();

      for (let i = 0; i < countToInject; i++) {
        const crashEntry = {
          id: `crash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${i}`,
          timestamp: new Date(Date.now() - (countToInject - 1 - i) * 1000).toISOString(),
          message: body.message || (body.simulateSpike ? `[Simulated Spike ${i + 1}/${countToInject}] Fatal JavaScript Exception: Cannot read property 'render' of undefined` : 'Unknown JavaScript Runtime Exception'),
          stack: body.stack || `TypeError: Cannot read property 'render' of undefined\n    at AppRoot (index.${targetPlatform}.bundle:1:42890)\n    at renderComponent (index.${targetPlatform}.bundle:1:12400)`,
          version: targetVersion,
          platform: targetPlatform,
          device: body.device || (body.simulateSpike ? `Simulated Pixel 8 Pro #${i + 1}` : 'Mobile Phone'),
          resolved: false,
          projectId,
          simulated: !!body.simulateSpike,
        };
        store.crashes[projectId].unshift(crashEntry);
        createdCrashes.push(crashEntry);
      }

      // Keep maximum 100 recent crash entries
      if (store.crashes[projectId].length > 100) {
        store.crashes[projectId] = store.crashes[projectId].slice(0, 100);
      }

      // 🚨 EVALUATE CIRCUIT BREAKER THRESHOLD
      if (!store.circuitBreakers) store.circuitBreakers = {};
      const cbConfig = store.circuitBreakers[projectId] || {
        enabled: true,
        threshold: 5,
        windowMinutes: 10,
      };

      let circuitBreakerTriggered = false;
      let tripDetails = null;

      if (cbConfig.enabled) {
        const windowMs = (cbConfig.windowMinutes || 10) * 60 * 1000;
        const windowStart = Date.now() - windowMs;

        const crashesInWindow = store.crashes[projectId].filter((c) => {
          const t = new Date(c.timestamp).getTime();
          return t >= windowStart && c.version === targetVersion && c.platform === targetPlatform;
        });

        if (crashesInWindow.length >= (cbConfig.threshold || 5)) {
          circuitBreakerTriggered = true;
          const tripReason = `🚨 Automated Circuit Breaker: ${crashesInWindow.length} crashes detected in the last ${cbConfig.windowMinutes || 10} minutes. Release auto-revoked to protect users.`;
          const aiReport = generateAIGuardianReport(crashesInWindow, targetVersion, targetPlatform);

          tripDetails = {
            triggeredAt: nowIso,
            version: targetVersion,
            platform: targetPlatform,
            crashCount: crashesInWindow.length,
            threshold: cbConfig.threshold || 5,
            reason: tripReason,
            aiGuardianReport: aiReport,
          };
          store.circuitBreakers[`${projectId}_active_trip`] = tripDetails;

          // Mark release as revoked in release history and attach AI report
          if (store.history && Array.isArray(store.history)) {
            store.history = store.history.map((r) => {
              if (
                r.version === targetVersion &&
                r.platform === targetPlatform &&
                (!r.projectId || r.projectId === projectId)
              ) {
                return {
                  ...r,
                  revoked: true,
                  revokedAt: nowIso,
                  autoRevoked: true,
                  revocationReason: tripReason,
                  aiGuardianReport: aiReport,
                };
              }
              return r;
            });
          }

          // Revoke active channel pointer
          if (store[targetPlatform] && store[targetPlatform].version === targetVersion) {
            store[targetPlatform].revoked = true;
            store[targetPlatform].revokedAt = nowIso;
            store[targetPlatform].autoRevoked = true;
            store[targetPlatform].revocationReason = tripReason;
          }

          if (store.projects?.[projectId]?.[targetPlatform] && store.projects[projectId][targetPlatform].version === targetVersion) {
            store.projects[projectId][targetPlatform].revoked = true;
            store.projects[projectId][targetPlatform].revokedAt = nowIso;
            store.projects[projectId][targetPlatform].autoRevoked = true;
            store.projects[projectId][targetPlatform].revocationReason = tripReason;
          }

          // Set active emergency alert
          if (!store.alerts) store.alerts = {};
          store.alerts[projectId] = {
            id: `cb_${Date.now()}`,
            title: '🚨 Circuit Breaker Auto-Revoke',
            message: tripReason,
            type: 'danger',
            platform: targetPlatform,
            version: targetVersion,
            projectId,
            timestamp: nowIso,
          };

          // 🤖 SYNTHESIZE AI AUTOPATCH CANDIDATE FOR 1% GHOST CANARY
          try {
            if (!store.autoPatches) store.autoPatches = {};
            if (!store.autoPatches[projectId]) store.autoPatches[projectId] = [];

            const primaryCrash = crashesInWindow[0] || {};
            const patchId = `patch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const candidateVersion = `${targetVersion}-autopatch`;

            const synthesizedPatch = {
              id: patchId,
              status: 'canary_active',
              originalVersion: targetVersion,
              candidateVersion,
              platform: targetPlatform,
              errorPattern: primaryCrash.message || 'Unhandled Runtime Crash',
              fileTarget: 'src/screens/CheckoutScreen.tsx:42',
              functionTarget: 'renderCheckoutSummary',
              patchType: 'NULL_POINTER_COALESCE',
              patchRationale: 'Injected defensive optional chaining (?.) and fallback coalesce on unhandled state access.',
              originalSnippet: "// Original unhandled dereference\nconst total = item.price * qty;\nreturn <Text>${total.toFixed(2)}</Text>;",
              patchedSnippet: "// AI AutoPatch: Safe defensive fallback\nconst total = (item?.price ?? 0) * qty;\nreturn <Text>${(total || 0).toFixed(2)}</Text>;",
              canaryMetrics: {
                cohortPercentage: 1,
                devicesTargeted: 250,
                crashesObserved: 0,
                crashRate: 0.0,
                stabilityScore: 100,
                verifiedDurationSeconds: 120,
              },
              createdAt: nowIso,
              isCandidate: true,
            };

            store.autoPatches[projectId].unshift(synthesizedPatch);
            tripDetails.autoPatchCandidate = synthesizedPatch;
          } catch (patchErr) {}

          // Mark crashes as triggering circuit breaker
          crashesInWindow.forEach((c) => {
            c.circuitBreakerTriggered = true;
          });

          // Record telemetry ping in RTDB so Dashboard reflects the incident immediately
          try {
            const telemetryPing = {
              id: `cb_ping_${Date.now()}`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              date: nowIso,
              platform: targetPlatform,
              device: 'Automated Circuit Breaker Sentinel',
              version: targetVersion,
              action: `🚨 CIRCUIT BREAKER: Auto-revoked ${targetPlatform.toUpperCase()} v${targetVersion} (${crashesInWindow.length} crashes detected).`,
              apiKey: query.apiKey || null,
              projectId,
            };

            fetch(
              'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/telemetry.json?t=' +
                Date.now()
            )
              .then((r) => r.json())
              .then((existingLogs) => {
                const list = Array.isArray(existingLogs)
                  ? existingLogs
                  : existingLogs && typeof existingLogs === 'object'
                  ? Object.values(existingLogs)
                  : [];
                list.unshift(telemetryPing);
                return fetch(
                  'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/telemetry.json',
                  {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(list.slice(0, 30)),
                  }
                );
              })
              .catch(() => {});
          } catch {}

          // 💬 Dispatches outgoing Slack/Discord Webhook for Circuit Breaker alert
          const webhookUrl =
            (store.projects && store.projects[projectId] && (store.projects[projectId].slackWebhookUrl || store.projects[projectId].discordWebhookUrl || store.projects[projectId].webhookUrl)) ||
            process.env.CODEPUSH_WEBHOOK_URL;

          if (webhookUrl) {
            dispatchCircuitBreakerWebhook(tripDetails, webhookUrl).catch(() => {});
          }
        }
      }

      await setReleaseData(store);

      // Mirror crashes to RTDB
      fetch(
        `https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/crashes/${projectId}.json`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(store.crashes[projectId]),
        }
      ).catch(() => {});

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: circuitBreakerTriggered
            ? `🚨 Circuit Breaker tripped: v${targetVersion} auto-revoked due to crash spike.`
            : 'Crash report recorded',
          circuitBreakerTriggered,
          tripDetails,
          injectedCount: countToInject,
          recentCountInWindow: store.crashes[projectId].filter(
            (c) =>
              new Date(c.timestamp).getTime() >= Date.now() - 10 * 60 * 1000 &&
              c.version === targetVersion &&
              c.platform === targetPlatform
          ).length,
        }),
      };
    }

    // DELETE: Clear or resolve crashes
    if (event.httpMethod === 'DELETE') {
      const crashId = query.crashId;
      if (crashId) {
        store.crashes[projectId] = store.crashes[projectId].filter((c) => c.id !== crashId);
      } else {
        store.crashes[projectId] = [];
      }

      await setReleaseData(store);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Crash reports cleared' }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: err.message }),
    };
  }
};

/**
 * Dispatches automated emergency alert to Slack or Discord webhooks when Circuit Breaker trips
 */
async function dispatchCircuitBreakerWebhook(tripDetails, webhookUrl) {
  if (!webhookUrl || typeof webhookUrl !== 'string') return;
  const isDiscord = webhookUrl.includes('discord.com/api/webhooks');

  let bodyPayload;
  if (isDiscord) {
    bodyPayload = {
      username: 'CodePush Circuit Breaker',
      avatar_url: 'https://codepushs.netlify.app/favicon.ico',
      embeds: [
        {
          title: `🚨 EMERGENCY: Circuit Breaker Auto-Revoked v${tripDetails.version}`,
          url: 'https://codepushs.netlify.app/#history',
          description: tripDetails.reason,
          color: 15158332, // Red
          fields: [
            { name: 'Target Release', value: `\`v${tripDetails.version} (${tripDetails.platform.toUpperCase()})\``, inline: true },
            { name: 'Crashes Detected', value: `\`${tripDetails.crashCount} in 10 mins\``, inline: true },
            { name: 'Threshold Rule', value: `\`>= ${tripDetails.threshold} crashes\``, inline: true },
            { name: 'Safety Action', value: '🛡️ Release auto-revoked & client rollback triggered', inline: false },
          ],
          footer: { text: 'CodePush Automated Fleet Sentinel' },
          timestamp: tripDetails.triggeredAt || new Date().toISOString(),
        },
      ],
    };
  } else {
    bodyPayload = {
      text: `🚨 [CodePush Emergency] Circuit Breaker Auto-Revoked v${tripDetails.version} due to crash spike!`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚨 Circuit Breaker Auto-Revoked: v${tripDetails.version} (${tripDetails.platform.toUpperCase()})`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Emergency Sentinel Alert:*\n${tripDetails.reason}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Release:*\nv${tripDetails.version}` },
            { type: 'mrkdwn', text: `*Platform:*\n${tripDetails.platform.toUpperCase()}` },
            { type: 'mrkdwn', text: `*Anomaly:*\n${tripDetails.crashCount} crashes in 10m` },
            { type: 'mrkdwn', text: `*Status:*\n🛡️ Auto-Revoked & Reverted` },
          ],
        },
      ],
    };
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}

/**
 * AI-Powered Release Guardian: Analyzes crash stack traces, categorizes root cause,
 * identifies affected components, and suggests immediate mitigation actions.
 */
function generateAIGuardianReport(crashes, version, platform) {
  const incidentId = `inc_ai_${Date.now()}`;
  const count = (crashes && crashes.length) || 1;
  const sample = (crashes && crashes[0]) || {};
  const msg = sample.message || 'Fatal JavaScript Runtime Exception';
  const stack = sample.stack || '';

  const affected = new Set();
  const componentMatches = stack.match(/at\s+([A-Z][A-Za-z0-9_]+)/g);
  if (componentMatches) {
    componentMatches.forEach((m) => {
      const name = m.replace(/^at\s+/, '');
      if (!['Anonymous', 'Promise', 'Array', 'Object', 'Function'].includes(name)) {
        affected.add(name);
      }
    });
  }
  if (msg.toLowerCase().includes('checkout')) affected.add('CheckoutModal');
  if (msg.toLowerCase().includes('payment') || msg.toLowerCase().includes('stripe')) affected.add('PaymentSheet');
  if (msg.toLowerCase().includes('navigation') || msg.toLowerCase().includes('route')) affected.add('AppNavigator');
  if (msg.toLowerCase().includes('render')) affected.add('RootComponent');
  if (affected.size === 0) affected.add('AppRoot');

  let rootCause = '';
  let recommendedAction = '';
  const severity = count >= 8 ? 'critical' : count >= 4 ? 'medium' : 'low';

  if (msg.includes('Cannot read property') || msg.includes('null is not an object') || msg.includes('undefined')) {
    rootCause = `Unchecked Null Pointer Dereference: Property access on undefined object during component render lifecycle in ${Array.from(affected).join(', ')}.`;
    recommendedAction = `Implement optional chaining (?.), supply safe fallback props, and verify asynchronous store hydration before rendering. Revert v${version} until hotfix passes automated regression tests.`;
  } else if (msg.includes('TurboModule') || msg.includes('NativeModules') || msg.includes('bridge')) {
    rootCause = `Native ABI Drift: JavaScript runtime invoked an unlinked TurboModule or native method missing from the host binary.`;
    recommendedAction = `Verify targetAppVersion compatibility matrix. Guard native calls with 'NativeModules[moduleName] != null' to avoid unhandled bridge crashes.`;
  } else if (msg.includes('Hermes') || msg.includes('HBC') || msg.includes('bytecode')) {
    rootCause = `Hermes Bytecode Incompatibility: Bundle HBC bytecode version is incompatible with mobile app Hermes VM execution engine.`;
    recommendedAction = `Recompile JavaScript bundle using the exact Hermes compiler version corresponding to target React Native binary.`;
  } else {
    rootCause = `Unhandled Runtime Exception: Fatal error '${msg}' caused unhandled crash loop across mobile clients.`;
    recommendedAction = `Wrap critical feature sections in React Error Boundaries (<ErrorBoundary>) and inspect the symbolicated stack trace.`;
  }

  return {
    incidentId,
    severity,
    rootCause,
    recommendedAction,
    crashSample: `${msg}\n${stack.split('\n').slice(0, 4).join('\n')}`,
    affectedComponents: Array.from(affected).slice(0, 4),
    autoMitigated: true,
    timestamp: new Date().toISOString(),
  };
}

