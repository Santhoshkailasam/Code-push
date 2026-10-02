import React, { useState, useEffect } from 'react';
import {
  User,
  Key,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Cpu,
  Lock,
  Sparkles,
  ExternalLink,
  Info,
} from 'lucide-react';
import type { UserSession } from '../../App';
import { db } from '../../../db/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface ProfileScreenProps {
  user: UserSession;
  theme?: 'dark' | 'light';
  showToast: (msg: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  theme = 'dark',
  showToast,
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

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showKey, setShowKey] = useState(true);

  // Sync API Key with Firebase Firestore on component mount
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
          // Save default key to Firestore
          await setDoc(userKeyRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            apiKey: apiKey,
            createdAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Firestore key sync notice:', err);
      }
    }
    syncKeyFromFirestore();
  }, [user.uid]);

  const handleGenerateNewKey = async () => {
    setIsGenerating(true);
    const newKey = `cp_live_${user.uid.slice(0, 6)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    setApiKey(newKey);
    try {
      localStorage.setItem(apiKeyStorageKey, newKey);
      const userKeyRef = doc(db, 'codepush_user_keys', user.uid);
      await setDoc(userKeyRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        apiKey: newKey,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore API key save notice:', e);
    }
    setIsGenerating(false);
    showToast('🎉 New CodePush API Key generated & saved to Cloud Database!');
  };

  const copyToClipboard = (text: string, setFn: (val: boolean) => void, msg: string) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    showToast(msg);
    setTimeout(() => setFn(false), 2500);
  };

  const envSnippet = `CODEPUSH_SERVER_URL=https://codepushs.netlify.app\nCODEPUSH_API_KEY=${apiKey}`;

  const yamlSnippet = `- name: 🚀 Publish OTA Release to CodePush Server
  run: |
    curl -X POST "https://codepushs.netlify.app/.netlify/functions/publish-release" \\
      -H "Content-Type: application/json" \\
      -H "x-codepush-api-key: \${{ secrets.CODEPUSH_API_KEY }}" \\
      -d '{
        "platform": "android",
        "version": "\${{ steps.vars.outputs.version }}",
        "downloadUrl": "https://your-site.netlify.app/bundles/android-\${{ steps.vars.outputs.version }}.zip",
        "mandatory": true
      }'`;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl pb-12">
      {/* Header Banner */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden transition-all duration-300 ${
          isDark
            ? 'bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950/80 border-slate-800 text-white shadow-2xl'
            : 'bg-gradient-to-r from-indigo-100 via-sky-100 to-cyan-100 border-indigo-200 text-slate-900 shadow-xl'
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="relative">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-cyan-500 shadow-xl shadow-cyan-500/20"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-cyan-500/30 border-2 border-cyan-400/50">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="h-10 w-10 text-white" />}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-slate-950 flex items-center justify-center">
                <Check className="h-3 w-3 text-white stroke-[3]" />
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {user.displayName || 'Developer Account'}
                </h1>
                <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Developer Tier
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {user.email || 'developer@codepush.io'} • UID: <span className="font-mono text-cyan-400 font-bold">{user.uid}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Multi-Tenant Key Scoping Active</span>
            </div>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* API Key Generation & Management Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-white shadow-xl'
            : 'bg-white border-indigo-100 text-slate-900 shadow-lg'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/60 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-400">
              <Key className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">CodePush API Key</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Use this unique key in your mobile app & GitHub CI/CD pipeline to publish and receive releases.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateNewKey}
            disabled={isGenerating}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 flex items-center space-x-2 cursor-pointer shadow-lg ${
              isDark
                ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/20'
                : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white shadow-cyan-600/20'
            } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : 'Regenerate API Key'}</span>
          </button>
        </div>

        {/* API Key Display Box */}
        <div className="mt-6 space-y-4">
          <label className={`text-xs font-bold uppercase tracking-wider font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Active Production API Key
          </label>
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 font-mono text-sm sm:text-base relative overflow-hidden transition-all ${
              isDark
                ? 'bg-slate-950/90 border-cyan-500/40 text-cyan-300 shadow-inner'
                : 'bg-slate-50 border-cyan-400 text-cyan-950 font-bold shadow-xs'
            }`}
          >
            <div className="flex items-center space-x-3 truncate">
              <Lock className="h-4 w-4 text-cyan-500 shrink-0" />
              <span className="truncate select-all font-semibold">
                {showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••'}
              </span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setShowKey(!showKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-sans font-semibold border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>

              <button
                onClick={() => copyToClipboard(apiKey, setCopiedKey, 'API Key copied to clipboard! 🚀')}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans font-bold text-xs flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shadow-md shadow-cyan-500/20"
              >
                {copiedKey ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
                <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
              </button>
            </div>
          </div>

          {/* Integration Status Badge */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-bold flex items-center space-x-1.5">
              <Cpu className="h-3.5 w-3.5" />
              <span>Scope: User-isolated releases</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold flex items-center space-x-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Status: Active & Valid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Setup Instructions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Mobile App Setup */}
        <div
          className={`p-6 rounded-3xl border space-y-4 transition-all duration-300 ${
            isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-indigo-100 text-slate-900 shadow-md'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <div className="flex items-center space-x-2.5">
              <Terminal className="h-5 w-5 text-cyan-400" />
              <h3 className="font-bold text-sm">1. Mobile App (.env)</h3>
            </div>
            <button
              onClick={() => copyToClipboard(envSnippet, setCopiedEnv, 'Environment snippet copied!')}
              className="text-xs text-cyan-400 hover:underline flex items-center space-x-1 font-semibold cursor-pointer"
            >
              {copiedEnv ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedEnv ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Add your generated API Key to your React Native project environment file (<code className="text-cyan-400">.env</code>):
          </p>

          <pre
            className={`p-4 rounded-2xl font-mono text-xs overflow-x-auto border ${
              isDark ? 'bg-slate-950 border-slate-800/90 text-cyan-300' : 'bg-slate-900 text-cyan-300 border-slate-800'
            }`}
          >
            {envSnippet}
          </pre>
        </div>

        {/* Step 2: GitHub Actions CI/CD Pipeline */}
        <div
          className={`p-6 rounded-3xl border space-y-4 transition-all duration-300 ${
            isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-indigo-100 text-slate-900 shadow-md'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <div className="flex items-center space-x-2.5">
              <ExternalLink className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-sm">2. GitHub Secrets (CI/CD)</h3>
            </div>
            <button
              onClick={() => copyToClipboard(yamlSnippet, setCopiedYaml, 'GitHub Action YAML snippet copied!')}
              className="text-xs text-indigo-400 hover:underline flex items-center space-x-1 font-semibold cursor-pointer"
            >
              {copiedYaml ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedYaml ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Set <code className="text-indigo-400">CODEPUSH_API_KEY</code> in <b>GitHub Repo → Settings → Secrets & Variables</b>:
          </p>

          <pre
            className={`p-4 rounded-2xl font-mono text-xs overflow-x-auto border ${
              isDark ? 'bg-slate-950 border-slate-800/90 text-indigo-300' : 'bg-slate-900 text-indigo-300 border-slate-800'
            }`}
          >
            {yamlSnippet}
          </pre>
        </div>
      </div>

      {/* Explanatory Info Card */}
      <div
        className={`p-5 rounded-2xl border flex items-start space-x-3 ${
          isDark
            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
            : 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200 text-sky-950'
        }`}
      >
        <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold block">How CodePush Multi-Tenant Key Identification Works</span>
          <p className="opacity-90 leading-relaxed">
            When your CI/CD pipeline pushes an update using <code className="font-mono bg-cyan-950/40 px-1 py-0.5 rounded">x-codepush-api-key</code>, 
            the Netlify server binds the JS bundle version specifically to your account. When users open your app, it checks for updates matching your exact API Key channel.
          </p>
        </div>
      </div>
    </div>
  );
};
