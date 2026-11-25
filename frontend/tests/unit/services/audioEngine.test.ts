import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAudioContext, playAlertChime, playNotificationTone } from '../../../src/pages/TestingConsole/audioEngine';

describe('audioEngine', () => {
  const mockOsc = {
    type: 'sine',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const mockGain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  const mockCtx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => ({ ...mockOsc })),
    createGain: vi.fn(() => ({ ...mockGain })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).AudioContext = class MockAudioContext {
      state = mockCtx.state;
      currentTime = mockCtx.currentTime;
      destination = mockCtx.destination;
      resume = mockCtx.resume;
      createOscillator = mockCtx.createOscillator;
      createGain = mockCtx.createGain;
    };
  });

  it('initializes AudioContext and plays alert chime', async () => {
    const ctx = await getAudioContext();
    expect(ctx).toBeTruthy();

    await playAlertChime();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
    expect(mockCtx.createGain).toHaveBeenCalled();
  });

  it('plays notification tone and skips when toneId is "silent"', async () => {
    await playNotificationTone('silent');
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();

    await playNotificationTone('crystal_glass');
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
  });
});
