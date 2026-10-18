# 📶 How to Run & Debug React Native on Android over Wi-Fi

This guide explains how to connect your physical Android device to your computer and run **SkillSwap** wirelessly over Wi-Fi without needing a USB cable plugged in.

---

## ⚡ Prerequisites
1. Your **Computer** and **Android Phone** MUST be connected to the **SAME Wi-Fi network**.
2. **Developer Options** and **USB Debugging** must be enabled on your phone:
   - Go to **Settings** &rarr; **About Phone** &rarr; Tap **Build Number** 7 times.
   - Go to **Settings** &rarr; **System / Additional Settings** &rarr; **Developer Options** &rarr; Enable **USB Debugging**.

---

## Method 1: The Quick TCP/IP Method (Recommended for all Android versions)

### Step 1: Connect Phone via USB Cable (One-Time Setup)
Plug your phone into your computer with a USB cable first, then check:
```bash
adb devices
```
You should see your device listed (e.g. `0767031221072719 device`).

### Step 2: Enable TCP/IP on Port 5555
Run:
```bash
adb tcpip 5555
```
You should see: `restarting in TCP mode port: 5555`.

### Step 3: Find Your Phone's Wi-Fi IP Address
You can find it either from your terminal or on your phone:
* **Option A (Terminal):**
  ```bash
  adb shell ip route
  ```
  Look for the IP ending with `/24` (e.g., `192.168.0.220`).
* **Option B (Phone Settings):**
  Go to **Settings** &rarr; **Wi-Fi** &rarr; Tap your connected Wi-Fi &rarr; Look at **IP Address**.

### Step 4: Disconnect USB and Connect Wirelessly
Unplug the USB cable from your computer and phone, then run:
```bash
adb connect <PHONE_IP>:5555
```
*(Example: `adb connect 192.168.0.220:5555`)*

You should see:
```text
connected to 192.168.0.220:5555
```

Verify your device is connected wirelessly:
```bash
adb devices
```
Output:
```text
List of devices attached
192.168.0.220:5555    device
```

### Step 5: Forward Metro Port (Crucial!)
To make sure your phone can fetch the JavaScript bundle from your computer:
```bash
adb reverse tcp:8081 tcp:8081
```

### Step 6: Start & Run App
In your project root (`k:\Projects\codepush project\SkillSwap`):
```bash
npm run android
```
The app will build and install onto your phone wirelessly over Wi-Fi!

---

## Method 2: Android 11+ Native Wireless Debugging (No USB Cable Needed)

If your phone runs Android 11 or newer, you can pair without ever using a USB cable:

1. On your phone: Go to **Settings** &rarr; **Developer Options** &rarr; Enable **Wireless Debugging**.
2. Tap on **Wireless Debugging** &rarr; Tap **"Pair device with pairing code"**.
3. A popup will show:
   - **Wi-Fi pairing code** (e.g. `123456`)
   - **IP address & Port** (e.g. `192.168.0.220:41234`)
4. In your computer terminal, run:
   ```bash
   adb pair <IP>:<PORT>
   ```
   *(Example: `adb pair 192.168.0.220:41234`)*
5. Enter the pairing code when prompted:
   ```text
   Enter pairing code: 123456
   Successfully paired to 192.168.0.220:41234
   ```
6. Look at the main **Wireless Debugging** screen for your primary connection port (e.g. `192.168.0.220:39876`), and connect:
   ```bash
   adb connect <IP>:<PORT>
   ```
7. Forward Metro port:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

---

## 🛠️ Common Issues & Fast Fixes

### 1. "Another process is running on port 8081. Use port 8082 instead?"
**Cause:** Metro bundler is already running in another terminal window or background process.

**Fix (Option A - Reuse the running server):**
If Metro is already running, you don't need `npm run android` to restart Metro. Just run:
```bash
npm run android -- --no-packager
```
or simply open the app on your phone; it will connect to the running Metro automatically!

**Fix (Option B - Kill stale process):**
In PowerShell:
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8081).OwningProcess -Force
```

---

### 2. "Unable to load script. Make sure you're either running a Metro server or that your bundle 'index.android.bundle' is packaged..."
**Cause:** The phone can't reach Metro port 8081 on your computer.

**Fix:**
1. Run:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
2. In the app on your phone, shake the phone (or press `Ctrl + M` / `adb shell input keyevent 82`) to open the **Dev Menu**.
3. Tap **Change Bundle Location** &rarr; Enter your computer's local IP:
   ```text
   <COMPUTER_IP>:8081
   ```
   *(Example: `192.168.0.183:8081`)*.
4. Tap **Reload**.

---

### 3. "Failed to launch emulator. Reason: No emulators found..."
**Cause:** `react-native run-android` couldn't find an emulator and no physical device was detected by ADB.

**Fix:**
Ensure your phone is connected by checking:
```bash
adb devices
```
If empty, reconnect over Wi-Fi:
```bash
adb connect <PHONE_IP>:5555
```
Once listed as `device`, re-run `npm run android`.

---

## 📋 Quick Reference Cheat-Sheet

```bash
# 1. Plug in USB once and enable Wi-Fi mode
adb tcpip 5555

# 2. Unplug USB and connect via Wi-Fi
adb connect 192.168.0.220:5555

# 3. Confirm device is attached
adb devices

# 4. Port forward Metro
adb reverse tcp:8081 tcp:8081

# 5. Run app
npm run android
```
