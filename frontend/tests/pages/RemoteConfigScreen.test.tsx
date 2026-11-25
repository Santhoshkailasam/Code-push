import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RemoteConfigScreen } from '../../src/pages/RemoteConfig/RemoteConfigScreen';
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

describe('RemoteConfigScreen', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          config: [
            { key: 'enable_new_checkout', value: true, type: 'boolean', description: 'New checkout flow' },
          ],
        }),
        { status: 200 }
      )
    );
  });

  it('loads and displays remote config feature flags from backend', async () => {
    render(<RemoteConfigScreen theme="dark" currentProject={mockProject} />);

    await waitFor(() => {
      expect(screen.getByText('enable_new_checkout')).toBeInTheDocument();
    });
  });
});

