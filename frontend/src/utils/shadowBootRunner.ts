/**
 * Shadow-Boot Pre-Flight Simulator
 *
 * Executes a candidate OTA JS bundle inside an isolated sandbox with mocked
 * React Native bridges and replays anonymized persisted-state snapshots
 * BEFORE the bundle is published to production devices.
 */

import JSZip from 'jszip';
import type { ShadowBootError, ShadowBootReport } from '../types';
import { StateRecorder } from '../services/StateRecorder';

export interface ShadowStateSnapshot {
  label: string;
  state: Record<string, any>;
}

const SHADOW_TIMEOUT_MS = 2000;

/**
 * Extracts executable JS source from a .js/.bundle file or .zip archive.
 * Returns null if the artifact is compiled Hermes bytecode (.hbc) with no JS source.
 */
export async function extractBundleSourceForShadowBoot(file: File): Promise<{
  code: string | null;
  isHermesBinary: boolean;
}> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.zip')) {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const entryName = Object.keys(zip.files).find(
      (name) => !zip.files[name].dir && (name.endsWith('.bundle') || name.endsWith('.js'))
    );
    if (!entryName) return { code: null, isHermesBinary: false };
    const bytes = new Uint8Array(await zip.files[entryName].async('arraybuffer'));
    if (bytes.length >= 4 && bytes[0] === 0x1f && bytes[1] === 0x55 && bytes[2] === 0xc0 && bytes[3] === 0xde) {
      return { code: null, isHermesBinary: true };
    }
    return { code: new TextDecoder().decode(bytes), isHermesBinary: false };
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 4 && bytes[0] === 0x1f && bytes[1] === 0x55 && bytes[2] === 0xc0 && bytes[3] === 0xde) {
    return { code: null, isHermesBinary: true };
  }
  return { code: new TextDecoder().decode(bytes), isHermesBinary: false };
}

function buildSandboxEnv(snapshotState: Record<string, any>) {
  let bridgeCalls = 0;

  const trackBridge = <T extends (...args: any[]) => any>(fn: T) => {
    return (...args: Parameters<T>): ReturnType<T> => {
      bridgeCalls++;
      return fn(...args);
    };
  };

  const storageMap = new Map<string, string>();
  if (snapshotState && typeof snapshotState === 'object') {
    storageMap.set('persist:root', JSON.stringify(snapshotState));
    for (const [k, v] of Object.entries(snapshotState)) {
      storageMap.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }

  const nativeModulesProxy = new Proxy(
    {
      PlatformConstants: { OS: 'android', Version: 33 },
      AsyncLocalStorage: {
        getItem: trackBridge((k: string) => Promise.resolve(storageMap.get(k) ?? null)),
        setItem: trackBridge((k: string, v: string) => {
          storageMap.set(k, v);
          return Promise.resolve();
        }),
      },
      RNDeviceInfo: { getUniqueId: trackBridge(() => 'shadow-sim-device') },
      NativeAnimatedModule: { startOperationBatch: trackBridge(() => {}) },
    },
    {
      get(target: Record<string, any>, prop: string) {
        bridgeCalls++;
        if (prop in target) return target[prop];
        return new Proxy({}, { get: () => trackBridge(() => undefined) });
      },
    }
  );

  const env = {
    __DEV__: false,
    __CODEPUSH_SHADOW_STATE__: snapshotState,
    Platform: { OS: 'android', Version: 33, select: (obj: any) => obj.android ?? obj.default },
    NativeModules: nativeModulesProxy,
    TurboModuleRegistry: {
      get: trackBridge((name: string) => (nativeModulesProxy as any)[name] ?? null),
      getEnforcing: trackBridge((name: string) => (nativeModulesProxy as any)[name]),
    },
    AsyncStorage: {
      getItem: trackBridge((k: string) => Promise.resolve(storageMap.get(k) ?? null)),
      getItemSync: trackBridge((k: string) => storageMap.get(k) ?? null),
      setItem: trackBridge((k: string, v: string) => {
        storageMap.set(k, v);
        return Promise.resolve();
      }),
    },
    __fbBatchedBridge: {
      callFunctionReturnFlushedQueue: trackBridge(() => null),
      registerCallableModule: trackBridge(() => {}),
    },
    console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {} },
  };

  return { env, getBridgeCalls: () => bridgeCalls };
}

function executeInScopedSandbox(
  bundleCode: string,
  snapshot: ShadowStateSnapshot
): { error: ShadowBootError | null; bridgeCalls: number } {
  const { env, getBridgeCalls } = buildSandboxEnv(snapshot.state);
  try {
    const runner = new Function(
      'globalThis',
      'global',
      '__DEV__',
      '__CODEPUSH_SHADOW_STATE__',
      'Platform',
      'NativeModules',
      'TurboModuleRegistry',
      'AsyncStorage',
      '__fbBatchedBridge',
      'console',
      `"use strict";\n${bundleCode}`
    );
    runner(
      env,
      env,
      env.__DEV__,
      env.__CODEPUSH_SHADOW_STATE__,
      env.Platform,
      env.NativeModules,
      env.TurboModuleRegistry,
      env.AsyncStorage,
      env.__fbBatchedBridge,
      env.console
    );
    return { error: null, bridgeCalls: getBridgeCalls() };
  } catch (err: any) {
    return {
      error: {
        snapshotLabel: snapshot.label,
        message: err?.message || String(err),
        stack: err?.stack ? String(err.stack).split('\n').slice(0, 4).join('\n') : undefined,
      },
      bridgeCalls: getBridgeCalls(),
    };
  }
}

function executeInWebWorker(
  bundleCode: string,
  snapshots: ShadowStateSnapshot[]
): Promise<ShadowBootReport> {
  return new Promise((resolve) => {
    const start = performance.now();
    const workerScript = `
      self.onmessage = function(e) {
        const { bundleCode, snapshots } = e.data;
        const errors = [];
        let bridgeCallsVerified = 0;
        for (const snap of snapshots) {
          let calls = 0;
          const storage = new Map();
          if (snap.state && typeof snap.state === 'object') {
            storage.set('persist:root', JSON.stringify(snap.state));
            for (const [k, v] of Object.entries(snap.state)) {
              storage.set(k, typeof v === 'string' ? v : JSON.stringify(v));
            }
          }
          const AsyncStorage = {
            getItem: (k) => { calls++; return Promise.resolve(storage.get(k) ?? null); },
            getItemSync: (k) => { calls++; return storage.get(k) ?? null; },
            setItem: (k, v) => { calls++; storage.set(k, v); return Promise.resolve(); },
          };
          const NativeModules = new Proxy({ PlatformConstants: { OS: 'android', Version: 33 } }, {
            get(t, p) { calls++; return p in t ? t[p] : {}; }
          });
          const TurboModuleRegistry = {
            get: (n) => { calls++; return NativeModules[n] || null; },
            getEnforcing: (n) => { calls++; return NativeModules[n]; },
          };
          const Platform = { OS: 'android', Version: 33, select: (o) => o.android ?? o.default };
          try {
            const fn = new Function('__CODEPUSH_SHADOW_STATE__', 'AsyncStorage', 'NativeModules', 'TurboModuleRegistry', 'Platform', '"use strict";\\n' + bundleCode);
            fn(snap.state, AsyncStorage, NativeModules, TurboModuleRegistry, Platform);
          } catch (err) {
            errors.push({
              snapshotLabel: snap.label,
              message: err && err.message ? err.message : String(err),
              stack: err && err.stack ? String(err.stack).split('\\n').slice(0, 4).join('\\n') : undefined
            });
          }
          bridgeCallsVerified += calls;
        }
        self.postMessage({ errors, bridgeCallsVerified });
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({
        passed: false,
        snapshotsTested: snapshots.length,
        executionTimeMs: Math.round(performance.now() - start),
        bridgeCallsVerified: 0,
        errors: [
          {
            snapshotLabel: 'timeout_guard',
            message: `Shadow-Boot execution exceeded ${SHADOW_TIMEOUT_MS}ms budget (possible infinite render/hydration loop).`,
          },
        ],
        testedAt: new Date().toISOString(),
      });
    }, SHADOW_TIMEOUT_MS);

    worker.onmessage = (ev) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      const { errors, bridgeCallsVerified } = ev.data;
      resolve({
        passed: errors.length === 0,
        snapshotsTested: snapshots.length,
        executionTimeMs: Math.max(1, Math.round(performance.now() - start)),
        bridgeCallsVerified,
        errors,
        testedAt: new Date().toISOString(),
      });
    };

    worker.onerror = (ev) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({
        passed: false,
        snapshotsTested: snapshots.length,
        executionTimeMs: Math.max(1, Math.round(performance.now() - start)),
        bridgeCallsVerified: 0,
        errors: [{ snapshotLabel: 'worker_boot', message: ev.message || 'Shadow worker error' }],
        testedAt: new Date().toISOString(),
      });
    };

    worker.postMessage({ bundleCode, snapshots });
  });
}

/**
 * Runs the Shadow-Boot Pre-Flight Simulation against anonymized persisted-state snapshots.
 */
export async function runShadowBootSimulation(
  bundleCode: string,
  customSnapshots?: ShadowStateSnapshot[]
): Promise<ShadowBootReport> {
  const snapshots =
    customSnapshots && customSnapshots.length > 0
      ? customSnapshots
      : StateRecorder.exportAnonymizedSchemaSnapshots();

  const canUseWorker =
    typeof Worker !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function';

  if (canUseWorker) {
    return executeInWebWorker(bundleCode, snapshots);
  }

  const start = performance.now();
  const errors: ShadowBootError[] = [];
  let bridgeCallsVerified = 0;

  for (const snap of snapshots) {
    const res = executeInScopedSandbox(bundleCode, snap);
    bridgeCallsVerified += res.bridgeCalls;
    if (res.error) errors.push(res.error);
  }

  return {
    passed: errors.length === 0,
    snapshotsTested: snapshots.length,
    executionTimeMs: Math.max(1, Math.round(performance.now() - start)),
    bridgeCallsVerified,
    errors,
    testedAt: new Date().toISOString(),
  };
}
