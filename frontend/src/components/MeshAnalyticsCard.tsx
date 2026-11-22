import React, { useState, useEffect } from 'react';
import {
  Radio,
  Wifi,
  Sparkles,
  Lock,
} from 'lucide-react';
import { MeshRelayService, type MeshPeer, type MeshSwarmStats } from '../services/MeshRelayService';

interface MeshAnalyticsCardProps {
  theme?: 'dark' | 'light';
  projectId?: string;
}

export const MeshAnalyticsCard: React.FC<MeshAnalyticsCardProps> = ({
  theme = 'dark',
  projectId = 'default',
}) => {
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<MeshSwarmStats>(() => MeshRelayService.getSwarmStats());
  const [peers, setPeers] = useState<MeshPeer[]>(() => MeshRelayService.getPeersList());

  // 📡 Real-time live polling from Netlify / PostgreSQL backend
  useEffect(() => {
    let isMounted = true;
    const fetchLive = async () => {
      const updated = await MeshRelayService.refreshLiveSwarmStats(projectId);
      if (isMounted) {
        setStats(updated);
        setPeers(MeshRelayService.getPeersList());
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [projectId]);

  const formattedSaved =
    stats.bytesSavedOverCDN > 1024 * 1024 * 1024
      ? `${(stats.bytesSavedOverCDN / (1024 * 1024 * 1024)).toFixed(2)} GB`
      : `${(stats.bytesSavedOverCDN / (1024 * 1024)).toFixed(0)} MB`;

  return (
    <div
      className={`p-6 sm:p-7 rounded-3xl border transition-all duration-300 relative overflow-hidden shadow-xl ${
        isDark
          ? 'bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/95 border-slate-800/80 text-white shadow-black/40'
          : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/60'
      }`}
    >
      {/* Top subtle highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-base tracking-tight">Zero-Egress P2P Local Mesh Relay</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Swarm</span>
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
              High-speed local Wi-Fi peer distribution for enterprise fleets, warehouses & retail
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{stats.egressReductionPercent}% CDN Egress Saved</span>
          </div>
        </div>
      </div>

      {/* Core Telemetry Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Local Swarm</span>
          <span className="text-xl font-black text-white mt-1 block">{stats.totalPeers} {stats.totalPeers === 1 ? 'Device' : 'Devices'}</span>
          <span className="text-[9px] text-cyan-400 font-mono">
            {stats.totalPeers > 1 ? `1 Seed • ${stats.totalPeers - 1} Local Peers` : '1 Local Seed Listening'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Bandwidth Saved</span>
          <span className="text-xl font-black text-emerald-400 mt-1 block">{formattedSaved}</span>
          <span className="text-[9px] text-slate-400 font-mono">Zero CDN Cost</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">LAN Speed</span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">{stats.averageTransferSpeedMbps} MB/s</span>
          <span className="text-[9px] text-slate-400 font-mono">Local Gigabit Wi-Fi</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block flex items-center justify-center space-x-1">
            <Lock className="h-3 w-3 text-indigo-400" />
            <span>Security Trust</span>
          </span>
          <span className="text-xl font-black text-indigo-400 mt-1 block">Ed25519</span>
          <span className="text-[9px] text-emerald-400 font-mono font-bold">Zero-Trust Enforced</span>
        </div>
      </div>

      {/* Swarm Peers List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 px-1">
          <span>Connected Local LAN Peers</span>
          <span>mDNS Protocol: _codepush_mesh._tcp</span>
        </div>

        {peers.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-center flex flex-col items-center justify-center space-y-2">
            <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Wifi className="h-4 w-4 animate-pulse" />
            </div>
            <span className="text-xs font-mono text-slate-300 font-semibold">
              Listening for local Wi-Fi devices...
            </span>
            <p className="text-[11px] text-slate-500 max-w-sm">
              Mobile devices running CodePush on this network are discovered dynamically via mDNS with their assigned local IP addresses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {peers.map((peer) => (
              <div
                key={peer.id}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  peer.isSeed
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10'
                    : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className={`h-2 w-2 rounded-full ${peer.isSeed ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
                    <span className="font-mono text-xs font-bold text-white truncate">
                      {peer.id}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {peer.ip}:{peer.port} • {peer.transferSpeedMbps} MB/s
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    peer.isSeed
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {peer.isSeed ? 'SEED' : 'PEER'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeshAnalyticsCard;
