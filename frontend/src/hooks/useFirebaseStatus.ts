import { useState, useEffect } from 'react';

export type ServerHealthStatus = 'live' | 'connecting' | 'offline';

export interface ServerStatusDetails {
  isLive: boolean;
  status: ServerHealthStatus;
  postgres: boolean;
  firebase: boolean;
  isConnected: boolean;
}

export function useFirebaseStatus(): ServerStatusDetails {
  return useServerStatus();
}

export function useServerStatus(): ServerStatusDetails {
  const [postgresOk, setPostgresOk] = useState<boolean>(true);
  const [firebaseOk, setFirebaseOk] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const checkBothHealth = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (isMounted) {
          setPostgresOk(false);
          setFirebaseOk(false);
          setIsConnecting(false);
        }
        return;
      }

      // 1. Verify PostgreSQL connection via backend endpoint
      let pg = false;
      try {
        const res = await fetch('/.netlify/functions/report-status', {
          method: 'GET',
          cache: 'no-store',
        });
        pg = res.ok;
      } catch {
        pg = false;
      }

      // 2. Verify Firebase connection
      let fb = false;
      try {
        const authDomain =
          import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tracker-42b47.firebaseapp.com';
        await fetch(`https://${authDomain}`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
        });
        fb = true;
      } catch {
        fb = false;
      }

      if (isMounted) {
        setPostgresOk(pg);
        setFirebaseOk(fb);
        setIsConnecting(false);
      }
    };

    checkBothHealth();
    const interval = setInterval(checkBothHealth, 15000);

    const handleOnline = () => {
      setIsConnecting(true);
      checkBothHealth();
    };

    const handleOffline = () => {
      if (isMounted) {
        setPostgresOk(false);
        setFirebaseOk(false);
        setIsConnecting(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isLive = postgresOk && firebaseOk;
  const status: ServerHealthStatus = isLive
    ? 'live'
    : isConnecting
    ? 'connecting'
    : 'offline';

  return {
    isLive,
    status,
    postgres: postgresOk,
    firebase: firebaseOk,
    isConnected: isLive,
  };
}
