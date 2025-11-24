import { useEffect, useState } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { usePHRI } from './usePHRI';
import { toast } from '@/hooks/use-toast';

export const useBackgroundSync = () => {
  const { isReady, getUnsyncedLogs, markAsSynced, clearSyncedLogs } = useIndexedDB();
  const { saveHealthLog } = usePHRI();
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  const syncData = async () => {
    if (!isReady || isSyncing) return;

    try {
      setIsSyncing(true);
      const unsyncedLogs = await getUnsyncedLogs();
      
      if (unsyncedLogs.length === 0) {
        return;
      }

      console.log(`🔄 Syncing ${unsyncedLogs.length} unsynced logs...`);

      let successCount = 0;
      for (const log of unsyncedLogs) {
        try {
          await saveHealthLog({
            aqi: log.aqi,
            pm25: log.pm25,
            pm10: log.pm10 || 0,
            co: log.co || 0,
            no2: log.no2 || 0,
            o3: log.o3 || 0,
            so2: log.so2 || 0,
            outdoorTime: log.outdoorTime,
            age: log.age,
            gender: log.gender,
            hasSymptoms: log.hasSymptoms,
            symptoms: log.symptoms,
            location: log.location,
            wearingMask: log.wearingMask,
          });

          if (log.id) {
            await markAsSynced(log.id.toString());
            successCount++;
          }
        } catch (error) {
          console.error('Failed to sync log:', error);
        }
      }

      if (successCount > 0) {
        toast({
          title: '✅ ซิงค์ข้อมูลสำเร็จ',
          description: `ซิงค์ข้อมูล ${successCount} รายการเรียบร้อยแล้ว`,
        });

        // Clear synced logs after 1 minute to keep storage clean
        setTimeout(() => clearSyncedLogs(), 60000);
      }

      setUnsyncedCount(unsyncedLogs.length - successCount);
    } catch (error) {
      console.error('Background sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateUnsyncedCount = async () => {
    if (!isReady) return;
    
    const unsyncedLogs = await getUnsyncedLogs();
    setUnsyncedCount(unsyncedLogs.length);
  };

  useEffect(() => {
    if (!isReady) return;

    // Update unsynced count on mount
    updateUnsyncedCount();

    // Listen for online event
    const handleOnline = () => {
      console.log('🌐 Back online, attempting to sync...');
      syncData();
    };

    window.addEventListener('online', handleOnline);

    // Check for unsynced data periodically (every 5 minutes)
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        updateUnsyncedCount();
        if (unsyncedCount > 0) {
          syncData();
        }
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalId);
    };
  }, [isReady, unsyncedCount]);

  return {
    isSyncing,
    unsyncedCount,
    syncData,
    updateUnsyncedCount,
  };
};
