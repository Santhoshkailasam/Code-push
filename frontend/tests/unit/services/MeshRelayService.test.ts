import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeshRelayService } from '../../../src/services/MeshRelayService';
import { calculateTextHash } from '../../../src/utils/crypto';

describe('MeshRelayService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies valid peer bundle SHA-256 hash and Ed25519 signature', async () => {
    const content = 'hermes-bundle-content';
    const bytes = new TextEncoder().encode(content);
    const expectedHash = await calculateTextHash(content);

    const ok = await MeshRelayService.verifyPeerBundle(bytes, expectedHash, 'ed25519-sig-abcdef');
    expect(ok.valid).toBe(true);

    const badHash = await MeshRelayService.verifyPeerBundle(bytes, '0000deadbeef', 'ed25519-sig-abcdef');
    expect(badHash.valid).toBe(false);
    expect(badHash.reason).toContain('Integrity Failure');

    const badSig = await MeshRelayService.verifyPeerBundle(bytes, expectedHash, 'invalid-sig-format');
    expect(badSig.valid).toBe(false);
    expect(badSig.reason).toContain('Security Reject');
  });

  it('announces local peers and computes swarm egress savings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const ok1 = await MeshRelayService.announceLocalPeer(
      {
        id: 'peer_seed_1',
        ip: '192.168.1.10',
        port: 8443,
        isSeed: true,
        version: 'v2.0.0',
        bundleHash: 'abc123',
        transferSpeedMbps: 210,
      },
      'proj_1',
      'cp_key_1'
    );

    const ok2 = await MeshRelayService.announceLocalPeer(
      {
        id: 'peer_leech_2',
        ip: '192.168.1.11',
        port: 8443,
        isSeed: false,
        version: 'v2.0.0',
        bundleHash: 'abc123',
        transferSpeedMbps: 185,
      },
      'proj_1'
    );

    expect(ok1).toBe(true);
    expect(ok2).toBe(true);

    const stats = MeshRelayService.getSwarmStats();
    expect(stats.totalPeers).toBeGreaterThanOrEqual(2);
    expect(stats.seedPeerId).toBe('peer_seed_1');
    expect(stats.isMeshActive).toBe(true);
    expect(stats.egressReductionPercent).toBeGreaterThan(0);
    expect(MeshRelayService.getPeersList().length).toBeGreaterThanOrEqual(2);
  });

  it('refreshes live swarm stats from backend API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          stats: {
            totalPeers: 5,
            seedPeerId: 'seed_99',
            bundleVersion: 'v3.0.0',
            bytesSavedOverCDN: 100000,
            egressReductionPercent: 80,
            averageTransferSpeedMbps: 200,
            isMeshActive: true,
          },
          peers: [
            { id: 'seed_99', ip: '10.0.0.1', port: 9000, isSeed: true, version: 'v3.0.0', bundleHash: 'h', transferSpeedMbps: 200, lastSeenMs: 1 },
          ],
        }),
        { status: 200 }
      )
    );

    const stats = await MeshRelayService.refreshLiveSwarmStats('proj_1');
    expect(stats.isLiveServerSynced).toBe(true);
    expect(stats.bundleVersion).toBe('v3.0.0');
  });
});

