import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Upload, Check } from 'lucide-react';
import { offlineQueue } from '@/utils/offlineQueue';
import { toast } from '@/hooks/use-toast';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const updatePendingCount = () => {
      setPendingCount(offlineQueue.getPendingCount());
    };

    // Initial check
    updatePendingCount();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Poll pending count
    const interval = setInterval(updatePendingCount, 2000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (isSyncing || pendingCount === 0) return;
    
    setIsSyncing(true);
    try {
      await offlineQueue.uploadQueue();
      setPendingCount(offlineQueue.getPendingCount());
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ${
        isOnline 
          ? 'bg-amber-500/90 text-white' 
          : 'bg-red-500/90 text-white'
      }`}>
        {isOnline ? (
          <>
            {isSyncing ? (
              <>
                <Upload className="h-3 w-3 animate-pulse" />
                <span>Syncing {pendingCount}...</span>
              </>
            ) : (
              <>
                <Upload className="h-3 w-3" />
                <span>{pendingCount} pending</span>
                <button 
                  onClick={handleSync}
                  className="ml-1 underline"
                >
                  Sync now
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline{pendingCount > 0 ? ` • ${pendingCount} queued` : ''}</span>
          </>
        )}
      </div>
    </div>
  );
}