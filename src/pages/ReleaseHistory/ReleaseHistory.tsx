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
  Calendar,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ReleaseDetailModal } from './ReleaseDetailModal';
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
        (item.releaseNotes && item.releaseNotes.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
    ? 'border-slate-800 bg-slate-900/90 text-slate-100 shadow-xl'
    : 'border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/60';

  const androidCount = useMemo(() => history.filter((h) => h.platform === 'android').length, [history]);
  const iosCount = useMemo(() => history.filter((h) => h.platform === 'ios').length, [history]);
  const mandatoryCount = useMemo(() => history.filter((h) => h.mandatory).length, [history]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`p-5 rounded-3xl border transition-all duration-300 ${cardBgClass}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Releases
            </span>
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {history.length}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 block">
            Published Over-The-Air
          </span>
        </div>

        <div
          className={`p-5 rounded-3xl border transition-all duration-300 ${cardBgClass}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Android Builds
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
            {androidCount}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 block">
            Android updates published
          </span>
        </div>

        <div
          className={`p-5 rounded-3xl border transition-all duration-300 ${cardBgClass}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              iOS Builds
            </span>
            <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Apple className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2 text-blue-600 dark:text-blue-400">
            {iosCount}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 block">
            iOS updates published
          </span>
        </div>

        <div
          className={`p-5 rounded-3xl border transition-all duration-300 ${cardBgClass}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Mandatory Pushes
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2 text-amber-600 dark:text-amber-400">
            {mandatoryCount}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 block">
            Enforced hotfix updates
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className={`rounded-3xl border p-6 sm:p-8 relative overflow-hidden transition-all duration-300 ${cardBgClass}`}>
        {/* Top Header & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center space-x-3.5">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/30 shrink-0">
              <History className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Release History & Rollbacks
                </h2>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold ${
                    isDark
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                  }`}
                >
                  {history.length} {history.length === 1 ? 'Release' : 'Releases'}
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Complete audit trail of all published Over-The-Air bundles with 1-click instant rollback.
              </p>
            </div>
          </div>

          {/* Search & Platform Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72">
              <Search className={`absolute left-3.5 top-3 h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search version, notes, hash..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold border outline-none transition-all ${
                  isDark
                    ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-2xs'
                }`}
              />
            </div>

            {/* Filter Pills */}
            <div
              className={`flex p-1 rounded-2xl border text-xs font-bold ${
                isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setPlatformFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  platformFilter === 'all'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter('android')}
                className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  platformFilter === 'android'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter('ios')}
                className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  platformFilter === 'ios'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Apple className="h-3.5 w-3.5" />
                <span>iOS</span>
              </button>
            </div>
          </div>
        </div>

        {/* Release History Table or Empty State */}
        {filteredHistory.length === 0 ? (
          <div
            className={`rounded-3xl border p-12 text-center flex flex-col items-center justify-center space-y-4 ${
              isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
            }`}
          >
            <div
              className={`p-4 rounded-3xl ${
                isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
              }`}
            >
              <Layers className="h-10 w-10" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {history.length === 0 ? 'No OTA Releases Published Yet' : 'No Matching Releases Found'}
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {history.length === 0
                  ? 'Head over to the Publish Update tab to upload your React Native bundle and deploy your first release.'
                  : 'Try adjusting your search query or platform filter criteria.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr
                  className={`border-b uppercase font-mono text-[10px] font-extrabold tracking-wider ${
                    isDark
                      ? 'border-slate-800 text-slate-400 bg-slate-950'
                      : 'border-slate-200 text-slate-500 bg-slate-50/90'
                  }`}
                >
                  <th className="py-4 px-5">Platform</th>
                  <th className="py-4 px-5">Bundle Version</th>
                  <th className="py-4 px-5">SHA256 Checksum</th>
                  <th className="py-4 px-5">Policy</th>
                  <th className="py-4 px-5">Release Notes</th>
                  <th className="py-4 px-5">Published Date</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                {filteredHistory.map((item) => {
                  const isAndroid = item.platform === 'android';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors duration-150 ${
                        isDark
                          ? 'hover:bg-slate-800/50 bg-slate-900/40'
                          : 'hover:bg-slate-50/80 bg-white'
                      }`}
                    >
                      {/* Platform */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                            isAndroid
                              ? isDark
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : isDark
                              ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}
                        >
                          {isAndroid ? <Smartphone className="h-3.5 w-3.5" /> : <Apple className="h-3.5 w-3.5" />}
                          <span className="capitalize">{item.platform}</span>
                        </span>
                      </td>

                      {/* Version */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-1.5">
                          <span className={`font-mono text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            v{item.version}
                          </span>
                        </div>
                      </td>

                      {/* SHA256 Hash */}
                      <td className="py-4 px-5 font-mono">
                        <button
                          type="button"
                          onClick={() => copyHash(item.hash, item.id)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            copiedHashId === item.id
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : isDark
                              ? 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/40 text-cyan-400'
                              : 'bg-slate-50 border-slate-200 hover:border-cyan-400 text-cyan-800'
                          }`}
                          title="Click to copy full SHA256 checksum"
                        >
                          <Hash className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                          <span>{item.hash.substring(0, 8)}...</span>
                          {copiedHashId === item.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-60" />
                          )}
                        </button>
                      </td>

                      {/* Mandatory / Optional Policy */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            item.mandatory
                              ? isDark
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                              : isDark
                              ? 'bg-slate-800 border-slate-700 text-slate-300'
                              : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {item.mandatory ? (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          )}
                          <span>{item.mandatory ? 'Mandatory' : 'Optional'}</span>
                        </span>
                      </td>

                      {/* Release Notes */}
                      <td
                        className={`py-4 px-5 max-w-xs truncate font-medium ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                        title={item.releaseNotes}
                      >
                        {item.releaseNotes || 'No notes provided'}
                      </td>

                      {/* Published Date */}
                      <td className={`py-4 px-5 whitespace-nowrap font-medium text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-3.5 w-3.5 opacity-60" />
                          <span>
                            {new Date(item.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center space-x-2">
                          {/* View Details Button */}
                          <button
                            type="button"
                            onClick={() => handleView(item)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-1.5 shrink-0"
                            title={`View full release details & timeline for v${item.version}`}
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
                                message: `Are you sure you want to revert the active ${item.platform.toUpperCase()} production bundle to v${item.version}?`,
                                confirmLabel: 'Confirm Rollback',
                                variant: 'warning',
                                onConfirm: () => onRollback(item),
                              })
                            }
                            className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer border ${
                              isDark
                                ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
                                : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                            }`}
                            title={`Rollback active release to v${item.version}`}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>

                          {/* Delete Record Button */}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  title: `Delete ${item.platform.toUpperCase()} Release Record`,
                                  message: `Are you sure you want to permanently delete the ${item.platform.toUpperCase()} v${item.version} release entry from Firebase Firestore?`,
                                  confirmLabel: 'Delete Record',
                                  variant: 'danger',
                                  onConfirm: () => onDelete(item.id),
                                })
                              }
                              className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer border ${
                                isDark
                              ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30'
                              : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                              }`}
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
      </div>

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

export default ReleaseHistory;
