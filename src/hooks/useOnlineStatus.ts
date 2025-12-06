import { useState, useEffect, useCallback } from 'react';

interface OnlineStatusState {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineTime: Date | null;
  connectionType: string | null;
}

export const useOnlineStatus = () => {
  const [status, setStatus] = useState<OnlineStatusState>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineTime: null,
    connectionType: null,
  }));

  const updateConnectionInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      setStatus(prev => ({
        ...prev,
        connectionType: connection.effectiveType || connection.type || null,
      }));
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        wasOffline: true,
        lastOnlineTime: new Date(),
      }));
      updateConnectionInfo();
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for connection changes
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, [updateConnectionInfo]);

  return status;
};
