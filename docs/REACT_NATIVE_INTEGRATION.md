# React Native Client Integration Guide

This guide explains how to integrate your self-hosted Netlify CodePush server into your React Native mobile app.

---

## Step 1: Install Required React Native Packages

In your React Native project root:

```bash
npm install react-native-fs react-native-zip-archive react-native-restart @react-native-async-storage/async-storage
```

For iOS:
```bash
cd ios && pod install
```

---

## Step 2: Add CodePush Service (`src/services/CodePushService.ts`)

Create `src/services/CodePushService.ts` in your React Native app:

```typescript
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';
import RNRestart from 'react-native-restart';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NETLIFY_SERVER_URL = 'https://your-site.netlify.app';
const BUNDLE_VERSION_KEY = '@codepush_bundle_version';

interface UpdateCheckResponse {
  updateAvailable: boolean;
  downloadUrl: string | null;
  latestVersion: string;
  mandatory: boolean;
  hash: string;
}

export const CodePushService = {
  async checkForUpdates(): Promise<void> {
    try {
      const platform = Platform.OS; // 'android' or 'ios'
      const currentVersion = (await AsyncStorage.getItem(BUNDLE_VERSION_KEY)) || '1.0.0';

      console.log(`Checking for CodePush updates... (Current: v${currentVersion})`);

      const response = await fetch(
        `${NETLIFY_SERVER_URL}/.netlify/functions/check-update?platform=${platform}&currentVersion=${currentVersion}`
      );
      const data: UpdateCheckResponse = await response.json();

      if (data.updateAvailable && data.downloadUrl) {
        console.log(`⚡ New update available: v${data.latestVersion}`);
        await this.downloadAndApplyUpdate(data.downloadUrl, data.latestVersion);
      } else {
        console.log('✅ App is up to date.');
      }
    } catch (error) {
      console.warn('CodePush update check failed:', error);
    }
  },

  async downloadAndApplyUpdate(downloadUrl: string, newVersion: string): Promise<void> {
    const downloadDest = `${RNFS.CachesDirectoryPath}/bundle-update.zip`;
    const extractPath = `${RNFS.DocumentDirectoryPath}/codepush_bundle`;

    // 1. Download zip from Netlify CDN
    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: downloadDest,
    }).promise;

    if (downloadResult.statusCode === 200) {
      // 2. Unzip bundle
      await unzip(downloadDest, extractPath);

      // 3. Save new version in local storage
      await AsyncStorage.setItem(BUNDLE_VERSION_KEY, newVersion);

      // 4. Clean up downloaded zip
      await RNFS.unlink(downloadDest);

      console.log('🎉 Update installed! Reloading app...');

      // 5. Restart app JS engine immediately
      RNRestart.Restart();
    }
  },
};
```

---

## Step 3: Trigger Update Check on App Startup (`App.tsx`)

Inside your main `App.tsx`:

```typescript
import React, { useEffect } from 'react';
import { CodePushService } from './src/services/CodePushService';

export default function App() {
  useEffect(() => {
    // Check for updates when app launches
    CodePushService.checkForUpdates();
  }, []);

  return (
    // Your React Native screens
    <YourMainScreen />
  );
}
```

---

## How to Test Locally

1. Start your local dev server:
   ```bash
   npx netlify dev
   ```
2. Replace `NETLIFY_SERVER_URL` in your app with `http://localhost:8888` (or your local IP for mobile devices).
3. Change `latestVersion` in `version.json` and watch your app download and apply the patch!
