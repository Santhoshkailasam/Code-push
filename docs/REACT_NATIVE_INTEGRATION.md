# React Native Client Integration Guide

This guide explains how to integrate your self-hosted CodePush server (`https://codepushs.netlify.app`) into your React Native mobile application.

---

## Architecture Overview

```
┌─────────────────────────────────┐
│ React Native Mobile App (iOS/Android) │
└───────────────┬─────────────────┘
                │ 1. GET /.netlify/functions/check-update?platform=android&apiKey=cp_live_...
                ▼
┌─────────────────────────────────┐
│     Netlify Edge Serverless     │
└───────────────┬─────────────────┘
                │ 2. Reads/Writes releases & telemetry
                ▼
┌─────────────────────────────────┐
│  Firebase Realtime Database     │ ◄─── Synced live across Local & Production
│  (asia-southeast1 cloud)        │
└─────────────────────────────────┘
```

---

## Step 1: Install Required React Native Packages

In your React Native project root:

```bash
# npm
npm install react-native-fs react-native-zip-archive react-native-restart @react-native-async-storage/async-storage

# or yarn
yarn add react-native-fs react-native-zip-archive react-native-restart @react-native-async-storage/async-storage
```

For **iOS**, install CocoaPods dependencies:
```bash
cd ios && pod install && cd ..
```

---

## Step 2: Add CodePush Service (`src/services/CodePushService.ts`)

Create `src/services/CodePushService.ts` in your React Native app. Replace `YOUR_CODEPUSH_API_KEY` with the API key from your **Profile & API Keys** dashboard screen:

```typescript
import { Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';
import RNRestart from 'react-native-restart';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production CodePush Server URL
const CODEPUSH_SERVER_URL = 'https://codepushs.netlify.app';

// Your App's unique API Key (from Dashboard -> Profile & API Keys)
const CODEPUSH_API_KEY = 'cp_live_YOUR_API_KEY_HERE';

// App ID if scoping updates to a specific app (optional)
const CODEPUSH_APP_ID = 'app_rCYp1a_mvdfs5j4_w9dyc';

const BUNDLE_VERSION_KEY = '@codepush_bundle_version';

export interface UpdateCheckResponse {
  updateAvailable: boolean;
  downloadUrl: string | null;
  latestVersion: string;
  mandatory: boolean;
  hash: string;
  releaseNotes?: string;
  alertMessage?: string; // In-app broadcast test message
  alertTitle?: string;   // Optional alert title
  alertId?: string;
}

export const CodePushService = {
  /**
   * Checks for available Over-The-Air (OTA) updates and in-app broadcast alerts for the current platform.
   */
  async checkForUpdates(): Promise<void> {
    try {
      const platform = Platform.OS; // 'android' | 'ios'
      const currentVersion = (await AsyncStorage.getItem(BUNDLE_VERSION_KEY)) || '1.0.0';

      console.log(`[CodePush] Checking updates for ${platform} (Active: v${currentVersion})...`);

      const queryParams = new URLSearchParams({
        platform,
        currentVersion,
        apiKey: CODEPUSH_API_KEY,
        projectId: CODEPUSH_APP_ID,
      });

      const response = await fetch(
        `${CODEPUSH_SERVER_URL}/.netlify/functions/check-update?${queryParams.toString()}`,
        {
          headers: {
            'x-codepush-api-key': CODEPUSH_API_KEY,
          },
        }
      );

      if (!response.ok) {
        console.warn(`[CodePush] Server responded with status: ${response.status}`);
        return;
      }

      const data: UpdateCheckResponse = await response.json();

      // 🔔 1. Display in-app test popup alert if sent from CodePush Console
      if (data.alertMessage) {
        Alert.alert(
          data.alertTitle || 'CodePush Alert Testing',
          data.alertMessage,
          [{ text: 'OK', onPress: () => console.log('CodePush alert acknowledged') }]
        );
      }

      // ⚡ 2. Download and apply OTA bundle if an update is available
      if (data.updateAvailable && data.downloadUrl) {
        console.log(`⚡ [CodePush] New OTA update detected: v${data.latestVersion}`);
        await this.downloadAndApplyUpdate(data.downloadUrl, data.latestVersion);
      } else {
        console.log('✅ [CodePush] App is up to date.');
      }
    } catch (error) {
      console.warn('[CodePush] Update check failed:', error);
    }
  },

  /**
   * 📡 Listens for live alerts sent from CodePush dashboard in REAL TIME.
   * Pops up instantly when the developer clicks Send on the dashboard!
   */
  startLiveAlertListener(): () => void {
    let lastSeenAlertId: string | null = null;

    const checkLiveAlert = async () => {
      try {
        const res = await fetch(
          'https://tracker-42b47-default-rtdb.asia-southeast1.firebasedatabase.app/codepush_releases/alerts/latest.json'
        );
        if (!res.ok) return;
        const alert = await res.json();

        if (alert && alert.active && alert.id && alert.id !== lastSeenAlertId) {
          lastSeenAlertId = alert.id;
          Alert.alert(
            alert.title || 'CodePush Alert Testing',
            alert.message,
            [{ text: 'OK' }]
          );
        }
      } catch (err) {}
    };

    checkLiveAlert();
    const interval = setInterval(checkLiveAlert, 2500); // Polls every 2.5 seconds
    return () => clearInterval(interval);
  },



  /**
   * Downloads the release package, extracts the bundle, and restarts the JS engine.
   */
  async downloadAndApplyUpdate(downloadUrl: string, newVersion: string): Promise<void> {
    const downloadDest = `${RNFS.CachesDirectoryPath}/bundle-update.zip`;
    const extractPath = `${RNFS.DocumentDirectoryPath}/codepush_bundle`;

    console.log(`[CodePush] Downloading bundle from: ${downloadUrl}`);

    // 1. Download zip from Netlify Edge CDN
    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: downloadDest,
    }).promise;

    if (downloadResult.statusCode === 200) {
      // 2. Unzip bundle
      await unzip(downloadDest, extractPath);

      // 3. Save new version in local storage
      await AsyncStorage.setItem(BUNDLE_VERSION_KEY, newVersion);

      // 4. Clean up downloaded zip file
      await RNFS.unlink(downloadDest);

      console.log(`🎉 [CodePush] Hotfix v${newVersion} installed! Reloading app...`);

      // 5. Restart React Native JS engine immediately
      RNRestart.Restart();
    } else {
      console.error(`[CodePush] Failed to download bundle, status: ${downloadResult.statusCode}`);
    }
  },
};
```

---

## Step 3: Trigger Update Check on App Startup (`App.tsx`)

Inside your React Native main `App.tsx`:

```typescript
import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, Text, StyleSheet } from 'react-native';
import { CodePushService } from './src/services/CodePushService';

export default function App() {
  useEffect(() => {
    // Check for updates every time app launches
    CodePushService.checkForUpdates();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.text}>Welcome to My CodePush Mobile App</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, fontWeight: 'bold' },
});
```

---

## Step 4: GitHub Actions CI/CD (`.github/workflows/codepush.yml`)

To publish releases automatically whenever you push code to GitHub:

1. In your **Mobile App GitHub repository**, go to **Settings &rarr; Secrets and variables &rarr; Actions**.
2. Add a repository secret named `CODEPUSH_API_KEY` containing your API key from the CodePush Dashboard.
3. Create `.github/workflows/codepush.yml`:

```yaml
name: CodePush Auto-Release & Live Sync

on:
  push:
    branches:
      - main
      - master

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🟢 Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: 📦 Install Dependencies
        run: npm ci

      - name: ⚙️ Generate Version & Metadata
        id: vars
        run: |
          VERSION="1.1.$(date +'%Y%m%d%H%M')"
          COMMIT_MSG=$(git log -1 --pretty=%B)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "commit_msg=$COMMIT_MSG" >> $GITHUB_OUTPUT

      - name: 📦 Compile React Native Android Bundle
        run: |
          mkdir -p build_bundle/res
          npx react-native bundle \
            --platform android \
            --dev false \
            --entry-file index.js \
            --bundle-output build_bundle/index.android.bundle \
            --assets-dest build_bundle/res

      - name: 🗜️ Archive Bundle to ZIP
        run: |
          cd build_bundle
          zip -r ../bundle.zip index.android.bundle res
          cd ..

      - name: 🚀 Publish Release to CodePush Server
        run: node scripts/publish-release.mjs
        env:
          RELEASE_VERSION: ${{ steps.vars.outputs.version }}
          COMMIT_MSG: ${{ steps.vars.outputs.commit_msg }}
          CODEPUSH_API_KEY: ${{ secrets.CODEPUSH_API_KEY }}
          CODEPUSH_PROJECT_ID: "app_rCYp1a_mvdfs5j4_w9dyc"
```

4. Create `scripts/publish-release.mjs`:

```javascript
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function main() {
  const version = process.env.RELEASE_VERSION || `1.1.${Date.now()}`;
  const commitMsg = process.env.COMMIT_MSG || 'App update';
  const apiKey = process.env.CODEPUSH_API_KEY;
  const projectId = process.env.CODEPUSH_PROJECT_ID;

  let bundleBase64 = null;
  let bundleHash = `sha256-${Date.now()}`;
  const zipPath = path.resolve('bundle.zip');

  if (fs.existsSync(zipPath)) {
    const fileBuffer = fs.readFileSync(zipPath);
    bundleBase64 = fileBuffer.toString('base64');
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    bundleHash = hashSum.digest('hex');
  }

  const payload = {
    platform: 'android',
    projectId: projectId,
    version: version,
    bundleBase64: bundleBase64,
    hash: bundleHash,
    downloadUrl: `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${version}&platform=android`,
    mandatory: true,
    releaseNotes: `Git Push: ${commitMsg}`
  };

  const res = await fetch('https://codepushs.netlify.app/.netlify/functions/publish-release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-codepush-api-key': apiKey },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error('Publish failed');
    process.exit(1);
  }
}

main();
```

---

## Local Development vs. Production

* **Production URL**: `https://codepushs.netlify.app`
* **Local Development**: Run `npm run dev` and point to `http://localhost:5173` or `http://localhost:8888`.
* **Cloud Synchronization**: All apps and releases are backed by **Firebase Realtime Database**, meaning updates published from CLI, Webhook, or Dashboard reflect instantly in both local and production environments.
