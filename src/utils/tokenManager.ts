import { type User, getIdTokenResult, signOut } from 'firebase/auth';
import { auth } from '../../db/firebaseConfig';

export interface AuthTokenSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds for Access Token
  refreshTokenExpiresAt: number; // Unix timestamp in milliseconds for Refresh Token
  tokenIssuedAt: number; // Unix timestamp in milliseconds
}

export interface ApiCallLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  tokenUsed: string; // Truncated access token
  status: 'SUCCESS' | 'TOKEN_REFRESHED' | 'EXPIRED_RELOGIN_REQUIRED' | 'FAILED';
  statusCode: number;
}

// Global log of API calls interceptor
let apiCallLogs: ApiCallLog[] = [];
const logListeners: Array<(logs: ApiCallLog[]) => void> = [];

export function subscribeApiLogs(listener: (logs: ApiCallLog[]) => void): () => void {
  logListeners.push(listener);
  listener([...apiCallLogs]);
  return () => {
    const index = logListeners.indexOf(listener);
    if (index !== -1) logListeners.splice(index, 1);
  };
}

function notifyLogListeners() {
  logListeners.forEach((l) => l([...apiCallLogs]));
}

export function addApiLog(log: Omit<ApiCallLog, 'id' | 'timestamp'>) {
  const newLog: ApiCallLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
  apiCallLogs = [newLog, ...apiCallLogs].slice(0, 30); // Keep last 30 logs
  notifyLogListeners();
}

/**
 * Parse token expiry settings from environment variables (.env)
 */
export function getEnvTokenConfig() {
  const days = parseInt(import.meta.env.VITE_TOKEN_EXPIRY_DAYS || '0', 10);
  const hours = parseInt(import.meta.env.VITE_TOKEN_EXPIRY_HOURS || '0', 10);
  const minutes = parseInt(import.meta.env.VITE_TOKEN_EXPIRY_MINUTES || '1', 10);
  const seconds = parseInt(import.meta.env.VITE_TOKEN_EXPIRY_SECONDS || '0', 10);

  const refreshDays = parseInt(import.meta.env.VITE_REFRESH_TOKEN_EXPIRY_DAYS || '30', 10);
  const refreshHours = parseInt(import.meta.env.VITE_REFRESH_TOKEN_EXPIRY_HOURS || '0', 10);
  const refreshMinutes = parseInt(import.meta.env.VITE_REFRESH_TOKEN_EXPIRY_MINUTES || '0', 10);

  const totalMs = (days * 86400 + hours * 3600 + minutes * 60 + seconds) * 1000;
  const refreshMs = (refreshDays * 86400 + refreshHours * 3600 + refreshMinutes * 60) * 1000;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: totalMs > 0 ? totalMs : 60000, // Default to 60,000ms (1 min) if not specified
    refreshDays,
    refreshHours,
    refreshMinutes,
    refreshMs: refreshMs > 0 ? refreshMs : 30 * 86400 * 1000,
  };
}

/**
 * Extract all VITE_ environment variables dynamically from import.meta.env
 */
export function getEnvVariablesList(): Array<{ key: string; value: string; masked: string }> {
  const envObj = import.meta.env || {};
  return Object.keys(envObj)
    .filter((k) => k.startsWith('VITE_'))
    .map((key) => {
      const val = String(envObj[key] || '');
      const masked = val.length > 8 ? `${val.substring(0, 6)}...${val.slice(-4)}` : val;
      return { key, value: val, masked };
    });
}

/**
 * Formats a timestamp into Day Name, Date String, and Time String
 */
export function formatFullDateTime(timestampMs: number): {
  dayName: string;
  dateStr: string;
  timeStr: string;
  fullFormatted: string;
} {
  const date = new Date(timestampMs);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Friday"
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); // e.g., "Oct 2, 2026"
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }); // e.g., "10:13:47 AM"

  return {
    dayName,
    dateStr,
    timeStr,
    fullFormatted: `${dayName}, ${dateStr} at ${timeStr}`,
  };
}

/**
 * Extract full token session data from Firebase User
 */
export async function extractTokenSession(user: User): Promise<AuthTokenSession> {
  const tokenResult = await getIdTokenResult(user, false);
  const envConfig = getEnvTokenConfig();
  
  const tokenIssuedAt = tokenResult.issuedAtTime 
    ? new Date(tokenResult.issuedAtTime).getTime() 
    : Date.now();

  // Priority to envConfig.totalMs if configured in .env (e.g., 1 min)
  const expiresAt = envConfig.totalMs > 0
    ? tokenIssuedAt + envConfig.totalMs
    : (tokenResult.expirationTime 
        ? new Date(tokenResult.expirationTime).getTime() 
        : tokenIssuedAt + 60000);

  const refreshTokenExpiresAt = tokenIssuedAt + envConfig.refreshMs;

  const accessToken = import.meta.env.VITE_ACCESS_TOKEN || tokenResult.token;
  const refreshToken = import.meta.env.VITE_REFRESH_TOKEN || user.refreshToken || 'fb_refresh_' + Date.now();

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Developer',
    photoURL: user.photoURL,
    accessToken,
    refreshToken,
    expiresAt,
    refreshTokenExpiresAt,
    tokenIssuedAt,
  };
}

/**
 * Verify and return a valid Access Token before making any API call.
 * If expired or near expiration (< 30s), attempts auto-refresh using the Refresh Token.
 * If refresh fails or user is logged out, throws a SessionExpired error.
 */
export async function getValidAccessToken(forceRefresh = false): Promise<string> {
  const currentUser = auth.currentUser;
  
  // Try retrieving cached session if current user is not loaded yet
  const cachedUserRaw = localStorage.getItem('codepush_cached_user');
  let cachedSession: AuthTokenSession | null = null;
  if (cachedUserRaw) {
    try {
      cachedSession = JSON.parse(cachedUserRaw);
    } catch {
      cachedSession = null;
    }
  }

  const now = Date.now();
  
  // If we have a cached session, check if it's expired
  if (cachedSession) {
    const isExpired = now >= cachedSession.expiresAt - 10000; // 10s buffer
    if (!isExpired && !forceRefresh) {
      return cachedSession.accessToken;
    }
  }

  // If user is available on Firebase Auth SDK, attempt refresh
  if (currentUser) {
    try {
      // Force refresh using Firebase SDK (uses refresh token under the hood)
      const freshTokenResult = await getIdTokenResult(currentUser, true);
      const envConfig = getEnvTokenConfig();
      const tokenIssuedAt = Date.now();
      const freshExpiresAt = envConfig.totalMs > 0
        ? tokenIssuedAt + envConfig.totalMs
        : (freshTokenResult.expirationTime 
            ? new Date(freshTokenResult.expirationTime).getTime() 
            : tokenIssuedAt + 60000);
      const refreshTokenExpiresAt = cachedSession?.refreshTokenExpiresAt || (tokenIssuedAt + envConfig.refreshMs);
        
      const updatedSession: AuthTokenSession = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Developer',
        photoURL: currentUser.photoURL,
        accessToken: freshTokenResult.token,
        refreshToken: currentUser.refreshToken || cachedSession?.refreshToken || 'fb_refresh_' + Date.now(),
        expiresAt: freshExpiresAt,
        refreshTokenExpiresAt,
        tokenIssuedAt,
      };

      localStorage.setItem('codepush_cached_user', JSON.stringify(updatedSession));
      return freshTokenResult.token;
    } catch (err) {
      console.error('Failed to auto-refresh access token:', err);
      // Force sign out if refresh token fails
      await signOut(auth);
      localStorage.removeItem('codepush_cached_user');
      throw new Error('SESSION_EXPIRED');
    }
  }

  if (cachedSession && now >= cachedSession.expiresAt) {
    localStorage.removeItem('codepush_cached_user');
    throw new Error('SESSION_EXPIRED');
  }

  if (cachedSession) {
    return cachedSession.accessToken;
  }

  throw new Error('UNAUTHENTICATED');
}

/**
 * Higher-order wrapper for API / Firestore calls.
 * Ensures an active access token is attached and handles expired session relogin.
 */
export async function executeAuthenticatedApiCall<T>(
  endpointName: string,
  apiFn: (accessToken: string) => Promise<T>
): Promise<T> {
  try {
    const accessToken = await getValidAccessToken();
    const truncatedToken = accessToken ? `${accessToken.substring(0, 10)}...${accessToken.slice(-6)}` : 'No Token';
    
    const result = await apiFn(accessToken);
    
    addApiLog({
      endpoint: endpointName,
      method: 'POST/FIRESTORE',
      tokenUsed: truncatedToken,
      status: 'SUCCESS',
      statusCode: 200,
    });
    
    return result;
  } catch (err: any) {
    if (err?.message === 'SESSION_EXPIRED' || err?.message === 'UNAUTHENTICATED') {
      addApiLog({
        endpoint: endpointName,
        method: 'POST/FIRESTORE',
        tokenUsed: 'EXPIRED',
        status: 'EXPIRED_RELOGIN_REQUIRED',
        statusCode: 401,
      });
      throw err;
    }
    
    addApiLog({
      endpoint: endpointName,
      method: 'POST/FIRESTORE',
      tokenUsed: 'VALID',
      status: 'FAILED',
      statusCode: 500,
    });
    throw err;
  }
}

/**
 * Authenticated Fetch Wrapper
 * Attaches Authorization: Bearer <accessToken> header to standard HTTP API calls.
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const accessToken = await getValidAccessToken();
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    
    const response = await fetch(url, { ...options, headers });
    
    const truncatedToken = accessToken ? `${accessToken.substring(0, 10)}...` : 'NONE';
    addApiLog({
      endpoint: url,
      method: options.method || 'GET',
      tokenUsed: truncatedToken,
      status: response.ok ? 'SUCCESS' : 'FAILED',
      statusCode: response.status,
    });
    
    if (response.status === 401) {
      // Try refresh once
      try {
        const freshToken = await getValidAccessToken(true);
        headers.set('Authorization', `Bearer ${freshToken}`);
        return await fetch(url, { ...options, headers });
      } catch {
        throw new Error('SESSION_EXPIRED');
      }
    }
    
    return response;
  } catch (err) {
    console.error('Authenticated fetch error:', err);
    throw err;
  }
}

/**
 * Utility for Testing: Artificially set token expiry to X seconds in the future
 */
export function simulateTokenExpiry(secondsInFuture: number): AuthTokenSession | null {
  const cachedRaw = localStorage.getItem('codepush_cached_user');
  if (!cachedRaw) return null;
  try {
    const session: AuthTokenSession = JSON.parse(cachedRaw);
    session.expiresAt = Date.now() + secondsInFuture * 1000;
    localStorage.setItem('codepush_cached_user', JSON.stringify(session));
    return session;
  } catch {
    return null;
  }
}
