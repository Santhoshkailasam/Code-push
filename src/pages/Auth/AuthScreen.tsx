import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sun,
  Moon,
  Zap,
  Server,
  Smartphone,
  Shield,
  X,
  Globe,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../../../db/firebaseConfig';
import { extractTokenSession, type AuthTokenSession } from '../../utils/tokenManager';

interface AuthScreenProps {
  onLoginSuccess: (tokenSession: AuthTokenSession) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  theme = 'dark',
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status, Toast & Error handling
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const handleThemeClick = () => {
    setIsSpinning(true);
    if (onToggleTheme) onToggleTheme();
    setTimeout(() => setIsSpinning(false), 600);
  };

  // Calculate Password Strength for Register Mode
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-300' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-cyan-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  // Sync authenticated user details live to Firestore users collection
  const syncUserToFirestore = async (user: any, nameOverride?: string) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || nameOverride || user.email?.split('@')[0],
          photoURL: user.photoURL || null,
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not sync user profile to Firestore:', err);
    }
  };

  // Convert raw Firebase auth errors to developer-friendly messages
  const formatAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/account-exists-with-different-credential') {
      return 'This email address is already associated with Google Sign-In. Please sign in using "Continue with Google".';
    }
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      return 'Invalid email or password. Please verify your credentials or create a new account.';
    }
    if (code === 'auth/wrong-password') {
      return 'Incorrect password. Please try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account already exists with this email address. If registered via Google, please use Google Sign-In.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/weak-password') {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
      return 'Google Sign-In is not enabled yet in your Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method -> Click Google -> Enable -> Save.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed before completing.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'Domain unauthorized. Go to Firebase Console -> Authentication -> Settings -> Authorized domains and add localhost.';
    }
    return err?.message || 'Firebase Authentication failed. Please check your connection and Firebase console settings.';
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const tokenSession = await extractTokenSession(user);
      await syncUserToFirestore(user);

      showToast(`Welcome ${user.displayName || 'Developer'}! Google Sign-In successful.`, 'success');

      onLoginSuccess(tokenSession);
    } catch (err: any) {
      console.error('Live Google Sign-In Error:', err);
      const msg = formatAuthError(err);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      const msg = 'Please fill in all required fields.';
      showToast(msg, 'error');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        const msg = 'Passwords do not match.';
        showToast(msg, 'error');
        return;
      }
      if (password.length < 6) {
        const msg = 'Password must be at least 6 characters.';
        showToast(msg, 'error');
        return;
      }
    }

    setLoading(true);

    try {
      // Check if email is registered with Google Sign-In
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.includes('google.com') && !methods.includes('password')) {
          const googleErrMsg = `The email "${email}" is registered via Google Sign-In. Please sign in using the "Continue with Google" button.`;
          showToast(googleErrMsg, 'error');
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        // Fallback to standard sign-in if method check is restricted by Firebase rules
      }

      if (mode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const tokenSession = await extractTokenSession(user);
        await syncUserToFirestore(user);

        showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
        onLoginSuccess(tokenSession);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (name) {
          await updateProfile(user, { displayName: name });
        }

        const tokenSession = await extractTokenSession(user);
        await syncUserToFirestore(user, name);

        showToast(`Account successfully created! Welcome to CodePush.`, 'success');
        onLoginSuccess(tokenSession);
      }
    } catch (err: any) {
      console.error('Live Firebase Authentication Error:', err);
      const msg = formatAuthError(err);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center p-4 sm:p-8 lg:p-12 relative overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950'
          : 'bg-[#f4f7fa] text-slate-900 selection:bg-blue-600 selection:text-white'
      }`}
    >
      {/* Full Screen Theme Transition Ripple Overlay */}
      {isSpinning && (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden flex items-center justify-center">
          <div
            className={`w-96 h-96 rounded-full animate-theme-ripple ${
              isDark
                ? 'bg-gradient-to-r from-slate-900 via-slate-950 to-cyan-950'
                : 'bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600'
            }`}
          />
        </div>
      )}

      {/* Decorative Geometric Dot Matrix & Cyber Grid Pattern */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          isDark
            ? 'opacity-40 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]'
            : 'opacity-70 bg-[radial-gradient(#94a3b8_1.2px,transparent_1.2px)] [background-size:24px_24px]'
        }`}
      />

      {/* Secondary Diagonal Grid Lines in Light Mode for Depth */}
      {!isDark && (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:96px_96px] opacity-40 pointer-events-none" />
      )}

      {/* Glowing Ambient Mesh Orbs with Soft Radial Falloff */}
      <div
        className={`absolute -top-24 left-1/4 w-[38rem] h-[38rem] rounded-full blur-[130px] pointer-events-none ${
          isDark ? 'bg-cyan-500/15' : 'bg-cyan-400/20'
        }`}
      />
      <div
        className={`absolute bottom-0 right-1/4 w-[42rem] h-[42rem] rounded-full blur-[140px] pointer-events-none ${
          isDark ? 'bg-indigo-600/15' : 'bg-blue-400/20'
        }`}
      />
      <div
        className={`absolute top-1/3 right-10 w-96 h-96 rounded-full blur-[110px] pointer-events-none ${
          isDark ? 'bg-purple-500/15' : 'bg-indigo-300/20'
        }`}
      />

      {/* Split Screen Responsive Grid Layout */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-20">
        {/* Left Hero & Feature Showcase Column (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-4">
          <div className="space-y-6">
            {/* Version Badge Accent */}
            <div
              className={`inline-flex items-center space-x-2.5 px-4 py-2 rounded-full border shadow-sm ${
                isDark
                  ? 'bg-slate-900/80 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10'
                  : 'bg-white border-cyan-300/80 text-cyan-800 shadow-xs'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-mono font-black tracking-wider uppercase">
                Self-Hosted CodePush OTA v2.4
              </span>
            </div>

            {/* Main Hero Typography */}
            <div className="space-y-3">
              <h1
                className={`text-4xl xl:text-5xl font-black tracking-tight leading-[1.12] ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }`}
              >
                Instant Mobile OTA{' '}
                <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Deployment
                </span>{' '}
                Console
              </h1>
              <p
                className={`text-sm leading-relaxed font-medium max-w-lg ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Ship React Native JS bundles instantly across iOS & Android devices in real-time with zero App Store review waiting periods.
              </p>
            </div>

            {/* Feature Highlights 2x2 Grid */}
            <div className="grid grid-cols-2 gap-4 pt-3">
              {/* Feature 1: Real-Time Sync */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:shadow-md hover:border-cyan-300'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl w-fit mb-3 border ${
                    isDark
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                      : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                  }`}
                >
                  <Zap className="h-5 w-5" />
                </div>
                <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Real-Time Sync</div>
                <div className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Firebase Cloud Firestore
                </div>
              </div>

              {/* Feature 2: SHA256 Verified */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:shadow-md hover:border-purple-300'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl w-fit mb-3 border ${
                    isDark
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                      : 'bg-purple-50 border-purple-200 text-purple-700'
                  }`}
                >
                  <Shield className="h-5 w-5" />
                </div>
                <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>SHA256 Verified</div>
                <div className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  RSA security integrity
                </div>
              </div>

              {/* Feature 3: Dual Platform */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:shadow-md hover:border-emerald-300'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl w-fit mb-3 border ${
                    isDark
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Dual Platform</div>
                <div className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Android & iOS bundles
                </div>
              </div>

              {/* Feature 4: Netlify Edge */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:shadow-md hover:border-amber-300'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl w-fit mb-3 border ${
                    isDark
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                >
                  <Server className="h-5 w-5" />
                </div>
                <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Netlify Edge</div>
                <div className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Global CDN distribution
                </div>
              </div>
            </div>
          </div>

          {/* Live Status Stats Bar */}
          <div
            className={`pt-5 border-t flex items-center justify-between text-xs font-mono ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600 font-semibold'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Status: <strong className="text-emerald-600 dark:text-emerald-400 font-black">Online & Operational</strong>
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Globe className="h-3.5 w-3.5 text-cyan-500" />
              <span>Edge Latency: <strong className="text-cyan-700 dark:text-cyan-400 font-black">18ms</strong></span>
            </div>
          </div>
        </div>

        {/* Right Ultra-Premium Auth Form Column */}
        <div className="w-full lg:col-span-6 flex justify-center">
          <div
            className={`w-full ${mode === 'register' ? 'max-w-xl' : 'max-w-md'} rounded-3xl border p-8 sm:p-10 transition-all duration-300 ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/5'
                : 'bg-white border-slate-200 text-slate-900 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/5'
            }`}
          >
            {/* Header Brand Icon & Titles */}
            <div className="text-center space-y-3 mb-7">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-xl shadow-cyan-500/25 ring-4 ring-cyan-500/15 p-1.5 transform hover:scale-105 transition-all duration-300 overflow-hidden">
                <img src="/logo.png" alt="CodePush Logo" className="h-full w-full object-cover rounded-xl" />
              </div>
              <div>
                <h2
                  className={`text-2xl font-black tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  CodePush OTA Console
                </h2>
                <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {mode === 'login'
                    ? 'Sign in to access your OTA management dashboard'
                    : 'Create a developer account to publish updates'}
                </p>
              </div>
            </div>

            {/* Segmented Mode Switcher Tabs */}
            <div
              className={`p-1.5 rounded-2xl flex items-center mb-6 border transition-all ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200 shadow-inner'
              }`}
            >
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/25'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900 font-bold'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/25'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900 font-bold'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' ? (
                <>
                  {/* Row 1: Full Name & Email Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label
                        className={`block text-[11px] font-black mb-1.5 font-mono uppercase tracking-wider ${
                          isDark ? 'text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        Full Name
                      </label>
                      <div className="relative">
                        <User
                          className={`absolute left-3.5 top-3 h-4 w-4 ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Alex Mercer"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-all ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/15 shadow-2xs'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label
                        className={`block text-[11px] font-black mb-1.5 font-mono uppercase tracking-wider ${
                          isDark ? 'text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail
                          className={`absolute left-3.5 top-3 h-4 w-4 ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="developer@company.com"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-all ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/15 shadow-2xs'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Password */}
                    <div>
                      <label
                        className={`block text-[11px] font-black mb-1.5 font-mono uppercase tracking-wider ${
                          isDark ? 'text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        Password
                      </label>
                      <div className="relative">
                        <Lock
                          className={`absolute left-3.5 top-3 h-4 w-4 ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-all ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/15 shadow-2xs'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      {password && (
                        <div className="mt-2 space-y-1">
                          <div
                            className={`h-1.5 w-full rounded-full overflow-hidden ${
                              isDark ? 'bg-slate-800' : 'bg-slate-200'
                            }`}
                          >
                            <div
                              className={`h-full transition-all duration-300 ${strength.color}`}
                              style={{ width: `${strength.score}%` }}
                            />
                          </div>
                          <div
                            className={`flex justify-between text-[10px] font-mono ${
                              isDark ? 'text-slate-400' : 'text-slate-600'
                            }`}
                          >
                            <span>Strength</span>
                            <span className="font-extrabold">{strength.label}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label
                        className={`block text-[11px] font-black mb-1.5 font-mono uppercase tracking-wider ${
                          isDark ? 'text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock
                          className={`absolute left-3.5 top-3 h-4 w-4 ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-all ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/15 shadow-2xs'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Email Address (Login Mode) */}
                  <div>
                    <label
                      className={`block text-[11px] font-black mb-1.5 font-mono uppercase tracking-wider ${
                        isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        className={`absolute left-3.5 top-3 h-4 w-4 ${
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="developer@company.com"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-all ${
                          isDark
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/15 shadow-2xs'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Password Input (Login Mode) */}
                  <div>
                    <label
                      className={`block text-[11px] font-black mb-1.5 font-mono uppercase tracking-wider ${
                        isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        className={`absolute left-3.5 top-3 h-4 w-4 ${
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-all ${
                          isDark
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/15 shadow-2xs'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Submit Form Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-2 border border-cyan-400/30 mt-6"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In to Console' : 'Create Developer Account'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex py-4 items-center my-2">
              <div className={`flex-grow border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
              <span
                className={`flex-shrink mx-3 text-[10px] font-extrabold uppercase tracking-widest font-mono ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Or continue with
              </span>
              <div className={`flex-grow border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
            </div>

            {/* Google SSO Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center space-x-3 border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                isDark
                  ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-white shadow-md'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-xs hover:border-slate-300'
              }`}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top-Right Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] max-w-md w-[calc(100%-3rem)] sm:w-auto px-4 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between space-x-3 text-xs font-semibold animate-toast-slide border backdrop-blur-2xl transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-slate-900 border-emerald-500/50 text-emerald-300 shadow-emerald-950/40'
              : 'bg-slate-900 border-rose-500/50 text-rose-300 shadow-rose-950/40'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            {toast.type === 'success' ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="leading-snug font-bold truncate">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Dismiss Toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Floating Bottom-Right Theme Toggle Button */}
      {onToggleTheme && (
        <button
          type="button"
          onClick={handleThemeClick}
          className={`fixed bottom-6 right-6 z-50 p-3.5 rounded-2xl border transition-all duration-300 active:scale-90 hover:scale-110 cursor-pointer shadow-2xl flex items-center justify-center ${
            isDark
              ? 'bg-slate-900/90 border-slate-700 text-amber-400 hover:bg-slate-800 shadow-cyan-950/50'
              : 'bg-gradient-to-tr from-amber-400 via-orange-400 to-pink-500 border-amber-300 text-white shadow-xl shadow-orange-500/30'
          }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <div className={isSpinning ? 'animate-theme-spin' : 'transition-transform duration-300'}>
            {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-white" />}
          </div>
        </button>
      )}
    </div>
  );
};

export default AuthScreen;
