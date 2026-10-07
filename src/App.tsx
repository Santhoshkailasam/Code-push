import React, { useState, useEffect } from 'react';
import { TopHeader } from './components/TopHeader';
import { Sidebar } from './components/Sidebar';
import { NotificationDrawer } from './components/NotificationDrawer';
import { FullPageSkeleton } from './components/SkeletonLoader';
import { ActiveReleaseCard } from './pages/Dashboard/ActiveReleaseCard';
import { DashboardAnalytics } from './pages/Dashboard/DashboardAnalytics';
import { BundleUploader } from './pages/PublishUpdates/BundleUploader';
import { ReleaseHistory } from './pages/ReleaseHistory/ReleaseHistory';
import { ReleaseDetailScreen } from './pages/ReleaseHistory/ReleaseDetailScreen';
import { IntegrationDocs } from './pages/IntegrationDocs/IntegrationDocs';
import { ProfileScreen } from './pages/Profile/ProfileScreen';
import { AuthScreen } from './pages/Auth/AuthScreen';
import { SessionExpiryModal } from './components/SessionExpiryModal';
import type { VersionData, Platform, ReleaseHistoryItem, Project } from './types';
import { CreateProjectModal } from './components/CreateProjectModal';
import { EditProjectModal } from './components/EditProjectModal';
import {
  getProjects,
  saveProject,
  deleteProject,
  getSelectedProjectId,
  setSelectedProjectId,
} from './utils/projectStorage';
import {
  loadVersionDataAsync,
  loadVersionDataSync,
  saveVersionData,
  deleteReleaseRecord,
  subscribeToVersionData,
  getUserApiKey,
} from './utils/storage';
import { auth } from '../db/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Sparkles } from 'lucide-react';
import {
  type AuthTokenSession,
  extractTokenSession,
  getValidAccessToken,
} from './utils/tokenManager';

export type UserSession = AuthTokenSession;

export const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const cached = localStorage.getItem('codepush_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(true);

  const [data, setData] = useState<VersionData>(() => loadVersionDataSync());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedReleaseForDetail, setSelectedReleaseForDetail] = useState<ReleaseHistoryItem | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);

  // Load user projects
  useEffect(() => {
    if (!user) return;
    getProjects(user.uid).then((list) => {
      setProjects(list);
      const selected = getSelectedProjectId();
      if (selected && list.some((p) => p.id === selected)) {
        setActiveProjectId(selected);
      } else if (list.length > 0) {
        setActiveProjectId(list[0].id);
        setSelectedProjectId(list[0].id);
      }
    });
  }, [user?.uid]);

  // Switch active project
  const handleSwitchProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setSelectedProjectId(projectId);
    // Reset data to sync state, will be refreshed by the data effect below
    setData(loadVersionDataSync());
    showToast(`📱 Switched to "${projects.find(p => p.id === projectId)?.name || 'app'}".`);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const handleCreateProject = async (newProj: Project) => {
    const updated = await saveProject(newProj, user?.uid);
    setProjects(updated);
    setActiveProjectId(newProj.id);
    setSelectedProjectId(newProj.id);
    showToast(`🚀 New application "${newProj.name}" created & GitHub Webhook activated!`);
  };

  const handleUpdateProject = async (updatedProj: Project) => {
    const updatedList = await saveProject(updatedProj, user?.uid);
    setProjects(updatedList);
    showToast(`⚙️ Updated target repository for "${updatedProj.name}" to ${updatedProj.githubRepo}!`);
  };

  const handleDeleteProject = async (projectId: string) => {
    const projName = projects.find((p) => p.id === projectId)?.name || 'App';
    const updatedList = await deleteProject(projectId, user?.uid);
    setProjects(updatedList);
    // If the deleted project was the active one, switch to first remaining
    if (activeProjectId === projectId) {
      const nextId = updatedList[0]?.id || '';
      setActiveProjectId(nextId);
      if (nextId) setSelectedProjectId(nextId);
    }
    showToast(`🗑️ "${projName}" has been deleted.`);
  };

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userObj = await extractTokenSession(fbUser);
          setUser(userObj);
          localStorage.setItem('codepush_cached_user', JSON.stringify(userObj));
        } catch (err) {
          console.warn('Could not extract token session:', err);
        }
      } else {
        setUser(null);
        localStorage.removeItem('codepush_cached_user');
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Periodic token expiration & auto-relogin modal checker
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const now = Date.now();

      // Check 1: If Refresh Token has expired (e.g. 30 days in .env)
      if (user.refreshTokenExpiresAt && now >= user.refreshTokenExpiresAt) {
        console.warn('Refresh token expired (30-day lifetime ended). Forcing logout:');
        handleSignOut();
        setIsExpiryModalOpen(false);
        showToast('Session Expired: Your refresh token has expired. Please log in again.');
        return;
      }

      // Check 2: Show centered modal before Access Token expires (within 15s or expired)
      if (user.expiresAt && now >= user.expiresAt - 15000) {
        if (!isExpiryModalOpen) {
          setIsExpiryModalOpen(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, isExpiryModalOpen]);

  const handleContinueSession = async () => {
    try {
      await getValidAccessToken(true);
      const cachedRaw = localStorage.getItem('codepush_cached_user');
      if (cachedRaw) {
        const freshUser = JSON.parse(cachedRaw);
        setUser(freshUser);
      }
      setIsExpiryModalOpen(false);
      showToast('Session Extended! Access token successfully refreshed for another minute.');
    } catch (err) {
      console.error('Failed to extend session:', err);
      handleSignOut();
      setIsExpiryModalOpen(false);
      showToast('Session renewal failed. Please log in again.');
    }
  };

  const handleLoginSuccess = (userData: UserSession) => {
    setUser(userData);
    try {
      localStorage.setItem('codepush_cached_user', JSON.stringify(userData));
    } catch (e) {
      console.warn('Cache write failed:', e);
    }
    showToast(`Welcome back, ${userData.displayName || 'Developer'}! Security access tokens verified.`);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setUser(null);
    localStorage.removeItem('codepush_cached_user');
    showToast('Signed out safely. Active session tokens revoked.');
  };

  // Load Firebase DB data scoped to active project
  useEffect(() => {
    if (!activeProjectId) return;
    const userApiKey = getUserApiKey(user?.uid);
    loadVersionDataAsync(user?.uid, userApiKey, activeProjectId).then((firebaseData) => {
      if (firebaseData) {
        setData(firebaseData);
      }
    });

    const unsubscribe = subscribeToVersionData(user?.uid, userApiKey, (realtimeData) => {
      if (realtimeData) {
        setData(realtimeData);
      }
    }, activeProjectId);

    return () => unsubscribe();
  }, [user?.uid, activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;
    const userApiKey = getUserApiKey(user?.uid);
    saveVersionData(data, user?.uid, userApiKey, activeProjectId);
  }, [data, user?.uid, activeProjectId]);

  useEffect(() => {
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
    fileName: _fileName,
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
    const userApiKey = getUserApiKey(user?.uid);

    const newReleaseItem: ReleaseHistoryItem = {
      id: `rel_${Date.now()}`,
      platform,
      version,
      hash: finalHash,
      mandatory,
      releaseNotes,
      createdAt: new Date().toISOString(),
      downloadUrl: `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${version}&platform=${platform}`,
      sizeBytes: sizeBytes || 1024 * 180,
      userId: user?.uid,
      apiKey: userApiKey,
      // Tag with project ID so data is scoped to this app
      ...(activeProjectId ? { projectId: activeProjectId } : {}),
    } as ReleaseHistoryItem & { projectId?: string };

    const nextData: VersionData = {
      ...data,
      [platform]: {
        latestVersion: version,
        minAppVersion: data[platform]?.minAppVersion || '1.0.0',
        downloadUrl: `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${version}&platform=${platform}`,
        mandatory,
        hash: finalHash,
        releaseNotes,
        updatedAt: new Date().toISOString(),
        sizeBytes: sizeBytes || 1024 * 180,
        userId: user?.uid,
        apiKey: userApiKey,
      },
      history: [newReleaseItem, ...data.history],
    };

    setData(nextData);
    saveVersionData(nextData, user?.uid, userApiKey, activeProjectId || undefined);

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
    showToast(`Deleted ${deletedItem ? `${deletedItem.platform.toUpperCase()} v${deletedItem.version}` : 'release'} entry from Firebase Firestore!`);
  };

  const isDark = theme === 'dark';

  const toggleNotifications = () => {
    setIsNotificationOpen((prev) => !prev);
  };

  if (authLoading && !user) {
    return (
      <div className="relative h-screen w-screen overflow-hidden">
        <FullPageSkeleton theme={theme} />
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex flex-col items-center justify-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl p-2 animate-pulse">
              <img src="/logo.png" alt="CodePush" className="h-full w-full object-cover rounded-xl" />
            </div>
            <div className="absolute -inset-2 rounded-3xl border border-cyan-500/30 animate-ping pointer-events-none" />
          </div>
          <div className="flex items-center space-x-2 font-mono text-xs text-cyan-400 font-extrabold tracking-wider uppercase bg-slate-900/90 px-4 py-2 rounded-full border border-cyan-500/40 shadow-xl">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Verifying Security Session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <div
      className={`h-screen w-screen overflow-hidden font-sans flex transition-colors duration-500 relative ${isDark
        ? 'bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950'
        : 'bg-[#ebf0f5] text-slate-900 selection:bg-cyan-500 selection:text-slate-950'
        }`}
    >
      {/* Ambient Premium Glow Orbs for Light Mode & Dark Mode */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isDark ? (
          <>
            <div className="absolute -top-24 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute -top-32 right-0 w-[600px] h-[600px] bg-gradient-to-br from-cyan-200/40 via-sky-100/30 to-indigo-100/40 rounded-full blur-3xl opacity-70" />
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-blue-100/40 via-indigo-100/30 to-teal-100/30 rounded-full blur-3xl opacity-60" />
          </>
        )}
      </div>

      {/* Full Screen Theme Transition Ripple Overlay */}
      {isThemeTransitioning && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
          <div
            className={`w-96 h-96 rounded-full animate-theme-ripple ${isDark
              ? 'bg-gradient-to-r from-slate-900 via-slate-950 to-cyan-950'
              : 'bg-gradient-to-tr from-cyan-400 via-indigo-400 to-pink-500'
              }`}
          />
        </div>
      )}

      {/* Full-Height Left Sidebar (Fixed & Stationary) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        theme={theme}
        onOpenCreateAppModal={() => setIsCreateProjectModalOpen(true)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSwitchProject={handleSwitchProject}
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
          user={user}
          onSignOut={handleSignOut}
          onNavigateToProfile={() => setActiveTab('profile')}
          onNavigateToDocs={() => setActiveTab('docs')}
          activeProject={activeProject}
          onOpenEditProjectModal={() => setIsEditProjectModalOpen(true)}
        />

        {/* Right Side Notification Drawer Slide-Over */}
        <NotificationDrawer
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          theme={theme}
          history={data.history}
        />

        {/* Main Content Area (Independent Scroll Container) */}
        {/* Key on activeProjectId forces all screens to remount fresh when switching apps */}
        <main key={`${activeTab}-${activeProjectId}`} className="flex-1 p-6 sm:p-8 space-y-8 overflow-y-auto animate-tab-content">
          {/* Toast Notification */}
          {toastMessage && (
            <div
              className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-sm animate-bounce ${isDark
                ? 'bg-slate-900 border border-cyan-500/50 text-cyan-300'
                : 'bg-gradient-to-r from-cyan-100 via-sky-100 to-indigo-100 border border-cyan-500 text-cyan-950 shadow-2xl shadow-cyan-500/20'
                }`}
            >
              <Sparkles className="h-4 w-4 text-cyan-500 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* NO APP STATE: Show create-app prompt when no active project */}
          {!activeProjectId && activeTab !== 'profile' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-fade-in">
              <div className={`p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30 text-white">
                    <Sparkles className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Create Your First App
                    </h2>
                    <p className={`text-sm max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Create an app to start managing OTA releases. Each app gets its own isolated release history and API key.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateProjectModalOpen(true)}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>+ Create App</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* App-scoped screens — only render when there's an active project */}
          {activeProjectId && (
            <>
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
                  <div className={`pt-4 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
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
                <div className="w-full">
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

              {/* SCREEN 5: INTEGRATION DOCS */}
              {activeTab === 'docs' && <IntegrationDocs theme={theme} />}

              {/* SCREEN 6: RELEASE DETAIL & PLAIN-ENGLISH TIMELINE SCREEN */}
              {activeTab === 'release-detail' && selectedReleaseForDetail && (
                <ReleaseDetailScreen
                  item={selectedReleaseForDetail}
                  onBack={() => setActiveTab('history')}
                  theme={theme}
                />
              )}
            </>
          )}

          {/* SCREEN 4: PROFILE & API KEYS — always accessible */}
          {activeTab === 'profile' && (
            <ProfileScreen
              user={user}
              theme={theme}
              showToast={showToast}
              onSignOut={handleSignOut}
              projects={projects}
              activeProjectId={activeProjectId}
              onSwitchProject={handleSwitchProject}
              onOpenCreateAppModal={() => setIsCreateProjectModalOpen(true)}
              onDeleteProject={handleDeleteProject}
            />
          )}
        </main>
      </div>

      {/* Centered Session Expiry Warning Modal */}
      {user && (
        <SessionExpiryModal
          isOpen={isExpiryModalOpen}
          expiresAt={user.expiresAt}
          onContinue={handleContinueSession}
          onRelogin={() => {
            setIsExpiryModalOpen(false);
            handleSignOut();
          }}
          theme={theme}
        />
      )}

      {/* Create New Project Modal Wizard */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
        theme={theme}
        userId={user?.uid}
      />

      {/* Edit Project & Repository Modal */}
      <EditProjectModal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        project={activeProject}
        onUpdateProject={handleUpdateProject}
        theme={theme}
        userId={user?.uid}
      />

      {/* Floating Powered by Netlify Badge */}
      <div className="fixed bottom-4 right-6 z-30 pointer-events-auto hidden sm:block">
        <div className="flex items-center space-x-2 bg-slate-900/90 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-2xl backdrop-blur-md hover:scale-105 transition-all">
          <div className="h-3.5 w-3.5 rounded-xs bg-gradient-to-tr from-cyan-400 to-teal-400 flex items-center justify-center p-0.5">
            <span className="text-[8px] font-black text-slate-950">❖</span>
          </div>
          <span>Powered by Netlify</span>
        </div>
      </div>
    </div>
  );
};

export default App;
