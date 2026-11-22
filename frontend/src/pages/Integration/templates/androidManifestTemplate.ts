export function getAndroidManifestTemplate(appName: string = 'MyApp'): string {
  return `<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Essential CodePush & Network Connectivity -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Android 13+ (API 33+) Notification Permission (Required for push banners) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- Sound & Haptic Vibration Feedback for Push Alerts -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- WakeLock for Background OTA Downloads & High-Priority Alerts -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- Boot Survival for CodePush Startup Crash Watchdog -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
      android:name=".MainApplication"
      android:label="${appName}"
      android:icon="@mipmap/ic_launcher"
      android:roundIcon="@mipmap/ic_launcher_round"
      android:allowBackup="false"
      android:theme="@style/AppTheme"
      android:supportsRtl="true">
      <activity
        android:name=".MainActivity"
        android:label="${appName}"
        android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
        android:launchMode="singleTask"
        android:windowSoftInputMode="adjustResize"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity>
    </application>
</manifest>`;
}

export function getAndroidManifestPermissionsSnippet(): string {
  return `<!-- Add inside <manifest> in android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />`;
}
