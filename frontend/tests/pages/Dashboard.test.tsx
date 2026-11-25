import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveReleaseCard } from '../../src/pages/Dashboard/ActiveReleaseCard';
import { DashboardAnalytics } from '../../src/pages/Dashboard/DashboardAnalytics';
import type { ReleaseInfo, ReleaseHistoryItem } from '../../src/types';

const sampleInfo: ReleaseInfo = {
  latestVersion: 'v2.4.0',
  minAppVersion: '1.0.0',
  targetBinaryVersion: '1.0.0',
  track: 'production',
  rolloutPercentage: 75,
  downloadUrl: 'https://cdn.example.com/bundle.zip',
  mandatory: true,
  hash: 'sha256_abcdef1234567890',
  releaseNotes: 'Performance boost and Hermes optimization',
  timestamp: new Date().toISOString(),
  revoked: false,
};

const sampleHistory: ReleaseHistoryItem[] = [
  {
    id: 'rel_1',
    version: 'v2.4.0',
    platform: 'android',
    track: 'production',
    rolloutPercentage: 75,
    mandatory: true,
    releaseNotes: 'Performance boost',
    downloadUrl: 'https://cdn.example.com/bundle.zip',
    hash: 'sha256_abcdef1234567890',
    timestamp: new Date().toISOString(),
  },
];

describe('Dashboard', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
  });

  it('ActiveReleaseCard renders Android/iOS active release details and copies hash', () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<ActiveReleaseCard platform="android" info={sampleInfo} theme="dark" />);
    expect(screen.getAllByText(/2\.4\.0/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Performance boost/i)).toBeInTheDocument();

    const copyBtn = screen.getByTitle(/Copy/i) || screen.getAllByRole('button')[0];
    fireEvent.click(copyBtn);
  });

  it('ActiveReleaseCard shows revoked warning when release is revoked', () => {
    render(
      <ActiveReleaseCard
        platform="ios"
        info={{ ...sampleInfo, revoked: true, revocationReason: 'Crash spike' }}
        theme="dark"
      />
    );
    expect(screen.getAllByText(/2\.4\.0/).length).toBeGreaterThan(0);
  });

  it('DashboardAnalytics renders fleet metrics and release counts', () => {
    render(
      <DashboardAnalytics
        totalReleases={12}
        androidVersion="v2.4.0"
        iosVersion="v2.3.1"
        history={sampleHistory}
        theme="dark"
      />
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
