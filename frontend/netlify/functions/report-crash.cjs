const db = require('./db.cjs');
const { extractApiKey, verifyApiKey } = require('./auth.cjs');

// Sliding 10-minute window for Dimensional Cohort Quarantine detection
const COHORT_WINDOW_MS = 10 * 60 * 1000;
const cohortCrashWindow = new Map();

function resetCohortWindow() {
  cohortCrashWindow.clear();
}

function buildCohortSignature(projectId, platform, version, dims) {
  const clean = (v) => (v ? String(v).trim().toLowerCase() : '');
  return [
    projectId,
    platform,
    version,
    clean(dims.osVersion),
    clean(dims.ramTier),
    clean(dims.abi),
    clean(dims.manufacturer),
  ].join('|');
}

async function evaluateCohortQuarantine({ projectId, platform, version, dims, threshold = 3 }) {
  const hasDimension = Boolean(dims.osVersion || dims.ramTier || dims.abi || dims.manufacturer);
  if (!hasDimension) return null;

  const sig = buildCohortSignature(projectId, platform, version, dims);
  const now = Date.now();
  const timestamps = (cohortCrashWindow.get(sig) || []).filter((ts) => now - ts <= COHORT_WINDOW_MS);
  timestamps.push(now);
  cohortCrashWindow.set(sig, timestamps);

  if (timestamps.length < threshold) return null;

  const relRes = await db.query(
    `SELECT id, quarantined_cohorts FROM releases
     WHERE (project_id = $1 OR project_id IS NULL) AND platform = $2 AND version = $3
     ORDER BY created_at DESC LIMIT 1`,
    [projectId, platform, version]
  );
  const relRow = relRes?.rows?.[0];
  const existing = Array.isArray(relRow?.quarantined_cohorts) ? relRow.quarantined_cohorts : [];

  const alreadyQuarantined = existing.some(
    (c) =>
      (c.osVersion || '') === (dims.osVersion || '') &&
      (c.ramTier || '') === (dims.ramTier || '') &&
      (c.abi || '') === (dims.abi || '') &&
      (c.manufacturer || '') === (dims.manufacturer || '')
  );
  if (alreadyQuarantined) return null;

  const labelParts = [dims.osVersion && `OS ${dims.osVersion}`, dims.ramTier && `${dims.ramTier}-RAM`, dims.abi, dims.manufacturer].filter(Boolean);
  const cohortRule = {
    id: `qc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...(dims.osVersion ? { osVersion: dims.osVersion } : {}),
    ...(dims.ramTier ? { ramTier: dims.ramTier } : {}),
    ...(dims.abi ? { abi: dims.abi } : {}),
    ...(dims.manufacturer ? { manufacturer: dims.manufacturer } : {}),
    reason: `Auto-quarantined ${labelParts.join(' + ')} after ${timestamps.length} crashes in 10m`,
    crashCount: timestamps.length,
    quarantinedAt: new Date(now).toISOString(),
    autoQuarantined: true,
  };

  if (relRow?.id) {
    const updated = [...existing, cohortRule];
    await db.query(
      `UPDATE releases SET quarantined_cohorts = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(updated), relRow.id]
    );
  }
  return cohortRule;
}

exports.resetCohortWindow = resetCohortWindow;

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
    // GET: Retrieve crashes and circuit breaker status from PostgreSQL
    if (event.httpMethod === 'GET') {
      const crashRes = await db.query(
        `SELECT * FROM crash_reports 
         WHERE (project_id = $1 OR project_id IS NULL) 
         ORDER BY created_at DESC 
         LIMIT 100`,
        [projectId]
      );
      const crashesList = crashRes.rows;

      if (query.action === 'ai-diagnosis') {
        const targetVer = query.version || '1.0.1';
        const targetPlat = (query.platform || 'android').toLowerCase();
        const relevantCrashes = crashesList.filter(
          (c) => c.version === targetVer && c.platform === targetPlat
        );
        const sampleList = relevantCrashes.length > 0 ? relevantCrashes : crashesList.slice(0, 5);
        const report = generateAIGuardianReport(sampleList, targetVer, targetPlat);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, aiReport: report }),
        };
      }

      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const recentCrashes = crashesList.filter(
        (c) => new Date(c.created_at).getTime() >= tenMinutesAgo
      );

      // Fetch project circuit breaker settings from PostgreSQL 'projects' table
      const projRes = await db.query(
        'SELECT circuit_breaker_enabled, circuit_breaker_threshold FROM projects WHERE id = $1 LIMIT 1',
        [projectId]
      );
      const projRow = projRes.rows[0] || {};
      const circuitBreakerConfig = {
        enabled: projRow.circuit_breaker_enabled !== false,
        threshold: projRow.circuit_breaker_threshold || 5,
        windowMinutes: 10,
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          projectId,
          crashes: crashesList,
          circuitBreaker: {
            ...circuitBreakerConfig,
            recentCrashCount: recentCrashes.length,
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
        const crashRes = await db.query(
          `SELECT * FROM crash_reports 
           WHERE (project_id = $1 OR project_id IS NULL) AND version = $2 AND platform = $3 
           ORDER BY created_at DESC LIMIT 5`,
          [projectId, targetVer, targetPlat]
        );
        const report = generateAIGuardianReport(crashRes.rows, targetVer, targetPlat);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, aiReport: report }),
        };
      }

      // Lift a specific dimensional cohort quarantine rule
      if (body.action === 'lift-quarantine') {
        const targetReleaseId = body.releaseId || body.id;
        const cohortId = body.cohortId;
        if (!targetReleaseId || !cohortId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'releaseId and cohortId are required' }),
          };
        }
        const relRes = await db.query(
          `SELECT id, quarantined_cohorts FROM releases WHERE id = $1 LIMIT 1`,
          [targetReleaseId]
        );
        const relRow = relRes?.rows?.[0];
        if (!relRow) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Release not found' }) };
        }
        const existing = Array.isArray(relRow.quarantined_cohorts) ? relRow.quarantined_cohorts : [];
        const updated = existing.filter((c) => c.id !== cohortId);
        await db.query(
          `UPDATE releases SET quarantined_cohorts = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(updated), relRow.id]
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Cohort quarantine lifted',
            quarantinedCohorts: updated,
          }),
        };
      }

      // Configuration update mode
      if (body.action === 'configure-circuit-breaker') {
        await db.query(
          `UPDATE projects 
           SET circuit_breaker_enabled = $1, circuit_breaker_threshold = $2, updated_at = NOW() 
           WHERE id = $3`,
          [body.enabled !== false, Number(body.threshold) || 5, projectId]
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Circuit breaker settings updated in PostgreSQL',
            circuitBreaker: { enabled: body.enabled !== false, threshold: Number(body.threshold) || 5 },
          }),
        };
      }

      // Simulation or device crash ingestion
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
        };
        createdCrashes.push(crashEntry);

        // Insert crash report into PostgreSQL 'crash_reports'
        await db.query(
          `INSERT INTO crash_reports (project_id, version, platform, message, stack, device, resolved, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
          [
            projectId,
            crashEntry.version,
            crashEntry.platform,
            crashEntry.message,
            crashEntry.stack,
            crashEntry.device,
            crashEntry.timestamp,
          ]
        );
      }

      // Evaluate Circuit Breaker Threshold in PostgreSQL
      const projRes = await db.query(
        'SELECT circuit_breaker_enabled, circuit_breaker_threshold, webhook_url, slack_webhook_url, discord_webhook_url FROM projects WHERE id = $1 LIMIT 1',
        [projectId]
      );
      const projRow = projRes.rows[0] || {};
      const cbThreshold = projRow.circuit_breaker_threshold || 5;
      const cbEnabled = projRow.circuit_breaker_enabled !== false;

      let circuitBreakerTriggered = false;
      let tripDetails = null;

      if (cbEnabled) {
        const windowRes = await db.query(
          `SELECT COUNT(*) FROM crash_reports 
           WHERE (project_id = $1 OR project_id IS NULL) 
             AND platform = $2 
             AND version = $3 
             AND created_at >= NOW() - INTERVAL '10 minutes'`,
          [projectId, targetPlatform, targetVersion]
        );
        const crashesInWindowCount = parseInt(windowRes.rows[0]?.count || '0', 10);

        if (crashesInWindowCount >= cbThreshold) {
          circuitBreakerTriggered = true;
          const tripReason = `🚨 Automated Circuit Breaker: ${crashesInWindowCount} crashes detected in the last 10 minutes. Release auto-revoked to protect users.`;

          tripDetails = {
            triggeredAt: nowIso,
            version: targetVersion,
            platform: targetPlatform,
            crashCount: crashesInWindowCount,
            threshold: cbThreshold,
            reason: tripReason,
            autoMitigated: true,
          };

          // 1. Auto-revoke release in PostgreSQL 'releases' table
          await db.query(
            `UPDATE releases 
             SET revoked = true, revocation_reason = $1, revoked_at = NOW() 
             WHERE (project_id = $2 OR project_id IS NULL) AND platform = $3 AND version = $4`,
            [tripReason, projectId, targetPlatform, targetVersion]
          );

          // 2. Set active emergency alert in PostgreSQL 'alerts' table
          await db.query(
            `INSERT INTO alerts (id, project_id, title, message, type, active, sound_tone, created_at)
             VALUES ($1, $2, $3, $4, $5, true, $6, NOW())
             ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, message = EXCLUDED.message`,
            [`cb_${Date.now()}`, projectId, '🚨 Circuit Breaker Auto-Revoke', tripReason, 'warning', 'urgent_alarm']
          );

          // 3. Log alert in PostgreSQL 'telemetry_pings'
          await db.query(
            `INSERT INTO telemetry_pings (id, project_id, platform, device_id, action, version)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [
              `ping_${Date.now()}`,
              projectId,
              targetPlatform,
              'Automated Circuit Breaker',
              tripReason,
              targetVersion,
            ]
          );

          // 4. Dispatch outgoing Slack / Discord Webhook
          const webhookUrl = projRow.discord_webhook_url || projRow.slack_webhook_url || projRow.webhook_url || process.env.CODEPUSH_WEBHOOK_URL;
          if (webhookUrl) {
            dispatchCircuitBreakerWebhook(tripDetails, webhookUrl).catch(() => {});
          }
        }
      }

      // Evaluate Dimensional Cohort Quarantine (surgical isolation before global trip)
      const cohortDims = {
        osVersion: body.osVersion || null,
        ramTier: body.ramTier || null,
        abi: body.abi || null,
        manufacturer: body.manufacturer || null,
      };
      const quarantinedCohort = await evaluateCohortQuarantine({
        projectId,
        platform: targetPlatform,
        version: targetVersion,
        dims: cohortDims,
        threshold: Number(body.cohortThreshold) || 3,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: circuitBreakerTriggered
            ? `🚨 Circuit Breaker tripped: v${targetVersion} auto-revoked due to crash spike.`
            : quarantinedCohort
            ? `🛡️ Cohort quarantined (${quarantinedCohort.reason}) without revoking healthy devices.`
            : 'Crash report recorded in PostgreSQL',
          circuitBreakerTriggered,
          tripDetails,
          cohortQuarantined: Boolean(quarantinedCohort),
          quarantinedCohort,
          injectedCount: countToInject,
        }),
      };
    }

    // DELETE: Clear or resolve crashes in PostgreSQL
    if (event.httpMethod === 'DELETE') {
      const crashId = query.crashId;
      if (crashId) {
        await db.query('DELETE FROM crash_reports WHERE id = $1', [crashId]);
      } else {
        await db.query('DELETE FROM crash_reports WHERE project_id = $1', [projectId]);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Crash reports cleared from PostgreSQL' }),
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
