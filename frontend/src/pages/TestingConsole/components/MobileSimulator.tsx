import React from 'react';
import type { TestingMode } from '../types';
import {
  Bell,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';

interface MobileSimulatorProps {
  isDark?: boolean;
  testingMode: TestingMode;
  selectedPlatform: 'android' | 'ios';
  testVersion: string;
  defaultAppName: string;
  simulatedPopupOpen: boolean;
  setSimulatedPopupOpen: (open: boolean) => void;
  testAlertTitle: string;
  testAlertMessage: string;
  onPlayAlertChime: () => void;
  pushSimulatedBannerOpen: boolean;
  setPushSimulatedBannerOpen: (open: boolean) => void;
  pushTitle: string;
  pushBody: string;
  pushSubtitle: string;
  pushSound: boolean;
  pushPriority: 'high' | 'normal';
  pushImageUrl: string;
  pushDeepLink: string;
  deepLinkTriggeredNotice: string | null;
  setDeepLinkTriggeredNotice: (notice: string | null) => void;
}

export const MobileSimulator: React.FC<MobileSimulatorProps> = ({
  isDark: _isDark = true,
  testingMode,
  selectedPlatform,
  testVersion,
  defaultAppName,
  simulatedPopupOpen,
  setSimulatedPopupOpen,
  testAlertTitle,
  testAlertMessage,
  onPlayAlertChime,
  pushSimulatedBannerOpen,
  setPushSimulatedBannerOpen,
  pushTitle,
  pushBody,
  pushSound,
  pushPriority,
  pushImageUrl,
  pushDeepLink,
  deepLinkTriggeredNotice,
  setDeepLinkTriggeredNotice,
}) => {
  return (
    <div className="p-4 sm:p-5 flex-1 flex flex-col items-center justify-center bg-radial from-slate-900/50 to-slate-950 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Realistic Mobile Device Frame */}
      <div className="relative w-full max-w-[245px] rounded-[34px] border-4 border-slate-700 bg-slate-900 shadow-2xl overflow-hidden aspect-[9/17] flex flex-col ring-1 ring-slate-800">
        {/* Top Notch / Dynamic Island */}
        <div className="bg-black pt-2.5 pb-1.5 px-5 flex items-center justify-between z-20">
          <span className="text-[10px] font-mono font-bold text-slate-300">09:41</span>
          <div className="h-3.5 w-16 rounded-full bg-black border border-slate-800 flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
          </div>
          <div className="flex items-center space-x-1 text-slate-300">
            <span className="text-[9px] font-mono">5G</span>
            <span className="h-2 w-3.5 rounded-xs border border-slate-400 inline-block p-0.5">
              <span className="h-full w-full bg-emerald-400 block rounded-2xs" />
            </span>
          </div>
        </div>

        {/* Mobile Screen App Background */}
        <div className="relative flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-4 flex flex-col justify-between overflow-hidden">
          {/* App Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                SS
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-white leading-tight">
                  {defaultAppName}
                </div>
                <div className="text-[9px] font-mono text-cyan-400">v{testVersion} • Connected</div>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* App Background Mock Cards */}
          <div className="space-y-2.5 py-3 opacity-30 filter blur-[0.5px]">
            <div className="h-14 rounded-xl bg-slate-800/60 p-2 space-y-1.5">
              <div className="h-2.5 w-20 bg-slate-700 rounded-sm" />
              <div className="h-2 w-32 bg-slate-700/60 rounded-sm" />
            </div>
            <div className="h-16 rounded-xl bg-slate-800/40 p-2 space-y-1.5">
              <div className="h-2.5 w-28 bg-slate-700 rounded-sm" />
              <div className="h-2 w-40 bg-slate-700/60 rounded-sm" />
              <div className="h-2 w-24 bg-slate-700/40 rounded-sm" />
            </div>
          </div>

          {/* MODE 1 SIMULATION: IN-APP ALERT POPUP DIALOG */}
          {testingMode === 'in-app-alert' && (
            simulatedPopupOpen ? (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3.5 z-30 transition-all">
                <div className="w-full bg-slate-800/95 border border-slate-700/90 rounded-2xl p-4 shadow-2xl text-center space-y-2.5 backdrop-blur-xl">
                  <div className="mx-auto h-9 w-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/25">
                    <Bell className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-black text-white tracking-tight">
                    {testAlertTitle.trim() || 'CodePush Alert Testing'}
                  </h4>
                  <p className="text-[11px] text-slate-200 font-medium leading-relaxed max-h-32 overflow-y-auto px-1">
                    {testAlertMessage.trim() || 'Testing CodePush alert popup on mobile device.'}
                  </p>
                  <div className="pt-2 border-t border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setSimulatedPopupOpen(false)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-cyan-500/25 active:scale-95"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/75 z-20 text-center space-y-2.5">
                <p className="text-xs text-slate-400 font-medium">Alert was dismissed in app simulator.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedPopupOpen(true);
                    onPlayAlertChime();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Re-trigger Popup Alert</span>
                </button>
              </div>
            )
          )}

          {/* MODE 2 SIMULATION: SYSTEM PUSH NOTIFICATION HEADS-UP BANNER */}
          {testingMode === 'push-notification' && (
            pushSimulatedBannerOpen ? (
              <div className="absolute top-2 inset-x-2 z-30 transition-all duration-300 ease-out animate-fadeIn">
                <div className={`p-2.5 rounded-2xl border shadow-2xl backdrop-blur-xl ${
                  selectedPlatform === 'ios'
                    ? 'bg-slate-900/95 border-slate-700/90 text-white'
                    : 'bg-slate-950/95 border-cyan-500/40 text-slate-100'
                }`}>
                  {/* Banner Top Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                    <div className="flex items-center space-x-1.5">
                      <div className="h-4 w-4 rounded-md bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[8px] font-black text-white shrink-0">
                        SS
                      </div>
                      <span className="text-[10px] font-bold text-slate-200">{defaultAppName}</span>
                      <span className="text-[9px] text-slate-400">• now</span>
                      {pushSound && (
                        <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1 shrink-0">
                          <Bell className="h-2 w-2" />
                          <span>Sound</span>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPushSimulatedBannerOpen(false)}
                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Banner Interactive Body */}
                  <div
                    onClick={() => {
                      if (pushDeepLink.trim()) {
                        setDeepLinkTriggeredNotice(`Navigated to: ${pushDeepLink}`);
                        setTimeout(() => setDeepLinkTriggeredNotice(null), 3500);
                      }
                    }}
                    className="pt-1.5 space-y-1 cursor-pointer group"
                    title="Click banner to simulate deep link app open"
                  >
                    <div className="text-[11px] font-black text-white leading-tight flex items-center justify-between">
                      <span className="truncate pr-1">{pushTitle || 'CodePush Notification'}</span>
                      {pushPriority === 'high' && (
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          HIGH
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-snug line-clamp-2 font-medium">
                      {pushBody || 'Live push notification message preview.'}
                    </p>

                    {/* Rich Media Image Preview */}
                    {pushImageUrl.trim() && (
                      <div className="mt-1 rounded-lg overflow-hidden border border-slate-800 max-h-20 bg-slate-950">
                        <img
                          src={pushImageUrl.trim()}
                          alt="Push media preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Deep Link Route Indicator */}
                    {pushDeepLink.trim() && (
                      <div className="pt-1 flex items-center space-x-1 text-[9px] font-mono text-cyan-400 group-hover:text-cyan-300">
                        <ExternalLink className="h-2.5 w-2.5" />
                        <span className="truncate">Deep Link: {pushDeepLink}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/75 z-20 text-center space-y-2.5">
                <p className="text-xs text-slate-400 font-medium">Push notification was dismissed.</p>
                <button
                  type="button"
                  onClick={() => {
                    setPushSimulatedBannerOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Re-trigger Push Banner</span>
                </button>
              </div>
            )
          )}

          {/* MODE 3 SIMULATION: DUAL-SLOT ARCHITECTURE OVERLAY */}
          {testingMode === 'dual-slot-simulator' && (
            <div className="absolute top-2 inset-x-2 z-30 transition-all duration-300 ease-out animate-fadeIn">
              <div className="p-3 rounded-2xl border border-purple-500/50 bg-slate-950/95 shadow-2xl backdrop-blur-xl text-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-400 font-mono">
                    ● HERMES ATOMIC SWAPPER
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Watchdog 5s Armed
                  </span>
                </div>
                <div className="text-[11px] font-black text-slate-100">
                  Boot Partition: /slots/slot_a (v{testVersion})
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Standby slot_b staged. Automatic fallback enabled.
                </p>
              </div>
            </div>
          )}

          {/* Simulated Deep Link Notice Toast */}
          {deepLinkTriggeredNotice && (
            <div className="absolute bottom-5 inset-x-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[10px] font-black p-2 rounded-xl text-center shadow-2xl animate-fadeIn z-40">
              ⚡ {deepLinkTriggeredNotice}
            </div>
          )}

          {/* Bottom Home Indicator */}
          <div className="pt-1 flex justify-center">
            <div className="h-1 w-20 rounded-full bg-slate-600" />
          </div>
        </div>
      </div>
    </div>
  );
};
