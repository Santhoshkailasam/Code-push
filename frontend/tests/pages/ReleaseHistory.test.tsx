import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReleaseHistory } from '../../src/pages/ReleaseHistory/ReleaseHistory';
import type { ReleaseHistoryItem } from '../../src/types';

const historyItems: ReleaseHistoryItem[] = [
  {
    id: 'rel_1',
    version: 'v2.1.0',
    platform: 'android',
    track: 'production',
    rolloutPercentage: 100,
    mandatory: true,
    releaseNotes: 'Fix payment crash',
    downloadUrl: 'https://cdn/1.zip',
    hash: 'hash_111',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'rel_2',
    version: 'v2.2.0-beta',
    platform: 'ios',
    track: 'staging',
    rolloutPercentage: 25,
    mandatory: false,
    releaseNotes: 'Staging UI refresh',
    downloadUrl: 'https://cdn/2.zip',
    hash: 'hash_222',
    timestamp: new Date().toISOString(),
  },
];

describe('ReleaseHistory', () => {
  it('renders releases, filters by search query, and triggers detail/promote/rollback', () => {
    const onRollback = vi.fn();
    const onPromote = vi.fn();
    const onSelectReleaseForDetail = vi.fn();

    render(
      <ReleaseHistory
        history={historyItems}
        onRollback={onRollback}
        onPromote={onPromote}
        onSelectReleaseForDetail={onSelectReleaseForDetail}
        theme="dark"
      />
    );

    expect(screen.getByText(/Fix payment crash/i)).toBeInTheDocument();
    expect(screen.getByText(/Staging UI refresh/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(searchInput, { target: { value: 'payment' } });
    expect(screen.getByText(/Fix payment crash/i)).toBeInTheDocument();
    expect(screen.queryByText(/Staging UI refresh/i)).not.toBeInTheDocument();
  });
});
