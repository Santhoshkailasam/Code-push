import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const auth = require('../../netlify/functions/auth.cjs');
const store = require('../../netlify/functions/store.cjs');
const meshRelay = require('../../netlify/functions/mesh-relay.cjs');

describe('mesh-relay.cjs', () => {
  beforeEach(() => {
    auth.invalidateAuthCache();
    store.invalidateStoreCache();
    process.env.CODEPUSH_API_KEY = 'cp_test_key';
    vi.restoreAllMocks();
  });

  it('GET returns current mesh swarm stats', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });

    const res = await meshRelay.handler({
      httpMethod: 'GET',
      queryStringParameters: { projectId: 'proj_mesh' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.stats).toBeDefined();
  });

  it('POST rejects public IPs to prevent SSRF spoofing and accepts private LAN IPs', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });

    const publicIpRes = await meshRelay.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { projectId: 'proj_mesh' },
      body: JSON.stringify({
        peerId: 'peer_evil',
        ip: '8.8.8.8',
        port: 8443,
        isSeed: true,
      }),
    });
    expect(publicIpRes.statusCode).toBe(403);

    const lanIpRes = await meshRelay.handler({
      httpMethod: 'POST',
      headers: { 'x-codepush-api-key': 'cp_test_key' },
      queryStringParameters: { projectId: 'proj_mesh' },
      body: JSON.stringify({
        peerId: 'peer_lan_1',
        ip: '192.168.1.42',
        port: 8443,
        isSeed: true,
        version: 'v1.0.0',
        bundleHash: 'sha256-ok',
      }),
    });
    expect(lanIpRes.statusCode).toBe(200);
    expect(JSON.parse(lanIpRes.body).success).toBe(true);
  });
});
