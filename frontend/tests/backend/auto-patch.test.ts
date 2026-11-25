import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');
const store = require('../../netlify/functions/store.cjs');
const autoPatch = require('../../netlify/functions/auto-patch.cjs');

describe('auto-patch.cjs', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    store.invalidateStoreCache();
    process.env.CODEPUSH_API_KEY = 'cp_test_key';
    vi.restoreAllMocks();
  });

  it('rejects non-POST/GET or unauthenticated requests', async () => {
    const res = await autoPatch.handler({ httpMethod: 'POST', headers: {} });
    expect(res.statusCode).toBe(401);
  });

  it('synthesizes defensive AST null-pointer guard patch on POST', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });

    const res = await autoPatch.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      body: JSON.stringify({
        projectId: 'proj_1',
        platform: 'android',
        version: '1.2.0',
        message: "TypeError: Cannot read properties of undefined (reading 'userProfile')",
        stack: 'at ProfileHeader (src/components/ProfileHeader.tsx:42:15)',
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.patch.patchType).toBe('NULL_POINTER_COALESCE');
    expect(body.patch.patchedSnippet).toContain('?.userProfile');
  });

  it('synthesizes callable type guard patch for "is not a function" errors', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });

    const res = await autoPatch.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      body: JSON.stringify({
        projectId: 'proj_1',
        platform: 'ios',
        version: '1.2.0',
        message: 'TypeError: onCheckout is not a function',
        stack: 'at Checkout (src/pages/Checkout.tsx:88:10)',
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.patch.patchType).toBe('CALLABLE_TYPE_GUARD');
    expect(body.patch.patchedSnippet).toContain("typeof onCheckout === 'function'");
  });
});
