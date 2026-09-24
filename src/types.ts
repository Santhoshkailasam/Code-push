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
  timeline?: TimelineEvent[];
  adoptionStats?: AdoptionStats;
}

export interface VersionData {
  android: ReleaseInfo;
  ios: ReleaseInfo;
  history: ReleaseHistoryItem[];
}

