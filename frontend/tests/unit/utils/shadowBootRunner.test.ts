import { describe, it, expect, beforeEach } from 'vitest';
import { runShadowBootSimulation } from '../../../src/utils/shadowBootRunner';
import { StateRecorder } from '../../../src/services/StateRecorder';

describe('shadowBootRunner', () => {
  beforeEach(() => {
    StateRecorder.clear();
  });

  it('passes when bundle safely hydrates across all state snapshots and verifies bridge calls', async () => {
    const safeBundle = `
      const state = __CODEPUSH_SHADOW_STATE__ || {};
      const name = state.user && state.user.name ? state.user.name : 'Guest';
      AsyncStorage.getItem('persist:root');
      TurboModuleRegistry.get('PlatformConstants');
      if (typeof name !== 'string') throw new Error('Invalid name');
    `;

    const report = await runShadowBootSimulation(safeBundle);
    expect(report.passed).toBe(true);
    expect(report.snapshotsTested).toBeGreaterThanOrEqual(3);
    expect(report.bridgeCallsVerified).toBeGreaterThan(0);
    expect(report.errors).toHaveLength(0);
  });

  it('catches legacy persisted-state hydration crashes while fresh install passes', async () => {
    const buggyBundle = `
      const state = __CODEPUSH_SHADOW_STATE__ || {};
      if (state.user) {
        // Expects nested .profile which does not exist in v1_legacy_user_state!
        const firstName = state.user.profile.firstName;
        if (!firstName) throw new Error('Missing firstName');
      }
    `;

    const report = await runShadowBootSimulation(buggyBundle);
    expect(report.passed).toBe(false);
    expect(report.errors.length).toBeGreaterThanOrEqual(1);
    expect(report.errors[0].snapshotLabel).toBe('v1_legacy_user_state');
    expect(report.errors[0].message).toContain('firstName');
  });

  it('scrubs PII in StateRecorder.exportAnonymizedSchemaSnapshots()', () => {
    StateRecorder.recordAction('LOGIN_SUCCESS', {
      user: { email: 'secret@example.com', age: 29, isAdmin: false },
    });

    const snapshots = StateRecorder.exportAnonymizedSchemaSnapshots();
    const live = snapshots.find((s) => s.label.startsWith('live_session_'));
    expect(live).toBeDefined();
    expect(live?.state.user.email).toBe('anonymized_str');
    expect(live?.state.user.age).toBe(1);
    expect(live?.state.user.isAdmin).toBe(true);
  });
});
