import React, { useState, useMemo } from 'react';
import type { ReleaseHistoryItem } from '../../types';
import {
  History,
  RotateCcw,
  Smartphone,
  Apple,
  Trash2,
  Eye,
  Search,
  Layers,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ReleaseDetailModal } from './ReleaseDetailModal';
import { TableSkeleton } from '../../components/SkeletonLoader';

interface Props {
  history: ReleaseHistoryItem[];
  onRollback: (item: ReleaseHistoryItem) => void;
  onDelete?: (id: string) => void;
  onSelectReleaseForDetail?: (item: ReleaseHistoryItem) => void;
  onPromote?: (item: ReleaseHistoryItem) => void;
  onRevoke?: (item: ReleaseHistoryItem) => void;
  theme?: 'dark' | 'light';
  isLoading?: boolean;
}

export const ReleaseHistory: React.FC<Props> = ({
  history,
  onRollback,
  onDelete,
  onSelectReleaseForDetail,
  onPromote,
  onRevoke,
  theme = 'dark',
  isLoading = false,
}) => {
  const isDark = theme === 'dark';

  if (isLoading) {
    return <TableSkeleton theme={theme} />;
  }

  const [selectedDetailRelease, setSelectedDetailRelease] = useState<ReleaseHistoryItem | null>(null);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'android' | 'ios'>('all');
  const [trackFilter, setTrackFilter] = useState<'all' | 'production' | 'staging'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleView = (item: ReleaseHistoryItem) => {
    if (onSelectReleaseForDetail) {
      onSelectReleaseForDetail(item);
    } else {
      setSelectedDetailRelease(item);
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter;
      const matchesTrack = trackFilter === 'all' || (item.track || 'production') === trackFilter;
      const matchesSearch =
        item.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.releaseNotes && item.releaseNotes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.hash.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlatform && matchesTrack && matchesSearch;
    });
  }, [history, platformFilter, trackFilter, searchQuery]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    variant: 'warning',
    onConfirm: () => {},
  });

  const cardBgClass = isDark
    ? 'border-slate-800 bg-slate-900/90 text-slate-100 shadow-xl'
    : 'border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/60';

  const androidCount = useMemo(() => history.filter((h) => h.platform === 'android').length, [history]);
  const iosCount = useMemo(() => history.filter((h) => h.platform === 'ios').length, [history]);
  const stagingCount = useMemo(() => history.filter((h) => h.track === 'staging').length, [history]);
  const revokedCount = useMemo(() => history.filter((h) => h.revoked).length, [history]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in font-sans">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-3xl border transition-all duration-300 ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Releases
            </span>
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              <History className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black">{history.length}</span>
            <span className="text-xs font-medium text-slate-400">records</span>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border transition-all duration-300 ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Staging Track
            </span>
            <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black">{stagingCount}</span>
            <span className="text-xs font-medium text-purple-400">QA / Internal</span>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border transition-all duration-300 ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Platforms (Android / iOS)
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Smartphone className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black">{androidCount}</span>
            <span className="text-xs font-medium text-slate-400">/ {iosCount} iOS</span>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border transition-all duration-300 ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Revoked (Kill-Switch)
            </span>
            <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black">{revokedCount}</span>
            <span className="text-xs font-medium text-rose-400">safe rollbacks</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 sm:p-5 rounded-3xl border ${cardBgClass} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by version, hash, or release notes..."
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Track Filter */}
          <div className={`flex p-1 rounded-2xl border text-xs font-bold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            {(['all', 'production', 'staging'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrackFilter(t)}
                className={`px-3 py-1.5 rounded-xl uppercase font-mono font-bold text-xs transition-all cursor-pointer ${
                  trackFilter === t
                    ? t === 'staging' ? 'bg-purple-600 text-white shadow-sm' : 'bg-cyan-500 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Platform Filter */}
          <div className={`flex p-1 rounded-2xl border text-xs font-bold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            {(['all', 'android', 'ios'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-1.5 rounded-xl uppercase font-mono font-bold text-xs transition-all cursor-pointer ${
                  platformFilter === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className={`rounded-3xl border overflow-hidden ${cardBgClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-xs font-bold uppercase tracking-wider ${isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <th className="py-3.5 px-4">Platform & Track</th>
                <th className="py-3.5 px-4">Version & Rollout</th>
                <th className="py-3.5 px-4">Target Binary</th>
                <th className="py-3.5 px-4">Release Notes</th>
                <th className="py-3.5 px-4">Published Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
              {filteredHistory.map((item) => {
                const isAndroid = item.platform === 'android';
                const isStaging = item.track === 'staging';

                return (
                  <tr key={item.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                    {/* Platform & Track */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          isAndroid
                            ? isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : isDark ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          {isAndroid ? <Smartphone className="h-3.5 w-3.5" /> : <Apple className="h-3.5 w-3.5" />}
                          <span className="capitalize">{item.platform}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border ${
                          isStaging
                            ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                            : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                        }`}>
                          {isStaging ? 'Staging' : 'Production'}
                        </span>
                      </div>
                    </td>

                    {/* Version, Rollout %, & Badges */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {item.revoked && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 ${
                              item.autoRevoked
                                ? 'bg-rose-500/30 text-rose-300 border border-rose-500/80 animate-pulse shadow-md shadow-rose-500/20'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            }`}
                            title={item.revocationReason || 'Release revoked'}
                          >
                            <span>{item.autoRevoked ? '⚡ CIRCUIT BREAKER' : 'REVOKED'}</span>
                          </span>
                        )}
                        {item.rolloutPercentage && item.rolloutPercentage < 100 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            Canary {item.rolloutPercentage}%
                          </span>
                        )}
                        {item.mandatory && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            Mandatory
                          </span>
                        )}
                        {item.signature && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center space-x-1"
                            title={`Detached signature: ${item.signature}`}
                          >
                            <span>🔐 Ed25519</span>
                          </span>
                        )}
                        {item.driftStatus === 'passed' && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                            title="Native ABI verified against target binary"
                          >
                            ABI Safe
                          </span>
                        )}
                        {item.driftStatus === 'warning' && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400"
                            title="Native Module Drift detected"
                          >
                            ABI Drift
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Target Binary SemVer */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {item.targetBinaryVersion || '1.0.0'}
                    </td>

                    {/* Release Notes */}
                    <td className={`py-3.5 px-4 truncate max-w-xs md:max-w-md font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.releaseNotes || 'No notes provided'}
                    </td>

                    {/* Published Date */}
                    <td className={`py-3.5 px-4 whitespace-nowrap text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end space-x-1.5">
                        {/* 1-Click Promote Staging to Production */}
                        {isStaging && onPromote && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                title: `Promote v${item.version} to Production`,
                                message: `Promote staging release v${item.version} to the public Production track?`,
                                confirmLabel: 'Promote to Production',
                                variant: 'info',
                                onConfirm: () => onPromote(item),
                              })
                            }
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 cursor-pointer flex items-center space-x-1"
                            title="Promote to Production track"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            <span>Promote</span>
                          </button>
                        )}

                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => handleView(item)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 cursor-pointer flex items-center space-x-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>

                        {/* Rollback Button */}
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              title: `Rollback ${item.platform.toUpperCase()} Release`,
                              message: `Revert active production bundle to v${item.version}?`,
                              confirmLabel: 'Confirm Rollback',
                              variant: 'warning',
                              onConfirm: () => onRollback(item),
                            })
                          }
                          className="p-1.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                          title="Rollback to this version"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>

                        {/* Emergency Revoke Kill-Switch */}
                        {!item.revoked && onRevoke && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                title: `🚨 Emergency Revoke v${item.version}`,
                                message: `Are you sure you want to revoke release v${item.version}? Connected devices will immediately purge this bundle and revert to factory baseline assets!`,
                                confirmLabel: 'Emergency Revoke Release',
                                variant: 'danger',
                                onConfirm: () => onRevoke(item),
                              })
                            }
                            className="p-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                            title="Emergency Kill-Switch (Revoke)"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Delete Button */}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                title: `Delete Release Record`,
                                message: `Permanently delete v${item.version} release record?`,
                                confirmLabel: 'Delete Record',
                                variant: 'danger',
                                onConfirm: () => onDelete(item.id),
                              })
                            }
                            className="p-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        theme={theme}
      />

      {/* Detail Modal */}
      {selectedDetailRelease && (
        <ReleaseDetailModal
          isOpen={Boolean(selectedDetailRelease)}
          item={selectedDetailRelease}
          onClose={() => setSelectedDetailRelease(null)}
          theme={theme}
        />
      )}
    </div>
  );
};

export default ReleaseHistory;
