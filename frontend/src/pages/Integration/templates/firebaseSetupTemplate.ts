export function getFirebaseSetupGuide(): {
  rootGradle: string;
  appGradle: string;
  placementPath: string;
  instructions: string;
} {
  return {
    placementPath: 'android/app/google-services.json',
    rootGradle: `// android/build.gradle
buildscript {
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
        classpath("com.google.gms:google-services:4.4.2") // <-- Add this dependency
    }
}`,
    appGradle: `// android/app/build.gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"
apply plugin: "com.google.gms.google-services" // <-- Add this plugin at top`,
    instructions: `### Firebase Cloud Messaging (FCM) Setup for Android

1. Open Firebase Console (https://console.firebase.google.com).
2. Under Project Settings -> Your Apps -> Add Android App.
3. Enter your Android Package Name (e.g., matching applicationId in android/app/build.gradle).
4. Download google-services.json and save it directly into android/app/google-services.json.
5. In android/build.gradle, add:
   classpath("com.google.gms:google-services:4.4.2")
6. In android/app/build.gradle, add at the top:
   apply plugin: "com.google.gms.google-services"
7. Rebuild the app:
   npm run android
8. (Server-side) Place firebase-service-account.json in netlify/functions/ or set the FIREBASE_SERVICE_ACCOUNT environment variable on Netlify so the server can dispatch FCM v1 pushes directly to devices.`
  };
}
