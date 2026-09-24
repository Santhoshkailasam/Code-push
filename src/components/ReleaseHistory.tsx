
import React, { useState } from 'react';
import type { ReleaseHistoryItem } from '../types';
import { History, RotateCcw, Smartphone, Apple, Hash, AlertTriangle, CheckCircle2, Trash2, Eye } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { ReleaseDetailModal } from './ReleaseDetailModal';

interface Props {
  history: ReleaseHistoryItem[];
  onRollback: (item: ReleaseHistoryItem) => void;
  onDelete?: (id: string) => void;
  onSelectReleaseForDetail?: (item: ReleaseHistoryItem) => void;
  theme?: 'dark' | 'light';
}

export const ReleaseHistory: React.FC<Props> = ({
  history,
  onRollback,
  onDelete,
  onSelectReleaseForDetail,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  const [selectedDetailRelease, setSelectedDetailRelease] = useState<ReleaseHistoryItem | null>(null);

  const handleView = (item: ReleaseHistoryItem) => {
    if (onSelectReleaseForDetail) {
      onSelectReleaseForDetail(item);
    } else {
      setSelectedDetailRelease(item);
    }
  };


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
    onConfirm: () => { },
  });


  return (
    <div
      className={`rounded-2xl border p-6 backdrop-blur-md transition-all duration-300 ${isDark
          ? 'border-slate-800 bg-slate-900/40 text-slate-100 shadow-xl'
          : 'border-purple-300/90 bg-gradient-to-br from-purple-100/95 via-indigo-100/90 to-sky-100/95 text-slate-900 shadow-xl shadow-purple-500/10'
        }`}
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 shadow-xs">
          <History className="h-6 w-6" />
        </div>
        <div>
          <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Release History & Rollbacks
          </h2>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-purple-900'}`}>
            Audit trail of all published Over-The-Air bundles with 1-click rollback
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-transparent">
        <table className="w-full text-left text-xs">
          <thead>
            <tr
              className={`border-b uppercase font-mono text-[10px] font-bold ${isDark
                  ? 'border-slate-800 text-slate-400 bg-slate-950/40'
                  : 'border-indigo-300 text-indigo-950 bg-gradient-to-r from-sky-200/90 via-indigo-200/90 to-purple-200/90'
                }`}
            >
              <th className="py-3.5 px-4">Platform</th>
              <th className="py-3.5 px-4">Bundle Version</th>
              <th className="py-3.5 px-4">SHA256 Hash</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Notes</th>
              <th className="py-3.5 px-4">Date</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody
            className={`divide-y ${isDark ? 'divide-slate-800/50' : 'divide-indigo-200/70'
              }`}
          >
            {history.map((item) => {
              const isAndroid = item.platform === 'android';

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${isDark
                      ? 'hover:bg-slate-800/30'
                      : 'hover:bg-sky-200/60 bg-sky-100/60 text-slate-900'
                    }`}
                >
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 font-bold capitalize ${isAndroid ? 'text-emerald-600' : 'text-blue-600'
                        }`}
                    >
                      {isAndroid ? <Smartphone className="h-3.5 w-3.5" /> : <Apple className="h-3.5 w-3.5" />}
                      <span>{item.platform}</span>
                    </span>
                  </td>

                  <td
                    className={`py-3 px-4 font-mono font-extrabold ${isDark ? 'text-white' : 'text-slate-900'
                      }`}
                  >
                    v{item.version}
                  </td>

                  <td className={`py-3 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-700 font-semibold'}`}>
                    <span className="flex items-center space-x-1" title={item.hash}>
                      <Hash className="h-3 w-3 text-purple-500" />
                      <span>{item.hash.substring(0, 8)}...</span>
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${item.mandatory
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-600'
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
                    className={`py-3 px-4 max-w-xs truncate font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'
                      }`}
                    title={item.releaseNotes}
                  >
                    {item.releaseNotes}
                  </td>

                  <td className={`py-3 px-4 whitespace-nowrap font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center space-x-1.5">
                      {/* Highly Visible View Details Button */}
                      <button
                        onClick={() => handleView(item)}
                        className="px-3 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 shadow-md shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-1.5 border border-cyan-300/40 shrink-0"
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
                        className="p-2 rounded-xl text-amber-600 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 transition-all hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
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
                              message: `Are you sure you want to delete ${item.platform.toUpperCase()} v${item.version} release entry from the SQLite database?`,
                              confirmLabel: 'Delete Record',
                              variant: 'danger',
                              onConfirm: () => onDelete(item.id),
                            })
                          }
                          className="p-2 rounded-xl text-rose-600 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 transition-all hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
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

