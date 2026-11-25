import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const store = require('../../netlify/functions/store.cjs');
const githubWebhook = require('../../netlify/functions/github-webhook.cjs');

describe('github-webhook.cjs', () => {
  beforeEach(() => {
    store.invalidateStoreCache();
    vi.restoreAllMocks();
  });

  it('rejects non-POST methods with 405', async () => {
    const res = await githubWebhook.handler({ httpMethod: 'GET' });
    expect(res.statusCode).toBe(405);
  });

  it('processes GitHub push webhook payload and creates automated release', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });

    const res = await githubWebhook.handler({
      httpMethod: 'POST',
      headers: { 'x-github-event': 'push' },
      body: JSON.stringify({
        ref: 'refs/heads/main',
        repository: { full_name: 'acme/mobile-app' },
        head_commit: {
          id: 'a1b2c3d4e5f6',
          message: 'Fix checkout crash',
          author: { name: 'Jane Dev' },
        },
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.release.releaseNotes).toContain('Fix checkout crash');
    expect(body.release.commitHash).toBe('a1b2c3d4');
  });
});

