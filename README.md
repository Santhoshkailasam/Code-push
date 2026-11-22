# 🚀 CodePush Enterprise Platform

> **Zero-Downtime Over-The-Air (OTA) Updates & Real-Time Push Notification Engine**  
> Designed for high-scale React Native mobile applications on Android & iOS. Built with React 19, TypeScript, Vite, TailwindCSS, Firebase RTDB/Auth, Netlify Edge Functions, and Hermes HBC Bytecode.

---

## 📑 Core Documentation Index

| Document | Purpose & Description |
| :--- | :--- |
| 📱 [**Client Integration Guide**](./docs/REACT_NATIVE_INTEGRATION.md) | Click-by-click setup for React Native apps, Hermes compiler, Boot Loop Watchdog, Push Notifications, and CLI deployment. |
| 🧪 [**Master Manual QA Playbook**](../MANUAL_TESTING_DOCUMENTATION.md) | Exhaustive 20-feature testing playbook with step-by-step UI actions, terminal verification commands, and sign-off matrix. |
| 📋 [**Codebase Audit & Roadmap**](../codepush_codebase_audit_and_next_features.md) | Architectural audit of all 12 implemented components and in-depth breakdown of next-gen features. |
| 🗺️ [**Product Feature Recommendations**](../FEATURE_RECOMMENDATIONS.md) | Deep dive into phased enterprise reliability, Canary hashing, circuit breakers, and delta patches. |
| 🤖 [**Android Production & APK Guide**](./docs/PRODUCTION_GUIDE.md) | Building standalone APKs, signing keys, and Google Play Store AAB bundles. |
| 📶 [**Wi-Fi Debugging Guide**](./docs/WIFI_DEBUGGING.md) | Wireless ADB pairing and on-device live testing. |

---

## ⚡ Key Platform Capabilities

1. **Zero-Downtime Silent OTA Distribution**: Download and apply bundles seamlessly in the background with zero user interruption.
2. **Deterministic Canary / Phased Rollouts**: Staged rollouts (`5%` ➔ `25%` ➔ `50%` ➔ `100%`) using CRC32 device cohort hashing.
3. **Automated Boot Loop Crash Guard**: 5-second survival watchdog that automatically reverts to factory APK baseline on 3 startup crashes.
4. **Automated Crash Circuit Breaker**: Disconnects broken bundles and triggers autonomous rollback when crash thresholds are exceeded.
5. **Source Map Stack Trace Symbolication**: Upload `.map` files to de-minify production crash traces back to original TypeScript lines.
6. **Hermes Bytecode Pre-Flight Validator**: Inspects binary magic header `0x1F55C0DE` before ingestion to prevent white-screen crashes.
7. **Emergency Instant Kill-Switch**: 1-click global revocation flag that immediately blocks and rolls back compromised releases.
8. **Multi-Track Promotion**: Separate `Staging` (internal QA) and `Production` (live fleet) with 1-click instant promotion.
9. **Dynamic Remote Config**: Real-time key-value feature flags and parameters updated instantly via Firebase RTDB.
10. **High-Priority FCM v1 Push Notifications**: Instant native banner dispatch with custom sound channels (`crystal_glass`, `electronic_pulse`, etc.) and deep linking.
11. **Developer CLI Tool (`@codepush/cli`)**: Terminal utility (`npx codepush`) for packaging, publishing, promoting, and rolling back.
12. **Team Collaboration Webhooks**: Automated deployment cards dispatched to Slack and Discord channels.

---

## 🛠️ Quick Local Development Setup

### 1. Start the CodePush Web Console
```bash
cd "k:\Projects\codepush project\codepush"
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 2. Developer CLI Commands
```bash
# Login with your project API Key
npx codepush login --key cp_live_e93847a98b2c1d0e

# Deploy bundle to Staging
npx codepush release-react -a app_rCYp1a_mvdfs5j4_w9dyc -p android -t staging -m "Hotfix v1.0.1"

# Promote to Production
npx codepush promote -a app_rCYp1a_mvdfs5j4_w9dyc -p android -s staging -d production

# Emergency Rollback
npx codepush rollback -a app_rCYp1a_mvdfs5j4_w9dyc -p android

# View Current Release Status
npx codepush status -a app_rCYp1a_mvdfs5j4_w9dyc
```

---

## 🌐 Production Deployment Architecture

* **Web Console & Edge Functions**: Netlify (`https://codepushs.netlify.app`)
* **Realtime State & Telemetry**: Firebase Realtime Database (`asia-southeast1`)
* **Storage & Bundles**: Netlify Blobs & Firebase Storage
