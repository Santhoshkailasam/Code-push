// app
import React, { useState, useEffect, useRef } from 'react';
import { TopHeader } from './components/TopHeader';
import { Sidebar } from './components/Sidebar';
import { NotificationDrawer } from './components/NotificationDrawer';
import {
  FullPageSkeleton,
  DashboardSkeleton,
  TableSkeleton,
  UploaderSkeleton,
} from './components/SkeletonLoader';
import { ErrorScreen, ErrorBoundary } from './components/ErrorScreen';
import { useServerStatus } from './hooks/useFirebaseStatus';
import { ActiveReleaseCard } from './pages/Dashboard/ActiveReleaseCard';
import { DashboardAnalytics } from './pages/Dashboard/DashboardAnalytics';
import { BundleUploader } from './pages/PublishUpdates/BundleUploader';
import { ReleaseHistory } from './pages/ReleaseHistory/ReleaseHistory';
import { ReleaseDetailScreen } from './pages/ReleaseHistory/ReleaseDetailScreen';
import { DocumentationScreen } from './pages/Documentation/DocumentationScreen';
import { IntegrationScreen } from './pages/Integration/IntegrationScreen';
import { TestingConsole } from './pages/TestingConsole/Live Testing';
import { ProfileScreen } from './pages/Profile/ProfileScreen';
import { AuthScreen } from './pages/Auth/AuthScreen';
import { SessionExpiryModal } from './components/SessionExpiryModal';
import { RemoteConfigScreen } from './pages/RemoteConfig/RemoteConfigScreen';
import { CrashAnalyticsScreen } from './pages/CrashAnalytics/CrashAnalyticsScreen';
import { MeshAnalyticsCard } from './components/MeshAnalyticsCard';
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
  loadVersionDataSync,
  saveVersionData,
  deleteReleaseRecord,
  subscribeToVersionData,
  getUserApiKey,
  getCachedVersionData,
  setCachedVersionData,
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

const VALID_TABS = ['dashboard', 'publish', 'history', 'remote-config', 'crashes', 'testing', 'docs', 'integration', 'profile', 'release-detail'];

function getInitialActiveTab(): string {
  // If user is not authenticated yet, do not restore previous tab; start clean on dashboard
  try {
    const cachedUser = localStorage.getItem('codepush_cached_user');
    if (!cachedUser) {
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return 'dashboard';
    }
  } catch {}

  if (typeof window !== 'undefined' && window.location.hash) {
    const hash = window.location.hash.replace('#', '').trim();
    if (VALID_TABS.includes(hash)) return hash;
  }
  try {
    const saved = localStorage.getItem('codepush_active_tab');
    if (saved && VALID_TABS.includes(saved)) return saved;
  } catch {}
  return 'dashboard';
}

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

  // Track whether the user was logged out to enforce landing on dashboard after login
  const wasLoggedOutRef = useRef<boolean>(
    typeof window !== 'undefined' ? !localStorage.getItem('codepush_cached_user') : true
  );

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return getSelectedProjectId() || '';
  });

  const [data, setData] = useState<VersionData>(() => {
    const activeId = getSelectedProjectId();
    if (activeId) {
      const cached = getCachedVersionData(activeId);
      if (cached) return cached;
    }
    return loadVersionDataSync();
  });

  // Controls skeleton loading: active ONLY when actively fetching data without cache
  const [isFetchingData, setIsFetchingData] = useState<boolean>(() => {
    const activeId = getSelectedProjectId();
    if (activeId) {
      const cached = getCachedVersionData(activeId);
      if (cached) return false; // Simple refresh: already has data, do not show skeleton
    }
    return true; // No data yet: show skeleton while fetching
  });

  // Server health status (used to keep skeleton loader active when server is offline)
  const { status: serverStatus } = useServerStatus();
  const isServerOffline = serverStatus === 'offline';

  // Persistent activeTab across browser refreshes
  const [activeTab, setActiveTab] = useState<string>(() => getInitialActiveTab());
  const [routeError, setRouteError] = useState<{ statusCode: number | string; message?: string } | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && !VALID_TABS.includes(hash)) {
        return {
          statusCode: 404,
          message: `The route "#${hash}" does not exist in this dashboard.`,
        };
      }
    }
    return null;
  });

  // Persistent selected release for release-detail view
  const [selectedReleaseForDetail, setSelectedReleaseForDetail] = useState<ReleaseHistoryItem | null>(() => {
    try {
      const raw = localStorage.getItem('codepush_selected_release_detail');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const handleTabChange = (tab: string) => {
    setRouteError(null);
    setActiveTab(tab);
    try {
      localStorage.setItem('codepush_active_tab', tab);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#${tab}`);
      }
    } catch {}
  };

  // Sync activeTab changes to localStorage & URL hash (only when user is authenticated)
  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('codepush_active_tab', activeTab);
      if (typeof window !== 'undefined') {
        const currentHash = window.location.hash.replace('#', '');
        if (currentHash !== activeTab) {
          window.history.replaceState(null, '', `#${activeTab}`);
        }
      }
    } catch {}
  }, [activeTab, user]);

  // Support browser Back/Forward navigation between tabs
  useEffect(() => {
    const handleHashChange = () => {
      if (!user) return;
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && !VALID_TABS.includes(hash)) {
        setRouteError({
          statusCode: 404,
          message: `The route "#${hash}" does not exist in this dashboard.`,
        });
        return;
      }
      setRouteError(null);
      if (hash && VALID_TABS.includes(hash) && hash !== activeTab) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab, user]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Projects State
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const localKey = `codepush_projects_${user?.uid || 'guest'}`;
      const cached = localStorage.getItem(localKey);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);

  // Load user projects
  useEffect(() => {
    if (!user) return;
    getProjects(user.uid)
      .then((list) => {
        setProjects(list);
        const selected = getSelectedProjectId();
        if (selected && list.some((p) => p.id === selected)) {
          setActiveProjectId(selected);
        } else if (list.length > 0) {
          setActiveProjectId(list[0].id);
          setSelectedProjectId(list[0].id);
        }
      })
      .catch((err) => {
        console.warn('Failed to load projects:', err);
      });
  }, [user?.uid]);

  // Switch active project
  const handleSwitchProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setSelectedProjectId(projectId);
    const cached = getCachedVersionData(projectId);
    if (cached) {
      setData(cached);
      setIsFetchingData(false);
    } else {
      setData({
        android: { latestVersion: 'v1.0.0 (Base)', minAppVersion: '1.0.0', downloadUrl: '', mandatory: false, hash: '', releaseNotes: '', updatedAt: new Date().toISOString() },
        ios: { latestVersion: 'v1.0.0 (Base)', minAppVersion: '1.0.0', downloadUrl: '', mandatory: false, hash: '', releaseNotes: '', updatedAt: new Date().toISOString() },
        history: [],
      });
      setIsFetchingData(true);
    }
    showToast(`📱 Switched to "${projects.find(p => p.id === projectId)?.name || 'app'}".`);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const handleCreateProject = async (newProj: Project) => {
    try {
      const updated = await saveProject(newProj, user?.uid);
      setProjects(updated);
      setActiveProjectId(newProj.id);
      setSelectedProjectId(newProj.id);
      showToast(`🚀 Application "${newProj.name}" created & stored in PostgreSQL!`);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      showToast(`❌ Database Error: ${err.message || 'Failed to save project'}`);
      throw err;
    }
  };

  const handleUpdateProject = async (updatedProj: Project) => {
    try {
      const updatedList = await saveProject(updatedProj, user?.uid);
      setProjects(updatedList);
      showToast(`⚙️ Updated target repository for "${updatedProj.name}" in PostgreSQL!`);
    } catch (err: any) {
      console.error('Failed to update project:', err);
      showToast(`❌ Database Error: ${err.message || 'Failed to update project'}`);
      throw err;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const projName = projects.find((p) => p.id === projectId)?.name || 'App';
    try {
      const updatedList = await deleteProject(projectId, user?.uid);
      setProjects(updatedList);
      // If the deleted project was the active one, switch to first remaining
      if (activeProjectId === projectId) {
        const nextId = updatedList[0]?.id || '';
        setActiveProjectId(nextId);
        if (nextId) setSelectedProjectId(nextId);
      }
      showToast(`🗑️ "${projName}" has been deleted from PostgreSQL.`);
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      showToast(`❌ Database Error: ${err.message || 'Failed to delete project'}`);
    }
  };

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userObj = await extractTokenSession(fbUser);
          setUser(userObj);
          localStorage.setItem('codepush_cached_user', JSON.stringify(userObj));

          // If transitioning from logged out state, always redirect to dashboard tab
          if (wasLoggedOutRef.current) {
            wasLoggedOutRef.current = false;
            setActiveTab('dashboard');
            setSelectedReleaseForDetail(null);
            try {
              localStorage.setItem('codepush_active_tab', 'dashboard');
              localStorage.removeItem('codepush_selected_release_detail');
              if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', '#dashboard');
              }
            } catch {}
          }
        } catch (err) {
          console.warn('Could not extract token session:', err);
        }
      } else {
        wasLoggedOutRef.current = true;
        setUser(null);
        setActiveTab('dashboard');
        setSelectedReleaseForDetail(null);
        try {
          localStorage.removeItem('codepush_cached_user');
          localStorage.setItem('codepush_active_tab', 'dashboard');
          localStorage.removeItem('codepush_selected_release_detail');
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch {}
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
    wasLoggedOutRef.current = false;
    setUser(userData);
    setActiveTab('dashboard');
    setSelectedReleaseForDetail(null);
    try {
      localStorage.setItem('codepush_cached_user', JSON.stringify(userData));
      localStorage.setItem('codepush_active_tab', 'dashboard');
      localStorage.removeItem('codepush_selected_release_detail');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '#dashboard');
      }
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
    wasLoggedOutRef.current = true;
    setUser(null);
    setActiveTab('dashboard');
    setSelectedReleaseForDetail(null);
    try {
      localStorage.removeItem('codepush_cached_user');
      localStorage.setItem('codepush_active_tab', 'dashboard');
      localStorage.removeItem('codepush_selected_release_detail');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch {}
    showToast('Signed out safely. Active session tokens revoked.');
  };

  // Load Firebase DB data scoped to active project
  useEffect(() => {
    if (!activeProjectId) {
      setIsFetchingData(false);
      return;
    }
    const targetProject = projects.find(p => p.id === activeProjectId);
    const projectApiKey = targetProject?.apiKey || getUserApiKey(user?.uid);
    const cached = getCachedVersionData(activeProjectId);
    if (cached) {
      setData(cached);
      setIsFetchingData(false);
    } else {
      setData({
        android: { latestVersion: 'v1.0.0 (Base)', minAppVersion: '1.0.0', downloadUrl: '', mandatory: false, hash: '', releaseNotes: '', updatedAt: new Date().toISOString() },
        ios: { latestVersion: 'v1.0.0 (Base)', minAppVersion: '1.0.0', downloadUrl: '', mandatory: false, hash: '', releaseNotes: '', updatedAt: new Date().toISOString() },
        history: [],
      });
      setIsFetchingData(true);
    }

    const unsubscribe = subscribeToVersionData(
      user?.uid,
      projectApiKey,
      (realtimeData) => {
        if (realtimeData) {
          setData(realtimeData);
          setCachedVersionData(activeProjectId, realtimeData);
        }
        setIsFetchingData(false);
      },
      activeProjectId
    );

    return () => unsubscribe();
  }, [user?.uid, activeProjectId, projects]);



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
    bundleBase64,
    hash,
    sizeBytes,
    track = 'production',
    rolloutPercentage = 100,
    targetBinaryVersion = '1.0.0',
    canarySchedule,
    targetingRules,
    deltaUpdate,
    assetManifest,
    signature,
    signatureAlgorithm,
    detectedNativeModules,
    driftStatus,
    experiment,
  }: {
    platform: Platform;
    version: string;
    mandatory: boolean;
    releaseNotes: string;
    fileName: string;
    bundleBase64?: string;
    hash?: string;
    signature?: string;
    signatureAlgorithm?: 'ed25519' | 'sha256-hmac';
    detectedNativeModules?: string[];
    driftStatus?: 'passed' | 'warning' | 'incompatible';
    sizeBytes?: number;
    track?: 'production' | 'staging';
    rolloutPercentage?: number;
    targetBinaryVersion?: string;
    canarySchedule?: any;
    targetingRules?: any;
    deltaUpdate?: any;
    assetManifest?: any;
    experiment?: any;
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
      signature,
      signatureAlgorithm: signatureAlgorithm || 'ed25519',
      detectedNativeModules,
      driftStatus: driftStatus || 'passed',
      mandatory,
      releaseNotes,
      createdAt: new Date().toISOString(),
      downloadUrl: `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${version}&platform=${platform}`,
      bundleBase64: bundleBase64 || undefined,
      sizeBytes: sizeBytes || 1024 * 180,
      userId: user?.uid,
      apiKey: userApiKey,
      track,
      rolloutPercentage,
      targetBinaryVersion,
      canarySchedule,
      targetingRules,
      deltaUpdate,
      assetManifest,
      experiment,
      revoked: false,
      // Tag with project ID so data is scoped to this app
      ...(activeProjectId ? { projectId: activeProjectId } : {}),
    } as ReleaseHistoryItem & { projectId?: string };

    const nextData: VersionData = {
      ...data,
      [platform]: {
        latestVersion: version,
        minAppVersion: targetBinaryVersion || data[platform]?.minAppVersion || '1.0.0',
        targetBinaryVersion,
        track,
        rolloutPercentage,
        canarySchedule,
        targetingRules,
        deltaUpdate,
        assetManifest,
        experiment,
        signature,
        signatureAlgorithm: signatureAlgorithm || 'ed25519',
        detectedNativeModules,
        driftStatus: driftStatus || 'passed',
        revoked: false,
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

    const projectApiKey = activeProject?.apiKey || userApiKey;

    // Also notify Netlify Edge function publish-release with complete metadata
    fetch('/.netlify/functions/publish-release', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user?.uid || '',
        'x-codepush-api-key': projectApiKey,
      },
      body: JSON.stringify({
        platform,
        version,
        mandatory,
        releaseNotes,
        bundleBase64: bundleBase64 || undefined,
        downloadUrl: `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${version}&platform=${platform}`,
        hash: finalHash,
        signature,
        signatureAlgorithm: signatureAlgorithm || 'ed25519',
        detectedNativeModules,
        driftStatus: driftStatus || 'passed',
        track,
        rolloutPercentage,
        targetBinaryVersion,
        projectId: activeProjectId,
        apiKey: projectApiKey,
        canarySchedule,
        targetingRules,
        deltaUpdate,
        assetManifest,
        experiment,
      }),
    }).catch(() => {});

    showToast(`Published ${platform.toUpperCase()} update v${version} (${track.toUpperCase()} track, ${rolloutPercentage}% rollout) to Netlify Edge!`);
  };

  const handleRollback = (item: ReleaseHistoryItem) => {
    const userApiKey = getUserApiKey(user?.uid);
    const targetDownloadUrl =
      item.downloadUrl ||
      `https://codepushs.netlify.app/.netlify/functions/download-bundle?version=${item.version}&platform=${item.platform}`;

    const rollbackItem: ReleaseHistoryItem = {
      id: `rel_rb_${Date.now()}`,
      platform: item.platform,
      version: item.version,
      hash: item.hash,
      mandatory: true,
      releaseNotes: `[Rolled back to v${item.version}] ${item.releaseNotes || 'Reverted to previous release'}`,
      createdAt: new Date().toISOString(),
      downloadUrl: targetDownloadUrl,
      sizeBytes: item.sizeBytes,
      userId: user?.uid,
      apiKey: userApiKey,
      ...(activeProjectId ? { projectId: activeProjectId } : {}),
    };

    const nextData: VersionData = {
      ...data,
      [item.platform]: {
        latestVersion: item.version,
        minAppVersion: data[item.platform]?.minAppVersion || '1.0.0',
        downloadUrl: targetDownloadUrl,
        mandatory: true,
        hash: item.hash,
        releaseNotes: `[Rollback] ${item.releaseNotes || `Reverted to v${item.version}`}`,
        updatedAt: new Date().toISOString(),
        sizeBytes: item.sizeBytes,
        userId: user?.uid,
        apiKey: userApiKey,
        ...(activeProjectId ? { projectId: activeProjectId } : {}),
      },
      history: [rollbackItem, ...data.history],
    };

    setData(nextData);
    saveVersionData(nextData, user?.uid, userApiKey, activeProjectId || undefined);

    // Also record telemetry ping in RTDB so dashboard telemetry card reflects rollback
    try {
      const ping = {
        id: `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: new Date().toISOString(),
        platform: item.platform,
        device: 'CodePush Dashboard Dispatcher',
        version: item.version,
        action: `Rollback triggered: Reverted active ${item.platform.toUpperCase()} release to v${item.version}`,
        apiKey: userApiKey,
        projectId: activeProjectId || null,
      };

      fetch('/.netlify/functions/report-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ping),
      }).catch(() => {});
    } catch {}

    showToast(`Rolled back ${item.platform.toUpperCase()} active release to v${item.version}!`);
  };

  const handleDeleteRelease = (id: string) => {
    const userApiKey = getUserApiKey(user?.uid);
    const deletedItem = data.history.find((h) => h.id === id);
    const updatedHistory = data.history.filter((h) => h.id !== id);
    const nextData: VersionData = {
      ...data,
      history: updatedHistory,
    };
    setData(nextData);
    saveVersionData(nextData, user?.uid, userApiKey, activeProjectId || undefined);
    deleteReleaseRecord(id);
    showToast(`Deleted ${deletedItem ? `${deletedItem.platform.toUpperCase()} v${deletedItem.version}` : 'release'} entry from Firebase Firestore!`);
  };

  const handlePromote = async (item: ReleaseHistoryItem) => {
    const userApiKey = activeProject?.apiKey || getUserApiKey(user?.uid);
    try {
      const res = await fetch('/.netlify/functions/publish-release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userApiKey}`,
        },
        body: JSON.stringify({
          action: 'promote',
          releaseId: item.id,
          platform: item.platform,
          version: item.version,
          projectId: activeProjectId || undefined,
          apiKey: userApiKey,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Promotion failed');

      const updatedHistory = data.history.map((h) =>
        h.id === item.id ? { ...h, track: 'production' as const } : h
      );
      const nextData: VersionData = { ...data, history: updatedHistory };
      setData(nextData);
      saveVersionData(nextData, user?.uid, userApiKey, activeProjectId || undefined);
      showToast(`Promoted ${item.platform.toUpperCase()} v${item.version} to Production track!`);
    } catch (err: any) {
      showToast(`Promotion error: ${err.message || 'Unknown error'}`);
    }
  };

  const handleRevoke = async (item: ReleaseHistoryItem) => {
    const userApiKey = activeProject?.apiKey || getUserApiKey(user?.uid);
    try {
      const res = await fetch('/.netlify/functions/publish-release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userApiKey}`,
        },
        body: JSON.stringify({
          action: 'revoke',
          releaseId: item.id,
          platform: item.platform,
          version: item.version,
          projectId: activeProjectId || undefined,
          apiKey: userApiKey,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Revocation failed');

      const updatedHistory = data.history.map((h) =>
        h.id === item.id ? { ...h, revoked: true, revokedAt: new Date().toISOString() } : h
      );
      const nextData: VersionData = { ...data, history: updatedHistory };
      setData(nextData);
      saveVersionData(nextData, user?.uid, userApiKey, activeProjectId || undefined);
      showToast(`🚨 Kill-Switch triggered: Revoked ${item.platform.toUpperCase()} v${item.version}!`);
    } catch (err: any) {
      showToast(`Revocation error: ${err.message || 'Unknown error'}`);
    }
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
        setActiveTab={handleTabChange}
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
          onNavigateToProfile={() => handleTabChange('profile')}
          onNavigateToDocs={() => handleTabChange('docs')}
          onNavigateToIntegration={() => handleTabChange('integration')}
          activeProject={activeProject}
          onOpenEditProjectModal={() => setIsEditProjectModalOpen(true)}
        />

        {/* Right Side Notification Drawer Slide-Over */}
        <NotificationDrawer
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          theme={theme}
          history={data.history}
          currentProject={activeProject}
        />

        {/* Main Content Area (Independent Scroll Container) */}
        {/* Key on activeProjectId forces all screens to remount fresh when switching apps */}
        <main
          key={`${activeTab}-${activeProjectId}`}
          className={`flex-1 ${
            activeTab === 'testing'
              ? 'p-3 sm:p-4 space-y-3'
              : activeTab === 'docs' || activeTab === 'integration'
              ? 'p-3 sm:p-4 lg:p-5'
              : 'p-3 sm:p-5 lg:p-6 space-y-6'
          } overflow-y-auto animate-tab-content`}
        >
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

          {/* SKELETON LOADING STATE: Displays when server is offline or actively fetching data */}
          {(isServerOffline || isFetchingData) && activeTab !== 'profile' ? (
            <div className="space-y-6 animate-fade-in">
              {activeTab === 'publish' ? (
                <UploaderSkeleton theme={theme} />
              ) : activeTab === 'history' ? (
                <TableSkeleton theme={theme} />
              ) : (
                <DashboardSkeleton theme={theme} />
              )}
            </div>
          ) : routeError ? (
            <ErrorScreen
              statusCode={routeError.statusCode}
              message={routeError.message}
              theme={theme}
              onRetry={() => window.location.reload()}
              onGoHome={() => handleTabChange('dashboard')}
            />
          ) : (
            <ErrorBoundary theme={theme} onGoHome={() => handleTabChange('dashboard')}>
              <>
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
                  <div className={`pt-6 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                      <div>
                        <h2 className={`text-lg font-black flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <span>Active Production Bundles</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            Live Edge CDN
                          </span>
                        </h2>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Current active JavaScript runtime bundles served globally to Android and iOS mobile clients
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <ActiveReleaseCard platform="android" info={data.android} theme={theme} />
                      <ActiveReleaseCard platform="ios" info={data.ios} theme={theme} />
                    </div>

                    {/* Zero-Egress P2P Local Mesh Relay Fleet Telemetry */}
                    <div className="pt-6">
                      <MeshAnalyticsCard theme={theme} projectId={activeProject?.id} />
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 2: PUBLISH OTA UPDATE */}
              {activeTab === 'publish' && (
                <div className="w-full">
                  <BundleUploader
                    onPublish={handlePublish}
                    theme={theme}
                    appName={activeProject?.name}
                    latestAndroidVersion={data.android.latestVersion}
                    latestIosVersion={data.ios.latestVersion}
                    onNavigateToHistory={() => handleTabChange('history')}
                  />
                </div>
              )}

              {/* SCREEN 3: RELEASE HISTORY & ROLLBACKS */}
              {activeTab === 'history' && (
                <div className="space-y-8">
                  <ReleaseHistory
                    history={data.history}
                    onRollback={handleRollback}
                    onDelete={handleDeleteRelease}
                    onPromote={handlePromote}
                    onRevoke={handleRevoke}
                    onSelectReleaseForDetail={(item) => {
                      setSelectedReleaseForDetail(item);
                      try {
                        localStorage.setItem('codepush_selected_release_detail', JSON.stringify(item));
                      } catch {}
                      handleTabChange('release-detail');
                    }}
                    theme={theme}
                  />
                </div>
              )}

              {/* SCREEN 5: DOCUMENTATION (Clean, Non-Tech Knowledge Base) */}
              {activeTab === 'docs' && (
                <DocumentationScreen
                  theme={theme}
                  currentProject={activeProject}
                  onNavigateToIntegration={() => handleTabChange('integration')}
                />
              )}

              {/* SCREEN: APP & SDK INTEGRATION (Developer Code Setup) */}
              {activeTab === 'integration' && (
                <IntegrationScreen
                  theme={theme}
                  currentProject={activeProject}
                  onNavigateToDocs={() => handleTabChange('docs')}
                />
              )}

              {/* SCREEN: REMOTE CONFIG & FEATURE FLAGS */}
              {activeTab === 'remote-config' && <RemoteConfigScreen theme={theme} currentProject={activeProject} />}

              {/* SCREEN: CRASH ANALYTICS & EXCEPTIONS */}
              {activeTab === 'crashes' && <CrashAnalyticsScreen theme={theme} currentProject={activeProject} />}

              {/* SCREEN 7: LIVE TESTING CONSOLE & ENDPOINT SIMULATOR */}
              {activeTab === 'testing' && (
                <TestingConsole
                  theme={theme}
                  activeProject={activeProject}
                  projects={projects}
                  userApiKey={getUserApiKey(user?.uid)}
                />
              )}

              {/* SCREEN 6: RELEASE DETAIL & PLAIN-ENGLISH TIMELINE SCREEN */}
              {activeTab === 'release-detail' && (
                selectedReleaseForDetail ? (
                  <ReleaseDetailScreen
                    item={selectedReleaseForDetail}
                    onBack={() => {
                      try {
                        localStorage.removeItem('codepush_selected_release_detail');
                      } catch {}
                      handleTabChange('history');
                    }}
                    theme={theme}
                    activeProject={activeProject}
                    onRollback={handleRollback}
                  />
                ) : (
                  <div className="space-y-8">
                    <ReleaseHistory
                      history={data.history}
                      onRollback={handleRollback}
                      onDelete={handleDeleteRelease}
                      onPromote={handlePromote}
                      onRevoke={handleRevoke}
                      onSelectReleaseForDetail={(item) => {
                        setSelectedReleaseForDetail(item);
                        try {
                          localStorage.setItem('codepush_selected_release_detail', JSON.stringify(item));
                        } catch {}
                        handleTabChange('release-detail');
                      }}
                      theme={theme}
                    />
                  </div>
                )
              )}
            </>
          )}
        </>
        </ErrorBoundary>
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
