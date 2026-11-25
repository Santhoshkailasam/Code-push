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

export interface CanarySchedule {
  enabled: boolean;
  stages: number[]; // e.g. [5, 25, 50, 100]
  intervalMinutes: number; // minutes elapsed before advancing to next percentage
  currentStageIndex: number;
  startedAt?: string;
  lastAdvancedAt?: string;
  autoHaltOnSpike?: boolean;
}

export interface TargetingRules {
  targetRegions?: string[]; // e.g. ['US', 'IN', 'GB', 'DE', 'BR', 'JP']
  minOSVersion?: string; // e.g. '12.0' or '16.0'
  targetCohort?: 'all' | 'internal_qa' | 'beta_testers' | 'general_public';
  customTag?: string;
  network?: 'any' | 'wifi_only';
  minBattery?: number; // e.g. 20 (percent)
  allowedBrands?: string[]; // e.g. ['Samsung', 'Google', 'OnePlus']
}

export interface ExperimentVariant {
  label: string;
  version: string;
  hash: string;
  downloadUrl?: string;
  visitors: number;
  conversions: number;
}

export interface ExperimentConfig {
  enabled: boolean;
  name: string;
  goalMetric: string; // e.g. 'checkout_conversion', 'onboarding_completion'
  splitPercentage: number; // e.g. 50 (50% Variant A, 50% Variant B)
  variantA: ExperimentVariant;
  variantB: ExperimentVariant;
  winner?: 'variant_a' | 'variant_b' | null;
  startedAt: string;
}

export interface DualSlotStatus {
  activeSlot: 'slot_a' | 'slot_b';
  slotAVersion: string;
  slotBVersion?: string;
  lastSuccessfulSwapAt?: string;
  watchdogRecoveryCount: number;
  quarantinedHashes: string[];
}

export interface QuarantinedCohort {
  id: string;
  osVersion?: string;
  ramTier?: 'low' | 'mid' | 'high';
  abi?: string;
  manufacturer?: string;
  reason: string;
  crashCount: number;
  quarantinedAt: string;
  autoQuarantined: boolean;
}

export interface ShadowBootError {
  snapshotLabel: string;
  message: string;
  stack?: string;
}

export interface ShadowBootReport {
  passed: boolean;
  snapshotsTested: number;
  executionTimeMs: number;
  bridgeCallsVerified: number;
  errors: ShadowBootError[];
  testedAt: string;
}

export interface AIGuardianReport {
  incidentId: string;
  severity: 'low' | 'medium' | 'critical';
  rootCause: string;
  recommendedAction: string;
  crashSample: string;
  affectedComponents: string[];
  autoMitigated: boolean;
  timestamp: string;
}

export interface DeltaUpdateInfo {
  available: boolean;
  baseHash?: string;
  deltaHash?: string;
  deltaSizeBytes?: number;
  deltaDownloadUrl?: string;
  compressionRatio?: string; // e.g. "94% smaller (180 KB vs 24 MB)"
}

export interface AssetManifest {
  imageCount: number;
  fontCount: number;
  localeCount: number;
  locales: string[];
  totalAssetBytes: number;
}

export interface GeoDistribution {
  countryCode: string;
  countryName: string;
  activeDevices: number;
  percentage: number;
  crashes: number;
}

export interface ReleaseInfo {
  latestVersion: string;
  minAppVersion: string;
  targetBinaryVersion?: string;
  track?: 'production' | 'staging';
  rolloutPercentage?: number;
  canarySchedule?: CanarySchedule;
  targetingRules?: TargetingRules;
  deltaUpdate?: DeltaUpdateInfo;
  assetManifest?: AssetManifest;
  revoked?: boolean;
  revokedAt?: string;
  autoRevoked?: boolean;
  revocationReason?: string;
  downloadUrl: string;
  mandatory: boolean;
  hash: string;
  releaseNotes: string;
  updatedAt: string;
  sizeBytes?: number;
  userId?: string;
  apiKey?: string;
  signature?: string;
  signatureAlgorithm?: 'ed25519' | 'sha256-hmac';
  driftStatus?: 'passed' | 'warning' | 'incompatible';
  detectedNativeModules?: string[];
  experiment?: ExperimentConfig;
  aiGuardianReport?: AIGuardianReport;
  dualSlotStatus?: DualSlotStatus;
  quarantinedCohorts?: QuarantinedCohort[];
  shadowBootReport?: ShadowBootReport;
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
  targetBinaryVersion?: string;
  track?: 'production' | 'staging';
  rolloutPercentage?: number;
  canarySchedule?: CanarySchedule;
  targetingRules?: TargetingRules;
  deltaUpdate?: DeltaUpdateInfo;
  assetManifest?: AssetManifest;
  revoked?: boolean;
  revokedAt?: string;
  autoRevoked?: boolean;
  revocationReason?: string;
  timeline?: TimelineEvent[];
  adoptionStats?: AdoptionStats;
  userId?: string;
  apiKey?: string;
  projectId?: string;
  signature?: string;
  signatureAlgorithm?: 'ed25519' | 'sha256-hmac';
  driftStatus?: 'passed' | 'warning' | 'incompatible';
  detectedNativeModules?: string[];
  experiment?: ExperimentConfig;
  aiGuardianReport?: AIGuardianReport;
  dualSlotStatus?: DualSlotStatus;
  quarantinedCohorts?: QuarantinedCohort[];
  shadowBootReport?: ShadowBootReport;
}

export interface VersionData {
  android: ReleaseInfo;
  ios: ReleaseInfo;
  history: ReleaseHistoryItem[];
  keys?: Record<string, { android?: ReleaseInfo; ios?: ReleaseInfo }>;
  users?: Record<string, { android?: ReleaseInfo; ios?: ReleaseInfo }>;
  remoteConfig?: Record<string, RemoteConfigEntry[]>;
  crashes?: Record<string, CrashReportItem[]>;
}

export interface RemoteConfigEntry {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  updatedAt: string;
}

export interface CrashReportItem {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  version: string;
  platform: Platform;
  device?: string;
  resolved?: boolean;
  projectId?: string;
  circuitBreakerTriggered?: boolean;
  symbolicated?: boolean;
  symbolicatedStack?: string;
}

export interface Project {
  id: string;
  name: string;
  platform: 'android' | 'ios' | 'both';
  githubRepo?: string;
  branch?: string;
  apiKey: string;
  webhookUrl?: string;
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  circuitBreakerEnabled?: boolean;
  circuitBreakerThreshold?: number;
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


