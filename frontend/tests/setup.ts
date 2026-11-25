import '@testing-library/jest-dom/vitest';
import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import nodeCrypto from 'node:crypto';

// Ensure Web Crypto API (including subtle) is available in jsdom
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: nodeCrypto.webcrypto,
    configurable: true,
  });
}

if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.subtle)) {
  Object.defineProperty(window, 'crypto', {
    value: nodeCrypto.webcrypto,
    configurable: true,
  });
}

// Mock window.matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock ResizeObserver
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock IntersectionObserver
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

// Mock Firebase config & modules globally so UI/unit tests never hit live Firebase
vi.mock('../db/firebaseConfig', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(() => () => {}),
    signOut: vi.fn(),
  },
  db: {},
  storage: {},
  default: {},
}));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

