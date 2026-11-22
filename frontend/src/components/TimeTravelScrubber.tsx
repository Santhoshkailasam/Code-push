import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Layers,
  X,
} from 'lucide-react';
import type { ReplayFrame } from '../services/StateRecorder';

export interface TimeTravelScrubberProps {
  isOpen: boolean;
  onClose: () => void;
  crashTitle?: string;
  frames?: ReplayFrame[];
  theme?: 'dark' | 'light';
}

// Generate high-fidelity simulated frames if real crash does not have a custom dump
export function generateDemoReplayFrames(crashTitle?: string): ReplayFrame[] {
  const baseTime = Date.now() - 45000;
  return [
    {
      index: 1,
      timestamp: new Date(baseTime).toISOString(),
      timeOffsetMs: 0,
      type: 'navigation',
      name: 'APP_BOOTSTRAP',
      route: 'SplashScreen',
      payload: { binaryVersion: '1.0.0', bundleVersion: '1.0.1' },
      stateSnapshot: { session: { authenticated: true, user: 'dev_user_42' }, cart: { items: [] } },
    },
    {
      index: 2,
      timestamp: new Date(baseTime + 1200).toISOString(),
      timeOffsetMs: 1200,
      type: 'navigation',
      name: 'NAVIGATE_TO_FEED',
      route: 'FeedScreen',
      payload: { category: 'recommended' },
      stateSnapshot: { session: { authenticated: true }, feed: { page: 1, loaded: true } },
    },
    {
      index: 3,
      timestamp: new Date(baseTime + 4500).toISOString(),
      timeOffsetMs: 4500,
      type: 'action',
      name: 'DISPATCH_ADD_TO_CART',
      route: 'FeedScreen',
      payload: { itemId: 'prod_981', title: 'Developer Hoodie', price: 59.99 },
      stateSnapshot: { cart: { items: [{ id: 'prod_981', qty: 1 }], total: 59.99 } },
    },
    {
      index: 4,
      timestamp: new Date(baseTime + 9800).toISOString(),
      timeOffsetMs: 9800,
      type: 'navigation',
      name: 'NAVIGATE_TO_CHECKOUT',
      route: 'CheckoutScreen',
      payload: { flow: 'instant_checkout' },
      stateSnapshot: { checkout: { step: 'shipping', couponApplied: null } },
    },
    {
      index: 5,
      timestamp: new Date(baseTime + 14200).toISOString(),
      timeOffsetMs: 14200,
      type: 'action',
      name: 'DISPATCH_APPLY_COUPON',
      route: 'CheckoutScreen',
      payload: { code: 'BLACKFRIDAY_90', discount: 0.9 },
      stateSnapshot: { checkout: { step: 'payment', coupon: 'BLACKFRIDAY_90', subtotal: 5.99 } },
    },
    {
      index: 6,
      timestamp: new Date(baseTime + 18500).toISOString(),
      timeOffsetMs: 18500,
      type: 'network',
      name: 'HTTP_200_VALIDATE_PROMO',
      route: 'CheckoutScreen',
      payload: { endpoint: '/api/v1/promos/validate', durationMs: 142 },
      stateSnapshot: { paymentGateway: 'ready', validationToken: 'tok_live_891' },
    },
    {
      index: 7,
      timestamp: new Date(baseTime + 22100).toISOString(),
      timeOffsetMs: 22100,
      type: 'action',
      name: 'STATE_MUTATION_UNHANDLED_ACCESS',
      route: 'CheckoutScreen',
      payload: { selectedVariant: undefined, requestedProperty: 'price' },
      stateSnapshot: { selectedVariant: null, errorTriggerPending: true },
    },
    {
      index: 8,
      timestamp: new Date(baseTime + 22120).toISOString(),
      timeOffsetMs: 22120,
      type: 'crash',
      name: 'FATAL_EXCEPTION_THROWN',
      route: 'CheckoutScreen:42',
      payload: {
        error: crashTitle || "TypeError: Cannot read properties of undefined (reading 'price')",
        stack: "at renderCheckoutSummary (CheckoutScreen.tsx:42:19)\n    at FlatList.renderList (VirtualizedList.js:128:10)",
      },
      stateSnapshot: { crashedAtLine: 42, unhandledState: true },
    },
  ];
}

export const TimeTravelScrubber: React.FC<TimeTravelScrubberProps> = ({
  isOpen,
  onClose,
  crashTitle,
  frames: customFrames,
  theme = 'dark',
}) => {
  const frames = customFrames && customFrames.length > 0 ? customFrames : generateDemoReplayFrames(crashTitle);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(frames.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const isDark = theme === 'dark';

  const currentFrame = frames[currentFrameIndex] || frames[0];

  useEffect(() => {
    setCurrentFrameIndex(frames.length - 1);
  }, [frames.length]);

  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 900);
    }
    return () => clearInterval(timer);
  }, [isPlaying, frames.length]);

  if (!isOpen) return null;

  const typeColorMap = {
    navigation: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
    action: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
    network: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    crash: 'text-rose-400 bg-rose-500/20 border-rose-500/40',
  };

  return (
    <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/70 backdrop-blur-md pointer-events-auto animate-fade-in font-sans">
      <div onClick={onClose} className="fixed inset-0 top-0 left-0 w-screen h-screen z-0 bg-transparent cursor-default" />

      <div
        className={`w-full max-w-3xl my-auto mx-auto rounded-3xl border p-6 sm:p-7 shadow-2xl relative z-10 transition-all duration-300 transform scale-100 max-h-[92vh] overflow-y-auto ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/90'
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white shrink-0">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-lg tracking-tight">Hermes Deterministic Time-Travel Replay</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 border border-purple-500/30 text-purple-400 uppercase">
                  Ring Buffer
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Frame-by-frame state and route reconstruction leading up to crash
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

        {/* Interactive Scrubber Controls & Visual Timeline */}
        <div className="mt-5 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-slate-400">
                  Frame {currentFrameIndex + 1} of {frames.length}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                    typeColorMap[currentFrame.type]
                  }`}
                >
                  {currentFrame.type.toUpperCase()}
                </span>
              </div>

              {/* Playback Steppers */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentFrameIndex(0)}
                  disabled={currentFrameIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-all cursor-pointer"
                  title="First Frame (Boot)"
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentFrameIndex((i) => Math.max(0, i - 1))}
                  disabled={currentFrameIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-all cursor-pointer"
                  title="Step Backward (-1 frame)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-purple-500/20"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentFrameIndex((i) => Math.min(frames.length - 1, i + 1))}
                  disabled={currentFrameIndex === frames.length - 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-all cursor-pointer"
                  title="Step Forward (+1 frame)"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentFrameIndex(frames.length - 1)}
                  disabled={currentFrameIndex === frames.length - 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-all cursor-pointer"
                  title="Last Frame (Crash Incident)"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Timeline Slider with Dots */}
            <div className="space-y-1.5">
              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={currentFrameIndex}
                onChange={(e) => setCurrentFrameIndex(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Start: +0ms</span>
                <span className="text-purple-400 font-bold">
                  +{currentFrame.timeOffsetMs}ms
                </span>
                <span className="text-rose-400 font-bold">
                  +{frames[frames.length - 1]?.timeOffsetMs || 0}ms (Fatal Crash)
                </span>
              </div>
            </div>
          </div>

          {/* Active Frame Inspection Window */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
            {/* Frame Metadata */}
            <div className="md:col-span-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="border-b border-slate-800 pb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Event Name
                </span>
                <span className="font-mono font-black text-white text-xs mt-0.5 block truncate">
                  {currentFrame.name}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Active Screen Route
                </span>
                <span className="font-mono text-cyan-400 text-xs mt-0.5 block truncate">
                  {currentFrame.route || 'GlobalApp'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Event Payload
                </span>
                <pre className="mt-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto max-h-32">
                  {JSON.stringify(currentFrame.payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* State Snapshot Tree at this frame */}
            <div className="md:col-span-7 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono flex items-center space-x-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-400" />
                  <span>State Snapshot Tree at Frame {currentFrameIndex + 1}</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500">Hermes Heap Bindings</span>
              </div>

              <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-56 leading-relaxed">
                {JSON.stringify(currentFrame.stateSnapshot || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            Close Replay
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeTravelScrubber;

