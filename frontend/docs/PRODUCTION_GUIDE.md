# 🚀 SkillSwap: Android Production & Release Guide

This guide covers everything you need to build, sign, and deploy **SkillSwap** to production, from generating standalone APKs to publishing on the Google Play Store and shipping Over-The-Air (OTA) updates via CodePush.

---

## 📑 Table of Contents
1. [Quick Production APK (Test Standalone on Device)](#1-quick-production-apk-test-standalone-on-device)
2. [Google Play Store Release (Production Keystore & AAB)](#2-google-play-store-release-production-keystore--aab)
3. [Shipping Production OTA Updates via CodePush](#3-shipping-production-ota-updates-via-codepush)
4. [Version Bumping Checklist](#4-version-bumping-checklist)
5. [Troubleshooting Common Production Build Errors](#5-troubleshooting-common-production-build-errors)

---

## 1. Quick Production APK (Test Standalone on Device)

If you want to test the app as a **standalone release APK** (no Metro dev server, no USB cable, completely self-contained):

### Step 1: Open Terminal in Android Directory
```bash
cd "k:\Projects\codepush project\SkillSwap\android"
```

### Step 2: Build the Release APK
```bash
./gradlew assembleRelease
```
*(On Windows PowerShell, use `.\gradlew assembleRelease`)*

### Step 3: Find & Install Your APK
Your compiled standalone APK is located at:
```text
android/app/build/outputs/apk/release/app-release.apk
```

To install it directly onto your connected phone:
```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```
*You can also send this `.apk` file to any Android phone via WhatsApp, Telegram, or Google Drive, and install it directly!*

---

## 2. Google Play Store Release (Production Keystore & AAB)

Google Play Store requires an **Android App Bundle (.aab)** signed with a secure private upload key.

### Step 1: Generate a Private Upload Key
Run the Java `keytool` command in your terminal:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```
- It will prompt you for a password (e.g. `YourSecurePassword123`). **Save this password!**
- Move the generated `my-upload-key.keystore` file to `SkillSwap/android/app/`.

### Step 2: Configure Gradle Credentials
Edit `SkillSwap/android/gradle.properties` and add at the bottom:

```properties
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=YourSecurePassword123
MYAPP_UPLOAD_KEY_PASSWORD=YourSecurePassword123
```

### Step 3: Update `android/app/build.gradle`
In `android/app/build.gradle`, update the `signingConfigs` and `buildTypes`:

```groovy
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled enableProguardInReleaseBuilds
        proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
    }
}
```

### Step 4: Generate the Play Store Bundle (.aab)
```bash
cd android
./gradlew bundleRelease
```
The output file is generated at:
```text
android/app/build/outputs/bundle/release/app-release.aab
```
👉 Upload this `.aab` file directly to the **Google Play Console** under **Production &rarr; Releases**.

---

## 3. Shipping Production OTA Updates via CodePush

Once your app is in production, you **never** need to wait for Google Play review to fix a UI bug, change copy, or add new JavaScript features. You push an Over-The-Air (OTA) update directly to user devices!

### How OTA Update Works:
```
[1. You edit code in src/] 
         │
         ▼
[2. Bundle JS + Assets: `npx react-native bundle ...`]
         │
         ▼
[3. Zip bundle files into bundle.zip]
         │
         ▼
[4. Publish to CodePush Console: `https://codepushs.netlify.app`]
         │
         ▼
[5. User opens app -> Downloads update -> Hot reloads automatically!]
```

### Step 1: Export the Production JS Bundle
In `SkillSwap` root directory:
```bash
# Create export directory
mkdir dist

# Bundle JavaScript and Assets
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output ./dist/index.android.bundle --assets-dest ./dist
```

### Step 2: Zip the Release Bundle
Using PowerShell:
```powershell
Compress-Archive -Path ./dist/* -DestinationPath ./android-v1.0.1.zip -Force
```

### Step 3: Publish to CodePush Console
1. Open your CodePush Console: `https://codepushs.netlify.app` (or local `http://localhost:5173`).
2. Select your project **Skillswap**.
3. Go to **Releases** &rarr; Click **"Create Release"**.
4. Fill in:
   - **Target Version:** `1.0.1`
   - **Platform:** `android`
   - **Upload Bundle:** Select `android-v1.0.1.zip`
   - **Release Notes:** *"Added new skill barter features and bug fixes"*
   - **Mandatory:** `True` (forces immediate hot-reload)
5. Click **Publish Release**!

All production apps in the wild will download this bundle and update instantly when opened!

---

## 4. Version Bumping Checklist

When releasing a new native binary to Google Play, always increment your version numbers in `android/app/build.gradle`:

```groovy
defaultConfig {
    applicationId "com.skillswap"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2          // 👈 Increment by 1 every release (1, 2, 3...)
    versionName "1.0.1"    // 👈 User-facing version string (e.g. 1.0.1, 1.1.0)
}
```

Also update your `.env` file:
```env
CODEPUSH_APP_VERSION=1.0.1
```

---

## 5. Troubleshooting Common Production Build Errors

### Issue A: `Out of Memory: Java heap space`
**Solution:** Increase Gradle daemon memory in `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### Issue B: Parallel Build File Lock (`Permission denied`) on Windows
**Solution:** Ensure `reactNativeArchitectures=arm64-v8a` is set in `android/gradle.properties` to avoid compiling 4 architectures simultaneously, and run:
```bash
./gradlew --stop
./gradlew clean
./gradlew assembleRelease
```

### Issue C: Proguard Stripping Required Classes
**Solution:** If release build crashes on startup with minification enabled, add keep rules in `android/app/proguard-rules.pro`:
```proguard
-keep class com.facebook.react.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
```

---

## 📋 Quick Production Commands Summary

| Task | Command |
| :--- | :--- |
| **Clean Gradle build cache** | `cd android && ./gradlew clean` |
| **Build Test Standalone APK** | `cd android && ./gradlew assembleRelease` |
| **Install APK on phone** | `adb install -r android/app/build/outputs/apk/release/app-release.apk` |
| **Build Play Store Bundle (.aab)** | `cd android && ./gradlew bundleRelease` |
| **Export JS Bundle for CodePush** | `npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output ./dist/index.android.bundle --assets-dest ./dist` |
