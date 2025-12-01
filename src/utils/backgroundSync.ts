/**
 * Background Sync Utilities for PWA
 * Handles periodic background sync registration and data management
 */

const SYNC_TAG = 'phri-air-quality-sync';
const DB_NAME = 'phri-db';
const STORE_NAME = 'phri';
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface BackgroundSyncStatus {
  registered: boolean;
  supported: boolean;
  lastSync: number | null;
}

/**
 * Check if Periodic Background Sync is supported
 */
export const isPeriodicBackgroundSyncSupported = (): boolean => {
  return 'serviceWorker' in navigator && 
         'periodicSync' in (navigator as any).serviceWorker?.ready;
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Save user's location to IndexedDB for background sync
 */
export const saveLocationForBackgroundSync = async (
  latitude: number,
  longitude: number
): Promise<boolean> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: 'last-location',
        latitude,
        longitude,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('✅ Location saved for background sync:', { latitude, longitude });
    return true;
  } catch (error) {
    console.error('Error saving location:', error);
    return false;
  }
};

/**
 * Save user's health profile to IndexedDB for background sync
 */
export const saveHealthProfileForBackgroundSync = async (
  conditions: string[],
  age?: number
): Promise<boolean> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: 'health-profile',
        conditions,
        age,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('✅ Health profile saved for background sync');
    return true;
  } catch (error) {
    console.error('Error saving health profile:', error);
    return false;
  }
};

/**
 * Register periodic background sync
 */
export const registerPeriodicBackgroundSync = async (): Promise<boolean> => {
  try {
    if (!isPeriodicBackgroundSyncSupported()) {
      console.log('⚠️ Periodic Background Sync not supported');
      return false;
    }

    // Request notification permission first
    const notificationGranted = await requestNotificationPermission();
    if (!notificationGranted) {
      console.log('⚠️ Notification permission not granted');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as any).periodicSync;

    if (!periodicSync) {
      console.log('⚠️ Periodic sync not available');
      return false;
    }

    // Register periodic sync with minimum interval (browser will adjust based on heuristics)
    await periodicSync.register(SYNC_TAG, {
      minInterval: SYNC_INTERVAL_MS // 15 minutes
    });

    console.log('✅ Periodic background sync registered');
    return true;
  } catch (error) {
    console.error('❌ Failed to register periodic sync:', error);
    return false;
  }
};

/**
 * Unregister periodic background sync
 */
export const unregisterPeriodicBackgroundSync = async (): Promise<boolean> => {
  try {
    if (!isPeriodicBackgroundSyncSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as any).periodicSync;

    if (!periodicSync) {
      return false;
    }

    await periodicSync.unregister(SYNC_TAG);
    console.log('✅ Periodic background sync unregistered');
    return true;
  } catch (error) {
    console.error('❌ Failed to unregister periodic sync:', error);
    return false;
  }
};

/**
 * Get periodic background sync status
 */
export const getBackgroundSyncStatus = async (): Promise<BackgroundSyncStatus> => {
  const status: BackgroundSyncStatus = {
    registered: false,
    supported: isPeriodicBackgroundSyncSupported(),
    lastSync: null
  };

  if (!status.supported) {
    return status;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as any).periodicSync;

    if (periodicSync) {
      const tags = await periodicSync.getTags();
      status.registered = tags.includes(SYNC_TAG);
    }

    // Get last sync time from IndexedDB
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const lastAirQuality = await new Promise<any>((resolve) => {
      const request = store.get('last-air-quality');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });

    if (lastAirQuality?.timestamp) {
      status.lastSync = lastAirQuality.timestamp;
    }
  } catch (error) {
    console.error('Error getting background sync status:', error);
  }

  return status;
};

/**
 * Helper: Open IndexedDB with proper version management
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Increment version to trigger upgrade
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      console.log(`Upgrading IndexedDB from version ${oldVersion} to 2`);
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        console.log(`Created object store: ${STORE_NAME}`);
      }
    };
  });
};
