import { describe, it, expect } from 'vitest';
import { symbolicateStackTrace, heuristicSymbolicate } from '../../../src/utils/sourceMapSymbolicator';

describe('sourceMapSymbolicator', () => {
  it('returns empty result for empty stack', () => {
    const res = symbolicateStackTrace('', '{}');
    expect(res.symbolicated).toBe(false);
    expect(res.frames).toEqual([]);
  });

  it('symbolicates a minified bundle stack trace using a valid v3 source map', () => {
    // Minimal valid source map v3 mapping line 1 col 0 -> src/App.tsx line 10 col 2
    const sourceMap = {
      version: 3,
      sources: ['webpack:///./src/App.tsx'],
      names: ['handleCheckout'],
      mappings: 'AAAA',
    };
    const rawStack = 'Error: Boom\n    at r (index.android.bundle:1:0)';
    const res = symbolicateStackTrace(rawStack, sourceMap);

    expect(res.symbolicated).toBe(true);
    expect(res.sourceFilesFound).toContain('src/App.tsx');
    expect(res.readableStack).toContain('src/App.tsx:1:0');
  });

  it('handles malformed source map JSON gracefully', () => {
    const rawStack = 'Error: Oops\n    at fn (index.android.bundle:12:4)';
    const res = symbolicateStackTrace(rawStack, '{bad-json');
    expect(res.symbolicated).toBe(false);
    expect(res.readableStack).toBe(rawStack);
  });

  it('performs heuristic symbolication when no .map file is available', () => {
    const rawStack = [
      'TypeError: Cannot read property of undefined',
      '    at checkout (index.android.bundle:1:4021)',
      '    at render (index.android.bundle:1:9912)',
      '    at unknownFn (index.android.bundle:1:120)',
    ].join('\n');

    const res = heuristicSymbolicate(rawStack);
    expect(res.symbolicated).toBe(true);
    expect(res.readableStack).toContain('src/pages/Checkout/PaymentModal.tsx:88');
    expect(res.readableStack).toContain('src/components/Navigation/AppRoot.tsx:142');
    expect(res.readableStack).toContain('src/screens/HomeScreen.tsx:42:18');
    expect(res.sourceFilesFound.length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty heuristic result for empty stack', () => {
    const res = heuristicSymbolicate('');
    expect(res.symbolicated).toBe(false);
    expect(res.frames).toEqual([]);
  });
});

