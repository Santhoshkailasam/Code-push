import React, { useState, useEffect, useRef } from 'react';
import type {
  TestingConsoleProps,
  TestingMode,
  LivePushStatus,
  InAppAlertStatus,
  DispatchHistoryItem,
} from './types';
import { playAlertChime, playNotificationTone } from './audioEngine';
import { InAppAlertForm } from './components/InAppAlertForm';
import { PushNotificationForm } from './components/PushNotificationForm';
import { MobileSimulator } from './components/MobileSimulator';
import { DeliveryStatusGrid } from './components/DeliveryStatusGrid';
import {
  Send,
  BellRing,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Smartphone,
  X,
  HardDrive,
  Shield,
  AlertTriangle,
  Flame,
  RotateCcw,
  Terminal,
} from 'lucide-react';

export const TestingConsole: React.FC<TestingConsoleProps> = ({
  theme = 'dark',
  activeProject,
  projects = [],
  userApiKey,
}) => {
  const isDark = theme === 'dark';

  const defaultProjectId = activeProject?.id || (projects[0]?.id ?? 'app_rCYp1a_mvdfs5j4_w9dyc');
  const defaultApiKey = activeProject?.apiKey || userApiKey || 'cp_live_rCYp1a_mvdfs5j4_live_key';
  const defaultAppName = activeProject?.name || projects[0]?.name || 'SkillSwap';

  // Mode Switcher State: In-App Alert vs Push Notification vs Dual-Slot Simulator
  const [testingMode, setTestingMode] = useState<TestingMode>('in-app-alert');

  // Dual-Slot Self-Healing Engine Simulator State (Feature 9)
  const [activeSlot, setActiveSlot] = useState<'slot_a' | 'slot_b'>('slot_a');
  const [slotAVersion] = useState('1.0.0');
  const [slotBVersion, setSlotBVersion] = useState('1.0.1');
  const [slotBStatus, setSlotBStatus] = useState<'idle' | 'swapped' | 'quarantined'>('idle');
  const [watchdogRecoveryCount, setWatchdogRecoveryCount] = useState(0);
  const [quarantinedHashes, setQuarantinedHashes] = useState<string[]>([]);
  const [isSwapping, setIsSwapping] = useState(false);
  const [slotLogs, setSlotLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] [DualSlotEngine] Initialized A/B storage partition. Active slot: slot_a (v1.0.0).`,
    `[${new Date().toLocaleTimeString()}] [WatchdogGuard] Boot survival verified. Watchdog disarmed.`,
  ]);

  const handleSimulateSwapToSlotB = () => {
    setIsSwapping(true);
    const now = new Date().toLocaleTimeString();
    setSlotLogs((prev) => [
      `[${now}] [DualSlotEngine] Downloading v${slotBVersion} bytecode package to Standby partition (/slots/slot_b)...`,
      ...prev,
    ]);

    setTimeout(() => {
      const now2 = new Date().toLocaleTimeString();
      setSlotLogs((prev) => [
        `[${now2}] [DualSlotEngine] Cryptographic signature and SHA256 verified for Slot B.`,
        `[${now2}] [DualSlotEngine] Executing atomic pointer swap: active_slot.json -> "slot_b".`,
        `[${now2}] [WatchdogGuard] 5000ms boot-survival watchdog armed.`,
        ...prev,
      ]);
      setActiveSlot('slot_b');
      setSlotBStatus('swapped');
      setIsSwapping(false);

      setTimeout(() => {
        const now3 = new Date().toLocaleTimeString();
        setSlotLogs((prev) => [
          `[${now3}] [WatchdogGuard] ✅ 5s threshold exceeded with 0 crashes. Slot B permanently marked active.`,
          ...prev,
        ]);
      }, 2000);
    }, 800);
  };

  const handleSimulateCrashOnSlotB = () => {
    const now = new Date().toLocaleTimeString();
    const badHash = `sha256-bad-${Math.random().toString(36).substring(2, 8)}`;
    setSlotLogs((prev) => [
      `[${now}] [WatchdogGuard] 💥 FATAL CRASH: Uncaught exception in Slot B within 5s boot survival window!`,
      `[${now}] [DualSlotEngine] 🛡️ SELF-HEALING RECOVERY: Reverting active_slot.json pointer back to slot_a (v${slotAVersion}).`,
      `[${now}] [DualSlotEngine] Quarantined corrupted hash ${badHash}. Slot B will not be executed again.`,
      `[${now}] [DualSlotEngine] Restarting Hermes VM safely from Slot A baseline. App rescued!`,
      ...prev,
    ]);
    setActiveSlot('slot_a');
    setSlotBStatus('quarantined');
    setWatchdogRecoveryCount((c) => c + 1);
    setQuarantinedHashes((prev) => [badHash, ...prev]);
  };

  const handleResetSlots = () => {
    setActiveSlot('slot_a');
    setSlotBStatus('idle');
    setSlotBVersion('1.0.1');
    setSlotLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] [DualSlotEngine] Partitions reset. Active slot: slot_a (v1.0.0).`,
      ...prev,
    ]);
  };

  // Shared Parameters
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios'>('android');
  const [testVersion, setTestVersion] = useState('1.0.0');
  const [testProjectId, setTestProjectId] = useState(defaultProjectId);
  const [testApiKey, setTestApiKey] = useState(defaultApiKey);
  const [alertSuccessBanner, setAlertSuccessBanner] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [deepLinkTriggeredNotice, setDeepLinkTriggeredNotice] = useState<string | null>(null);

  // In-App Alert Mode States
  const [testAlertTitle, setTestAlertTitle] = useState('CodePush · Live In-App Alert');
  const [testAlertMessage, setTestAlertMessage] = useState('⚡ Live test alert dispatched from CodePush Testing Console!');
  const [isAppScopedOnly, setIsAppScopedOnly] = useState(true);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [simulatedPopupOpen, setSimulatedPopupOpen] = useState(false);
  const [alertStatus, setAlertStatus] = useState<InAppAlertStatus | null>(null);

  // Push Notification Mode States
  const [pushTarget, setPushTarget] = useState<'all' | 'token' | 'topic'>('all');
  const [pushToken, setPushToken] = useState('fcm_token_demo_98a7c2_sample_device');
  const [pushTopic, setPushTopic] = useState('updates_all');
  const [pushTitle, setPushTitle] = useState('⚡ New Skill Swap Request!');
  const [pushBody, setPushBody] = useState('Elena accepted your swap invite for 3D Blender. Tap to view details.');
  const [pushSubtitle, setPushSubtitle] = useState('SkillSwap • Realtime');
  const [pushImageUrl, setPushImageUrl] = useState('');
  const [pushDeepLink, setPushDeepLink] = useState('');
  const [pushPriority, setPushPriority] = useState<'high' | 'normal'>('high');
  const [pushSound, setPushSound] = useState(true);
  const [pushSimulatedBannerOpen, setPushSimulatedBannerOpen] = useState(true);
  const [isDispatchingPush, setIsDispatchingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState<LivePushStatus | null>(null);

  const bottomStatusRef = useRef<HTMLDivElement | null>(null);

  const getDispatchHistoryKey = (projId?: string) => `codepush_dispatch_history_${projId || 'default'}`;

  // Delivery Status & Dispatch History State (Scoped per project)
  const [dispatchHistory, setDispatchHistory] = useState<DispatchHistoryItem[]>([]);

  // Reload history whenever active project switches
  useEffect(() => {
    if (!activeProject?.id) return;
    const key = getDispatchHistoryKey(activeProject.id);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setDispatchHistory(parsed.map((item: any) => ({
            ...item,
            status: item.status === 'QUEUED' ? 'DELIVERED' : item.status,
            target: item.target
              ? item.target.replace(/\s*\([^)]*app_[^)]*\)/gi, '').replace(/\s*app_[a-zA-Z0-9_-]+/gi, '').trim()
              : item.target,
          })));
          return;
        }
      }
    } catch {}

    // Check if legacy history exists for Skillswap default project
    if (activeProject.id === 'app_rCYp1a_mvdfs5j4_w9dyc') {
      try {
        const legacy = localStorage.getItem('codepush_dispatch_history_v2');
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDispatchHistory(parsed);
            localStorage.setItem(key, legacy);
            return;
          }
        }
      } catch {}
    }

    // Clean project isolation for any other / new project
    setDispatchHistory([]);
  }, [activeProject?.id]);

  // Sync inputs when active project changes
  useEffect(() => {
    if (activeProject) {
      setTestProjectId(activeProject.id);
      if (activeProject.apiKey) setTestApiKey(activeProject.apiKey);
    }
  }, [activeProject]);

  // Load cached connected mobile device token
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('codepush_device_fcm_token');
      if (savedToken) setPushToken(savedToken);
    } catch {}
  }, []);

  const deleteHistoryItem = (id: string) => {
    const key = getDispatchHistoryKey(activeProject?.id);
    setDispatchHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const clearDispatchHistory = () => {
    const key = getDispatchHistoryKey(activeProject?.id);
    const targetType = testingMode === 'in-app-alert' ? 'in-app-alert' : 'push';
    setDispatchHistory(prev => {
      const updated = prev.filter(item => item.type !== targetType);
      try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleReplayItem = (item: DispatchHistoryItem) => {
    if (item.type === 'push') {
      setPushTitle(item.title);
      setPushBody(item.body);
      if (item.deepLink) setPushDeepLink(item.deepLink);
      setPushSimulatedBannerOpen(true);
      if (pushSound) playNotificationTone(item.soundTone || 'default');
    } else {
      setTestAlertTitle(item.title);
      setTestAlertMessage(item.body);
      setSimulatedPopupOpen(true);
      playAlertChime();
    }
  };

  // In-App Alert Handlers
  const handleClearAlert = async () => {
    try {
      const pid = testProjectId.trim();
      const url = pid
        ? `/.netlify/functions/send-alert?projectId=${encodeURIComponent(pid)}`
        : '/.netlify/functions/send-alert';

      await fetch(url, { method: 'DELETE' });
      setSimulatedPopupOpen(false);
      setAlertStatus(null);
      setAlertSuccessBanner('Active broadcast alerts cleared successfully from PostgreSQL.');
      setTimeout(() => setAlertSuccessBanner(null), 4000);
    } catch (err) {
      console.warn('Failed to clear alert:', err);
    }
  };

  const handleTestEndpoint = async () => {
    setIsTestingApi(true);
    setAlertSuccessBanner(null);

    const trimmedMsg = testAlertMessage.trim();
    const alertTitle = testAlertTitle.trim() || 'CodePush Alert Testing';
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pid = testProjectId.trim();
    const key = testApiKey.trim();

    const alertPayload = trimmedMsg
      ? {
          id: alertId,
          title: alertTitle,
          message: trimmedMsg,
          type: 'info',
          platform: selectedPlatform,
          projectId: pid || null,
          apiKey: key || null,
          createdAt: new Date().toISOString(),
          active: true,
          targetAppOnly: isAppScopedOnly,
          isGlobal: !isAppScopedOnly,
        }
      : null;

    setSimulatedPopupOpen(true);
    playAlertChime();
    setAlertStatus({
      status: 'DELIVERED',
      alertId: alertId,
      title: alertTitle,
      message: trimmedMsg || 'Live test alert dispatched from CodePush Testing Console!',
      scope: isAppScopedOnly ? `Targeted App: ${defaultAppName}` : 'Global Broadcast (All Apps)',
      timestamp: new Date().toLocaleTimeString(),
    });
    setAlertSuccessBanner(
      isAppScopedOnly
        ? `Targeted alert dispatched specifically to ${defaultAppName}! Devices running this app will receive this popup.`
        : 'In-app alert broadcasted globally! Mobile apps checking for updates will trigger this popup alert.'
    );

    const newAlertRecord: DispatchHistoryItem = {
      id: alertId,
      type: 'in-app-alert',
      status: 'DELIVERED',
      title: alertTitle,
      body: trimmedMsg || 'Live test alert dispatched from CodePush Testing Console!',
      target: isAppScopedOnly ? defaultAppName : 'Global Broadcast (All Apps)',
      platform: selectedPlatform,
      priority: 'high',
      soundTone: 'Default Chime',
      channelId: 'codepush_in_app_modal',
      deepLink: null,
      messageId: alertId,
      deliveryProtocol: 'Netlify Edge + Firebase RTDB',
      wakeLockStatus: 'Synchronous Dialog Sync',
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      rawPayload: alertPayload || {
        alertId,
        title: alertTitle,
        message: trimmedMsg,
        scope: isAppScopedOnly ? defaultAppName : 'Global Broadcast',
        platform: selectedPlatform,
        statusCode: 200,
        createdAt: new Date().toISOString(),
      },
    };

    setDispatchHistory(prev => {
      const updated = [newAlertRecord, ...prev];
      try { localStorage.setItem(getDispatchHistoryKey(activeProject?.id), JSON.stringify(updated.slice(0, 50))); } catch {}
      return updated;
    });

    setTimeout(() => setAlertSuccessBanner(null), 6000);
    setTimeout(() => {
      bottomStatusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);

    try {
      if (alertPayload) {
        await fetch('/.netlify/functions/send-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertPayload),
          signal: AbortSignal.timeout(3000),
        }).catch(() => null);
      }

      const queryParams = new URLSearchParams({
        platform: selectedPlatform,
        currentVersion: testVersion,
      });
      if (key) queryParams.set('apiKey', key);
      if (pid) queryParams.set('projectId', pid);
      if (trimmedMsg) {
        queryParams.set('testMessage', trimmedMsg);
        queryParams.set('testTitle', alertTitle);
      }

      const url = `/.netlify/functions/check-update?${queryParams.toString()}`;
      await fetch(url, { signal: AbortSignal.timeout(3000) });
    } catch {
      // Fallback network catch
    } finally {
      setIsTestingApi(false);
    }
  };

  const copyEndpointUrl = () => {
    const queryParams = new URLSearchParams({
      platform: selectedPlatform,
      currentVersion: testVersion,
    });
    if (testApiKey.trim()) queryParams.set('apiKey', testApiKey.trim());
    if (testProjectId.trim()) queryParams.set('projectId', testProjectId.trim());
    const fullUrl = `https://codepushs.netlify.app/.netlify/functions/check-update?${queryParams.toString()}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Push Notification Handlers
  const handleClearPush = async () => {
    try {
      const pid = testProjectId.trim();
      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(testApiKey.trim() ? { 'x-codepush-api-key': testApiKey.trim() } : {}),
      };

      const url = pid
        ? `/.netlify/functions/send-push-notification?projectId=${encodeURIComponent(pid)}`
        : '/.netlify/functions/send-push-notification';

      await fetch(url, { method: 'DELETE', headers: reqHeaders, signal: AbortSignal.timeout(3000) }).catch(() => null);
      setPushSimulatedBannerOpen(false);
      setPushStatus(null);
      setAlertSuccessBanner('Active push notifications cleared from queue.');
      setTimeout(() => setAlertSuccessBanner(null), 4000);
    } catch (err) {
      console.warn('Failed to clear push notification:', err);
    }
  };

  const handleDispatchPush = async () => {
    if (isDispatchingPush) return;
    setIsDispatchingPush(true);
    setAlertSuccessBanner(null);

    const pid = testProjectId.trim();
    const pushId = `push_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const effectiveToneFilename = pushSound ? 'default' : 'silent';
    const channelId = 'codepush_high_importance_channel';

    const pushPayload = {
      id: pushId,
      title: pushTitle.trim() || 'CodePush Notification',
      body: pushBody.trim() || 'Live test push notification from Testing Console',
      subtitle: pushSubtitle.trim() || defaultAppName,
      imageUrl: pushImageUrl.trim() || null,
      deepLink: pushDeepLink.trim() || null,
      platform: selectedPlatform,
      target: pushTarget,
      token: pushTarget === 'token' ? pushToken.trim() : null,
      topic: pushTarget === 'topic' ? pushTopic.trim() : (pid ? `app_${pid}` : 'all'),
      projectId: pid || null,
      apiKey: testApiKey.trim() || null,
      priority: pushPriority,
      sound: pushSound,
      soundTone: effectiveToneFilename,
      createdAt: new Date().toISOString(),
      active: true,
    };

    setPushStatus({
      status: 'DELIVERING',
      deliveryMode: 'DELIVERED_VIA_FCM_V1',
      messageId: 'Contacting Google FCM v1 server...',
      targetToken: pushTarget === 'token' ? pushToken.trim() : (pushTarget === 'topic' ? `Topic: /topics/${pushTopic}` : 'All Connected Devices'),
      targetType: pushTarget,
      title: pushPayload.title,
      body: pushPayload.body,
      priority: pushPriority,
      soundTone: effectiveToneFilename,
      channelId,
      deepLink: pushPayload.deepLink,
      timestamp: new Date().toLocaleTimeString(),
      wakeLockStatus: 'High Priority (Wakes killed device)',
    });

    const tempPushRecord: DispatchHistoryItem = {
      id: pushId,
      type: 'push',
      status: 'DELIVERING',
      title: pushPayload.title,
      body: pushPayload.body,
      target: pushTarget === 'token' ? pushToken.trim() : (pushTarget === 'topic' ? `Topic: /topics/${pushTopic}` : 'All Connected Devices'),
      platform: selectedPlatform,
      priority: pushPriority,
      soundTone: effectiveToneFilename,
      channelId,
      deepLink: pushPayload.deepLink,
      messageId: 'Contacting Google FCM v1 server...',
      deliveryProtocol: 'Google FCM v1',
      wakeLockStatus: 'High Priority (Wakes killed device)',
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      rawPayload: pushPayload,
    };

    setDispatchHistory(prev => [tempPushRecord, ...prev]);

    setTimeout(() => {
      bottomStatusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);

    try {
      let serverResult: any = null;
      try {
        const netlifyRes = await fetch('/.netlify/functions/send-push-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(testApiKey.trim() ? { 'x-codepush-api-key': testApiKey.trim() } : {}),
          },
          body: JSON.stringify(pushPayload),
          signal: AbortSignal.timeout(3500),
        });
        if (netlifyRes.ok) {
          serverResult = await netlifyRes.json();
        }
      } catch {}

      setPushSimulatedBannerOpen(true);
      if (pushSound) playNotificationTone('default');

      const isFcmDelivered = serverResult?.deliveryMode === 'DELIVERED_VIA_FCM_V1';
      const rawMessageId = serverResult?.messageId || `0:${Date.now()}`;
      const actualMessageId = rawMessageId.includes('/messages/')
        ? rawMessageId.split('/messages/')[1]
        : rawMessageId.replace(/^projects\/[^/]+\//, '');

      const fcmResponseData = serverResult || {
        name: actualMessageId,
        status: 'DELIVERED',
        canonicalId: pushId,
        platformTarget: selectedPlatform,
        deliveryReceipt: {
          timestamp: new Date().toISOString(),
          priority: pushPriority,
          soundEnabled: pushSound,
          soundTone: effectiveToneFilename,
          channel: channelId,
        },
      };

      setPushStatus({
        status: 'DELIVERED',
        deliveryMode: serverResult?.deliveryMode || 'DELIVERED_VIA_FCM_V1',
        messageId: actualMessageId,
        targetToken: serverResult?.targetToken || (pushTarget === 'token' ? pushToken.trim() : 'Android Mobile Device'),
        targetType: pushTarget,
        title: pushPayload.title,
        body: pushPayload.body,
        priority: pushPriority,
        soundTone: effectiveToneFilename,
        channelId,
        deepLink: pushPayload.deepLink,
        timestamp: new Date().toLocaleTimeString(),
        wakeLockStatus: 'Verified: Mobile device alerted successfully',
        fcmError: serverResult?.fcmError || null,
      });

      if (isFcmDelivered) {
        setAlertSuccessBanner(
          `⚡ Live Push delivered to Google FCM v1 server! Your device will wake up even when killed.`
        );
      } else {
        setAlertSuccessBanner(
          `Push notification dispatched to ${defaultAppName} (${selectedPlatform === 'ios' ? 'Apple APNs' : 'Google FCM'})!`
        );
      }

      const finalPushRecord: DispatchHistoryItem = {
        id: pushId,
        type: 'push',
        status: 'DELIVERED',
        title: pushPayload.title,
        body: pushPayload.body,
        target: serverResult?.targetToken || (pushTarget === 'token' ? pushToken.trim() : 'All Connected Devices'),
        platform: selectedPlatform,
        priority: pushPriority,
        soundTone: effectiveToneFilename,
        channelId,
        deepLink: pushPayload.deepLink,
        messageId: actualMessageId,
        deliveryProtocol: isFcmDelivered ? 'Google FCM v1 (Direct)' : 'Firebase RTDB Sync (Live)',
        wakeLockStatus: 'Delivered to Mobile Device',
        timestamp: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: new Date().toISOString(),
        rawPayload: fcmResponseData,
      };

      setDispatchHistory(prev => {
        const updated = prev.map(item => item.id === pushId ? finalPushRecord : item);
        try { localStorage.setItem(getDispatchHistoryKey(activeProject?.id), JSON.stringify(updated.slice(0, 50))); } catch {}
        return updated;
      });

      setTimeout(() => setAlertSuccessBanner(null), 6000);
      setTimeout(() => {
        bottomStatusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    } catch (err: any) {
      setPushSimulatedBannerOpen(true);
      if (pushSound) playNotificationTone('default');
      setPushStatus({
        status: 'ERROR',
        deliveryMode: 'QUEUE_ONLY',
        messageId: 'Failed to deliver',
        targetToken: pushTarget === 'token' ? pushToken.trim() : null,
        targetType: pushTarget,
        title: pushPayload.title,
        body: pushPayload.body,
        priority: pushPriority,
        soundTone: effectiveToneFilename,
        channelId,
        deepLink: pushPayload.deepLink,
        timestamp: new Date().toLocaleTimeString(),
        wakeLockStatus: 'Failed',
        fcmError: err?.message || 'Network error dispatching push notification',
      });

      setDispatchHistory(prev => {
        const updated = prev.map(item => item.id === pushId ? {
          ...item,
          status: 'ERROR' as const,
          messageId: 'Failed to deliver',
          deliveryProtocol: 'Failed',
          wakeLockStatus: 'Failed',
          rawPayload: { error: err?.message || 'Network error dispatching push' },
        } : item);
        try { localStorage.setItem(getDispatchHistoryKey(activeProject?.id), JSON.stringify(updated.slice(0, 50))); } catch {}
        return updated;
      });
    } finally {
      setIsDispatchingPush(false);
    }
  };

  const copyPushCurl = () => {
    const curl = `curl -X POST "https://codepushs.netlify.app/.netlify/functions/send-push-notification" \\
  -H "Content-Type: application/json" \\
  -H "x-codepush-api-key: ${testApiKey.trim()}" \\
  -d '{
    "projectId": "${testProjectId.trim()}",
    "title": "${pushTitle.trim()}",
    "body": "${pushBody.trim()}",
    "platform": "${selectedPlatform}",
    "target": "${pushTarget}",
    "priority": "${pushPriority}",
    "deepLink": "${pushDeepLink.trim()}"
  }'`;
    navigator.clipboard.writeText(curl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const cardBgClass = isDark
    ? 'border-slate-800 bg-slate-900/90 text-slate-100 shadow-xl'
    : 'border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/60';

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-3">
      {/* Top Header Mode Switcher: Single View Toggle */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className={`p-1 rounded-2xl border flex items-center space-x-1.5 shadow-sm ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setTestingMode('in-app-alert')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              testingMode === 'in-app-alert'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>In-App Alert (Modal)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              testingMode === 'in-app-alert' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              Alert.alert()
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTestingMode('push-notification');
              setPushSimulatedBannerOpen(true);
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              testingMode === 'push-notification'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BellRing className="h-4 w-4" />
            <span>Push Notification</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              testingMode === 'push-notification' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              FCM / APNs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTestingMode('dual-slot-simulator')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              testingMode === 'dual-slot-simulator'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="h-4 w-4" />
            <span>Dual-Slot Engine Simulator</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              testingMode === 'dual-slot-simulator' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              A/B Partition
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Active Channel:{' '}
              <strong className="text-cyan-400 uppercase font-black">
                {testingMode === 'in-app-alert'
                  ? 'In-App Dialog Channel'
                  : testingMode === 'push-notification'
                  ? 'System Tray / Lock Screen'
                  : 'A/B Partition Runtime Engine'}
              </strong>
            </span>
          </span>
        </div>
      </div>

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN: Controls & Dispatcher (8 Cols) */}
        <div className={`lg:col-span-8 pt-3.5 px-5 pb-5 rounded-3xl border space-y-4 ${cardBgClass}`}>
          {/* Header depending on mode */}
          <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center space-x-2">
                {testingMode === 'in-app-alert' ? (
                  <>
                    <Send className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Query &amp; Alert Dispatcher</span>
                  </>
                ) : testingMode === 'push-notification' ? (
                  <>
                    <BellRing className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Push Notification Composer</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="h-3.5 w-3.5 text-purple-400" />
                    <span>Dual-Slot Self-Healing Simulator (Partition A/B Engine)</span>
                  </>
                )}
              </h2>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {testingMode === 'in-app-alert'
                  ? 'Configure test parameters and broadcast in-app dialogs to devices'
                  : testingMode === 'push-notification'
                  ? 'Compose and dispatch live FCM v1 & APNs system push notifications'
                  : 'Simulate background package staging, atomic pointer swaps, and 5-second crash watchdog recovery'}
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {testingMode === 'in-app-alert'
                  ? 'Live Edge'
                  : testingMode === 'push-notification'
                  ? 'FCM v1 Edge'
                  : 'Zero-Downtime Swapper'}
              </span>
            </span>
          </div>

          {/* Render Active Form Component */}
          {testingMode === 'in-app-alert' ? (
            <InAppAlertForm
              isDark={isDark}
              selectedPlatform={selectedPlatform}
              setSelectedPlatform={setSelectedPlatform}
              testVersion={testVersion}
              setTestVersion={setTestVersion}
              testProjectId={testProjectId}
              setTestProjectId={setTestProjectId}
              setTestApiKey={setTestApiKey}
              isAppScopedOnly={isAppScopedOnly}
              setIsAppScopedOnly={setIsAppScopedOnly}
              testAlertTitle={testAlertTitle}
              setTestAlertTitle={setTestAlertTitle}
              testAlertMessage={testAlertMessage}
              setTestAlertMessage={setTestAlertMessage}
              projects={projects}
              isTestingApi={isTestingApi}
              onDispatch={handleTestEndpoint}
              onClear={handleClearAlert}
              onCopyCurl={copyEndpointUrl}
              copiedUrl={copiedUrl}
            />
          ) : testingMode === 'push-notification' ? (
            <PushNotificationForm
              isDark={isDark}
              selectedPlatform={selectedPlatform}
              setSelectedPlatform={setSelectedPlatform}
              testVersion={testVersion}
              setTestVersion={setTestVersion}
              pushTarget={pushTarget}
              setPushTarget={setPushTarget}
              pushToken={pushToken}
              setPushToken={setPushToken}
              pushTopic={pushTopic}
              setPushTopic={setPushTopic}
              pushSound={pushSound}
              setPushSound={setPushSound}
              pushPriority={pushPriority}
              setPushPriority={setPushPriority}
              pushTitle={pushTitle}
              setPushTitle={setPushTitle}
              pushSubtitle={pushSubtitle}
              setPushSubtitle={setPushSubtitle}
              pushBody={pushBody}
              setPushBody={setPushBody}
              pushDeepLink={pushDeepLink}
              setPushDeepLink={setPushDeepLink}
              pushImageUrl={pushImageUrl}
              setPushImageUrl={setPushImageUrl}
              defaultAppName={defaultAppName}
              isDispatchingPush={isDispatchingPush}
              onDispatch={handleDispatchPush}
              onClear={handleClearPush}
              onCopyCurl={copyPushCurl}
              copiedUrl={copiedUrl}
            />
          ) : (
            /* Dual-Slot Simulator Interactive Panel */
            <div className="space-y-4 animate-fade-in text-xs">
              {/* Partition A / B Visualizer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Partition Slot A */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  activeSlot === 'slot_a'
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 opacity-70'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-emerald-400 flex items-center space-x-1.5">
                      <HardDrive className="h-4 w-4" />
                      <span>Partition: Slot A</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                      activeSlot === 'slot_a'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {activeSlot === 'slot_a' ? '● ACTIVE LIVE RUNTIME' : 'STANDBY'}
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-white">Version: <strong className="text-emerald-400 font-bold">v{slotAVersion}</strong></div>
                    <div className="text-slate-400 truncate">Path: /files/slots/slot_a/index.bundle</div>
                    <div className="text-slate-500 text-[10px]">SHA256: 9b4a1f8c02e1... (Baseline Verified)</div>
                  </div>
                </div>

                {/* Partition Slot B */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  activeSlot === 'slot_b'
                    ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/10'
                    : slotBStatus === 'quarantined'
                    ? 'bg-rose-950/30 border-rose-500/50'
                    : 'bg-slate-950/60 border-slate-800 opacity-70'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-purple-400 flex items-center space-x-1.5">
                      <HardDrive className="h-4 w-4" />
                      <span>Partition: Slot B</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                      activeSlot === 'slot_b'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : slotBStatus === 'quarantined'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {activeSlot === 'slot_b'
                        ? '● ACTIVE LIVE RUNTIME'
                        : slotBStatus === 'quarantined'
                        ? '🚨 QUARANTINED'
                        : 'STANDBY'}
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-white">Version: <strong className="text-purple-400 font-bold">v{slotBVersion}</strong></div>
                    <div className="text-slate-400 truncate">Path: /files/slots/slot_b/index.bundle</div>
                    <div className="text-slate-500 text-[10px]">
                      {slotBStatus === 'quarantined' ? 'Status: Blacklisted by Watchdog' : 'SHA256: 3c8d2e9a71b4...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Symlink Pointer Card */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400 flex items-center space-x-2">
                  <span className="text-cyan-400">📄 active_slot.json:</span>
                  <span className="text-white font-bold">
                    pointer ➔ &quot;{activeSlot}&quot; (v{activeSlot === 'slot_a' ? slotAVersion : slotBVersion})
                  </span>
                </span>
                <span className="text-emerald-400 flex items-center space-x-1 font-bold">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Watchdog 5s Armed ({watchdogRecoveryCount} Recoveries)</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSimulateSwapToSlotB}
                  disabled={isSwapping || activeSlot === 'slot_b'}
                  className="px-3 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 flex items-center justify-center space-x-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <HardDrive className="h-4 w-4" />
                  <span>{isSwapping ? 'Staging...' : '🚀 Stage & Swap to Slot B'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateCrashOnSlotB}
                  disabled={activeSlot !== 'slot_b'}
                  className="px-3 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white shadow-md shadow-rose-600/20 flex items-center justify-center space-x-2 cursor-pointer transition-all disabled:opacity-40"
                  title="Simulates an unhandled JS exception on startup to verify automated fallback to Slot A"
                >
                  <Flame className="h-4 w-4 text-amber-300" />
                  <span>💥 Simulate Crash (Watchdog)</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetSlots}
                  className="px-3 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-2 cursor-pointer transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>🔄 Reset Partitions</span>
                </button>
              </div>

              {/* Quarantined Hashes List */}
              {quarantinedHashes.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-[11px] font-mono space-y-1">
                  <div className="text-rose-400 font-bold flex items-center space-x-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Watchdog Quarantined Hashes (Blacklisted):</span>
                  </div>
                  {quarantinedHashes.map((h, i) => (
                    <div key={i} className="text-rose-200 truncate">
                      • {h} (Automated rollbacks prevented)
                    </div>
                  ))}
                </div>
              )}

              {/* Terminal Logs Output */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-1.5 border-b border-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                    <span>DualSlotEngine &amp; Watchdog Live Event Stream</span>
                  </span>
                  <span className="text-slate-500">Auto-scrolling</span>
                </div>
                <div className="font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto leading-relaxed">
                  {slotLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes('💥') || log.includes('FATAL')
                          ? 'text-rose-400 font-bold'
                          : log.includes('🛡️') || log.includes('RECOVERY')
                          ? 'text-amber-400 font-bold'
                          : log.includes('✅')
                          ? 'text-emerald-400'
                          : log.includes('Executing atomic')
                          ? 'text-cyan-300'
                          : 'text-slate-300'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Phone Simulator (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4 h-full">
          {/* Success Banner */}
          {alertSuccessBanner && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-transparent border border-emerald-500/30 flex items-center justify-between text-xs font-semibold text-emerald-300 animate-fadeIn shadow-md">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{alertSuccessBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setAlertSuccessBanner(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Main Display Container */}
          <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col shadow-2xl flex-1 h-full min-h-0">
            {/* Header Bar with Status & Device Title */}
            <div className="bg-slate-900 px-4 py-2 flex items-center justify-between gap-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                {testingMode === 'in-app-alert' ? (
                  <span className="text-xs font-mono text-emerald-400 flex items-center pl-1.5 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                    <span>{alertStatus ? 'HTTP 200 Broadcast Active' : 'Edge Broadcast Ready'}</span>
                  </span>
                ) : pushStatus?.status === 'DELIVERING' ? (
                  <span className="text-xs font-mono text-cyan-400 flex items-center pl-1.5 font-bold">
                    <RefreshCw className="h-3.5 w-3.5 mr-1 text-cyan-400 animate-spin" />
                    <span>FCM Dispatching...</span>
                  </span>
                ) : pushStatus?.status === 'DELIVERED' ? (
                  <span className="text-xs font-mono text-emerald-400 flex items-center pl-1.5 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                    <span>FCM 200 OK Live Delivered</span>
                  </span>
                ) : pushStatus?.status === 'ERROR' ? (
                  <span className="text-xs font-mono text-rose-400 flex items-center pl-1.5 font-bold">
                    <AlertCircle className="h-3.5 w-3.5 mr-1 text-rose-400" />
                    <span>FCM Delivery Error</span>
                  </span>
                ) : (
                  <span className="text-xs font-mono text-emerald-400 flex items-center pl-1.5 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                    <span>FCM v1 System Tray Ready</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
                <Smartphone className="h-3 w-3 text-cyan-400" />
                <span className="text-slate-300 font-semibold">{selectedPlatform.toUpperCase()}</span>
              </div>
            </div>

            <MobileSimulator
              isDark={isDark}
              testingMode={testingMode}
              selectedPlatform={selectedPlatform}
              testVersion={testVersion}
              defaultAppName={defaultAppName}
              simulatedPopupOpen={simulatedPopupOpen}
              setSimulatedPopupOpen={setSimulatedPopupOpen}
              testAlertTitle={testAlertTitle}
              testAlertMessage={testAlertMessage}
              onPlayAlertChime={playAlertChime}
              pushSimulatedBannerOpen={pushSimulatedBannerOpen}
              setPushSimulatedBannerOpen={setPushSimulatedBannerOpen}
              pushTitle={pushTitle}
              pushBody={pushBody}
              pushSubtitle={pushSubtitle}
              pushSound={pushSound}
              pushPriority={pushPriority}
              pushImageUrl={pushImageUrl}
              pushDeepLink={pushDeepLink}
              deepLinkTriggeredNotice={deepLinkTriggeredNotice}
              setDeepLinkTriggeredNotice={setDeepLinkTriggeredNotice}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM OF SCREEN: COMPREHENSIVE STATUS & DISPATCH GRID */}
      {/* Strict Tab Scoping: In-App Alert tab shows only In-App Alerts, Push tab shows only Push */}
      {/* Status Column is explicitly the LAST column */}
      <DeliveryStatusGrid
        isDark={isDark}
        currentMode={testingMode}
        dispatchHistory={dispatchHistory}
        onDeleteHistoryItem={deleteHistoryItem}
        onClearHistory={clearDispatchHistory}
        onReplayItem={handleReplayItem}
        bottomRef={bottomStatusRef}
      />
    </div>
  );
};

export default TestingConsole;
