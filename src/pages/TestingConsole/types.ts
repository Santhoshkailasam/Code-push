import type { Project } from '../../types';

export type TestingMode = 'in-app-alert' | 'push-notification' | 'dual-slot-simulator';

export interface TestingConsoleProps {
  theme?: 'dark' | 'light';
  activeProject?: Project;
  projects?: Project[];
  userApiKey?: string;
}

export interface LivePushStatus {
  status: 'DELIVERING' | 'DELIVERED' | 'QUEUED' | 'ERROR';
  deliveryMode: 'DELIVERED_VIA_FCM_V1' | 'RTDB_ONLY' | 'QUEUE_ONLY';
  messageId: string;
  targetToken?: string | null;
  targetType: 'all' | 'token' | 'topic';
  title: string;
  body: string;
  priority: string;
  soundTone: string;
  channelId: string;
  deepLink?: string | null;
  timestamp: string;
  wakeLockStatus: string;
  fcmError?: string | null;
}

export interface InAppAlertStatus {
  status: 'DELIVERED' | 'ERROR';
  alertId: string;
  title: string;
  message: string;
  scope: string;
  timestamp: string;
}

export interface DispatchHistoryItem {
  id: string;
  type: 'push' | 'in-app-alert';
  status: 'DELIVERED' | 'QUEUED' | 'ERROR' | 'DELIVERING';
  title: string;
  body: string;
  target: string;
  platform: 'android' | 'ios' | 'both';
  priority?: string;
  soundTone?: string;
  channelId?: string;
  deepLink?: string | null;
  messageId: string;
  deliveryProtocol: string;
  wakeLockStatus?: string;
  timestamp: string;
  date: string;
  createdAt?: string | number;
  rawPayload?: any;
}


export interface InAppPreset {
  label: string;
  title: string;
  text: string;
}

export const IN_APP_PRESETS: InAppPreset[] = [
  {
    label: '🚀 Hotfix Patch',
    title: 'CodePush Update Alert',
    text: '⚡ OTA Update v1.0.1 hotfix installed successfully! Bug fixes are now active.',
  },
  {
    label: '🎉 SkillSwap Test',
    title: 'SkillSwap In-App Alert',
    text: '🎉 Welcome to SkillSwap! CodePush realtime broadcast and update sync verified.',
  },
  {
    label: '⚠️ Maintenance',
    title: 'System Notice',
    text: '⚠️ Scheduled database maintenance in 10 minutes. Please save your work.',
  },
  {
    label: '🔴 Rollback Notice',
    title: 'Critical Rollback Alert',
    text: '↩️ Previous build restored. Mobile app refreshed to stable version.',
  },
];

export interface PushPreset {
  label: string;
  title: string;
  body: string;
  subtitle: string;
  deepLink: string;
  imageUrl: string;
}

export const PUSH_PRESETS: PushPreset[] = [
  {
    label: '⚡ OTA Update Ready',
    title: 'CodePush Update Downloaded',
    body: 'Version v1.1.2 is installed and ready. Tap to reload the app with new features.',
    subtitle: 'System Update',
    deepLink: 'skillswap://updates',
    imageUrl: '',
  },
  {
    label: '💬 New Message',
    title: 'Elena Vasquez sent you a message',
    body: '“Hey! Are we still on for the 3D Blender swap session today at 5pm?”',
    subtitle: 'SkillSwap Chat',
    deepLink: 'skillswap://messages',
    imageUrl: '',
  },
  {
    label: '🎯 New Skill Match',
    title: 'New Skill Swap Match!',
    body: 'Marcus Chen wants to trade UI/UX Design for your React Native knowledge.',
    subtitle: 'Match Radar',
    deepLink: 'skillswap://matches',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: '🔥 Hotfix Applied',
    title: 'CodePush Hotfix Applied',
    body: 'Live patch #1042 successfully synchronized via Netlify Edge.',
    subtitle: 'OTA Sync',
    deepLink: 'skillswap://home',
    imageUrl: '',
  },
];
