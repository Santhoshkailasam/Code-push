import React, { useState, useEffect } from 'react';
import type { CrashReportItem, Project, AIGuardianReport } from '../../types';
import {
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Sliders,
  Sparkles,
  RefreshCw,
  Clock,
  Brain,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { heuristicSymbolicate } from '../../utils/sourceMapSymbolicator';
import { AutoPatchModal, type AutoPatchData } from '../../components/AutoPatchModal';
import { TimeTravelScrubber } from '../../components/TimeTravelScrubber';

interface Props {
  theme?: 'dark' | 'light';
  currentProject?: Project;
}

interface CircuitBreakerState {
  enabled: boolean;
  threshold: number;
  windowMinutes: number;
  recentCrashCount: number;
  activeTrip: {
    triggeredAt: string;
    version: string;
    platform: string;
    crashCount: number;
    threshold: number;
    reason: string;
    aiGuardianReport?: AIGuardianReport;
  } | null;
}

export const CrashAnalyticsScreen: React.FC<Props> = ({ theme = 'dark', currentProject }) => {
  const isDark = theme === 'dark';
  const projectId = currentProject?.id || 'app_rCYp1a_mvdfs5j4_w9dyc';
  const apiKey = currentProject?.apiKey || '';

  const [crashes, setCrashes] = useState<CrashReportItem[]>([]);
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreakerState>({
    enabled: true,
    threshold: 5,
    windowMinutes: 10,
    recentCrashCount: 0,
    activeTrip: null,
  });
  const [isSimulatingSpike, setIsSimulatingSpike] = useState(false);
  const [spikeNotice, setSpikeNotice] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'android' | 'ios'>('all');
  const [symbolicatedCrashes, setSymbolicatedCrashes] = useState<Record<string, boolean>>({});
  const [symbolicatedTexts, setSymbolicatedTexts] = useState<Record<string, string>>({});
  const [aiReport, setAiReport] = useState<AIGuardianReport | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [activeAutoPatch, setActiveAutoPatch] = useState<AutoPatchData | null>(null);
  const [isAutoPatchModalOpen, setIsAutoPatchModalOpen] = useState(false);
  const [selectedReplayCrash, setSelectedReplayCrash] = useState<CrashReportItem | null>(null);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);

  const loadAutoPatch = async () => {
    try {
      const res = await fetch(`/.netlify/functions/auto-patch?projectId=${projectId}`, {
        headers: { 'x-codepush-api-key': apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveAutoPatch(data.activeCandidate || null);
      }
    } catch {}
  };

  const handlePromoteAutoPatch = async (patchId: string) => {
    try {
      const res = await fetch(`/.netlify/functions/auto-patch?action=promote&projectId=${projectId}&patchId=${patchId}`, {
        method: 'POST',
        headers: { 'x-codepush-api-key': apiKey },
      });
      if (res.ok) {
        setSpikeNotice('🚀 AI AutoPatch promoted to 100% production fleet successfully!');
        await loadCrashesAndBreaker();
      await loadAutoPatch();
        await loadAutoPatch();
      }
    } catch {}
  };

  const handleRejectAutoPatch = async (patchId: string) => {
    try {
      const res = await fetch(`/.netlify/functions/auto-patch?action=reject&projectId=${projectId}&patchId=${patchId}`, {
        method: 'POST',
        headers: { 'x-codepush-api-key': apiKey },
      });
      if (res.ok) {
        setSpikeNotice('AutoPatch candidate discarded.');
        await loadAutoPatch();
      }
    } catch {}
  };

  const handleRunAiDiagnosis = async () => {
    setIsLoadingAi(true);
    try {
      const res = await fetch(`/.netlify/functions/report-crash?action=ai-diagnosis&projectId=${projectId}`, {
        headers: { 'x-codepush-api-key': apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.aiReport) {
          setAiReport(data.aiReport);
        }
      }
    } catch {} finally {
      setIsLoadingAi(false);
    }
  };

  const toggleSymbolication = (id: string, stack: string) => {
    setSymbolicatedCrashes((prev) => {
      const next = !prev[id];
      if (next && !symbolicatedTexts[id]) {
        const res = heuristicSymbolicate(stack);
        setSymbolicatedTexts((t) => ({ ...t, [id]: res.readableStack }));
      }
      return { ...prev, [id]: next };
    });
  };

  // Load live crashes & circuit breaker state
  const loadCrashesAndBreaker = async () => {
    try {
      const res = await fetch(`/.netlify/functions/report-crash?projectId=${projectId}`, {
        headers: { 'x-codepush-api-key': apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.crashes)) {
          setCrashes(data.crashes);
        }
        if (data.circuitBreaker) {
          setCircuitBreaker(data.circuitBreaker);
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadCrashesAndBreaker();
    loadAutoPatch();
    const interval = setInterval(() => {
      loadCrashesAndBreaker();
      loadAutoPatch();
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleResolve = (id: string) => {
    setCrashes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))
    );
  };

  const handleClear = async () => {
    setCrashes([]);
    try {
      await fetch(`/.netlify/functions/report-crash?projectId=${projectId}`, {
        method: 'DELETE',
        headers: { 'x-codepush-api-key': apiKey },
      });
      await loadCrashesAndBreaker();
      await loadAutoPatch();
    } catch {}
  };

  // Test the Circuit Breaker live by simulating a 5-crash spike
  const handleSimulateSpike = async (spikeCount = 5) => {
    setIsSimulatingSpike(true);
    setSpikeNotice(null);
    try {
      const targetPlat = platformFilter === 'all' ? 'android' : platformFilter;
      const res = await fetch(`/.netlify/functions/report-crash?projectId=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-codepush-api-key': apiKey },
        body: JSON.stringify({
          simulateSpike: true,
          spikeCount,
          version: '1.0.1',
          platform: targetPlat,
          message: 'Fatal JavaScript Exception: Cannot read property of undefined in checkout module',
        }),
      });
      const data = await res.json();
      if (data.circuitBreakerTriggered) {
        setSpikeNotice(
          `🚨 CIRCUIT BREAKER TRIPPED! Injected ${spikeCount} crashes. Release v${data.tripDetails?.version || '1.0.1'} was automatically revoked!`
        );
      } else {
        setSpikeNotice(`Injected ${spikeCount} simulated crashes. Total in window: ${data.recentCountInWindow}/${circuitBreaker.threshold}`);
      }
      await loadCrashesAndBreaker();
      await loadAutoPatch();
    } catch (err: any) {
      setSpikeNotice(`Simulation error: ${err.message || 'Unknown'}`);
    } finally {
      setIsSimulatingSpike(false);
      setTimeout(() => setSpikeNotice(null), 8000);
    }
  };

  // Change Circuit Breaker threshold setting
  const handleChangeThreshold = async (newThreshold: number) => {
    try {
      await fetch(`/.netlify/functions/report-crash?projectId=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-codepush-api-key': apiKey },
        body: JSON.stringify({
          action: 'configure-circuit-breaker',
          threshold: newThreshold,
          enabled: true,
        }),
      });
      setCircuitBreaker((prev) => ({ ...prev, threshold: newThreshold }));
    } catch {}
  };

  const filteredCrashes = crashes.filter((c) => {
    const matchesPlat = platformFilter === 'all' || c.platform === platformFilter;
    const matchesSearch =
      c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.device && c.device.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPlat && matchesSearch;
  });

  const unresolvedCount = crashes.filter((c) => !c.resolved).length;

  const cardBgClass = isDark
    ? 'border-slate-800 bg-slate-900/90 text-slate-100 shadow-xl'
    : 'border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/60';

  const windowCrashCount = circuitBreaker.recentCrashCount || 0;
  const isTripActive = !!circuitBreaker.activeTrip;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in font-sans">
      {/* 🛡️ COMPACT PROFESSIONAL TELEMETRY & CIRCUIT BREAKER HEADER */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 relative overflow-hidden transition-all duration-200 ${
          isTripActive
            ? 'bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-slate-950 border-rose-500/60 shadow-lg shadow-rose-500/10'
            : cardBgClass
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Professional Icon, Title, and Inline Status Badges */}
          <div className="flex items-center space-x-3.5 min-w-0">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isTripActive
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {isTripActive ? <ShieldAlert className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  Crash & Exception Telemetry
                </h1>

                {/* Health Status Pill */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    unresolvedCount > 0
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      unresolvedCount > 0 ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
                    }`}
                  />
                  <span>{unresolvedCount > 0 ? `${unresolvedCount} Active Exceptions` : 'Zero Exceptions'}</span>
                </span>

                {/* Circuit Breaker Sentinel Pill */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium border ${
                    isTripActive
                      ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-bounce'
                      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{isTripActive ? 'CIRCUIT BREAKER TRIPPED' : `Sentinel Armed (${circuitBreaker.threshold}/10m)`}</span>
                </span>
              </div>

              <p className={`text-xs mt-0.5 truncate max-w-xl ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isTripActive
                  ? circuitBreaker.activeTrip?.reason
                  : `Real-time JS runtime exception capture with automated circuit breaker rollback.`}
              </p>
            </div>
          </div>

          {/* Right: Compact Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 text-xs">
            {/* Live 10-Min Gauge */}
            <div
              className={`px-2.5 py-1.5 rounded-xl border flex items-center space-x-1.5 font-mono ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-slate-400 text-[11px]">10m:</span>
              <span
                className={`font-bold ${
                  windowCrashCount >= circuitBreaker.threshold ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {windowCrashCount}
              </span>
              <span className="text-slate-500">/{circuitBreaker.threshold}</span>
            </div>

            {/* Threshold Selector Buttons */}
            <div
              className={`p-0.5 rounded-xl border flex items-center space-x-0.5 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] font-mono text-slate-400 px-1.5">Trip:</span>
              {[3, 5, 10].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleChangeThreshold(t)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    circuitBreaker.threshold === t
                      ? 'bg-cyan-500 text-white shadow-xs'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Trip threshold: ${t} crashes in 10 minutes`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Test Trigger Button */}
            <button
              type="button"
              onClick={() => handleSimulateSpike(circuitBreaker.threshold)}
              disabled={isSimulatingSpike}
              className="px-2.5 py-1.5 rounded-xl font-medium text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
              title="Test Circuit Breaker Auto-Revocation with simulated crash spike"
            >
              {isSimulatingSpike ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span>{isSimulatingSpike ? 'Testing...' : 'Test Breaker'}</span>
            </button>

            {/* Clear Log Button */}
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center space-x-1.5"
              title="Clear all recorded crashes"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>

            {/* AI Guardian Diagnosis Button */}
            <button
              type="button"
              onClick={handleRunAiDiagnosis}
              disabled={isLoadingAi}
              className="px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm shadow-cyan-500/20"
              title="Run AI Release Guardian root-cause deduction"
            >
              <Brain className={`h-3.5 w-3.5 text-cyan-400 ${isLoadingAi ? 'animate-pulse' : ''}`} />
              <span>{isLoadingAi ? 'Diagnosing...' : 'AI Guardian'}</span>
            </button>
          </div>
        </div>

        {/* Live Simulation Notice */}
        {spikeNotice && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/40 text-amber-300 text-xs font-mono font-medium flex items-center space-x-2 animate-fade-in shadow-lg">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>{spikeNotice}</span>
          </div>
        )}

        {/* 🤖 AI Release Guardian Incident Report Card */}
        {aiReport && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-950/90 to-slate-900 border border-rose-500/40 shadow-xl space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <span>AI Release Guardian Incident Report</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                      {aiReport.severity} Severity
                    </span>
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiReport(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg"
              >
                ✕ Dismiss
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/20">
                <span className="text-[10px] uppercase font-bold text-rose-400 font-mono block mb-1">
                  Root Cause Analysis:
                </span>
                <p className="text-slate-200 leading-relaxed font-sans">{aiReport.rootCause}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1">
                    Suspected Components:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {aiReport.affectedComponents?.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-mono text-[10px]">
                        {c}
                      </span>
                    )) || <span className="text-slate-400">AppRoot</span>}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1">
                    Recommended Fix:
                  </span>
                  <p className="text-slate-300 leading-relaxed">{aiReport.recommendedAction}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🤖 AI AUTOPATCH CANDIDATE BANNER (1% GHOST CANARY) */}
      {activeAutoPatch && activeAutoPatch.status === 'canary_active' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/70 border border-cyan-500/40 shadow-xl shadow-cyan-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white shrink-0">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  AI AutoPatch Active in 1% Ghost Canary
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {activeAutoPatch.canaryMetrics.crashesObserved} Crashes • 100% Stability
                </span>
                <span className="font-mono text-cyan-400 font-bold text-xs">
                  {activeAutoPatch.candidateVersion}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Defensive fix generated for <span className="font-mono text-rose-300">{activeAutoPatch.errorPattern.substring(0, 50)}...</span> Tested on {activeAutoPatch.canaryMetrics.devicesTargeted} devices.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAutoPatchModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Review Diff & Promote</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 🔍 COMPACT FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search error, version, device..."
            className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex items-center space-x-1 p-1 rounded-xl border border-slate-800/80 bg-slate-900/60">
          {(['all', 'android', 'ios'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1 rounded-lg uppercase font-mono font-bold text-[11px] transition-all cursor-pointer ${
                platformFilter === p
                  ? 'bg-slate-800 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Crash Cards List */}
      <div className="space-y-3">
        {filteredCrashes.length === 0 ? (
          /* Redesigned Compact Empty State (Low-Profile Status Banner) */
          <div className={`p-4 sm:p-5 rounded-2xl border ${cardBgClass} flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm`}>
            <div className="flex items-center space-x-3.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>All Systems Operational</span>
                  <span className="text-emerald-400 font-normal">• Zero Unhandled Exceptions</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Mobile devices running your CodePush releases are 100% healthy. Native exception watchdog is actively monitoring runtime threads.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0 font-mono text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Runtime Healthy</span>
              </span>
            </div>
          </div>
        ) : (
          filteredCrashes.map((crash) => {
            const isExpanded = expandedId === crash.id;
            return (
              <div
                key={crash.id}
                className={`rounded-2xl border p-5 transition-all space-y-3 ${
                  crash.resolved ? 'opacity-60 bg-slate-900/40 border-slate-800' : cardBgClass
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        crash.resolved
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {crash.resolved ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-mono text-sm font-bold text-rose-400">{crash.message}</h4>
                        {crash.circuitBreakerTriggered && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500 animate-pulse">
                            🚨 Tripped Circuit Breaker
                          </span>
                        )}
                        {(crash as any).simulated && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            🧪 Test Spike
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className="font-bold text-slate-200">v{crash.version}</span>
                        <span>•</span>
                        <span className="capitalize">{crash.platform}</span>
                        <span>•</span>
                        <span>{crash.device || 'Android Mobile'}</span>
                        <span>•</span>
                        <span>{new Date(crash.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResolve(crash.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer border ${
                        crash.resolved
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {crash.resolved ? 'Mark Unresolved' : 'Resolve'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReplayCrash(crash);
                        setIsReplayModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 flex items-center space-x-1"
                      title="Inspect deterministic frame-by-frame state leading to this crash"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-purple-400" />
                      <span>Replay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : crash.id)}
                      className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Stack Trace Accordion with Source Map Symbolication */}
                {isExpanded && crash.stack && (
                  <div className="pt-3 border-t border-slate-800 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {symbolicatedCrashes[crash.id] ? 'Decoded TypeScript Stack Trace:' : 'Minified Bundle Call Stack:'}
                        </span>
                        {symbolicatedCrashes[crash.id] && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            🗺️ Source Map Symbolicated
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => toggleSymbolication(crash.id, crash.stack || '')}
                          className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center space-x-1.5 ${
                            symbolicatedCrashes[crash.id]
                              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                          <span>{symbolicatedCrashes[crash.id] ? 'View Minified Stack' : '🔍 De-Minify Stack (Source Map)'}</span>
                        </button>
                      </div>
                    </div>

                    <pre
                      className={`p-4 rounded-xl border font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap transition-colors ${
                        symbolicatedCrashes[crash.id]
                          ? 'bg-slate-950 border-cyan-500/40 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-rose-300'
                      }`}
                    >
                      {symbolicatedCrashes[crash.id]
                        ? (symbolicatedTexts[crash.id] || heuristicSymbolicate(crash.stack).readableStack)
                        : crash.stack}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* AutoPatch Diff & Promotion Modal */}
      <AutoPatchModal
        isOpen={isAutoPatchModalOpen}
        patch={activeAutoPatch}
        onClose={() => setIsAutoPatchModalOpen(false)}
        onPromote={handlePromoteAutoPatch}
        onReject={handleRejectAutoPatch}
        theme={theme}
      />

      {/* Hermes VM Time-Travel State Replay Scrubber */}
      <TimeTravelScrubber
        isOpen={isReplayModalOpen}
        onClose={() => setIsReplayModalOpen(false)}
        crashTitle={selectedReplayCrash?.message}
        theme={theme}
      />
    </div>
  );
};

export default CrashAnalyticsScreen;
