import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { onAuthStateChanged } from 'firebase/auth';
import { App } from '../../src/App';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb(null);
    return () => {};
  }),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'tok_123',
    issuedAtTime: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 120000).toISOString(),
  }),
  signOut: vi.fn(),
  GoogleAuthProvider: class {},
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  updateProfile: vi.fn(),
  fetchSignInMethodsForEmail: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('renders AuthScreen when user is not authenticated', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Instant Mobile OTA/i)).toBeInTheDocument();
    });
  });

  it('renders authenticated Dashboard when cached session exists', async () => {
    vi.mocked(onAuthStateChanged).mockImplementationOnce((_auth, cb: any) => {
      cb({
        uid: 'u1',
        email: 'dev@codepush.io',
        displayName: 'Dev User',
        photoURL: null,
        refreshToken: 'ref_123',
      });
      return () => {};
    });

    localStorage.setItem(
      'codepush_cached_user',
      JSON.stringify({
        uid: 'u1',
        email: 'dev@codepush.io',
        displayName: 'Dev User',
        accessToken: 'tok_123',
        refreshToken: 'ref_123',
        expiresAt: Date.now() + 120000,
        refreshTokenExpiresAt: Date.now() + 86400000,
        tokenIssuedAt: Date.now(),
      })
    );

    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    });
  });
});
