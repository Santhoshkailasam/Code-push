import React from 'react';

interface BaseSkeletonProps {
  theme?: 'dark' | 'light';
  className?: string;
}

export const SkeletonItem: React.FC<BaseSkeletonProps & { style?: React.CSSProperties }> = ({
  theme = 'dark',
  className = '',
  style,
}) => {
  const isDark = theme === 'dark';
  return (
    <div
      style={style}
      className={`relative overflow-hidden rounded-xl animate-pulse ${
        isDark ? 'bg-slate-800/60' : 'bg-slate-200/80'
      } ${className}`}
    >
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
};

export const DashboardSkeleton: React.FC<BaseSkeletonProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 4 Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`p-5 rounded-2xl border backdrop-blur-md relative overflow-hidden space-y-3 ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-slate-200/80 shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <SkeletonItem theme={theme} className="h-3 w-28" />
              <SkeletonItem theme={theme} className="h-8 w-8 rounded-xl" />
            </div>
            <div className="flex items-baseline justify-between">
              <SkeletonItem theme={theme} className="h-7 w-20" />
              <SkeletonItem theme={theme} className="h-4 w-12 rounded-full" />
            </div>
            <SkeletonItem theme={theme} className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Activity & Endpoint Health Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className={`lg:col-span-2 rounded-2xl border p-6 space-y-4 ${
            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-slate-200 shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <SkeletonItem theme={theme} className="h-5 w-44" />
            <SkeletonItem theme={theme} className="h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <SkeletonItem theme={theme} className="h-7 w-7 rounded-lg" />
                  <div className="space-y-1.5">
                    <SkeletonItem theme={theme} className="h-3.5 w-64" />
                    <SkeletonItem theme={theme} className="h-2.5 w-40" />
                  </div>
                </div>
                <SkeletonItem theme={theme} className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>

        <div
          className={`rounded-2xl border p-6 space-y-4 flex flex-col justify-between ${
            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-slate-200 shadow-md'
          }`}
        >
          <div className="space-y-4">
            <SkeletonItem theme={theme} className="h-5 w-36" />
            <SkeletonItem theme={theme} className="h-3 w-48" />
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <SkeletonItem theme={theme} key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <SkeletonItem theme={theme} className="h-4 w-full rounded-lg" />
        </div>
      </div>

      {/* Active Production Cards Skeleton */}
      <div className="pt-4 border-t border-slate-800/60 space-y-4">
        <SkeletonItem theme={theme} className="h-6 w-52" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={`p-6 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-slate-200 shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <SkeletonItem theme={theme} className="h-11 w-11 rounded-xl" />
                  <div className="space-y-1.5">
                    <SkeletonItem theme={theme} className="h-5 w-36" />
                    <SkeletonItem theme={theme} className="h-3 w-24" />
                  </div>
                </div>
                <SkeletonItem theme={theme} className="h-6 w-28 rounded-full" />
              </div>
              <SkeletonItem theme={theme} className="h-20 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <SkeletonItem theme={theme} className="h-12 w-full rounded-lg" />
                <SkeletonItem theme={theme} className="h-12 w-full rounded-lg" />
              </div>
              <SkeletonItem theme={theme} className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<BaseSkeletonProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/95 border-slate-200 shadow-xl'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <SkeletonItem theme={theme} className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <SkeletonItem theme={theme} className="h-5 w-48" />
            <SkeletonItem theme={theme} className="h-3 w-64" />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <SkeletonItem theme={theme} className="h-9 w-48 rounded-xl" />
          <SkeletonItem theme={theme} className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800/60">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between">
          <SkeletonItem theme={theme} className="h-4 w-20" />
          <SkeletonItem theme={theme} className="h-4 w-24" />
          <SkeletonItem theme={theme} className="h-4 w-28" />
          <SkeletonItem theme={theme} className="h-4 w-16" />
          <SkeletonItem theme={theme} className="h-4 w-32" />
        </div>
        <div className="divide-y divide-slate-800/50 p-2 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3.5 flex items-center justify-between">
              <SkeletonItem theme={theme} className="h-6 w-20 rounded-xl" />
              <SkeletonItem theme={theme} className="h-4 w-16" />
              <SkeletonItem theme={theme} className="h-6 w-28 rounded-lg" />
              <SkeletonItem theme={theme} className="h-5 w-20 rounded-full" />
              <SkeletonItem theme={theme} className="h-4 w-40" />
              <div className="flex space-x-2">
                <SkeletonItem theme={theme} className="h-8 w-16 rounded-xl" />
                <SkeletonItem theme={theme} className="h-8 w-8 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const UploaderSkeleton: React.FC<BaseSkeletonProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/95 border-slate-200 shadow-xl'
      }`}
    >
      <div className="flex items-center space-x-4">
        <SkeletonItem theme={theme} className="h-14 w-14 rounded-2xl" />
        <div className="space-y-2">
          <SkeletonItem theme={theme} className="h-6 w-56" />
          <SkeletonItem theme={theme} className="h-3 w-80" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonItem theme={theme} className="h-12 w-full rounded-2xl" />
        <SkeletonItem theme={theme} className="h-12 w-full rounded-2xl" />
      </div>

      <SkeletonItem theme={theme} className="h-48 w-full rounded-3xl" />

      <div className="space-y-4">
        <SkeletonItem theme={theme} className="h-12 w-full rounded-xl" />
        <SkeletonItem theme={theme} className="h-24 w-full rounded-xl" />
      </div>

      <SkeletonItem theme={theme} className="h-12 w-full rounded-2xl" />
    </div>
  );
};

export const FullPageSkeleton: React.FC<BaseSkeletonProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-indigo-50 text-slate-900'
      }`}
    >
      {/* Sidebar Skeleton */}
      <div
        className={`w-64 h-full p-6 border-r flex flex-col justify-between hidden md:flex ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <SkeletonItem theme={theme} className="h-10 w-10 rounded-xl" />
            <SkeletonItem theme={theme} className="h-5 w-32" />
          </div>
          <div className="space-y-2 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonItem theme={theme} key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <SkeletonItem theme={theme} className="h-14 w-full rounded-2xl" />
      </div>

      {/* Main Container Skeleton */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar Skeleton */}
        <div
          className={`h-16 px-6 border-b flex items-center justify-between ${
            isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <SkeletonItem theme={theme} className="h-6 w-36" />
          <div className="flex items-center space-x-3">
            <SkeletonItem theme={theme} className="h-9 w-9 rounded-xl" />
            <SkeletonItem theme={theme} className="h-9 w-9 rounded-xl" />
            <SkeletonItem theme={theme} className="h-9 w-32 rounded-xl" />
          </div>
        </div>

        {/* Content Skeleton */}
        <main className="flex-1 p-8 overflow-y-auto">
          <DashboardSkeleton theme={theme} />
        </main>
      </div>
    </div>
  );
};

export default FullPageSkeleton;
