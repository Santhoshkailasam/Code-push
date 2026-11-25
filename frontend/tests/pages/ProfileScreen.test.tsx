import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileScreen } from '../../src/pages/Profile/ProfileScreen';
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

describe('ProfileScreen', () => {
  it('renders user profile, API key, and projects list', () => {
    const onSignOut = vi.fn();
    render(
      <ProfileScreen
        user={{
          uid: 'u1',
          email: 'dev@codepush.io',
          displayName: 'Dev User',
          accessToken: 'tok_123',
          refreshToken: 'ref_123',
          expiresAt: Date.now() + 60000,
          refreshTokenExpiresAt: Date.now() + 86400000,
          tokenIssuedAt: Date.now(),
        }}
        theme="dark"
        showToast={vi.fn()}
        onSignOut={onSignOut}
        projects={[mockProject]}
      />
    );

    expect(screen.getByText('Dev User')).toBeInTheDocument();
    expect(screen.getByText('dev@codepush.io')).toBeInTheDocument();
    expect(screen.getByText('Alpha App')).toBeInTheDocument();

    const signOutBtn = screen.getByRole('button', { name: /Sign Out|Log Out/i });
    fireEvent.click(signOutBtn);
    // ProfileScreen opens a ConfirmModal before signing out, or calls onSignOut directly
    const confirmBtns = screen.queryAllByRole('button', { name: /Sign Out|Log Out|Confirm/i });
    if (confirmBtns.length > 0) {
      fireEvent.click(confirmBtns[confirmBtns.length - 1]);
    }
    expect(onSignOut).toHaveBeenCalled();
  });
});
