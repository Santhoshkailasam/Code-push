import React, { useState, useEffect } from 'react';
import {
  User,
  Key,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Smartphone,
  FolderPlus,
  Calendar,
  ArrowRight,
  Trash2,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import type { UserSession } from '../../App';
import type { Project } from '../../types';
import { db } from '../../../db/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ConfirmModal } from '../../components/ConfirmModal';

export interface ProfileScreenProps {
  user: UserSession;
  theme?: 'dark' | 'light';
  showToast: (msg: string) => void;
  onSignOut?: () => void;
  projects?: Project[];
  activeProjectId?: string;
  onSwitchProject?: (projectId: string) => void;
  onOpenCreateAppModal?: () => void;
  onDeleteProject?: (projectId: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  theme = 'dark',
  showToast,
  onSignOut,
  projects = [],
  activeProjectId,
  onSwitchProject,
  onOpenCreateAppModal,
  onDeleteProject,
}) => {
  const isDark = theme === 'dark';
  const apiKeyStorageKey = `codepush_user_api_key_${user.uid}`;

  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(apiKeyStorageKey);
      if (stored) return stored;
    } catch {}
    return `cp_live_${user.uid.slice(0, 6)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  });

  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState<string | null>(null);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'env' | 'github' | 'curl' | 'rn'>('env');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? 'Recently'
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Sync API Key with Firebase Firestore
  useEffect(() => {
    async function syncKeyFromFirestore() {
      try {
        const userKeyRef = doc(db, 'codepush_user_keys', user.uid);
        const docSnap = await getDoc(userKeyRef);
        if (docSnap.exists() && docSnap.data().apiKey) {
          const remoteKey = docSnap.data().apiKey;
          setApiKey(remoteKey);
          localStorage.setItem(apiKeyStorageKey, remoteKey);
        } else {
          await setDoc(
            userKeyRef,
            {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              apiKey: apiKey,
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.warn('Firestore key sync notice:', err);
      }
    }
    syncKeyFromFirestore();
  }, [user.uid]);

  const copyToClipboard = (text: string, setFn: (val: boolean) => void, msg: string) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    showToast(msg);
    setTimeout(() => setFn(false), 2500);
  };

  const snippets = {
    env: `CODEPUSH_SERVER_URL=https://codepushs.netlify.app\nCODEPUSH_API_KEY=${apiKey}`,
    github: `- name: 🚀 Publish OTA Release to CodePush Server
  run: |
    curl -X POST "https://codepushs.netlify.app/.netlify/functions/publish-release" \\
      -H "Content-Type: application/json" \\
      -H "x-codepush-api-key: \${{ secrets.CODEPUSH_API_KEY }}" \\
      -d '{
        "platform": "android",
        "version": "\${{ steps.vars.outputs.version }}",
        "downloadUrl": "https://your-site.netlify.app/bundles/android-\${{ steps.vars.outputs.version }}.zip",
        "mandatory": true
      }'`,
    curl: `curl -X POST "https://codepushs.netlify.app/.netlify/functions/publish-release" \\
  -H "Content-Type: application/json" \\
  -H "x-codepush-api-key: ${apiKey}" \\
  -d '{
    "platform": "android",
    "version": "1.0.0",
    "downloadUrl": "https://example.com/bundle.zip",
    "mandatory": true,
    "description": "Hotfix OTA Bundle"
  }'`,
    rn: `import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

const CODEPUSH_SERVER_URL = "https://codepushs.netlify.app";
const CODEPUSH_API_KEY = "${apiKey}";

export default function App() {
  useEffect(() => {
    fetch(\`\${CODEPUSH_SERVER_URL}/.netlify/functions/releases?platform=android\`, {
      headers: { 'x-codepush-api-key': CODEPUSH_API_KEY }
    })
    .then(res => res.json())
    .then(data => console.log('CodePush Release:', data));
  }, []);

  return <View><Text>App Active</Text></View>;
}`,
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Developer Profile & Security
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5 shadow-sm ${
                isDark
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              <span>Multi-Tenant Engine</span>
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage developer identity, registered mobile applications, scoped App IDs, and integration credentials.
          </p>
        </div>
      </div>

      {/* 2-Column Split Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Panel: Developer Identity Card (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          <div
            className={`p-6 sm:p-7 rounded-3xl border relative overflow-hidden transition-all duration-300 shadow-xl ${
              isDark
                ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/60'
            }`}
          >
            {/* Top subtle decorative gradient banner for light mode */}
            {!isDark && (
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-cyan-100 via-sky-100 to-indigo-100 border-b border-slate-100" />
            )}

            {/* Avatar & Online Badge */}
            <div className="flex flex-col items-center text-center space-y-3.5 relative z-10 pt-2">
              <div className="relative">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 rounded-3xl object-cover border-4 border-white dark:border-slate-800 shadow-xl shadow-cyan-500/20"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-xl shadow-cyan-500/25 border-4 border-white dark:border-slate-800">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="h-10 w-10 text-white" />}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900 flex items-center justify-center shadow-md">
                  <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold tracking-tight">{user.displayName || 'Developer Account'}</h2>
                <p className={`text-xs mt-0.5 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {user.email || 'developer@codepush.io'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 ${
                    isDark
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : 'bg-cyan-100/70 text-cyan-800 border border-cyan-300'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Developer Tier</span>
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 mt-6 relative z-10">
              <div
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Apps</span>
                <span className={`text-lg font-black ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  {projects.length}
                </span>
              </div>
              <div
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auth</span>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">Firebase</span>
              </div>
              <div
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sync</span>
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block mt-1">Firestore</span>
              </div>
            </div>

            {/* Account Details Box */}
            <div
              className={`mt-4 p-4 rounded-2xl border space-y-3 font-mono text-xs relative z-10 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50/90 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-sans font-semibold text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Account UID
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(user.uid, setCopiedUid, 'UID copied to clipboard!')}
                  className={`font-mono font-bold flex items-center space-x-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    copiedUid
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : isDark
                      ? 'text-cyan-400 hover:bg-slate-800'
                      : 'text-cyan-700 hover:bg-slate-200'
                  }`}
                  title="Click to copy UID"
                >
                  <span>{user.uid.slice(0, 8)}...</span>
                  {copiedUid ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className={`font-sans font-semibold text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Session Status
                </span>
                <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold font-sans text-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Authenticated</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3 relative z-10">
              <button
                type="button"
                onClick={() => copyToClipboard(apiKey, setCopiedKey, 'API Key copied to clipboard!')}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
              >
                {copiedKey ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
                <span>{copiedKey ? 'API Key Copied!' : 'Copy Active API Key'}</span>
              </button>

              {onSignOut && (
                <button
                  type="button"
                  onClick={() => setIsSignOutConfirmOpen(true)}
                  className="w-full py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out Account</span>
                </button>
              )}
            </div>

            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>

        {/* Right Panel: API Key Management & Snippets (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: API Key Management */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 shadow-xl ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/60'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800/80 gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 shrink-0">
                  <Key className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">CodePush Master API Key</h2>
                  <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Developer key required for CI/CD pipelines, CLI deployment, and mobile client releases.
                  </p>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold shrink-0 flex items-center space-x-1.5 ${
                  isDark
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                    : 'bg-cyan-50 border border-cyan-200 text-cyan-800'
                }`}
              >
                <Lock className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                <span>Account Master Key</span>
              </div>
            </div>

            {/* Key Box */}
            <div className="mt-6 space-y-4">
              <div
                className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-sm transition-all ${
                  isDark
                    ? 'bg-slate-950/90 border-cyan-500/30 text-cyan-300 shadow-inner'
                    : 'bg-slate-50 border-cyan-300 text-slate-900 shadow-inner'
                }`}
              >
                <div className="flex items-center space-x-3 truncate max-w-full">
                  <Lock className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="truncate select-all font-semibold tracking-wide text-xs sm:text-sm">
                    {showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••'}
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className={`px-3 py-2 rounded-xl text-xs font-sans font-bold border transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{showKey ? 'Hide' : 'Reveal'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(apiKey, setCopiedKey, 'API Key copied to clipboard!')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-sans font-bold text-xs flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    {copiedKey ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                <ShieldCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>Keep this key secret. Do not expose in public repositories or client-side web bundles.</span>
              </div>
            </div>
          </div>

          {/* Card 2: Interactive Snippets Console */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 shadow-xl ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/60'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Integration Snippets</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Ready-to-use code blocks for your apps and deployment scripts.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(snippets[activeSnippetTab], setCopiedSnippet, 'Code snippet copied!')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  copiedSnippet
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-cyan-800 border border-slate-200'
                }`}
              >
                {copiedSnippet ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSnippet ? 'Snippet Copied!' : 'Copy Snippet'}</span>
              </button>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="flex items-center space-x-2 mt-5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveSnippetTab('env')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeSnippetTab === 'env'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold shadow-md shadow-cyan-500/20'
                    : isDark
                    ? 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                }`}
              >
                .env Config
              </button>

              <button
                type="button"
                onClick={() => setActiveSnippetTab('github')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeSnippetTab === 'github'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold shadow-md shadow-cyan-500/20'
                    : isDark
                    ? 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                }`}
              >
                GitHub Actions CI/CD
              </button>

              <button
                type="button"
                onClick={() => setActiveSnippetTab('curl')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeSnippetTab === 'curl'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold shadow-md shadow-cyan-500/20'
                    : isDark
                    ? 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                }`}
              >
                cURL CLI
              </button>

              <button
                type="button"
                onClick={() => setActiveSnippetTab('rn')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeSnippetTab === 'rn'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold shadow-md shadow-cyan-500/20'
                    : isDark
                    ? 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                }`}
              >
                React Native App
              </button>
            </div>

            {/* Code Block Terminal Container */}
            <div className="mt-4 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
              {/* Terminal Titlebar */}
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[11px] font-mono text-slate-400 font-semibold">
                  {activeSnippetTab === 'env' && '.env'}
                  {activeSnippetTab === 'github' && '.github/workflows/deploy.yml'}
                  {activeSnippetTab === 'curl' && 'bash / terminal'}
                  {activeSnippetTab === 'rn' && 'App.tsx'}
                </span>
                <div className="w-12" />
              </div>
              <pre className="p-4 sm:p-5 font-mono text-xs overflow-x-auto text-cyan-300 leading-relaxed max-h-64 selection:bg-cyan-500 selection:text-slate-950">
                {snippets[activeSnippetTab]}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: REGISTERED APPLICATIONS & APP LIST */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 shadow-xl ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 shrink-0">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-extrabold tracking-tight">Registered Applications</h2>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold ${
                    isDark
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                  }`}
                >
                  {projects.length} {projects.length === 1 ? 'App Configured' : 'Apps Configured'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                All mobile applications registered under your account with dedicated App IDs and release pipelines.
              </p>
            </div>
          </div>

          {onOpenCreateAppModal && (
            <button
              type="button"
              onClick={onOpenCreateAppModal}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center space-x-2 cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
            >
              <FolderPlus className="h-4 w-4" />
              <span>+ Create New App</span>
            </button>
          )}
        </div>

        {/* Apps Cards Grid */}
        {projects.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div
              className={`p-5 rounded-3xl ${
                isDark ? 'bg-slate-950/60 text-slate-600 border border-slate-800' : 'bg-slate-50 text-slate-400 border border-slate-200'
              }`}
            >
              <Smartphone className="h-12 w-12" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">No Applications Created Yet</h3>
              <p className={`text-xs mt-1 max-w-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Create your first mobile application to generate a unique App ID and begin publishing Over-The-Air updates.
              </p>
            </div>
            {onOpenCreateAppModal && (
              <button
                type="button"
                onClick={onOpenCreateAppModal}
                className="mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs cursor-pointer shadow-lg shadow-cyan-500/25 transition-all flex items-center space-x-2"
              >
                <FolderPlus className="h-4 w-4" />
                <span>+ Create Your First App</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-6">
            {projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              return (
                <div
                  key={proj.id}
                  className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
                    isActive
                      ? isDark
                        ? 'bg-slate-950/90 border-cyan-500/60 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                        : 'bg-gradient-to-b from-white via-cyan-50/20 to-blue-50/30 border-cyan-400/80 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-400/30'
                      : isDark
                      ? 'bg-slate-950/50 border-slate-800/90 hover:border-slate-700 hover:bg-slate-950/80 hover:shadow-xl'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50'
                  }`}
                >
                  {/* Subtle top indicator bar for active app */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />
                  )}

                  <div className="space-y-4">
                    {/* Header: Icon, Name, Date, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div
                          className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105 ${
                            isActive
                              ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/25'
                              : isDark
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <Smartphone className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-base truncate" title={proj.name}>
                            {proj.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>{formatDate(proj.createdAt)}</span>
                          </span>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5 shrink-0 shadow-xs">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            isDark
                              ? 'bg-slate-900 text-slate-400 border border-slate-800'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          Idle
                        </span>
                      )}
                    </div>

                    {/* App Details Box */}
                    <div
                      className={`p-4 rounded-2xl border space-y-3 text-xs font-mono transition-all ${
                        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50/90 border-slate-200/90'
                      }`}
                    >
                      {/* App ID Line */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5 font-sans">
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Unique App ID
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              isDark
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-cyan-100 text-cyan-800'
                            }`}
                          >
                            Scoped
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <code
                            className={`font-bold truncate text-xs select-all ${
                              isDark ? 'text-cyan-300' : 'text-cyan-800'
                            }`}
                          >
                            {proj.id}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(proj.id);
                              setCopiedAppId(proj.id);
                              showToast(`Copied App ID "${proj.id}"!`);
                              setTimeout(() => setCopiedAppId(null), 2000);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-bold transition-all cursor-pointer shrink-0 flex items-center space-x-1 ${
                              copiedAppId === proj.id
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                            }`}
                          >
                            {copiedAppId === proj.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedAppId === proj.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Platforms Badge */}
                      <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between font-sans text-xs">
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Platforms</span>
                        <span
                          className={`font-extrabold px-2.5 py-0.5 rounded-lg text-[11px] ${
                            isDark
                              ? 'bg-slate-800 text-slate-200'
                              : 'bg-white border border-slate-200 text-slate-800 shadow-2xs'
                          }`}
                        >
                          {proj.platform === 'both' ? 'Android & iOS' : proj.platform.toUpperCase()}
                        </span>
                      </div>

                      {/* GitHub Webhook URL if available */}
                      {proj.webhookUrl && (
                        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800/80">
                          <span className={`text-[10px] uppercase font-bold tracking-wider block font-sans mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            GitHub Webhook URL
                          </span>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="truncate text-[11px] text-slate-400 max-w-[170px]"
                              title={proj.webhookUrl}
                            >
                              {proj.webhookUrl}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(proj.webhookUrl!);
                                setCopiedWebhookUrl(proj.id);
                                showToast(`Copied Webhook URL for "${proj.name}"!`);
                                setTimeout(() => setCopiedWebhookUrl(null), 2000);
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-sans font-bold transition-all cursor-pointer shrink-0 ${
                                copiedWebhookUrl === proj.id
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : isDark
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                              }`}
                            >
                              {copiedWebhookUrl === proj.id ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2.5">
                    {isActive ? (
                      <div
                        className={`w-full py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 ${
                          isDark
                            ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                            : 'bg-cyan-50 border border-cyan-200 text-cyan-800 font-extrabold'
                        }`}
                      >
                        <Check className="h-4 w-4 stroke-[2.5]" />
                        <span>Active in Dashboard</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSwitchProject && onSwitchProject(proj.id)}
                        className={`w-full py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98 ${
                          isDark
                            ? 'bg-slate-800 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 hover:text-white text-slate-200 shadow-sm'
                            : 'bg-slate-100 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 hover:text-white text-slate-800 border border-slate-200 hover:border-transparent shadow-xs'
                        }`}
                      >
                        <span>Switch to this App</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Delete button */}
                    {onDeleteProject && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: proj.id, name: proj.name })}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                          isDark
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300'
                            : 'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700'
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete App</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Sign Out */}
      {onSignOut && (
        <ConfirmModal
          isOpen={isSignOutConfirmOpen}
          title="Sign Out of CodePush?"
          message="Are you sure you want to sign out? You will need to log back in to access your deployment dashboard and API keys."
          confirmLabel="Yes, Sign Out"
          variant="danger"
          onConfirm={onSignOut}
          onClose={() => setIsSignOutConfirmOpen(false)}
          theme={theme}
        />
      )}

      {/* Confirmation Modal for Delete App */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This will permanently remove the app and its App ID. This action cannot be undone."
        confirmLabel="Yes, Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteProject?.(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onClose={() => setDeleteTarget(null)}
        theme={theme}
      />
    </div>
  );
};

export default ProfileScreen;
