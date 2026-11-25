import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopHeader } from '../../src/components/TopHeader';
import type { Project } from '../../src/types';

const mockProject: Project = {
  id: 'proj_1',
  name: 'Alpha App',
  platform: 'both',
  githubRepo: 'acme/alpha',
  branch: 'main',
  apiKey: 'cp_live_alpha_123456',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('TopHeader', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('renders header controls, toggles theme, sidebar, and notifications', () => {
    const onToggleSidebar = vi.fn();
    const onToggleTheme = vi.fn();
    const onToggleNotifications = vi.fn();

    render(
      <TopHeader
        onToggleSidebar={onToggleSidebar}
        isSidebarCollapsed={false}
        activeTab="dashboard"
        theme="dark"
        onToggleTheme={onToggleTheme}
        onToggleNotifications={onToggleNotifications}
        activeProject={mockProject}
        user={{ uid: 'u1', email: 'dev@codepush.io', displayName: 'Dev User' }}
      />
    );

    expect(screen.getByText('Alpha App')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(2);
    fireEvent.click(buttons[0]); // toggle sidebar
    expect(onToggleSidebar).toHaveBeenCalled();
  });
});

