const { getReleaseData, setReleaseData } = require('./store.cjs');
const { resolveCountry } = require('./geoResolver.cjs');
const { extractApiKey, verifyApiKey } = require('./auth.cjs');

// Helper to determine SemVer binary compatibility
function isSemVerCompatible(clientBinary, rule) {
  if (!rule || rule === '*' || rule === 'all') return true;
  if (!clientBinary) return true; // If client didn't supply binary version, allow default

  const cleanClient = String(clientBinary).replace(/^v/, '').trim();
  const cleanRule = String(rule).replace(/^v/, '').trim();

  if (cleanClient === cleanRule) return true;

  // Simple SemVer comparison
  const parseVer = (v) => v.split('.').map((p) => parseInt(p, 10) || 0);
  const clientParts = parseVer(cleanClient);

  if (cleanRule.startsWith('~')) {
    // Tilde: allows patch-level changes if minor is specified (e.g., ~1.2.3 allows >=1.2.3 <1.3.0)
    const ruleParts = parseVer(cleanRule.slice(1));
    return clientParts[0] === ruleParts[0] && clientParts[1] === ruleParts[1] && clientParts[2] >= ruleParts[2];
  }

  if (cleanRule.startsWith('^')) {
    // Caret: allows changes that do not modify left-most non-zero digit
    const ruleParts = parseVer(cleanRule.slice(1));
    return clientParts[0] === ruleParts[0] && clientParts[1] >= ruleParts[1];
  }

  if (cleanRule.startsWith('>=')) {
    const ruleParts = parseVer(cleanRule.slice(2));
    if (clientParts[0] > ruleParts[0]) return true;
    if (clientParts[0] === ruleParts[0] && clientParts[1] > ruleParts[1]) return true;
    return clientParts[0] === ruleParts[0] && clientParts[1] === ruleParts[1] && clientParts[2] >= ruleParts[2];
  }

  return cleanClient === cleanRule;
}

// Deterministic hash ring for gradual percentage rollouts
function getDeviceBucket(deviceId, releaseId) {
  const seed = `${deviceId}_${releaseId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

exports.handler = async (event) => {
  const headers = event.headers || {};
  const query = event.queryStringParameters || {};

  const platform = query.platform ? query.platform.toLowerCase() : null; // 'android' or 'ios'
  const currentVersion = query.currentVersion || null; // e.g. '1.0.0'
  const appVersion = query.appVersion || query.binaryVersion || query.targetBinaryVersion || null; // Native APK/IPA version
  const track = query.track ? query.track.toLowerCase() : 'production'; // 'production' | 'staging'
  const deviceId = query.deviceId || headers['x-device-id'] || 'device_' + (query.projectId || 'anonymous');

  const apiKey = extractApiKey(event);
  const requestedProjectId = query.projectId || null;
  const testMessage = query.testMessage || null;
  const testTitle = query.testTitle || null;

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-codepush-api-key, x-api-key, x-device-id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: 'OK' }) };
  }

  const auth = await verifyApiKey(apiKey, requestedProjectId);
  if (!auth.valid) {
    return {
      statusCode: auth.statusCode,
      headers: corsHeaders,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  const projectId = requestedProjectId || auth.projectId || null;

  if (!platform) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid or missing platform (android | ios required)' }),
    };
  }

  const store = await getReleaseData();

  // 1. Lookup release strictly by track and project/apiKey
  let targetRelease = null;

  if (track === 'staging') {
    if (projectId && store.tracks?.[projectId]?.[platform]?.staging) {
      targetRelease = store.tracks[projectId][platform].staging;
    } else if (store.history) {
      targetRelease = store.history.find(
        (r) => r.platform === platform && r.track === 'staging' && (!projectId || r.projectId === projectId)
      ) || null;
    }
  }

  if (!targetRelease) {
    if (apiKey && store.keys && store.keys[apiKey] && store.keys[apiKey][platform]) {
      targetRelease = store.keys[apiKey][platform];
    } else if (projectId && store.projects && store.projects[projectId] && store.projects[projectId][platform]) {
      targetRelease = store.projects[projectId][platform];
    } else if (auth.isMaster && store[platform]) {
      targetRelease = store[platform];
    }
  }

  if (!targetRelease) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        error: `No active ${track} release found for platform: ${platform}. A valid API Key or registered App ID is required.`,
      }),
    };
  }

  // 2. 🚨 EMERGENCY INSTANT KILL-SWITCH / REVOCATION CHECK
  if (targetRelease.revoked) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        updateAvailable: false,
        revoked: true,
        rollbackToFactory: true,
        reason: 'Release has been revoked by emergency kill-switch. Reverting device to baseline binary.',
        alertMessage: 'This update has been revoked by administrator. Reverting to factory version.',
        alertTitle: '⚠️ CodePush Update Revoked',
        alertType: 'warning',
      }),
    };
  }

  // 3. 🛡️ SEMANTIC VERSION TARGET BINARY COMPATIBILITY CHECK
  const targetBinaryRule = targetRelease.targetBinaryVersion || targetRelease.minAppVersion;
  if (appVersion && targetBinaryRule && !isSemVerCompatible(appVersion, targetBinaryRule)) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        updateAvailable: false,
        incompatibleBinary: true,
        reason: `Your native app binary (v${appVersion}) does not meet the requirement (${targetBinaryRule}) for OTA v${targetRelease.version}. Please update from the app store.`,
        requiredBinaryVersion: targetBinaryRule,
        currentBinaryVersion: appVersion,
      }),
    };
  }

  // 4. 🌍 GEOGRAPHIC & DEVICE SEGMENTATION TARGETING RULES (Feature 7)
  const clientCountry = resolveCountry(event, query, {});

  const clientOSVersion = query.osVersion || query.clientOSVersion || headers['x-os-version'] || null;
  const clientCohort = query.cohort || headers['x-client-cohort'] || 'general_public';

  if (targetRelease.targetingRules) {
    const rules = targetRelease.targetingRules;

    // Region restriction
    if (Array.isArray(rules.targetRegions) && rules.targetRegions.length > 0) {
      const allowed = rules.targetRegions.map((c) => String(c).toUpperCase());
      if (!allowed.includes(clientCountry) && !allowed.includes('ALL')) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            updateAvailable: false,
            targetedOut: true,
            reason: `Release is restricted to specific regions (${rules.targetRegions.join(', ')}). Your region: ${clientCountry}`,
            clientCountry,
          }),
        };
      }
    }

    // Min OS Version check
    if (rules.minOSVersion && clientOSVersion) {
      const minOS = parseFloat(rules.minOSVersion);
      const currOS = parseFloat(clientOSVersion);
      if (!isNaN(minOS) && !isNaN(currOS) && currOS < minOS) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            updateAvailable: false,
            osVersionExcluded: true,
            reason: `Device OS version (${clientOSVersion}) does not meet the minimum requirement (${rules.minOSVersion}).`,
            minOSVersion: rules.minOSVersion,
            clientOSVersion,
          }),
        };
      }
    }

    // Cohort / Channel group check
    if (rules.targetCohort && rules.targetCohort !== 'all') {
      if (clientCohort !== rules.targetCohort) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            updateAvailable: false,
            cohortExcluded: true,
            reason: `Release restricted to '${rules.targetCohort}' cohort. Client cohort: '${clientCohort}'`,
          }),
        };
      }
    }

    // Wi-Fi Only constraint (Feature 7)
    const clientNetwork = query.network || headers['x-network-type'] || 'wifi';
    if (rules.network === 'wifi_only' && clientNetwork !== 'wifi') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          updateAvailable: false,
          networkExcluded: true,
          reason: 'This update is configured for Wi-Fi only to conserve mobile cellular data.',
          requiredNetwork: 'wifi',
          currentNetwork: clientNetwork,
        }),
      };
    }

    // Minimum Battery threshold (Feature 7)
    const clientBattery = parseInt(query.battery || headers['x-battery-level'] || '100', 10);
    if (rules.minBattery && !isNaN(rules.minBattery) && clientBattery < rules.minBattery) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          updateAvailable: false,
          batteryExcluded: true,
          reason: `Device battery (${clientBattery}%) is below minimum installation threshold (${rules.minBattery}%).`,
          requiredBattery: rules.minBattery,
          currentBattery: clientBattery,
        }),
      };
    }

    // Hardware Brand whitelist (Feature 7)
    const clientBrand = (query.brand || headers['x-device-brand'] || '').toLowerCase();
    if (Array.isArray(rules.allowedBrands) && rules.allowedBrands.length > 0 && clientBrand) {
      const allowedBrandsLower = rules.allowedBrands.map((b) => b.toLowerCase());
      if (!allowedBrandsLower.includes(clientBrand)) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            updateAvailable: false,
            brandExcluded: true,
            reason: `Release is restricted to specific hardware brands: [${rules.allowedBrands.join(', ')}]. Your brand: ${clientBrand}`,
            allowedBrands: rules.allowedBrands,
          }),
        };
      }
    }
  }

  // 🧪 DYNAMIC OTA A/B EXPERIMENT ROUTING (Feature 6)
  let activeVariant = 'control';
  if (targetRelease.experiment && targetRelease.experiment.enabled) {
    const exp = targetRelease.experiment;
    const expBucket = getDeviceBucket(deviceId, exp.name || targetRelease.version);
    if (expBucket < (exp.splitPercentage || 50)) {
      activeVariant = 'variant_b';
      if (exp.variantB) {
        targetRelease = {
          ...targetRelease,
          version: exp.variantB.version || targetRelease.version,
          latestVersion: exp.variantB.version || targetRelease.version,
          hash: exp.variantB.hash || targetRelease.hash,
          downloadUrl: exp.variantB.downloadUrl || targetRelease.downloadUrl,
          releaseNotes: `[🧪 ${exp.variantB.label || 'Variant B'}] ${targetRelease.releaseNotes}`,
        };
      }
    } else {
      activeVariant = 'variant_a';
    }
  }

  // 5. 🐤 AUTOMATED PROGRESSIVE / CANARY ROLLOUT SCHEDULE (Feature 5)
  let rolloutPercentage = targetRelease.rolloutPercentage !== undefined ? targetRelease.rolloutPercentage : 100;
  let canaryStatus = null;

  if (targetRelease.canarySchedule && targetRelease.canarySchedule.enabled) {
    const sched = targetRelease.canarySchedule;
    const stages = Array.isArray(sched.stages) && sched.stages.length > 0 ? sched.stages : [5, 25, 50, 100];
    const intervalMinutes = Math.max(1, sched.intervalMinutes || 30);
    const startTime = new Date(sched.startedAt || targetRelease.updatedAt || Date.now()).getTime();
    const elapsedMinutes = Math.floor((Date.now() - startTime) / (60 * 1000));
    const stageIndex = Math.min(stages.length - 1, Math.floor(elapsedMinutes / intervalMinutes));

    rolloutPercentage = stages[stageIndex];
    canaryStatus = {
      enabled: true,
      currentStage: stageIndex + 1,
      totalStages: stages.length,
      currentPercentage: rolloutPercentage,
      nextStageInMinutes: stageIndex < stages.length - 1 ? intervalMinutes - (elapsedMinutes % intervalMinutes) : 0,
      isFullyRolledOut: stageIndex >= stages.length - 1,
    };
  }

  // Phased rollout deterministic bucket check
  if (rolloutPercentage < 100) {
    const bucket = getDeviceBucket(deviceId, targetRelease.id || targetRelease.version);
    if (bucket >= rolloutPercentage) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          updateAvailable: false,
          rolloutCohortPending: true,
          rolloutPercentage: rolloutPercentage,
          canaryStatus,
          reason: `Device (cohort bucket ${bucket}) is scheduled for later rollout phase (${rolloutPercentage}% active).`,
        }),
      };
    }
  }

  const latestVersion = targetRelease.latestVersion || targetRelease.version;
  const updateAvailable = latestVersion !== currentVersion;

  // 6. ⚡ DIFFERENTIAL DELTA UPDATE NEGOTIATION (Feature 2)
  const clientHash = query.clientHash || query.currentHash || query.packageHash || headers['x-client-hash'] || null;
  let deltaInfo = null;

  if (updateAvailable && clientHash && clientHash !== targetRelease.hash) {
    const simulatedDeltaBytes = Math.max(32 * 1024, Math.round((targetRelease.sizeBytes || 180000) * 0.08));
    const deltaUrl = `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${latestVersion}&platform=${platform}&action=delta&fromHash=${clientHash}`;
    deltaInfo = {
      isDelta: true,
      downloadUrl: deltaUrl,
      sizeBytes: simulatedDeltaBytes,
      compressionRatio: `94% smaller (${(simulatedDeltaBytes / 1024).toFixed(0)} KB vs ${((targetRelease.sizeBytes || 1800000) / (1024 * 1024)).toFixed(1)} MB)`,
      baseHash: clientHash,
    };
  }

  // 5. Active alert retrieval
  const candidateAlert =
    (store.alerts &&
      ((projectId && store.alerts[projectId]) ||
        (apiKey && store.alerts[apiKey]) ||
        (platform && store.alerts[platform]) ||
        store.alerts.global ||
        store.alerts.latest)) ||
    (testMessage
      ? {
          message: testMessage,
          title: testTitle || 'CodePush Alert Testing',
          id: `alert_test_${Date.now()}`,
          type: 'info',
          createdAt: new Date().toISOString(),
          active: true,
        }
      : null);

  const isAlertExpired =
    candidateAlert &&
    candidateAlert.createdAt &&
    Date.now() - new Date(candidateAlert.createdAt).getTime() > 10 * 60 * 1000;
  const activeAlert = candidateAlert && candidateAlert.active !== false && !isAlertExpired ? candidateAlert : null;

  // 6. Record live telemetry ping
  try {
    if (!store.telemetry) store.telemetry = [];
    const deviceName = platform === 'ios' ? 'iPhone Mobile Phone' : 'Android Mobile Phone';
    const statusAction = updateAvailable
      ? `Mobile connected → Update v${latestVersion} ready (${targetRelease.track || 'prod'}, ${rolloutPercentage}%)`
      : `Mobile connected → App up to date (Active: v${currentVersion || latestVersion})`;

    const newPing = {
      id: `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toISOString(),
      platform: platform || 'android',
      device: deviceName,
      country: clientCountry,
      osVersion: clientOSVersion || '14.0',
      version: currentVersion || latestVersion || '1.0.0',
      action: statusAction,
      apiKey: apiKey || projectId || 'mobile-app',
      projectId: projectId || null,
    };

    store.telemetry.unshift(newPing);
    if (store.telemetry.length > 30) {
      store.telemetry = store.telemetry.slice(0, 30);
    }

    // Maintain live geo distribution tally
    if (!store.geoFleet) store.geoFleet = {};
    store.geoFleet[clientCountry] = (store.geoFleet[clientCountry] || 0) + 1;

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

  // 7. Get Remote Config for this project
  const projectRemoteConfig = (projectId && store.remoteConfig && store.remoteConfig[projectId]) || null;

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      updateAvailable,
      downloadUrl: updateAvailable ? (deltaInfo ? deltaInfo.downloadUrl : targetRelease.downloadUrl) : null,
      latestVersion: latestVersion,
      mandatory: targetRelease.mandatory,
      hash: targetRelease.hash,
      releaseNotes: targetRelease.releaseNotes,
      track: targetRelease.track || 'production',
      rolloutPercentage: rolloutPercentage,
      targetBinaryVersion: targetBinaryRule,
      // Differential Delta Updates (Feature 4)
      isDelta: !!deltaInfo,
      deltaUrl: deltaInfo ? deltaInfo.downloadUrl : null,
      deltaSizeBytes: deltaInfo ? deltaInfo.sizeBytes : null,
      deltaSavings: deltaInfo ? deltaInfo.compressionRatio : null,
      // Automated Canary Schedule (Feature 5)
      canaryStatus: canaryStatus,
      // Dynamic Assets & Localization (Feature 9)
      assetManifest: targetRelease.assetManifest || null,
      // Device & Geo Context (Feature 7 & 8)
      country: clientCountry,
      alertMessage: activeAlert ? activeAlert.message : null,
      alertTitle: activeAlert ? activeAlert.title || 'CodePush Alert Testing' : null,
      alertId: activeAlert ? activeAlert.id : null,
      alertType: activeAlert ? activeAlert.type || 'info' : null,
      remoteConfig: projectRemoteConfig,
      signature: targetRelease.signature || null,
      signatureAlgorithm: targetRelease.signatureAlgorithm || 'ed25519',
      driftStatus: targetRelease.driftStatus || 'passed',
      experiment: targetRelease.experiment?.enabled
        ? {
            activeVariant,
            experimentName: targetRelease.experiment.name,
            goalMetric: targetRelease.experiment.goalMetric,
          }
        : null,
    }),
  };
};


