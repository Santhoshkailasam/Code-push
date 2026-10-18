import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../../db/firebaseConfig';

export type FirebaseStatus = 'connected' | 'connecting' | 'disconnected';

export function useFirebaseStatus(): { isConnected: boolean; status: FirebaseStatus } {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [status, setStatus] = useState<FirebaseStatus>('connecting');

  useEffect(() => {
    if (!navigator.onLine) {
      setIsConnected(false);
      setStatus('disconnected');
    }

    const handleOnline = () => {
      setStatus('connecting');
    };

    const handleOffline = () => {
      setIsConnected(false);
      setStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let connectedRef: ReturnType<typeof ref> | null = null;
    try {
      connectedRef = ref(rtdb, '.info/connected');
      onValue(connectedRef, (snap) => {
        const val = snap.val() === true;
        if (val) {
          setIsConnected(true);
          setStatus('connected');
        } else if (!navigator.onLine) {
          setIsConnected(false);
          setStatus('disconnected');
        } else {
          setStatus('connecting');
        }
      });
    } catch (err) {
      console.warn('Firebase RTDB .info/connected listener error:', err);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connectedRef) {
        try {
          off(connectedRef);
        } catch {}
      }
    };
  }, []);

  return { isConnected, status };
}
