export type Platform = 'android' | 'ios';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  stage: 'upload' | 'edge_deploy' | 'verification' | 'sdk_check' | 'device_download' | 'applied';
}

export interface AdoptionStats {
  totalTargetDevices: number;
  updatedDevices: number;
  pendingDevices: number;
  failedDevices: number;
  adoptionPercentage: number;
}

export interface ReleaseInfo {
  latestVersion: string;
  minAppVersion: string;
  downloadUrl: string;
  mandatory: boolean;
  hash: string;
  releaseNotes: string;
  updatedAt: string;
  sizeBytes?: number;
  userId?: string;
  apiKey?: string;
}

export interface ReleaseHistoryItem {
  id: string;
  platform: Platform;
  version: string;
  hash: string;
  mandatory: boolean;
  releaseNotes: string;
  createdAt: string;
  downloadUrl?: string;
  sizeBytes?: number;
  source?: string;
  timeline?: TimelineEvent[];
  adoptionStats?: AdoptionStats;
  userId?: string;
  apiKey?: string;
}

export interface VersionData {
  android: ReleaseInfo;
  ios: ReleaseInfo;
  history: ReleaseHistoryItem[];
  keys?: Record<string, { android?: ReleaseInfo; ios?: ReleaseInfo }>;
  users?: Record<string, { android?: ReleaseInfo; ios?: ReleaseInfo }>;
}

export interface Project {
  id: string;
  name: string;
  platform: 'android' | 'ios' | 'both';
  githubRepo?: string;
  branch?: string;
  apiKey: string;
  webhookUrl?: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
}

export interface BuildLogEntry {
  id: string;
  projectId: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  commitHash?: string;
  commitMessage?: string;
  author?: string;
}

