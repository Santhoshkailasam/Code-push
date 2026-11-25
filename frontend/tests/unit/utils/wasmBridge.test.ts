import { describe, it, expect } from 'vitest';
import { validateWasmBinary, instantiateWasmModule } from '../../../src/utils/wasmBridge';

describe('wasmBridge', () => {
  it('validates a conformant WebAssembly binary header (\\0asm v1)', () => {
    const validWasm = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x04]);
    const meta = validateWasmBinary(validWasm);

    expect(meta.magicValid).toBe(true);
    expect(meta.version).toBe(1);
    expect(meta.sizeBytes).toBe(10);
    expect(meta.securitySandboxPassed).toBe(true);
    expect(meta.exportedFunctions).toContain('process');
  });

  it('rejects buffers smaller than 8 bytes', () => {
    expect(() => validateWasmBinary(new Uint8Array([0x00, 0x61]))).toThrow('File size too small');
  });

  it('rejects buffers without \\0asm magic bytes', () => {
    const badMagic = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x01, 0x00, 0x00, 0x00]);
    expect(() => validateWasmBinary(badMagic)).toThrow('Missing \\0asm magic bytes');
  });

  it('rejects unsupported WebAssembly version', () => {
    const badVersion = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x02, 0x00, 0x00, 0x00]);
    expect(() => validateWasmBinary(badVersion)).toThrow('Unsupported WebAssembly version: 2');
  });

  it('falls back to Hermes JSI polyfill when WebAssembly instantiation fails on synthetic bytes', async () => {
    const syntheticBytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0xff]);
    const mod = await instantiateWasmModule(syntheticBytes);

    expect(mod.instance.isJsiVirtualized).toBe(true);
    expect(mod.exports.init()).toBe(1);
    expect(mod.exports.process([1, 2, 3])).toEqual([2, 4, 6]);
    expect(mod.exports.calculateHash('abc')).toBe('wasm_hash_3');
    expect(mod.exports.transform('ok')).toBe('ok');
  });
});

