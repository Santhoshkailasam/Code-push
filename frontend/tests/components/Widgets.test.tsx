import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationDrawer } from '../../src/components/NotificationDrawer';
import { MeshAnalyticsCard } from '../../src/components/MeshAnalyticsCard';
import { TimeTravelScrubber, generateDemoReplayFrames } from '../../src/components/TimeTravelScrubber';
import { FirebaseStatusIndicator } from '../../src/components/FirebaseStatusIndicator';
import {
  DashboardSkeleton,
  TableSkeleton,
  UploaderSkeleton,
  FullPageSkeleton,
} from '../../src/components/SkeletonLoader';

describe('Widgets & Indicators', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('NotificationDrawer renders release notifications when open', () => {
    render(
      <NotificationDrawer
        isOpen={true}
        onClose={vi.fn()}
        theme="dark"
        history={[
          {
            id: 'rel_1',
            version: 'v1.4.0',
            platform: 'android',
            track: 'production',
            rolloutPercentage: 100,
            mandatory: true,
            releaseNotes: 'Hotfix deployed',
            downloadUrl: 'https://cdn/1.zip',
            hash: 'h1',
            timestamp: new Date().toISOString(),
          },
        ]}
      />
    );

    expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
  });

  it('MeshAnalyticsCard renders P2P mesh telemetry card', () => {
    render(<MeshAnalyticsCard theme="dark" projectId="proj_1" />);
    expect(screen.getAllByText(/Mesh/i).length).toBeGreaterThan(0);
  });

  it('TimeTravelScrubber renders replay frames and playback controls', () => {
    const frames = generateDemoReplayFrames('Payment Crash');
    expect(frames.length).toBeGreaterThan(0);

    render(
      <TimeTravelScrubber
        isOpen={true}
        onClose={vi.fn()}
        crashTitle="Payment Crash"
        frames={frames}
      />
    );

    expect(screen.getByText(/Payment Crash/)).toBeInTheDocument();
    const closeBtns = screen.getAllByRole('button');
    fireEvent.click(closeBtns[0]);
  });

  it('FirebaseStatusIndicator renders live/offline server indicator', () => {
    const { container } = render(<FirebaseStatusIndicator theme="dark" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('SkeletonLoader exports render without crashing', () => {
    const { container: c1 } = render(<DashboardSkeleton />);
    const { container: c2 } = render(<TableSkeleton />);
    const { container: c3 } = render(<UploaderSkeleton />);
    const { container: c4 } = render(<FullPageSkeleton />);
    expect(c1.firstChild).toBeInTheDocument();
    expect(c2.firstChild).toBeInTheDocument();
    expect(c3.firstChild).toBeInTheDocument();
    expect(c4.firstChild).toBeInTheDocument();
  });
});
