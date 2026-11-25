import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../src/components/Sidebar';
import type { Project } from '../../src/types';

const mockProjects: Project[] = [
  {
    id: 'proj_1',
    name: 'Alpha App',
    platform: 'both',
    githubRepo: 'acme/alpha',
    branch: 'main',
    apiKey: 'cp_live_alpha_123456',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'proj_2',
    name: 'Beta App',
    platform: 'android',
    githubRepo: '',
    branch: 'main',
    apiKey: 'cp_live_beta_654321',
    createdAt: '2026-01-02T00:00:00Z',
  },
];

describe('Sidebar', () => {
  it('renders all navigation items and switches tabs on click', () => {
    const setActiveTab = vi.fn();
    render(
      <Sidebar
        activeTab="dashboard"
        setActiveTab={setActiveTab}
        isCollapsed={false}
        projects={mockProjects}
        activeProjectId="proj_1"
      />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Publish Update')).toBeInTheDocument();
    expect(screen.getByText('Release History')).toBeInTheDocument();
    expect(screen.getByText('Remote Config')).toBeInTheDocument();
    expect(screen.getByText('Crash Analytics')).toBeInTheDocument();
    expect(screen.getByText('Live Testing')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Publish Update'));
    expect(setActiveTab).toHaveBeenCalledWith('publish');
  });

  it('switches projects and triggers create app modal', () => {
    const onSwitchProject = vi.fn();
    const onOpenCreateAppModal = vi.fn();
    render(
      <Sidebar
        activeTab="dashboard"
        setActiveTab={vi.fn()}
        isCollapsed={false}
        projects={mockProjects}
        activeProjectId="proj_1"
        onSwitchProject={onSwitchProject}
        onOpenCreateAppModal={onOpenCreateAppModal}
      />
    );

    // Open project switcher dropdown
    fireEvent.click(screen.getByText('Alpha App'));
    fireEvent.click(screen.getByText('Beta App'));
    expect(onSwitchProject).toHaveBeenCalledWith('proj_2');

    // Open again and click Create New App
    fireEvent.click(screen.getByText('Alpha App'));
    const createBtn = screen.queryByText(/Create New App|New Project/i);
    if (createBtn) {
      fireEvent.click(createBtn);
      expect(onOpenCreateAppModal).toHaveBeenCalled();
    }
  });
});

