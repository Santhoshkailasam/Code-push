import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const downloadBundle = require('../../netlify/functions/download-bundle.cjs');

describe('download-bundle.cjs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('serves BSDIFF40 binary delta patch when action=delta', async () => {
    const res = await downloadBundle.handler({
      queryStringParameters: {
        action: 'delta',
        platform: 'android',
        version: 'v2.0.0',
        fromHash: 'abcdef123456',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.isBase64Encoded).toBe(true);
    expect(res.headers['x-codepush-delta']).toBe('true');
    const buf = Buffer.from(res.body, 'base64');
    expect(buf.subarray(0, 8).toString('ascii')).toBe('BSDIFF40');
  });

  it('streams stored bundle_base64 ZIP from PostgreSQL', async () => {
    const zipBase64 = Buffer.from('PK\x03\x04dummyzip').toString('base64');
    vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [{ bundle_base64: zipBase64, download_url: null }],
    });

    const res = await downloadBundle.handler({
      queryStringParameters: { platform: 'android', version: 'v1.0.1', projectId: 'proj_1' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/zip');
    expect(res.body).toBe(zipBase64);
    expect(res.isBase64Encoded).toBe(true);
  });

  it('redirects (302) to external CDN download_url when no bundle_base64 is stored', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [{ bundle_base64: null, download_url: 'https://cdn.example.com/bundle.zip' }],
    });

    const res = await downloadBundle.handler({
      queryStringParameters: { platform: 'ios', version: 'v1.0.2' },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toBe('https://cdn.example.com/bundle.zip');
  });
});

