import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  inspectNativeBridgeDrift,
  validateBundleFile,
  KNOWN_NATIVE_BINARY_MODULES,
} from '../../../src/utils/bundleValidator';

describe('bundleValidator', () => {
  describe('inspectNativeBridgeDrift', () => {
    it('detects compatible modules against baseline 1.0.0', () => {
      const sample = `
        NativeModules.RNDeviceInfo.getVersion();
        TurboModuleRegistry.get('NetInfo');
        const anim = NativeModules.NativeAnimatedModule;
      `;
      const result = inspectNativeBridgeDrift(sample, '1.0.0');
      expect(result.driftCheck.status).toBe('compatible');
      expect(result.detectedModules).toContain('RNDeviceInfo');
      expect(result.detectedModules).toContain('NetInfo');
      expect(result.detectedModules).toContain('NativeAnimatedModule');
    });

    it('detects ABI drift when unknown native/turbo/component modules are invoked', () => {
      const sample = `
        NativeModules.StripeSdk.init();
        TurboModuleRegistry.getEnforcing('RNCamera');
        requireNativeComponent('LottieAnimationView');
      `;
      const result = inspectNativeBridgeDrift(sample, '1.0.0');
      expect(result.driftCheck.status).toBe('drift_detected');
      expect(result.driftCheck.missingModules).toEqual(
        expect.arrayContaining(['StripeSdk', 'RNCamera', 'LottieAnimationView'])
      );
      expect(result.driftCheck.message).toContain('Native ABI Drift');
    });

    it('allows all modules when targetBinaryVersion is wildcard "*"', () => {
      const sample = `NativeModules.CustomUnknownModule.doWork();`;
      const result = inspectNativeBridgeDrift(sample, '*');
      expect(result.driftCheck.status).toBe('compatible');
      expect(KNOWN_NATIVE_BINARY_MODULES['*']).toContain('StripeSdk');
    });

    it('falls back to baseline defaults when no native module calls are found', () => {
      const result = inspectNativeBridgeDrift('console.log("pure js");', '1.0.0');
      expect(result.driftCheck.status).toBe('compatible');
      expect(result.detectedModules).toEqual(
        expect.arrayContaining(['PlatformConstants', 'AsyncLocalStorage', 'RNDeviceInfo', 'SoundManager'])
      );
    });
  });

  describe('validateBundleFile', () => {
    it('validates a 64-bit Hermes bytecode .bundle file', async () => {
      // 64-bit Hermes magic: 0xc6, 0x1f, 0xbc, 0x03, 0xc1, 0x03, 0x19, 0x1f + version 96
      const bytes = new Uint8Array([0xc6, 0x1f, 0xbc, 0x03, 0xc1, 0x03, 0x19, 0x1f, 96, 0, 0, 0, 1, 2, 3, 4]);
      const file = new File([bytes], 'index.android.bundle', { type: 'application/octet-stream' });

      const result = await validateBundleFile(file, 'android');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('hermes');
      expect(result.hermesVersion).toBe(96);
      expect(result.bundleFileName).toBe('index.android.bundle');
    });

    it('validates a 32-bit Hermes bytecode .bundle file', async () => {
      const bytes = new Uint8Array([0xde, 0xc0, 0x55, 0x1f, 84, 0, 0, 0, 1, 2]);
      const file = new File([bytes], 'main.jsbundle', { type: 'application/octet-stream' });

      const result = await validateBundleFile(file, 'ios');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('hermes');
      expect(result.hermesVersion).toBe(84);
    });

    it('validates a ZIP archive with bundle, source map, wasm, and assets', async () => {
      const zip = new JSZip();
      zip.file('index.android.bundle', 'var __d = function() {}; NativeModules.RNDeviceInfo.getVersion();');
      zip.file('index.android.bundle.map', JSON.stringify({ version: 3, sources: ['App.tsx'], mappings: 'AAAA' }));
      zip.file('assets/logo.png', 'pngdata');
      zip.file('fonts/Inter.ttf', 'fontdata');
      zip.file('locales/en.json', '{"hello":"world"}');
      zip.file('locales/fr.json', '{"hello":"bonjour"}');
      zip.file('native_accelerator.wasm', new Uint8Array([0x00, 0x61, 0x73, 0x6d, 1, 0, 0, 0]));

      const blob = await zip.generateAsync({ type: 'blob' });
      const file = new File([blob], 'release.zip', { type: 'application/zip' });

      const result = await validateBundleFile(file, 'android');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('javascript');
      expect(result.hasSourceMap).toBe(true);
      expect(result.sourceMapFileName).toBe('index.android.bundle.map');
      expect(result.hasWasmModule).toBe(true);
      expect(result.assetManifest?.imageCount).toBe(1);
      expect(result.assetManifest?.fontCount).toBe(1);
      expect(result.assetManifest?.locales).toEqual(expect.arrayContaining(['en', 'fr']));
      expect(result.deltaUpdate?.available).toBe(true);
      expect(result.warning).toContain('hermesc');
    });

    it('fails validation when ZIP archive is missing the expected bundle entry', async () => {
      const zip = new JSZip();
      zip.file('README.md', '# No bundle here');
      const blob = await zip.generateAsync({ type: 'blob' });
      const file = new File([blob], 'invalid.zip', { type: 'application/zip' });

      const result = await validateBundleFile(file, 'ios');
      expect(result.valid).toBe(false);
      expect(result.bundleFileName).toBeNull();
      expect(result.message).toContain('missing expected entry file (main.jsbundle)');
    });

    it('returns invalid result on corrupted ZIP archive', async () => {
      const file = new File(['not-a-valid-zip-content'], 'broken.zip', { type: 'application/zip' });
      const result = await validateBundleFile(file, 'android');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Failed to inspect bundle');
    });
  });
});
