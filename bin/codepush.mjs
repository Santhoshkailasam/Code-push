#!/usr/bin/env node

/**
 * CodePush Official Developer CLI Tool (@codepush/cli)
 * 
 * Commands:
 *   codepush login --key <API_KEY> [--server <URL>]
 *   codepush release-react --app <APP_ID> --platform <android|ios> --version <VER> [--mandatory] [--notes <TEXT>]
 *   codepush status --app <APP_ID>
 *   codepush rollback --app <APP_ID> --platform <android|ios> --version <VER>
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const command = args[0] || 'help';

function getArg(flag, fallback = null) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return fallback;
}

const hasFlag = (flag) => args.includes(flag);

const CONFIG_PATH = path.resolve(process.env.HOME || process.env.USERPROFILE || '.', '.codepushrc.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {}
  }
  return {
    serverUrl: process.env.CODEPUSH_SERVER_URL || 'https://codepushs.netlify.app',
    apiKey: process.env.CODEPUSH_API_KEY || null,
  };
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

async function main() {
  const config = loadConfig();

  if (command === 'help' || hasFlag('--help') || hasFlag('-h')) {
    console.log(`
🚀 CodePush Developer CLI Tool

Usage:
  codepush <command> [options]

Commands:
  login             Save your server credentials & API key
  release-react     Deploy an OTA React Native bundle
  status            View current active release & device health
  rollback          Emergency rollback an active release

Options:
  --app             App ID / Project ID (e.g. app_rCYp1a_...)
  --platform        Target OS: android | ios
  --version         Release bundle version: e.g. 1.2.0
  --binary-version  Target native binary range: e.g. ~1.0.0
  --track           Deployment track: production | staging
  --rollout         Gradual rollout percentage (5, 25, 50, 100)
  --mandatory       Flag this release as immediate mandatory
  --notes           Changelog / Release notes
  --webhook         Slack or Discord webhook URL
    `);
    process.exit(0);
  }

  if (command === 'login') {
    const key = getArg('--key');
    const server = getArg('--server', 'https://codepushs.netlify.app');
    if (!key) {
      console.error('❌ Error: --key <API_KEY> is required.');
      process.exit(1);
    }
    saveConfig({ serverUrl: server, apiKey: key });
    console.log(`✅ Successfully logged in to ${server}! Credentials saved to ~/.codepushrc.json`);
    process.exit(0);
  }

  if (command === 'status') {
    const appId = getArg('--app', config.appId || 'default');
    const server = config.serverUrl || 'https://codepushs.netlify.app';
    console.log(`📡 Fetching live CodePush status for ${appId} from ${server}...`);
    try {
      const res = await fetch(`${server}/.netlify/functions/check-update?projectId=${appId}&platform=android`);
      const data = await res.json();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📦 Active Version:    v${data.latestVersion || 'N/A'}`);
      console.log(`🚨 Policy:            ${data.mandatory ? 'Mandatory OTA' : 'Silent Background'}`);
      console.log(`🔑 Integrity Hash:    ${(data.hash || '').substring(0, 16)}...`);
      console.log(`📝 Release Notes:     ${data.releaseNotes || 'None'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (e) {
      console.error('❌ Error connecting to CodePush server:', e.message);
    }
    process.exit(0);
  }

  if (command === 'release-react') {
    const appId = getArg('--app', config.appId);
    const platform = getArg('--platform', 'android');
    const version = getArg('--version');
    const binaryVersion = getArg('--binary-version', '1.0.0');
    const track = getArg('--track', 'production');
    const rollout = parseInt(getArg('--rollout', '100'), 10);
    const notes = getArg('--notes', 'CLI Hotfix deployment');
    const isMandatory = hasFlag('--mandatory');
    const webhook = getArg('--webhook');
    const bundlePath = getArg('--bundle');
    const canaryInterval = parseInt(getArg('--canary', '0'), 10);
    const regions = getArg('--regions');
    const minOS = getArg('--min-os');
    const cohort = getArg('--cohort', 'all');

    if (!appId || !version) {
      console.error('❌ Error: --app <APP_ID> and --version <VER> are required.');
      process.exit(1);
    }

    const apiKey = getArg('--key', config.apiKey);
    if (!apiKey) {
      console.error('❌ Error: API Key required. Run "codepush login --key <KEY>" or pass --key <KEY>');
      process.exit(1);
    }

    let bundleBase64 = null;
    let computedHash = null;

    if (bundlePath && fs.existsSync(bundlePath)) {
      console.log(`📦 Reading bundle package: ${bundlePath}...`);
      const fileBuffer = fs.readFileSync(bundlePath);
      computedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      bundleBase64 = fileBuffer.toString('base64');
      console.log(`🔒 Computed SHA256 checksum: ${computedHash}`);
    }

    console.log(`🚀 Publishing OTA Release v${version} for ${platform} (${track} track, ${rollout}% rollout)...`);

    const server = config.serverUrl || 'https://codepushs.netlify.app';
    try {
      const canarySchedule = canaryInterval > 0 ? {
        enabled: true,
        stages: [5, 25, 50, 100],
        intervalMinutes: canaryInterval,
        currentStageIndex: 0,
      } : undefined;

      const targetingRules = (regions || minOS || cohort !== 'all') ? {
        targetRegions: regions ? regions.split(',').map((r) => r.trim().toUpperCase()) : undefined,
        minOSVersion: minOS || undefined,
        targetCohort: cohort,
      } : undefined;

      const res = await fetch(`${server}/.netlify/functions/publish-release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-codepush-api-key': apiKey,
        },
        body: JSON.stringify({
          platform,
          version,
          projectId: appId,
          targetBinaryVersion: binaryVersion,
          track,
          rolloutPercentage: rollout,
          mandatory: isMandatory,
          releaseNotes: notes,
          webhookUrl: webhook,
          bundleBase64,
          hash: computedHash,
          canarySchedule,
          targetingRules,
          source: 'cli',
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        console.error('❌ Publish failed:', result.error || res.statusText);
        process.exit(1);
      }

      console.log(`✅ Success! Release v${version} deployed live to CodePush server!`);
      if (canarySchedule) {
        console.log(`🐤 Automated canary rollout active: 5% ➔ 25% ➔ 50% ➔ 100% every ${canaryInterval}m.`);
      }
      if (result.webhookDispatched) {
        console.log('📢 Team alert dispatched to Slack/Discord webhook.');
      }
    } catch (e) {
      console.error('❌ Network error:', e.message);
      process.exit(1);
    }
    process.exit(0);
  }

  if (command === 'rollback') {
    const appId = getArg('--app', config.appId);
    const platform = getArg('--platform', 'android');
    const version = getArg('--version');
    const apiKey = getArg('--key', config.apiKey);

    if (!appId) {
      console.error('❌ Error: --app <APP_ID> is required.');
      process.exit(1);
    }

    console.log(`⚠️ Triggering emergency rollback for ${appId} (${platform})...`);
    const server = config.serverUrl || 'https://codepushs.netlify.app';
    try {
      const res = await fetch(`${server}/.netlify/functions/publish-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-codepush-api-key': apiKey || '' },
        body: JSON.stringify({ action: 'revoke', projectId: appId, platform, version }),
      });
      const data = await res.json();
      console.log('✅', data.message || 'Release successfully revoked.');
    } catch (e) {
      console.error('❌ Rollback failed:', e.message);
    }
    process.exit(0);
  }

  if (command === 'promote') {
    const appId = getArg('--app', config.appId);
    const releaseId = getArg('--id');
    const apiKey = getArg('--key', config.apiKey);

    if (!appId || !releaseId) {
      console.error('❌ Error: --app <APP_ID> and --id <RELEASE_ID> are required.');
      process.exit(1);
    }

    console.log(`🚀 Promoting staging release ${releaseId} to Production...`);
    const server = config.serverUrl || 'https://codepushs.netlify.app';
    try {
      const res = await fetch(`${server}/.netlify/functions/publish-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-codepush-api-key': apiKey || '' },
        body: JSON.stringify({ action: 'promote', projectId: appId, releaseId }),
      });
      const data = await res.json();
      console.log('✅', data.message || 'Release promoted to production!');
    } catch (e) {
      console.error('❌ Promote failed:', e.message);
    }
    process.exit(0);
  }

  console.log(`Unknown command "${command}". Run "codepush --help" for usage.`);
}

main();
