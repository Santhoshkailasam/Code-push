import React, { useState, useRef, useEffect } from 'react';
import type { DispatchHistoryItem, TestingMode } from '../types';
import {
  Layers,
  Search,
  X,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  BellRing,
  Info,
  Calendar,
  Filter,
  RotateCcw,
} from 'lucide-react';

export type DateFilterPreset = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';

interface DeliveryStatusGridProps {
  isDark?: boolean;
  currentMode: TestingMode;
  dispatchHistory: DispatchHistoryItem[];
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  onReplayItem: (item: DispatchHistoryItem) => void;
  bottomRef?: React.RefObject<HTMLDivElement | null>;
}

// Clean helper to remove any internal project ID strings like (app_rCYp1a_...) from display
export const sanitizeTarget = (target?: string): string => {
  if (!target) return 'All Connected Devices';
  return target
    .replace(/\s*\([^)]*app_[^)]*\)/gi, '')
    .replace(/\s*app_[a-zA-Z0-9_-]+/gi, '')
    .replace(/\s*\(\s*\)/g, '')
    .trim() || 'All Connected Devices';
};

// Clean helper to remove Firebase project path prefix (e.g. projects/tracker-42b47/messages/)
export const sanitizeMessageId = (messageId?: string): string => {
  if (!messageId) return 'msg_live';
  if (messageId.includes('/messages/')) {
    return messageId.split('/messages/')[1];
  }
  return messageId.replace(/^projects\/[^/]+\//, '');
};

// Helper to parse item date into a Date object
export const parseItemDate = (item: DispatchHistoryItem): Date | null => {
  if (item.createdAt) {
    const d = new Date(item.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.rawPayload?.createdAt) {
    const d = new Date(item.rawPayload.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.date) {
    if (item.timestamp) {
      const combined = new Date(`${item.date} ${item.timestamp}`);
      if (!isNaN(combined.getTime())) return combined;
    }
    const d = new Date(item.date);
    if (!isNaN(d.getTime())) return d;
  }
  const match = item.id?.match(/(\d{12,14})/);
  if (match) {
    const d = new Date(parseInt(match[1], 10));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

// Helper to convert Date to local YYYY-MM-DD
export const toLocalDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const DeliveryStatusGrid: React.FC<DeliveryStatusGridProps> = ({
  isDark = true,
  currentMode,
  dispatchHistory,
  onDeleteHistoryItem,
  onClearHistory,
  onReplayItem,
  bottomRef,
}) => {
  const [gridSearchQuery, setGridSearchQuery] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Date Filter State
  const [dateFilterPreset, setDateFilterPreset] = useState<DateFilterPreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const dateFilterRef = useRef<HTMLDivElement | null>(null);

  // Close date popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) {
        setIsDateFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetDateFilter = () => {
    setDateFilterPreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setIsDateFilterOpen(false);
  };

  const handleFilterByDate = (item: DispatchHistoryItem) => {
    const d = parseItemDate(item);
    if (d) {
      const key = toLocalDateKey(d);
      setDateFilterPreset('custom');
      setCustomStartDate(key);
      setCustomEndDate(key);
    }
  };

  // Date matching predicate
  const isDateMatch = (item: DispatchHistoryItem): boolean => {
    if (dateFilterPreset === 'all') return true;

    const itemDate = parseItemDate(item);
    if (!itemDate) return true;
    const itemKey = toLocalDateKey(itemDate);

    const now = new Date();
    const todayKey = toLocalDateKey(now);

    if (dateFilterPreset === 'today') {
      return itemKey === todayKey;
    }

    if (dateFilterPreset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      return itemKey === toLocalDateKey(yest);
    }

    if (dateFilterPreset === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      return itemKey >= toLocalDateKey(past) && itemKey <= todayKey;
    }

    if (dateFilterPreset === '30days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      return itemKey >= toLocalDateKey(past) && itemKey <= todayKey;
    }

    if (dateFilterPreset === 'custom') {
      if (customStartDate && customEndDate) {
        const start = customStartDate <= customEndDate ? customStartDate : customEndDate;
        const end = customStartDate <= customEndDate ? customEndDate : customStartDate;
        return itemKey >= start && itemKey <= end;
      }
      if (customStartDate) {
        return itemKey === customStartDate;
      }
      if (customEndDate) {
        return itemKey <= customEndDate;
      }
      return true;
    }

    return true;
  };

  // Format label for current date filter
  const getDateFilterLabel = () => {
    switch (dateFilterPreset) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case '7days':
        return 'Last 7 Days';
      case '30days':
        return 'Last 30 Days';
      case 'custom':
        if (customStartDate && customEndDate && customStartDate !== customEndDate) {
          return `${customStartDate} → ${customEndDate}`;
        }
        if (customStartDate) {
          return customStartDate;
        }
        if (customEndDate) {
          return `Until ${customEndDate}`;
        }
        return 'Custom Date';
      default:
        return 'All Dates';
    }
  };

  // STRICT TAB FILTER:
  // In-app alert tab shows ONLY in-app alerts; push notification tab shows ONLY push notifications
  const targetType = currentMode === 'in-app-alert' ? 'in-app-alert' : 'push';
  const tabScopedHistory = dispatchHistory.filter((item) => item.type === targetType);

  const filteredHistory = tabScopedHistory.filter((item) => {
    if (!isDateMatch(item)) return false;

    if (!gridSearchQuery.trim()) return true;
    const query = gridSearchQuery.toLowerCase();
    const matchTitle = item.title?.toLowerCase().includes(query);
    const matchId = item.messageId?.toLowerCase().includes(query);
    const matchTarget = item.target?.toLowerCase().includes(query);
    const matchTone = item.soundTone?.toLowerCase().includes(query);
    const matchStatus = item.status?.toLowerCase().includes(query);
    const matchDate = item.date?.toLowerCase().includes(query);
    return matchTitle || matchId || matchTarget || matchTone || matchStatus || matchDate;
  });

  const isAlertMode = currentMode === 'in-app-alert';

  return (
    <div
      ref={bottomRef}
      className={`mt-6 rounded-3xl border transition-all duration-300 overflow-hidden ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 shadow-2xl shadow-black/50'
          : 'bg-white border-slate-200 shadow-xl shadow-slate-200/60'
      }`}
    >
      {/* Grid Header & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className={`p-1.5 rounded-xl border ${
              isAlertMode
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}>
              {isAlertMode ? <MessageSquare className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
            </span>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              {isAlertMode
                ? 'In-App Alert Delivery Status & History'
                : 'Push Notification Delivery Status & History'}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center space-x-1 ${
              isAlertMode
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                isAlertMode ? 'bg-emerald-400' : 'bg-cyan-400'
              }`} />
              <span>
                {filteredHistory.length !== tabScopedHistory.length
                  ? `${filteredHistory.length} of ${tabScopedHistory.length}`
                  : tabScopedHistory.length}{' '}
                {isAlertMode ? 'Alert' : 'Push'} Records
              </span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isAlertMode
              ? 'Showing live delivery receipts, sync status, and payloads for In-App Alerts only.'
              : 'Showing live delivery receipts, FCM v1 tokens, and payloads for Push Notifications only.'}
          </p>
        </div>

        {/* Search, Date Filter & Clear actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={gridSearchQuery}
              onChange={(e) => setGridSearchQuery(e.target.value)}
              placeholder={`Search ${isAlertMode ? 'alerts' : 'push notifications'}...`}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-all w-36 sm:w-48 font-mono"
            />
            {gridSearchQuery && (
              <button
                type="button"
                onClick={() => setGridSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative" ref={dateFilterRef}>
            <button
              type="button"
              onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                dateFilterPreset !== 'all'
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/20 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
              title="Filter records by date"
            >
              <Calendar className={`h-3.5 w-3.5 ${dateFilterPreset !== 'all' ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="truncate max-w-[110px] sm:max-w-[150px]">{getDateFilterLabel()}</span>
              {dateFilterPreset !== 'all' ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    resetDateFilter();
                  }}
                  className="p-0.5 rounded hover:bg-cyan-500/30 text-cyan-300 hover:text-white"
                  title="Clear date filter"
                >
                  <X className="h-3 w-3" />
                </span>
              ) : (
                <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isDateFilterOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* Date Filter Popover */}
            {isDateFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/80 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
                  <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-white">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Filter by Date</span>
                  </div>
                  {dateFilterPreset !== 'all' && (
                    <button
                      type="button"
                      onClick={resetDateFilter}
                      className="text-[10px] font-mono text-cyan-400 hover:text-white hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterPreset('all');
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setIsDateFilterOpen(false);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono text-left transition-all ${
                      dateFilterPreset === 'all'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    All Dates
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterPreset('today');
                      setIsDateFilterOpen(false);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono text-left transition-all ${
                      dateFilterPreset === 'today'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterPreset('yesterday');
                      setIsDateFilterOpen(false);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono text-left transition-all ${
                      dateFilterPreset === 'yesterday'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterPreset('7days');
                      setIsDateFilterOpen(false);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono text-left transition-all ${
                      dateFilterPreset === '7days'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterPreset('30days');
                      setIsDateFilterOpen(false);
                    }}
                    className={`col-span-2 py-1.5 px-2 rounded-lg text-xs font-mono text-left transition-all ${
                      dateFilterPreset === '30days'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    Last 30 Days
                  </button>
                </div>

                {/* Custom Range Picker */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-2">
                    Custom Date Range
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block mb-1">From</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          setDateFilterPreset('custom');
                        }}
                        style={{ colorScheme: isDark ? 'dark' : 'light' }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block mb-1">To</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          setCustomEndDate(e.target.value);
                          setDateFilterPreset('custom');
                        }}
                        style={{ colorScheme: isDark ? 'dark' : 'light' }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsDateFilterOpen(false)}
                      className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono text-center shadow cursor-pointer transition-all"
                    >
                      Apply Filter
                    </button>
                    {(customStartDate || customEndDate || dateFilterPreset !== 'all') && (
                      <button
                        type="button"
                        onClick={resetDateFilter}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer transition-all"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clear History Button */}
          {tabScopedHistory.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="p-1.5 px-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all"
              title="Clear all records"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear Grid</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Date Filter Banner */}
      {dateFilterPreset !== 'all' && (
        <div className="px-4 sm:px-5 py-2 bg-cyan-950/30 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-cyan-300 font-mono">
            <Filter className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>
              Date Filter: <strong className="text-white font-bold">{getDateFilterLabel()}</strong>
              <span className="ml-2 text-slate-400 font-normal">
                ({filteredHistory.length} of {tabScopedHistory.length} {isAlertMode ? 'alert' : 'push'} records match)
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={resetDateFilter}
            className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[11px] text-cyan-300 hover:text-white flex items-center space-x-1 cursor-pointer transition-all font-mono"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Date Filter</span>
          </button>
        </div>
      )}

      {/* Table / Grid - NO horizontal scroll, 100% width */}
      {/* Col 1: Title (ONLY TITLE, NO DESC) | Col 2: Date & Time (AFTER TITLE) | Col 3: Actions (NO ID) | Col 4: Status (LAST COLUMN) */}
      <div className="w-full overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr
              className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                isDark
                  ? 'border-slate-800 bg-slate-950/70 text-slate-400'
                  : 'border-slate-200 bg-slate-100/70 text-slate-600'
              }`}
            >
              <th className="py-2.5 px-3.5 font-bold w-[48%]">
                {isAlertMode ? 'Alert Title' : 'Notification Title'}
              </th>
              <th className="py-2.5 px-3 font-bold w-[20%]">Date &amp; Time</th>
              <th className="py-2.5 px-3 font-bold text-right w-[16%]">Actions</th>
              {/* Status is explicitly in the LAST column */}
              <th className="py-2.5 px-3.5 font-bold text-right w-[16%]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-slate-500">
                  <Layers className="h-7 w-7 mx-auto mb-1.5 text-slate-600" />
                  <p className="font-semibold text-slate-400 text-xs">
                    {dateFilterPreset !== 'all'
                      ? `No records found for ${getDateFilterLabel()}`
                      : gridSearchQuery
                      ? 'No matching records found'
                      : `No ${isAlertMode ? 'in-app alert' : 'push notification'} records found yet`}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {dateFilterPreset !== 'all'
                      ? 'Try adjusting your date range or selecting "All Dates"'
                      : gridSearchQuery
                      ? 'Try adjusting your search query'
                      : `Send ${isAlertMode ? 'an In-App Alert' : 'a Push Notification'} above to record live delivery status`}
                  </p>
                  {dateFilterPreset !== 'all' && (
                    <button
                      type="button"
                      onClick={resetDateFilter}
                      className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer font-mono"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset Date Filter</span>
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredHistory.map((item) => {
                const cleanTarget = sanitizeTarget(item.target);

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`transition-colors group hover:bg-slate-800/40 ${
                        expandedRowId === item.id ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      {/* 1. TITLE COLUMN (ONLY TITLE SHOWN, NO DESC, NO PROJECT ID) */}
                      <td className="py-2.5 px-3.5 align-middle">
                        <div className="font-bold text-white text-xs truncate" title={item.title}>
                          {item.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {/* Audience Target (No Project ID) */}
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/60 truncate max-w-[200px]">
                            {cleanTarget}
                          </span>
                          {item.soundTone && item.soundTone !== 'silent' && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/60 truncate max-w-[90px]">
                              {item.soundTone}
                            </span>
                          )}
                          {item.deepLink && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 truncate max-w-[130px]">
                              {item.deepLink}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. DATE & TIME COLUMN (IMMEDIATELY AFTER NOTIFICATION TITLE) */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center space-x-1.5 font-mono text-white text-xs font-bold">
                          <Clock className="h-3 w-3 text-cyan-400 shrink-0" />
                          <span>{item.timestamp}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFilterByDate(item)}
                          title={`Click to filter only records on ${item.date}`}
                          className="group/date flex items-center space-x-1 text-[10px] font-mono text-slate-400 hover:text-cyan-300 mt-0.5 pl-4.5 cursor-pointer transition-colors"
                        >
                          <span>{item.date}</span>
                          <Filter className="h-2.5 w-2.5 opacity-0 group-hover/date:opacity-100 transition-opacity text-cyan-400" />
                        </button>
                      </td>

                      {/* 3. ACTIONS COLUMN (ID COMPLETELY REMOVED FROM THE COLUMN) */}
                      <td className="py-2.5 px-3 align-middle text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setExpandedRowId(expandedRowId === item.id ? null : item.id)}
                            className={`p-1 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer shrink-0 ${
                              expandedRowId === item.id
                                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                            }`}
                            title="Toggle delivery details"
                          >
                            <Info className="h-3 w-3" />
                            <span>{expandedRowId === item.id ? 'Hide' : 'Details'}</span>
                            {expandedRowId === item.id ? (
                              <ChevronUp className="h-2.5 w-2.5" />
                            ) : (
                              <ChevronDown className="h-2.5 w-2.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteHistoryItem(item.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
                            title="Delete this record"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>

                      {/* 4. STATUS COLUMN - EXPLICITLY MOVED TO THE LAST COLUMN */}
                      <td className="py-2.5 px-3.5 align-middle text-right">
                        <div className="flex items-center justify-end">
                          {item.status === 'DELIVERED' && (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>DELIVERED</span>
                            </span>
                          )}
                          {item.status === 'QUEUED' && (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                              <span>QUEUED</span>
                            </span>
                          )}
                          {item.status === 'DELIVERING' && (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs">
                              <RefreshCw className="h-2.5 w-2.5 animate-spin text-amber-400" />
                              <span>SENDING</span>
                            </span>
                          )}
                          {item.status === 'ERROR' && (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-xs">
                              <AlertCircle className="h-2.5 w-2.5 text-rose-400" />
                              <span>FAILED</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Metadata Details Drawer (No JSON Payload) */}
                    {expandedRowId === item.id && (
                      <tr className="bg-slate-950/90 border-b border-cyan-500/20">
                        <td colSpan={4} className="p-4 sm:p-5">
                          <div className="space-y-3 text-left">
                            <div className="flex items-center justify-between">
                              <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center space-x-1.5">
                                <Info className="h-3.5 w-3.5" />
                                <span>Delivery Verification Metadata</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500">
                                Message ID: <span className="text-slate-300">{item.messageId || item.id}</span>
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-slate-500 text-[10px] block uppercase font-mono">Dispatched</span>
                                <span className="font-mono text-white text-[11px] block mt-0.5">{item.date} at {item.timestamp}</span>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-slate-500 text-[10px] block uppercase font-mono">Target Audience</span>
                                <span className="font-mono text-cyan-300 text-[11px] block mt-0.5 truncate">{cleanTarget}</span>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-slate-500 text-[10px] block uppercase font-mono">Delivery Protocol</span>
                                <span className="font-mono text-slate-300 text-[11px] block mt-0.5">{item.deliveryProtocol || 'Direct Edge'}</span>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-slate-500 text-[10px] block uppercase font-mono">Wake Lock Telemetry</span>
                                <span className="font-mono text-emerald-400 text-[11px] block mt-0.5">{item.wakeLockStatus || 'High Priority (Active)'}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900">
                              <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
                                {item.soundTone && item.soundTone !== 'silent' && (
                                  <div>
                                    <span>Tone: </span>
                                    <span className="text-cyan-400 font-bold">{item.soundTone}</span>
                                  </div>
                                )}
                                {item.channelId && (
                                  <div>
                                    <span>Channel: </span>
                                    <span className="text-slate-300">{item.channelId}</span>
                                  </div>
                                )}
                                {item.deepLink && (
                                  <div>
                                    <span>Deep Link: </span>
                                    <span className="text-purple-400 font-bold">{item.deepLink}</span>
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => onReplayItem(item)}
                                className="py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center space-x-1.5 transition-all cursor-pointer ml-auto"
                              >
                                <RefreshCw className="h-3 w-3" />
                                <span>Replay in Phone Simulator</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
