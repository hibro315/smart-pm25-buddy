import { useState, useEffect } from 'react';

const DB_NAME = 'phri-db';
const DB_VERSION = 1;
const STORE_NAME = 'health_logs';

interface HealthLogData {
  id?: string;
  aqi: number;
  pm25: number;
  pm10?: number;
  co?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  outdoorTime: number;
  age: number;
  gender: string;
  hasSymptoms: boolean;
  symptoms: string[];
  location?: string;
  wearingMask?: boolean;
  phri?: number;
  timestamp: string;
  synced: boolean;
}

export const useIndexedDB = () => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const openDB = () => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
      };

      request.onsuccess = () => {
        const database = request.result;
        setDb(database);
        setIsReady(true);
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = database.createObjectStore(STORE_NAME, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          objectStore.createIndex('synced', 'synced', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    };

    openDB();

    return () => {
      if (db) {
        db.close();
      }
    };
  }, []);

  const saveLog = async (data: Omit<HealthLogData, 'id' | 'timestamp' | 'synced'>): Promise<void> => {
    if (!db) {
      console.error('Database not ready');
      return;
    }

    const logData: Omit<HealthLogData, 'id'> = {
      ...data,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(logData);

      request.onsuccess = () => {
        console.log('💾 Autosaved to IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to save to IndexedDB');
        reject(request.error);
      };
    });
  };

  const getUnsyncedLogs = async (): Promise<HealthLogData[]> => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const allLogs = request.result as HealthLogData[];
        const unsyncedLogs = allLogs.filter(log => !log.synced);
        resolve(unsyncedLogs);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  };

  const markAsSynced = async (id: string): Promise<void> => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.synced = true;
          const updateRequest = store.put(data);
          
          updateRequest.onsuccess = () => {
            resolve();
          };
          
          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  };

  const clearSyncedLogs = async (): Promise<void> => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const allLogs = getAllRequest.result as HealthLogData[];
        const syncedLogs = allLogs.filter(log => log.synced && log.id);
        
        let deleted = 0;
        syncedLogs.forEach(log => {
          if (log.id) {
            const deleteRequest = store.delete(log.id);
            deleteRequest.onsuccess = () => {
              deleted++;
              if (deleted === syncedLogs.length) {
                resolve();
              }
            };
            deleteRequest.onerror = () => reject(deleteRequest.error);
          }
        });

        if (syncedLogs.length === 0) {
          resolve();
        }
      };

      getAllRequest.onerror = () => {
        reject(getAllRequest.error);
      };
    });
  };

  const getAllLogs = async (): Promise<HealthLogData[]> => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  };

  return {
    isReady,
    saveLog,
    getUnsyncedLogs,
    markAsSynced,
    clearSyncedLogs,
    getAllLogs,
  };
};
