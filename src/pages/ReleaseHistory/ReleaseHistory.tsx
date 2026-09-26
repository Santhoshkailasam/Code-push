import React, { useState, useMemo } from 'react';
import type { ReleaseHistoryItem } from '../../types';
import {
  History,
  RotateCcw,
  Smartphone,
  Apple,
  Hash,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  Search,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ReleaseDetailModal } from './ReleaseDetailModal.tsx';
import { TableSkeleton } from '../../components/SkeletonLoader';

interface Props {
  history: ReleaseHistoryItem[];
  onRollback: (item: ReleaseHistoryItem) => void;
  onDelete?: (id: string) => void;
  onSelectReleaseForDetail?: (item: ReleaseHistoryItem) => void;
  theme?: 'dark' | 'light';
  isLoading?: boolean;
}

export const ReleaseHistory: React.FC<Props> = ({
  history,
  onRollback,
  onDelete,
  onSelectReleaseForDetail,
  theme = 'dark',
  isLoading = false,
}) => {
  const isDark = theme === 'dark';

  if (isLoading) {
    return <TableSkeleton theme={theme} />;
  }

  const [selectedDetailRelease, setSelectedDetailRelease] = useState<ReleaseHistoryItem | null>(null);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'android' | 'ios'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  const handleView = (item: ReleaseHistoryItem) => {
    if (onSelectReleaseForDetail) {
      onSelectReleaseForDetail(item);
    } else {
      setSelectedDetailRelease(item);
    }
  };

  const copyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter;
      const matchesSearch =
        item.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.releaseNotes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hash.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlatform && matchesSearch;
    });
  }, [history, platformFilter, searchQuery]);

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
    ? 'border-slate-800 bg-slate-900/60 text-slate-100 shadow-2xl'
    : 'border-slate-200/90 bg-white/95 text-slate-900 shadow-2xl shadow-indigo-500/10';

  return (
    <div className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl transition-all duration-300 ${cardBgClass}`}>
      {/* Top Header & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-center space-x-3.5">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-xl shadow-purple-500/30 ring-4 ring-purple-500/20">
            <History className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Release History & Rollbacks
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/15 text-cyan-600 border border-cyan-500/30">
                {history.length} {history.length === 1 ? 'Release' : 'Releases'}
              </span>
            </div>
            <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Audit trail of all published Over-The-Air bundles with 1-click rollback
            </p>
          </div>
        </div>

        {/* Search & Platform Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className={`absolute left-3.5 top-2.5 h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search version, notes or hash..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-semibold border outline-none transition-all ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
              }`}
            />
          </div>

          {/* Filter Pills */}
          <div
            className={`flex p-1 rounded-xl border text-xs font-semibold ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}
          >
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                platformFilter === 'all'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPlatformFilter('android')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                platformFilter === 'android'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Smartphone className="h-3 w-3" />
              <span>Android</span>
            </button>
            <button
              onClick={() => setPlatformFilter('ios')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                platformFilter === 'ios'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Apple className="h-3 w-3" />
              <span>iOS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Release History Table or Empty State */}
      {filteredHistory.length === 0 ? (
        <div
          className={`rounded-2xl border p-12 text-center flex flex-col items-center justify-center space-y-4 ${
            isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            <Layers className="h-8 w-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {history.length === 0 ? 'No OTA Releases Published Yet' : 'No Matching Releases Found'}
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {history.length === 0
                ? 'Head over to the Publish Update tab to upload your React Native bundle and deploy your first release.'
                : 'Try adjusting your search query or platform filter options.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800/60 shadow-inner">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b uppercase font-mono text-[10px] font-bold ${
                  isDark
                    ? 'border-slate-800 text-slate-400 bg-slate-950/90'
                    : 'border-slate-300 text-slate-700 bg-slate-100'
                }`}
              >
                <th className="py-3.5 px-4">Platform</th>
                <th className="py-3.5 px-4">Bundle Version</th>
                <th className="py-3.5 px-4">SHA256 Checksum</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Release Notes</th>
                <th className="py-3.5 px-4">Published Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filteredHistory.map((item) => {
                const isAndroid = item.platform === 'android';

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isDark
                        ? 'hover:bg-slate-800/40 bg-slate-900/30'
                        : 'hover:bg-slate-100/90 bg-white text-slate-900'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          isAndroid
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {isAndroid ? <Smartphone className="h-3.5 w-3.5" /> : <Apple className="h-3.5 w-3.5" />}
                        <span className="capitalize">{item.platform}</span>
                      </span>
                    </td>

                    <td className={`py-3.5 px-4 font-mono text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      v{item.version}
                    </td>

                    <td className={`py-3.5 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-700 font-semibold'}`}>
                      <button
                        onClick={() => copyHash(item.hash, item.id)}
                        className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 text-[11px] transition-all cursor-pointer"
                        title="Click to copy full SHA256 checksum"
                      >
                        <Hash className="h-3 w-3 text-cyan-500" />
                        <span>{item.hash.substring(0, 8)}...</span>
                        {copiedHashId === item.id ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-500 hover:text-cyan-400" />
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          item.mandatory
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                            : isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-400'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700'
                        }`}
                      >
                        {item.mandatory ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                        <span>{item.mandatory ? 'Mandatory' : 'Optional'}</span>
                      </span>
                    </td>

                    <td
                      className={`py-3.5 px-4 max-w-xs truncate font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}
                      title={item.releaseNotes}
                    >
                      {item.releaseNotes}
                    </td>

                    <td className={`py-3.5 px-4 whitespace-nowrap font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        {/* Highly Visible View Details Button */}
                        <button
                          onClick={() => handleView(item)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-md shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-1.5 border border-cyan-400/30 shrink-0"
                          title={`View full release details & timeline for v${item.version}`}
                        >
                          <Eye className="h-4 w-4 text-cyan-200" />
                          <span className="tracking-wider uppercase text-[10px]">View</span>
                        </button>

                        {/* Rollback Button */}
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              title: `Rollback ${item.platform.toUpperCase()} Release`,
                              message: `Are you sure you want to revert active ${item.platform.toUpperCase()} production bundle to v${item.version}?`,
                              confirmLabel: 'Confirm Rollback',
                              variant: 'warning',
                              onConfirm: () => onRollback(item),
                            })
                          }
                          className="p-2 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 transition-all hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
                          title={`Rollback active release to v${item.version}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>

                        {/* Delete Record Button */}
                        {onDelete && (
                          <button
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                title: `Delete ${item.platform.toUpperCase()} Release Record`,
                                message: `Are you sure you want to delete ${item.platform.toUpperCase()} v${item.version} release entry from Firebase Firestore?`,
                                confirmLabel: 'Delete Record',
                                variant: 'danger',
                                onConfirm: () => onDelete(item.id),
                              })
                            }
                            className="p-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 transition-all hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
                            title={`Delete v${item.version} record`}
                          >
                            <Trash2 className="h-4 w-4" />
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
      )}

      {/* Confirmation Modal Component */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        theme={theme}
      />

      {/* Full Release Details & Realtime Timeline Modal Component */}
      <ReleaseDetailModal
        isOpen={!!selectedDetailRelease}
        item={selectedDetailRelease}
        onClose={() => setSelectedDetailRelease(null)}
        theme={theme}
      />
    </div>
  );
};
