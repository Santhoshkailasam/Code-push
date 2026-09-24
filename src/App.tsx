import React, { useState, useEffect } from 'react';
import { TopHeader } from './components/TopHeader';
import { Sidebar } from './components/Sidebar';
import { ActiveReleaseCard } from './components/ActiveReleaseCard';
import { BundleUploader } from './components/BundleUploader';
import { ReleaseHistory } from './components/ReleaseHistory';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { NotificationDrawer } from './components/NotificationDrawer';
import { IntegrationDocs } from './components/IntegrationDocs';
import { ReleaseDetailScreen } from './components/ReleaseDetailScreen';
import type { VersionData, Platform, ReleaseHistoryItem } from './types';
import {
  loadVersionDataAsync,
  loadVersionDataSync,
  saveVersionData,
  deleteReleaseRecord,
} from './utils/storage';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [data, setData] = useState<VersionData>(() => loadVersionDataSync());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedReleaseForDetail, setSelectedReleaseForDetail] = useState<ReleaseHistoryItem | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('codepush_theme') as 'dark' | 'light') || 'dark';
  });

  // Load SQLite DB data on mount
  useEffect(() => {
    loadVersionDataAsync().then((sqliteData) => {
      if (sqliteData) {
        setData(sqliteData);
      }
    });
  }, []);

  useEffect(() => {
    saveVersionData(data);
  }, [data]);

  useEffect(() => {
    localStorage.setItem('codepush_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setIsThemeTransitioning(true);
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    setTimeout(() => setIsThemeTransitioning(false), 750);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePublish = ({
    platform,
    version,
    mandatory,
    releaseNotes,
    fileName,
    hash,
    sizeBytes,
  }: {
    platform: Platform;
    version: string;
    mandatory: boolean;
    releaseNotes: string;
    fileName: string;
    hash?: string;
    sizeBytes?: number;
  }) => {
    const finalHash =
      hash ||
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newReleaseItem: ReleaseHistoryItem = {
      id: `rel_${Date.now()}`,
      platform,
      version,
      hash: finalHash,
      mandatory,
      releaseNotes,
      createdAt: new Date().toISOString(),
      downloadUrl: `https://your-site.netlify.app/bundles/${fileName}`,
      sizeBytes: sizeBytes || 1024 * 180,
    };

    const nextData: VersionData = {
      ...data,
      [platform]: {
        latestVersion: version,
        minAppVersion: data[platform].minAppVersion,
        downloadUrl: `https://your-site.netlify.app/bundles/${fileName}`,
        mandatory,
        hash: finalHash,
        releaseNotes,
        updatedAt: new Date().toISOString(),
        sizeBytes: sizeBytes || 1024 * 180,
      },
      history: [newReleaseItem, ...data.history],
    };

    setData(nextData);
    saveVersionData(nextData);

    showToast(`Published ${platform.toUpperCase()} update v${version} to Netlify Edge!`);
  };

  const handleRollback = (item: ReleaseHistoryItem) => {
    const rollbackItem: ReleaseHistoryItem = {
      id: `rel_rb_${Date.now()}`,
      platform: item.platform,
      version: item.version,
      hash: item.hash,
      mandatory: item.mandatory,
      releaseNotes: `[Rolled back to v${item.version}] ${item.releaseNotes}`,
      createdAt: new Date().toISOString(),
      sizeBytes: item.sizeBytes,
    };

    const nextData: VersionData = {
      ...data,
      [item.platform]: {
        latestVersion: item.version,
        minAppVersion: data[item.platform].minAppVersion,
        downloadUrl: item.downloadUrl || `https://your-site.netlify.app/bundles/${item.platform}-v${item.version}.zip`,
        mandatory: item.mandatory,
        hash: item.hash,
        releaseNotes: `[Rollback] ${item.releaseNotes}`,
        updatedAt: new Date().toISOString(),
        sizeBytes: item.sizeBytes,
      },
      history: [rollbackItem, ...data.history],
    };

    setData(nextData);
    saveVersionData(nextData);

    showToast(`Rolled back ${item.platform.toUpperCase()} active release to v${item.version}!`);
  };

  const handleDeleteRelease = (id: string) => {
    const deletedItem = data.history.find((h) => h.id === id);
    const updatedHistory = data.history.filter((h) => h.id !== id);
    const nextData: VersionData = {
      ...data,
      history: updatedHistory,
    };
    setData(nextData);
    saveVersionData(nextData);
    deleteReleaseRecord(id);
    showToast(`Deleted ${deletedItem ? `${deletedItem.platform.toUpperCase()} v${deletedItem.version}` : 'release'} entry from SQLite database!`);
  };

  const isDark = theme === 'dark';

  const toggleNotifications = () => {
    setIsNotificationOpen((prev) => {
      const nextState = !prev;
      if (nextState) {
        setIsSidebarCollapsed(true);
      }
      return nextState;
    });
  };

  return (
    <div
      className={`h-screen w-screen overflow-hidden font-sans flex transition-colors duration-500 relative ${
        isDark
          ? 'bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950'
          : 'bg-gradient-to-br from-indigo-200/90 via-sky-200/80 to-purple-200/90 text-slate-900 selection:bg-cyan-500 selection:text-white'
      }`}
    >
      {/* Full Screen Theme Transition Ripple Overlay */}
      {isThemeTransitioning && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
          <div
            className={`w-96 h-96 rounded-full animate-theme-ripple ${
              isDark
                ? 'bg-gradient-to-r from-slate-900 via-slate-950 to-cyan-950'
                : 'bg-gradient-to-tr from-cyan-400 via-indigo-400 to-pink-500'
            }`}
          />
        </div>
      )}

      {/* Colorful Ambient Floating Background Blobs for Light Mode */}
      {!isDark && (
        <>
          <div className="fixed -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none animate-float-glow" />
          <div className="fixed top-1/3 right-0 w-[30rem] h-[30rem] rounded-full bg-purple-400/25 blur-3xl pointer-events-none animate-float-glow" />
          <div className="fixed -bottom-32 left-1/3 w-96 h-96 rounded-full bg-pink-400/25 blur-3xl pointer-events-none animate-float-glow" />
        </>
      )}

      {/* Full-Height Left Sidebar (Fixed & Stationary) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        theme={theme}
      />

      {/* Right Column Container */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden z-10">
        {/* Top Header Bar inside Right Column */}
        <TopHeader
          activeTab={activeTab}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleNotifications={toggleNotifications}
        />

        {/* Right Side Notification Drawer Slide-Over */}
        <NotificationDrawer
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          theme={theme}
          history={data.history}
        />

        {/* Main Content Area (Independent Scroll Container) */}
        <main key={activeTab} className="flex-1 p-6 sm:p-8 space-y-8 overflow-y-auto animate-tab-content">
          {/* Toast Notification */}
          {toastMessage && (
            <div
              className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-sm animate-bounce ${
                isDark
                  ? 'bg-slate-900 border border-cyan-500/50 text-cyan-300'
                  : 'bg-gradient-to-r from-cyan-100 via-sky-100 to-indigo-100 border border-cyan-500 text-cyan-950 shadow-2xl shadow-cyan-500/20'
              }`}
            >
              <Sparkles className="h-4 w-4 text-cyan-500 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* SCREEN 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Analytics Summary Bar & System Health */}
              <DashboardAnalytics
                totalReleases={data.history.length}
                androidVersion={data.android.latestVersion}
                iosVersion={data.ios.latestVersion}
                history={data.history}
                theme={theme}
              />

              {/* Active Releases Overview Grid */}
              <div className={`pt-4 border-t ${isDark ? 'border-slate-800/80' : 'border-indigo-200/80'}`}>
                <h2 className={`text-lg font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Active Production Bundles
                </h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <ActiveReleaseCard platform="android" info={data.android} theme={theme} />
                  <ActiveReleaseCard platform="ios" info={data.ios} theme={theme} />
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: PUBLISH OTA UPDATE */}
          {activeTab === 'publish' && (
            <div className="max-w-7xl">
              <BundleUploader onPublish={handlePublish} theme={theme} />
            </div>
          )}

          {/* SCREEN 3: RELEASE HISTORY & ROLLBACKS */}
          {activeTab === 'history' && (
            <div className="space-y-8">
              <ReleaseHistory
                history={data.history}
                onRollback={handleRollback}
                onDelete={handleDeleteRelease}
                onSelectReleaseForDetail={(item) => {
                  setSelectedReleaseForDetail(item);
                  setActiveTab('release-detail');
                }}
                theme={theme}
              />
            </div>
          )}

          {/* SCREEN 4: INTEGRATION DOCS */}
          {activeTab === 'docs' && <IntegrationDocs theme={theme} />}

          {/* SCREEN 5: RELEASE DETAIL & PLAIN-ENGLISH TIMELINE SCREEN */}
          {activeTab === 'release-detail' && selectedReleaseForDetail && (
            <ReleaseDetailScreen
              item={selectedReleaseForDetail}
              onBack={() => setActiveTab('history')}
              theme={theme}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
