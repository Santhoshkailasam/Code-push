import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BundleUploader } from '../../src/pages/PublishUpdates/BundleUploader';

describe('BundleUploader', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('renders platform selector, version input, track selector, and dropzone', () => {
    const onPublish = vi.fn();
    render(
      <BundleUploader
        onPublish={onPublish}
        currentAndroidVersion="v1.0.0"
        currentIosVersion="v1.0.0"
        theme="dark"
        projectId="proj_1"
      />
    );

    expect(screen.getAllByText(/Android/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/iOS/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Production/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Staging/i).length).toBeGreaterThan(0);
  });

  it('allows switching between Android and iOS platforms', () => {
    render(
      <BundleUploader
        onPublish={vi.fn()}
        currentAndroidVersion="v1.0.0"
        currentIosVersion="v1.2.0"
        theme="dark"
      />
    );

    const iosBtn = screen.getByRole('button', { name: /iOS/i });
    fireEvent.click(iosBtn);
    expect(screen.getAllByText(/main\.jsbundle/i).length).toBeGreaterThan(0);
  });
});
