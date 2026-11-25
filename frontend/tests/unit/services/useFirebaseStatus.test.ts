import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFirebaseStatus } from '../../../src/hooks/useFirebaseStatus';

describe('useFirebaseStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('reports live status when both PostgreSQL and Firebase endpoints succeed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { result } = renderHook(() => useFirebaseStatus());
    await waitFor(() => {
      expect(result.current.isLive).toBe(true);
      expect(result.current.status).toBe('live');
      expect(result.current.postgres).toBe(true);
      expect(result.current.firebase).toBe(true);
    });
  });

  it('reports offline status when browser goes offline', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const { result } = renderHook(() => useFirebaseStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isLive).toBe(false);
    expect(result.current.status).toBe('offline');
    expect(result.current.postgres).toBe(false);
    expect(result.current.firebase).toBe(false);
  });

  it('reports offline when postgres health endpoint fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));

    const { result } = renderHook(() => useFirebaseStatus());
    await waitFor(() => {
      expect(result.current.postgres).toBe(false);
      expect(result.current.isLive).toBe(false);
    });
  });
});

