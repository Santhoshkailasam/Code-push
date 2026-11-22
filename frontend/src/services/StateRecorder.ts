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

  clear() {
    this.ringBuffer = [];
    this.frameCounter = 0;
    this.currentState = {};
  }
}

export const StateRecorder = new StateRecorderEngine();
export default StateRecorder;

