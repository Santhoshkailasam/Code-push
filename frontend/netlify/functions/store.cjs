const db = require('./db.cjs');
const initialVersionData = require('../../version.json');

// ⚡ Ultra-Fast Memory Cache for Releases across warm invocations (10s TTL)
let memoryCache = null;
let lastCacheTime = 0;
const STORE_CACHE_TTL_MS = 10 * 1000;

function invalidateStoreCache() {
  memoryCache = null;
  lastCacheTime = 0;
}

function formatReleaseRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    projectId: r.project_id,
    platform: r.platform,
    track: r.track || 'production',
    version: r.version,
    latestVersion: r.version,
    hash: r.hash,
    downloadUrl: r.download_url,
    mandatory: Boolean(r.mandatory),
    releaseNotes: r.release_notes || '',
    sizeBytes: r.size_bytes ? Number(r.size_bytes) : undefined,
    minAppVersion: r.target_binary_version || '1.0.0',
    targetBinaryVersion: r.target_binary_version || '1.0.0',
    rolloutPercentage: r.rollout_percentage !== null ? Number(r.rollout_percentage) : 100,
    apiKey: r.api_key,
    userId: r.user_id,
    bundleBase64: r.bundle_base64,
    isActive: Boolean(r.is_active),
    revoked: Boolean(r.revoked),
    revocationReason: r.revocation_reason,
    revokedAt: r.revoked_at ? new Date(r.revoked_at).toISOString() : undefined,
    signature: r.signature,
    signatureAlgorithm: r.signature_algorithm,
    driftStatus: r.drift_status || 'passed',
    canarySchedule: r.canary_schedule,
    targetingRules: r.targeting_rules,
    deltaUpdate: r.delta_update,
    assetManifest: r.asset_manifest,
    experiment: r.experiment,
    aiGuardianReport: r.ai_guardian_report,
    dualSlotStatus: r.dual_slot_status,
    quarantinedCohorts: r.quarantined_cohorts || [],
    shadowBootReport: r.shadow_boot_report || null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

async function getReleaseData() {
  const now = Date.now();
  if (memoryCache && (now - lastCacheTime) < STORE_CACHE_TTL_MS) {
    return memoryCache;
  }

  try {
    const releasesRes = await db.query(
      `SELECT * FROM codepush_schema.releases ORDER BY created_at DESC LIMIT 500`
    );

    const history = (releasesRes.rows || []).map(formatReleaseRow);

    // Latest active non-revoked production releases
    const latestAndroid = history.find(
      (r) => r.platform === 'android' && r.track === 'production' && !r.revoked && r.isActive
    ) || initialVersionData.android;

    const latestIos = history.find(
      (r) => r.platform === 'ios' && r.track === 'production' && !r.revoked && r.isActive
    ) || initialVersionData.ios;

    // Per-project and per-key index
    const projects = {};
    const keys = {};
    const bundles = {};

    for (const r of history) {
      if (r.bundleBase64 && r.version) {
        const vKey = r.version.replace(/\./g, '_');
        bundles[`${r.platform}_${vKey}`] = r.bundleBase64;
      }
      if (r.projectId) {
        if (!projects[r.projectId]) projects[r.projectId] = {};
        if (!projects[r.projectId][r.platform] && r.track === 'production' && !r.revoked && r.isActive) {
          projects[r.projectId][r.platform] = r;
        }
      }
      if (r.apiKey) {
        if (!keys[r.apiKey]) keys[r.apiKey] = {};
        if (!keys[r.apiKey][r.platform] && r.track === 'production' && !r.revoked && r.isActive) {
          keys[r.apiKey][r.platform] = r;
        }
      }
    }

    const resolved = {
      android: latestAndroid,
      ios: latestIos,
      history,
      projects,
      keys,
      bundles,
      alerts: {},
    };

    memoryCache = resolved;
    lastCacheTime = now;
    return resolved;
  } catch (err) {
    console.warn('[PostgreSQL Store] Query error:', err.message);
    return memoryCache || {
      android: initialVersionData.android,
      ios: initialVersionData.ios,
      history: [],
      projects: {},
      keys: {},
      bundles: {},
      alerts: {},
    };
  }
}

async function setReleaseData(data) {
  invalidateStoreCache();
  if (!data) return;

  // If new or updated releases exist in data.history, persist them to codepush_schema.releases
  if (Array.isArray(data.history) && data.history.length > 0) {
    for (const item of data.history.slice(0, 10)) {
      if (!item.id || !item.platform || !item.version) continue;
      try {
        if (item.projectId) {
          await db.query(
            `INSERT INTO codepush_schema.projects (id, name, api_key)
             VALUES ($1, $1, $2)
             ON CONFLICT (id) DO NOTHING`,
            [item.projectId, item.apiKey || `cp_auto_${item.projectId}`]
          );
        }
        await db.query(
          `INSERT INTO codepush_schema.releases (
            id, project_id, platform, track, version, hash, download_url,
            mandatory, release_notes, size_bytes, target_binary_version,
            rollout_percentage, api_key, user_id, bundle_base64,
            is_active, revoked, revocation_reason, revoked_at,
            signature, signature_algorithm, drift_status,
            canary_schedule, targeting_rules, delta_update, asset_manifest,
            experiment, ai_guardian_report, dual_slot_status,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, $22,
            $23, $24, $25, $26,
            $27, $28, $29,
            COALESCE($30::timestamptz, NOW()), NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            rollout_percentage = EXCLUDED.rollout_percentage,
            is_active = EXCLUDED.is_active,
            revoked = EXCLUDED.revoked,
            revocation_reason = EXCLUDED.revocation_reason,
            revoked_at = EXCLUDED.revoked_at,
            track = EXCLUDED.track,
            updated_at = NOW()`,
          [
            item.id,
            item.projectId || null,
            item.platform,
            item.track || 'production',
            item.version,
            item.hash || 'sha256-default',
            item.downloadUrl || '',
            Boolean(item.mandatory),
            item.releaseNotes || '',
            item.sizeBytes || null,
            item.targetBinaryVersion || item.minAppVersion || '1.0.0',
            item.rolloutPercentage !== undefined ? item.rolloutPercentage : 100,
            item.apiKey || null,
            item.userId || null,
            item.bundleBase64 || null,
            item.isActive !== undefined ? Boolean(item.isActive) : true,
            Boolean(item.revoked),
            item.revocationReason || null,
            item.revokedAt || null,
            item.signature || null,
            item.signatureAlgorithm || 'ed25519',
            item.driftStatus || 'passed',
            item.canarySchedule ? JSON.stringify(item.canarySchedule) : null,
            item.targetingRules ? JSON.stringify(item.targetingRules) : null,
            item.deltaUpdate ? JSON.stringify(item.deltaUpdate) : null,
            item.assetManifest ? JSON.stringify(item.assetManifest) : null,
            item.experiment ? JSON.stringify(item.experiment) : null,
            item.aiGuardianReport ? JSON.stringify(item.aiGuardianReport) : null,
            item.dualSlotStatus ? JSON.stringify(item.dualSlotStatus) : null,
            item.createdAt || null,
          ]
        );
      } catch (e) {
        console.warn(`[PostgreSQL Store] Failed to upsert release ${item.id}:`, e.message);
      }
    }
  }
}

module.exports = {
  getReleaseData,
  setReleaseData,
  invalidateStoreCache,
  formatReleaseRow,
};
