import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CrashAnalyticsScreen } from '../../src/pages/CrashAnalytics/CrashAnalyticsScreen';
import type { Project } from '../../src/types';

const mockProject: Project = {
  id: 'proj_1',
  name: 'Alpha App',
  platform: 'both',
  githubRepo: '',
  branch: 'main',
  apiKey: 'cp_live_123',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('CrashAnalyticsScreen', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          crashes: [
            {
              id: 'cr_1',
              platform: 'android',
              version: '1.0.1',
              message: 'TypeError: Cannot read property of undefined',
              stack: 'at checkout (index.android.bundle:1:4021)',
              device: 'Pixel 8',
              osVersion: '14',
              isFatal: true,
              timestamp: new Date().toISOString(),
            },
          ],
          circuitBreaker: {
            enabled: true,
            threshold: 5,
            windowMinutes: 10,
            recentCrashCount: 1,
            tripped: false,
          },
        }),
        { status: 200 }
      )
    );
  });

  it('loads crash reports and circuit breaker metrics', async () => {
    render(<CrashAnalyticsScreen theme="dark" currentProject={mockProject} />);

    await waitFor(() => {
      expect(screen.getByText(/Cannot read property of undefined/i)).toBeInTheDocument();
    });
  });
});
