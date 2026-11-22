import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Trash2,
  Code2,
  FileCode,
  Layers,
} from 'lucide-react';

export interface AutoPatchData {
  id: string;
  status: 'canary_active' | 'promoted' | 'rejected';
  originalVersion: string;
  candidateVersion: string;
  platform: 'android' | 'ios';
  errorPattern: string;
  fileTarget: string;
  functionTarget?: string;
  patchType: string;
  patchRationale: string;
  originalSnippet: string;
  patchedSnippet: string;
  canaryMetrics: {
    cohortPercentage: number;
    devicesTargeted: number;
    crashesObserved: number;
    crashRate: number;
    stabilityScore: number;
    verifiedDurationSeconds?: number;
  };
  createdAt: string;
}

export interface AutoPatchModalProps {
  isOpen: boolean;
  patch: AutoPatchData | null;
  onClose: () => void;
  onPromote: (patchId: string) => Promise<void>;
  onReject: (patchId: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

export const AutoPatchModal: React.FC<AutoPatchModalProps> = ({
  isOpen,
  patch,
  onClose,
  onPromote,
  onReject,
  theme = 'dark',
}) => {
  const [isPromoting, setIsPromoting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!isOpen || !patch) return null;

  const isDark = theme === 'dark';

  const handlePromote = async () => {
    setIsPromoting(true);
    try {
      await onPromote(patch.id);
      onClose();
    } finally {
      setIsPromoting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject(patch.id);
      onClose();
    } finally {
      setIsRejecting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/60 backdrop-blur-md pointer-events-auto animate-fade-in">
      <div onClick={onClose} className="fixed inset-0 top-0 left-0 w-screen h-screen z-0 bg-transparent cursor-default" />

      <div
        className={`w-full max-w-2xl my-auto mx-auto rounded-3xl border p-6 sm:p-7 shadow-2xl relative z-10 transition-all duration-300 transform scale-100 max-h-[92vh] overflow-y-auto ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/90'
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white shrink-0">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-lg tracking-tight">AI Autonomous Micro-Patch</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>1% Canary Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Defensive hotfix synthesized for candidate release{' '}
                <span className="font-mono text-cyan-400 font-bold">{patch.candidateVersion}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Incident Summary Card */}
        <div className="mt-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-mono text-rose-400 font-bold flex items-center space-x-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Caught: {patch.errorPattern}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">{patch.fileTarget}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{patch.patchRationale}</p>
          </div>

          {/* Side-by-Side / Unified AST Diff Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-slate-400 flex items-center space-x-1.5">
                <FileCode className="h-3.5 w-3.5 text-cyan-400" />
                <span>Synthesized AST Transformation Diff</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono font-bold">
                {patch.patchType}
              </span>
            </div>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden text-[11px] font-mono">
              <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-300">
                <div className="text-[10px] uppercase font-bold text-rose-400 mb-1">
                  - Vulnerable Runtime Code
                </div>
                <pre className="whitespace-pre-wrap">{patch.originalSnippet}</pre>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-300">
                <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">
                  + AI Synthesized Defensive Guard
                </div>
                <pre className="whitespace-pre-wrap">{patch.patchedSnippet}</pre>
              </div>
            </div>
          </div>

          {/* 1% Ghost Canary Live Telemetry Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Canary Fleet</div>
              <div className="text-base font-black text-cyan-400 mt-0.5">
                {patch.canaryMetrics.devicesTargeted} devices
              </div>
              <span className="text-[9px] text-slate-400">1% Partition</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Canary Crashes</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {patch.canaryMetrics.crashesObserved}
              </div>
              <span className="text-[9px] text-emerald-400 font-bold">0.00% Crash Rate</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Stability</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {patch.canaryMetrics.stabilityScore}%
              </div>
              <span className="text-[9px] text-emerald-400 font-bold">Safe for Prod</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Verification</div>
              <div className="text-base font-black text-indigo-400 mt-0.5">
                {patch.canaryMetrics.verifiedDurationSeconds || 120}s
              </div>
              <span className="text-[9px] text-slate-400 font-mono">Survival Window</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReject}
            disabled={isRejecting || isPromoting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isRejecting ? 'Discarding...' : 'Discard Patch'}</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer flex-1 sm:flex-none"
            >
              Keep in Canary
            </button>

            <button
              type="button"
              onClick={handlePromote}
              disabled={isPromoting || isRejecting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer flex-1 sm:flex-none"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isPromoting ? 'Promoting...' : 'Promote to 100% Fleet (1-Click)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default AutoPatchModal;

