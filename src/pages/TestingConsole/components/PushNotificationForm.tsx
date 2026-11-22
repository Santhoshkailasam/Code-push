import React, { useState } from 'react';
import { PUSH_PRESETS } from '../types';
import {
  Smartphone,
  Apple,
  Radio,
  Layers,
  Sparkles,
  BellRing,
  Volume2,
  VolumeX,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

interface PushNotificationFormProps {
  isDark?: boolean;
  selectedPlatform: 'android' | 'ios';
  setSelectedPlatform: (p: 'android' | 'ios') => void;
  testVersion: string;
  setTestVersion: (v: string) => void;
  pushTarget: 'all' | 'token' | 'topic';
  setPushTarget: (t: 'all' | 'token' | 'topic') => void;
  pushToken: string;
  setPushToken: (t: string) => void;
  pushTopic: string;
  setPushTopic: (t: string) => void;
  pushSound: boolean;
  setPushSound: (s: boolean) => void;
  pushPriority: 'high' | 'normal';
  setPushPriority: (p: 'high' | 'normal') => void;
  pushTitle: string;
  setPushTitle: (t: string) => void;
  pushSubtitle: string;
  setPushSubtitle: (s: string) => void;
  pushBody: string;
  setPushBody: (b: string) => void;
  pushDeepLink: string;
  setPushDeepLink: (d: string) => void;
  pushImageUrl: string;
  setPushImageUrl: (u: string) => void;
  defaultAppName: string;
  isDispatchingPush: boolean;
  onDispatch: () => void;
  onClear: () => void;
  onCopyCurl: () => void;
  copiedUrl: boolean;
}

export const PushNotificationForm: React.FC<PushNotificationFormProps> = ({
  isDark = true,
  selectedPlatform,
  setSelectedPlatform,
  testVersion,
  setTestVersion,
  pushTarget,
  setPushTarget,
  pushToken,
  setPushToken,
  pushTopic,
  setPushTopic,
  pushSound,
  setPushSound,
  pushPriority,
  setPushPriority,
  pushTitle,
  setPushTitle,
  pushSubtitle,
  setPushSubtitle,
  pushBody,
  setPushBody,
  pushDeepLink: _pushDeepLink,
  setPushDeepLink,
  pushImageUrl: _pushImageUrl,
  setPushImageUrl,
  defaultAppName,
  isDispatchingPush,
  onDispatch,
  onClear,
  onCopyCurl,
  copiedUrl,
}) => {
  const [showPushToken, setShowPushToken] = useState(false);

  const innerBoxClass = isDark
    ? 'border-slate-800 bg-slate-950/60'
    : 'border-slate-200 bg-slate-50/90';

  return (
    <div className="space-y-4">
      {/* Target Setup: Platform & App Version (Left) + Target Audience (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Module 1: Target Platform & App Version */}
        <div className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between ${innerBoxClass}`}>
          <div className="flex items-center justify-between">
            <label className={`text-xs font-mono font-bold uppercase flex items-center space-x-1.5 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
              <span>Target Platform &amp; App Version</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-8">
              <label className={`block text-[10px] font-mono font-bold uppercase mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Platform OS
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('android')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    selectedPlatform === 'android'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="h-4 w-4 shrink-0" />
                  <span>Android OS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('ios')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    selectedPlatform === 'ios'
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Apple className="h-4 w-4 shrink-0" />
                  <span>Apple iOS</span>
                </button>
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className={`block text-[10px] font-mono font-bold uppercase mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                App Version
              </label>
              <input
                type="text"
                value={testVersion}
                onChange={(e) => setTestVersion(e.target.value)}
                placeholder="1.0.0"
                className={`w-full py-2 px-2.5 rounded-xl border font-mono text-xs font-bold text-center outline-none transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white focus:border-cyan-400'
                    : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Module 2: Target Audience Selector */}
        <div className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between ${innerBoxClass}`}>
          <div className="flex items-center justify-between">
            <label className={`text-xs font-mono font-bold uppercase flex items-center space-x-1.5 ${
              isDark ? 'text-cyan-300' : 'text-cyan-900'
            }`}>
              <Radio className="h-3.5 w-3.5 text-cyan-400" />
              <span>Target Audience / Channel</span>
            </label>
            <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              App: {defaultAppName}
            </span>
          </div>

          <div>
            <label className={`block text-[10px] font-mono font-bold uppercase mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Audience Scope
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPushTarget('all')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  pushTarget === 'all'
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span>All Devices</span>
              </button>

              <button
                type="button"
                onClick={() => setPushTarget('token')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  pushTarget === 'token'
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5 shrink-0" />
                <span>Device Token</span>
              </button>

              <button
                type="button"
                onClick={() => setPushTarget('topic')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  pushTarget === 'topic'
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>Topic (/topics)</span>
              </button>
            </div>
          </div>

          {pushTarget === 'token' && (
            <div className="pt-0.5 animate-fadeIn">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Device Registration Token
                </span>
                <button
                  type="button"
                  onClick={() => setShowPushToken(!showPushToken)}
                  className="text-[10px] flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  title={showPushToken ? "Hide Device Token" : "Reveal Device Token"}
                >
                  {showPushToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{showPushToken ? "Hide" : "View"}</span>
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPushToken ? 'text' : 'password'}
                  value={pushToken}
                  onChange={(e) => setPushToken(e.target.value)}
                  placeholder="FCM Device Registration Token (e.g. fbI_PZx0...)"
                  className={`w-full px-3 py-2 pr-9 rounded-xl border font-mono text-xs font-medium outline-none transition-all ${
                    isDark ? 'bg-slate-900 border-slate-700 text-cyan-200 focus:border-cyan-400' : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPushToken(!showPushToken)}
                  className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                  title={showPushToken ? "Hide Device Token" : "Reveal Device Token"}
                >
                  {showPushToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          {pushTarget === 'topic' && (
            <div className="pt-0.5 animate-fadeIn">
              <input
                type="text"
                value={pushTopic}
                onChange={(e) => setPushTopic(e.target.value)}
                placeholder="Topic name (e.g. updates_all, beta_testers)"
                className={`w-full px-3 py-2 rounded-xl border font-mono text-xs font-medium outline-none transition-all ${
                  isDark ? 'bg-slate-900 border-slate-700 text-cyan-200 focus:border-cyan-400' : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                }`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Push Notification Content Box */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-slate-950/70 border-cyan-500/30' : 'bg-cyan-50/60 border-cyan-200'
      }`}>
        <div className="flex items-center justify-between">
          <label className={`text-xs font-extrabold flex items-center space-x-1.5 ${
            isDark ? 'text-cyan-300' : 'text-cyan-950'
          }`}>
            <BellRing className="h-3.5 w-3.5 text-cyan-400" />
            <span>Push Notification Content (Lock Screen / Tray)</span>
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setPushSound(!pushSound)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                pushSound
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
              title="Toggle sound chime on push receipt"
            >
              {pushSound ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              <span>{pushSound ? 'Sound On' : 'Silent'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPushPriority(pushPriority === 'high' ? 'normal' : 'high')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                pushPriority === 'high'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span>Priority: {pushPriority.toUpperCase()}</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className={`block text-[11px] font-mono font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Notification Title
              </label>
              <input
                type="text"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="Push title..."
                className={`w-full px-3 py-2 rounded-xl border font-mono text-xs font-bold outline-none transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Subtitle / Tag
              </label>
              <input
                type="text"
                value={pushSubtitle}
                onChange={(e) => setPushSubtitle(e.target.value)}
                placeholder="e.g. SkillSwap • Now"
                className={`w-full px-3 py-2 rounded-xl border font-mono text-xs font-medium outline-none transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-mono font-bold uppercase tracking-wider mb-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Notification Body Message
            </label>
            <textarea
              rows={2}
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              placeholder="Enter the push notification message shown on the lock screen..."
              className={`w-full p-2.5 rounded-xl border font-mono text-xs font-semibold resize-none outline-none transition-all min-h-[58px] ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-cyan-200 placeholder-slate-600 focus:border-cyan-400'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
              }`}
            />
          </div>
        </div>

        {/* Push Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
          {PUSH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setPushTitle(preset.title);
                setPushBody(preset.body);
                setPushSubtitle(preset.subtitle);
                setPushDeepLink(preset.deepLink);
                setPushImageUrl(preset.imageUrl);
              }}
              className={`text-[10px] px-2 py-0.5 rounded-lg font-mono transition-all cursor-pointer ${
                pushTitle === preset.title
                  ? 'bg-cyan-500 text-white font-bold shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onDispatch}
          disabled={isDispatchingPush}
          className="flex-1 py-3 px-3.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50 min-w-0"
        >
          {isDispatchingPush ? <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" /> : <BellRing className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{isDispatchingPush ? 'Dispatching FCM Push...' : 'Send Live Push Notification'}</span>
        </button>

        <button
          type="button"
          onClick={onClear}
          className={`py-3 px-3.5 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            isDark
              ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300'
          }`}
          title="Clear push notification queue"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          <span>Clear Queue</span>
        </button>

        <button
          type="button"
          onClick={onCopyCurl}
          className={`py-3 px-3.5 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
            isDark
              ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-cyan-600 hover:border-cyan-300'
          }`}
          title="Copy FCM v1 cURL command"
        >
          {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copiedUrl ? 'Copied' : 'Copy cURL'}</span>
        </button>
      </div>
    </div>
  );
};
