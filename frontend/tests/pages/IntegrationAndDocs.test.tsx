import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntegrationScreen } from '../../src/pages/Integration/IntegrationScreen';
import { IntegrationDocs } from '../../src/pages/IntegrationDocs/IntegrationDocs';
import { DocumentationScreen } from '../../src/pages/Documentation/DocumentationScreen';
import { getCodePushServiceTemplate } from '../../src/pages/Integration/templates/codePushServiceTemplate';
import { getPushNotificationServiceTemplate } from '../../src/pages/Integration/templates/pushNotificationServiceTemplate';
import { getAndroidManifestTemplate } from '../../src/pages/Integration/templates/androidManifestTemplate';
import { getCodePushNativeModuleCode } from '../../src/pages/Integration/templates/codePushNativeTemplate';
import { getFirebaseSetupGuide } from '../../src/pages/Integration/templates/firebaseSetupTemplate';
import { getIndexJsTemplate } from '../../src/pages/Integration/templates/indexJsTemplate';
import type { Project } from '../../src/types';

const mockProject: Project = {
  id: 'proj_1',
  name: 'Alpha App',
  platform: 'both',
  githubRepo: 'acme/alpha',
  branch: 'main',
  apiKey: 'cp_live_123',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('Integration, Templates & Documentation', () => {
  it('renders IntegrationScreen, IntegrationDocs, and DocumentationScreen', () => {
    render(<IntegrationScreen theme="dark" activeProject={mockProject} />);
    expect(screen.getAllByText(/Integration/i).length).toBeGreaterThan(0);

    render(<IntegrationDocs theme="dark" />);
    render(<DocumentationScreen theme="dark" activeProject={mockProject} onNavigate={vi.fn()} />);
  });

  it('generates all 6 React Native / Android integration templates with project config', () => {
    const cpService = getCodePushServiceTemplate(mockProject.id, mockProject.apiKey, mockProject.name);
    const pushService = getPushNotificationServiceTemplate(mockProject.id);
    const manifest = getAndroidManifestTemplate();
    const nativeMod = getCodePushNativeModuleCode();
    const firebaseSetup = getFirebaseSetupGuide();
    const indexJs = getIndexJsTemplate();

    expect(cpService).toContain('cp_live_123');
    expect(pushService.length).toBeGreaterThan(50);
    expect(manifest).toContain('manifest');
    expect(nativeMod.length).toBeGreaterThan(50);
    expect(firebaseSetup.placementPath).toContain('google-services.json');
    expect(indexJs.length).toBeGreaterThan(20);
  });
});
