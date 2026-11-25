import { describe, it, expect } from 'vitest';
import {
  calculateFileHash,
  calculateTextHash,
  generateBundleSignature,
  verifyBundleSignature,
} from '../../../src/utils/crypto';

describe('crypto utils', () => {
  it('calculates deterministic SHA-256 text hash', async () => {
    const hash1 = await calculateTextHash('codepush-release-v1');
    const hash2 = await calculateTextHash('codepush-release-v1');
    const hash3 = await calculateTextHash('codepush-release-v2');

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('calculates SHA-256 hash for a File', async () => {
    const file = new File(['hello bundle bytes'], 'index.android.bundle', { type: 'application/octet-stream' });
    const fileHash = await calculateFileHash(file);
    const textHash = await calculateTextHash('hello bundle bytes');

    expect(fileHash).toHaveLength(64);
    expect(fileHash).toBe(textHash);
  });

  it('generates and verifies Ed25519-compatible HMAC bundle signatures', async () => {
    const packageHash = await calculateTextHash('bundle-payload-123');
    const signed = await generateBundleSignature(packageHash, 'my_secret_key');

    expect(signed.algorithm).toBe('ed25519');
    expect(signed.signature).toMatch(/^ed25519-sig-[0-9a-f]{64}$/);
    expect(signed.keyFingerprint).toMatch(/^ed25519-pk-[0-9a-f]{12}$/);

    const isValid = await verifyBundleSignature(packageHash, signed.signature, 'my_secret_key');
    expect(isValid).toBe(true);

    const isInvalidHash = await verifyBundleSignature('tampered_hash', signed.signature, 'my_secret_key');
    expect(isInvalidHash).toBe(false);

    const isInvalidKey = await verifyBundleSignature(packageHash, signed.signature, 'wrong_key');
    expect(isInvalidKey).toBe(false);
  });
});

