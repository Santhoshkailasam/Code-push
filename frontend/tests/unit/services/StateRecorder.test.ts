import { describe, it, expect, beforeEach } from 'vitest';
import { StateRecorder } from '../../../src/services/StateRecorder';

describe('StateRecorder', () => {
  beforeEach(() => {
    StateRecorder.clear();
  });

  it('records navigation, actions, network calls, and crash replay dumps', () => {
    StateRecorder.recordNavigation('CheckoutScreen', { cartId: 'c_1' });
    StateRecorder.recordAction('ADD_ITEM', { itemCount: 2 });
    StateRecorder.recordNetwork('/api/pay', 200, 42);

    const dump = StateRecorder.exportReplayDump('TypeError: undefined is not an object');
    expect(dump).toHaveLength(4);
    expect(dump[0].type).toBe('navigation');
    expect(dump[0].route).toBe('CheckoutScreen');
    expect(dump[1].stateSnapshot).toEqual({ itemCount: 2 });
    expect(dump[2].type).toBe('network');
    expect(dump[3].type).toBe('crash');
    expect(dump[3].payload.error).toContain('TypeError');
  });

  it('enforces circular FIFO ring buffer limit of 50 frames', () => {
    for (let i = 1; i <= 65; i++) {
      StateRecorder.recordAction(`ACTION_${i}`, { step: i });
    }
    const dump = StateRecorder.exportReplayDump();
    expect(dump).toHaveLength(50);
    expect(dump[0].name).toBe('ACTION_16');
    expect(dump[49].name).toBe('ACTION_65');
  });
});

