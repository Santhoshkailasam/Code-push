import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestingConsole } from '../../src/pages/TestingConsole/Live Testing';
import { DeliveryStatusGrid } from '../../src/pages/TestingConsole/components/DeliveryStatusGrid';
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

describe('TestingConsole', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, alert: null, push: null }), { status: 200 })
    );
  });

  it('renders Live Testing console with In-App Alert and Push Notification modes', () => {
    render(
      <TestingConsole
        currentProject={mockProject}
        theme="dark"
        androidVersion="v1.0.0"
        iosVersion="v1.0.0"
      />
    );

    expect(screen.getAllByText(/In-App Alert/i).length).toBeGreaterThan(0);
    const pushTab = screen.getByRole('button', { name: /Push Notification/i });
    fireEvent.click(pushTab);
    expect(screen.getAllByText(/FCM/i).length).toBeGreaterThan(0);
  });

  it('DeliveryStatusGrid renders dispatch history rows', () => {
    render(
      <DeliveryStatusGrid
        currentMode="push-notification"
        isDark={true}
        dispatchHistory={[
          {
            id: 'd1',
            type: 'push',
            title: 'Flash Sale',
            body: '50% off today',
            target: 'all',
            platform: 'android',
            messageId: 'msg_1',
            deliveryProtocol: 'FCM v1',
            date: '2026-11-25',
            timestamp: new Date().toISOString(),
            status: 'DELIVERED',
          },
        ]}
      />
    );

    expect(screen.getByText('Flash Sale')).toBeInTheDocument();
  });
});
