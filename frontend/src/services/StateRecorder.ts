/**
 * Hermes VM Time-Travel State Recorder
 * Zero-overhead deterministic circular ring buffer (FIFO) tracking the last 50
 * state mutations, navigation transitions, and interaction breadcrumbs.
 */

export interface ReplayFrame {
  index: number;
  timestamp: string;
  timeOffsetMs: number;
  type: 'action' | 'navigation' | 'network' | 'crash';
  name: string;
  payload?: any;
  route?: string;
  stateSnapshot?: Record<string, any>;
}

class StateRecorderEngine {
  private bufferSize = 50;
  private ringBuffer: ReplayFrame[] = [];
  private frameCounter = 0;
  private startTime = Date.now();
  private currentRoute = 'HomeScreen';
  private currentState: Record<string, any> = {};

  constructor() {
    this.record('navigation', 'ROUTE_INIT', { screen: 'HomeScreen' });
  }

  record(type: 'action' | 'navigation' | 'network' | 'crash', name: string, payload?: any) {
    this.frameCounter++;
    const now = Date.now();

    if (type === 'navigation' && payload?.screen) {
      this.currentRoute = payload.screen;
    }

    if (type === 'action' && payload) {
      this.currentState = { ...this.currentState, ...payload };
    }

    const frame: ReplayFrame = {
      index: this.frameCounter,
      timestamp: new Date(now).toISOString(),
      timeOffsetMs: now - this.startTime,
      type,
      name,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      route: this.currentRoute,
      stateSnapshot: { ...this.currentState },
    };

    this.ringBuffer.push(frame);
    if (this.ringBuffer.length > this.bufferSize) {
      this.ringBuffer.shift();
    }
  }

  recordAction(actionName: string, stateDelta?: Record<string, any>) {
    this.record('action', actionName, stateDelta);
  }

  recordNavigation(screenName: string, params?: Record<string, any>) {
    this.record('navigation', `NAVIGATE_TO_${screenName}`, { screen: screenName, params });
  }

  recordNetwork(endpoint: string, status: number, durationMs: number) {
    this.record('network', `HTTP_${status}`, { endpoint, durationMs });
  }

  /**
   * Export the recorded ring buffer as a compact JSON replay dump
   */
  exportReplayDump(crashError?: string): ReplayFrame[] {
    if (crashError) {
      this.record('crash', 'FATAL_EXCEPTION_THROWN', { error: crashError });
    }
    return [...this.ringBuffer];
  }

  /**
   * Recursively scrubs PII values while preserving exact object keys, arrays, and primitive types.
   */
  private scrubStateShape(value: any): any {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) {
      return value.length > 0 ? [this.scrubStateShape(value[0])] : [];
    }
    if (typeof value === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = this.scrubStateShape(v);
      }
      return out;
    }
    if (typeof value === 'string') return 'anonymized_str';
    if (typeof value === 'number') return 1;
    if (typeof value === 'boolean') return true;
    return null;
  }

  /**
   * Returns anonymized persisted-state snapshots for Shadow-Boot Pre-Flight testing.
   * Falls back to realistic baseline snapshots if no runtime state has been recorded yet.
   */
  exportAnonymizedSchemaSnapshots(): Array<{ label: string; state: Record<string, any> }> {
    const liveFrames = this.ringBuffer.filter(
      (f) => f.stateSnapshot && Object.keys(f.stateSnapshot).length > 0
    );

    const snapshots: Array<{ label: string; state: Record<string, any> }> = [];
    if (liveFrames.length > 0) {
      const latest = liveFrames[liveFrames.length - 1];
      snapshots.push({
        label: `live_session_${latest.route || 'HomeScreen'}`,
        state: this.scrubStateShape(latest.stateSnapshot),
      });
    }

    return [...snapshots, ...this.getDefaultSeedSnapshots()];
  }

  getDefaultSeedSnapshots(): Array<{ label: string; state: Record<string, any> }> {
    return [
      {
        label: 'v1_legacy_user_state',
        state: {
          user: { id: 'usr_anon', name: 'anonymized_str', isLoggedIn: true },
          cart: { items: [{ id: 1, qty: 1 }], currency: 'USD' },
          preferences: { darkMode: true, notifications: true },
        },
      },
      {
        label: 'v1_empty_fresh_install',
        state: {},
      },
      {
        label: 'v1_offline_cached_session',
        state: {
          user: { id: 'usr_anon', name: 'anonymized_str', isLoggedIn: false },
          cart: { items: [] },
          offlineQueue: [{ action: 'SYNC_PROFILE', retries: 0 }],
        },
      },
    ];
  }

  clear() {
    this.ringBuffer = [];
    this.frameCounter = 0;
    this.currentState = {};
  }
}

export const StateRecorder = new StateRecorderEngine();
export default StateRecorder;

