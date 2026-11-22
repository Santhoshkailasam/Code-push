import React, { useState } from 'react';
import type { Project } from '../../../types';
import {
  Smartphone,
  Apple,
  MessageSquare,
  Send,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface InAppAlertFormProps {
  isDark?: boolean;
  selectedPlatform: 'android' | 'ios';
  setSelectedPlatform: (p: 'android' | 'ios') => void;
  testVersion: string;
  setTestVersion: (v: string) => void;
  testProjectId: string;
  setTestProjectId: (id: string) => void;
  setTestApiKey: (key: string) => void;
  isAppScopedOnly: boolean;
  setIsAppScopedOnly: (scoped: boolean) => void;
  testAlertTitle: string;
  setTestAlertTitle: (t: string) => void;
  testAlertMessage: string;
  setTestAlertMessage: (m: string) => void;
  projects?: Project[];
  isTestingApi: boolean;
  onDispatch: () => void;
  onClear: () => void;
  onCopyCurl: () => void;
  copiedUrl: boolean;
}

export const InAppAlertForm: React.FC<InAppAlertFormProps> = ({
  isDark = true,
  selectedPlatform,
  setSelectedPlatform,
  testVersion,
  setTestVersion,
  testProjectId,
  setTestProjectId,
  setTestApiKey,
  isAppScopedOnly,
  setIsAppScopedOnly,
  testAlertTitle,
  setTestAlertTitle,
  testAlertMessage,
  setTestAlertMessage,
  projects = [],
  isTestingApi,
  onDispatch,
  onClear,
  onCopyCurl,
  copiedUrl,
}) => {
  const [showProjectId, setShowProjectId] = useState(false);

  const innerBoxClass = isDark
    ? 'border-slate-800 bg-slate-950/60'
    : 'border-slate-200 bg-slate-50/90';

  return (
    <div className="space-y-4">
      {/* Target Platform & App Version Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={`block text-xs font-mono font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Target Platform
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedPlatform('android')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                selectedPlatform === 'android'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm'
                  : isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span>Android OS</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform('ios')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                selectedPlatform === 'ios'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-sm'
                  : isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Apple className="h-4 w-4" />
              <span>Apple iOS</span>
            </button>
          </div>
        </div>

        <div>
          <label className={`block text-xs font-mono font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Installed App Version
          </label>
          <input
            type="text"
            value={testVersion}
            onChange={(e) => setTestVersion(e.target.value)}
            placeholder="1.0.0"
            className={`w-full py-2.5 px-3 rounded-xl border font-mono text-xs font-bold outline-none transition-all ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-400'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'
            }`}
          />
        </div>
      </div>

      {/* App Scope (Project ID) */}
      <div className={`p-4 rounded-2xl border space-y-3 ${innerBoxClass}`}>
        <div className="flex items-center justify-between">
          <label className={`text-xs font-mono font-bold uppercase ${isDark ? 'text-cyan-300' : 'text-cyan-900'}`}>
            App Scope (Project ID)
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer text-[10px] font-bold text-cyan-400">
            <input
              type="checkbox"
              checked={isAppScopedOnly}
              onChange={(e) => setIsAppScopedOnly(e.target.checked)}
              className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
            />
            <span>Targeted to this App Only</span>
          </label>
        </div>

        <div className="relative flex items-center">
          <input
            type={showProjectId ? 'text' : 'password'}
            value={testProjectId}
            onChange={(e) => setTestProjectId(e.target.value)}
            placeholder="app_rCYp1a_..."
            className={`w-full px-3 py-2 pr-9 rounded-xl border font-mono text-xs font-bold outline-none transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowProjectId(!showProjectId)}
            className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title={showProjectId ? "Hide App ID" : "Reveal App ID"}
          >
            {showProjectId ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        {projects.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-semibold">Switch app:</span>
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setTestProjectId(p.id);
                  if (p.apiKey) setTestApiKey(p.apiKey);
                }}
                className={`text-[10px] px-2 py-0.5 rounded font-mono transition-all cursor-pointer ${
                  testProjectId === p.id
                    ? 'bg-cyan-500 text-white font-bold'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* In-App Alert Popup Message Box */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-slate-950/70 border-cyan-500/30' : 'bg-cyan-50/60 border-cyan-200'
      }`}>
        <div className="flex items-center justify-between">
          <label className={`text-xs font-extrabold flex items-center space-x-1.5 ${
            isDark ? 'text-cyan-300' : 'text-cyan-950'
          }`}>
            <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
            <span>In-App Mobile Alert Message</span>
          </label>
          <span className="text-[9px] font-mono text-cyan-400 font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
            Alert.alert()
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className={`block text-[11px] font-mono font-bold uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Alert Title (In-App Popup Heading)
            </label>
            <input
              type="text"
              value={testAlertTitle}
              onChange={(e) => setTestAlertTitle(e.target.value)}
              placeholder="Alert Title (e.g. CodePush Notice)"
              className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold outline-none transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[11px] font-mono font-bold uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Broadcast Alert Message (Body)
            </label>
            <textarea
              rows={3}
              value={testAlertMessage}
              onChange={(e) => setTestAlertMessage(e.target.value)}
              placeholder="Enter alert message to popup on connected mobile phone..."
              className={`w-full p-2.5 rounded-xl border font-mono text-xs font-semibold resize-none outline-none transition-all min-h-[72px] ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-cyan-200 placeholder-slate-600 focus:border-cyan-400'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onDispatch}
          disabled={isTestingApi}
          className="flex-1 py-3 px-3.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50 min-w-0"
        >
          {isTestingApi ? <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Send className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{isTestingApi ? 'Dispatching...' : 'Send Live HTTP Request & Trigger Alert'}</span>
        </button>

        <button
          type="button"
          onClick={onClear}
          className={`py-3 px-3.5 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            isDark
              ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300'
          }`}
          title="Clear active broadcast alerts across all channels"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          <span>Clear Alert</span>
        </button>

        <button
          type="button"
          onClick={onCopyCurl}
          className={`py-3 px-3.5 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            isDark
              ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-cyan-600 hover:border-cyan-300'
          }`}
          title="Copy full HTTP GET URL for Postman or cURL"
        >
          {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copiedUrl ? 'Copied' : 'Copy cURL'}</span>
        </button>
      </div>
    </div>
  );
};
