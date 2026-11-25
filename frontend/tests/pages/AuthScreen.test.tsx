import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthScreen } from '../../src/pages/Auth/AuthScreen';

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  updateProfile: vi.fn(),
  fetchSignInMethodsForEmail: vi.fn(),
  GoogleAuthProvider: class {},
}));

vi.mock('../../../db/firebaseConfig', () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign-in form and toggles between Sign In and Create Account modes', () => {
    render(<AuthScreen onAuthSuccess={vi.fn()} theme="dark" />);

    expect(screen.getByText(/Instant Mobile OTA/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument();

    const signUpToggle = screen.getByRole('button', { name: /Sign Up|Create Account/i });
    fireEvent.click(signUpToggle);
    expect(screen.getAllByText(/Create Account|Sign Up/i).length).toBeGreaterThan(0);
  });

  it('toggles theme when theme button is clicked', () => {
    const onToggleTheme = vi.fn();
    render(<AuthScreen onAuthSuccess={vi.fn()} theme="dark" onToggleTheme={onToggleTheme} />);

    const themeBtn = screen.getByTitle(/Switch to|Theme|Light|Dark/i) || screen.getAllByRole('button')[0];
    fireEvent.click(themeBtn);
    expect(onToggleTheme).toHaveBeenCalled();
  });
});
