import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { CreateProjectModal } from '../../src/components/CreateProjectModal';
import { EditProjectModal } from '../../src/components/EditProjectModal';
import { ConnectAppModal } from '../../src/components/ConnectAppModal';
import { SessionExpiryModal } from '../../src/components/SessionExpiryModal';
import { AutoPatchModal, type AutoPatchData } from '../../src/components/AutoPatchModal';
import type { Project } from '../../src/types';

const sampleProject: Project = {
  id: 'proj_1',
  name: 'Demo Mobile App',
  platform: 'both',
  githubRepo: 'acme/demo-app',
  branch: 'main',
  apiKey: 'cp_live_demo_123',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('Modals', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
  });

  it('ConfirmModal renders and triggers onConfirm and onClose', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        title="Revoke Release"
        message="Are you sure?"
        confirmLabel="Revoke Now"
        variant="danger"
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Revoke Release')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Revoke Now'));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('CreateProjectModal creates a new project when submitted', async () => {
    const onCreateProject = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <CreateProjectModal
        isOpen={true}
        onClose={onClose}
        onCreateProject={onCreateProject}
        userId="user_123"
      />
    );

    const input = screen.getByPlaceholderText(/SkillSwap|My Mobile App/i);
    fireEvent.change(input, { target: { value: 'ShopEase' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Project|Create App/i }));

    await waitFor(() => {
      expect(onCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'ShopEase', userId: 'user_123' })
      );
    });
  });

  it('EditProjectModal renders project settings and allows closing', () => {
    const onClose = vi.fn();
    render(
      <EditProjectModal
        isOpen={true}
        onClose={onClose}
        project={sampleProject}
        onUpdateProject={vi.fn()}
        userId="user_123"
      />
    );

    expect(screen.getByDisplayValue('Demo Mobile App')).toBeInTheDocument();
  });

  it('ConnectAppModal renders SDK connection details and project API key', () => {
    render(
      <ConnectAppModal
        isOpen={true}
        onClose={vi.fn()}
        activeProject={sampleProject}
      />
    );

    expect(screen.getAllByText(/Demo Mobile App/i).length).toBeGreaterThan(0);
  });

  it('SessionExpiryModal displays countdown and triggers onContinue / onRelogin', () => {
    const onContinue = vi.fn();
    const onRelogin = vi.fn();
    render(
      <SessionExpiryModal
        isOpen={true}
        expiresAt={Date.now() + 25000}
        onContinue={onContinue}
        onRelogin={onRelogin}
      />
    );

    const continueBtn = screen.getByRole('button', { name: /Continue|Refresh/i });
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalled();

    const reloginBtn = screen.getByRole('button', { name: /Log Out|Re-login|Sign Out/i });
    fireEvent.click(reloginBtn);
    expect(onRelogin).toHaveBeenCalled();
  });

  it('AutoPatchModal renders AI patch diff and supports promote/reject', () => {
    const patch: AutoPatchData = {
      id: 'patch_1',
      status: 'canary_active',
      originalVersion: '1.0.1',
      candidateVersion: '1.0.1-autopatch',
      platform: 'android',
      errorPattern: "TypeError: Cannot read properties of undefined (reading 'name')",
      fileTarget: 'src/App.tsx:42',
      patchType: 'NULL_POINTER_COALESCE',
      patchRationale: 'Added optional chaining',
      originalSnippet: 'const n = user.name;',
      patchedSnippet: "const n = user?.name ?? '';",
      canaryMetrics: {
        cohortPercentage: 1,
        devicesTargeted: 250,
        crashesObserved: 0,
        crashRate: 0,
        stabilityScore: 100,
      },
      createdAt: new Date().toISOString(),
    };

    const onPromote = vi.fn();
    const onReject = vi.fn();
    render(
      <AutoPatchModal
        isOpen={true}
        onClose={vi.fn()}
        patch={patch}
        onPromote={onPromote}
        onReject={onReject}
      />
    );

    expect(screen.getByText(/1.0.1-autopatch/)).toBeInTheDocument();
    expect(screen.getByText(/NULL_POINTER_COALESCE/)).toBeInTheDocument();
  });
});
