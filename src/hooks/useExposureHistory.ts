import { useState, useCallback, useEffect } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { supabase } from '@/integrations/supabase/client';

export interface ExposureLog {
  id?: string;
  timestamp: string;
  pm25: number;
  aqi: number;
  location: string;
  latitude?: number;
  longitude?: number;
  outdoorTime: number; // minutes
  phri: number;
  symptoms: string[];
  wearingMask: boolean;
  temperature?: number;
  humidity?: number;
  synced: boolean;
}

export interface ExposureSummary {
  hourly: ExposureLog[];
  daily: {
    date: string;
    avgPM25: number;
    maxPM25: number;
    avgPHRI: number;
    maxPHRI: number;
    totalOutdoorTime: number;
    locationsVisited: string[];
  }[];
  weekly: {
    week: string;
    avgPM25: number;
    avgPHRI: number;
    totalOutdoorTime: number;
    highRiskDays: number;
  }[];
}

export const useExposureHistory = () => {
  const { isReady, saveLog, getAllLogs, getUnsyncedLogs, markAsSynced } = useIndexedDB();
  const [exposureLogs, setExposureLogs] = useState<ExposureLog[]>([]);
  const [summary, setSummary] = useState<ExposureSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Save exposure log to IndexedDB
  const saveExposureLog = useCallback(async (log: Omit<ExposureLog, 'id' | 'timestamp' | 'synced'>) => {
    if (!isReady) return;

    try {
      await saveLog({
        aqi: log.aqi,
        pm25: log.pm25,
        pm10: 0,
        co: 0,
        no2: 0,
        o3: 0,
        so2: 0,
        outdoorTime: log.outdoorTime,
        age: 0,
        gender: '',
        hasSymptoms: log.symptoms.length > 0,
        symptoms: log.symptoms,
        location: log.location,
        wearingMask: log.wearingMask,
        phri: log.phri,
      });

      // Reload logs
      await loadExposureLogs();
    } catch (error) {
      console.error('Error saving exposure log:', error);
    }
  }, [isReady, saveLog]);

  // Load all exposure logs from IndexedDB
  const loadExposureLogs = useCallback(async () => {
    if (!isReady) return;

    setLoading(true);
    try {
      const logs = await getAllLogs();
      const formattedLogs: ExposureLog[] = logs.map(log => ({
        id: log.id?.toString(),
        timestamp: log.timestamp,
        pm25: log.pm25,
        aqi: log.aqi,
        location: log.location || 'ไม่ระบุ',
        outdoorTime: log.outdoorTime,
        phri: log.phri || 0,
        symptoms: log.symptoms || [],
        wearingMask: log.wearingMask || false,
        synced: log.synced,
      }));

      setExposureLogs(formattedLogs);
      
      // Generate summary
      generateSummary(formattedLogs);
    } catch (error) {
      console.error('Error loading exposure logs:', error);
    } finally {
      setLoading(false);
    }
  }, [isReady, getAllLogs]);

  // Generate exposure summary
  const generateSummary = (logs: ExposureLog[]) => {
    if (logs.length === 0) {
      setSummary(null);
      return;
    }

    // Sort logs by timestamp
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Hourly data (last 24 hours)
    const last24Hours = sortedLogs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      const now = Date.now();
      return now - logTime < 24 * 60 * 60 * 1000;
    });

    // Daily data (last 30 days)
    const dailyMap = new Map<string, ExposureLog[]>();
    sortedLogs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, []);
      }
      dailyMap.get(date)!.push(log);
    });

    const daily = Array.from(dailyMap.entries())
      .slice(0, 30)
      .map(([date, logs]) => {
        const pm25Values = logs.map(l => l.pm25);
        const phriValues = logs.map(l => l.phri);
        const locations = [...new Set(logs.map(l => l.location))];

        return {
          date,
          avgPM25: Math.round(pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length),
          maxPM25: Math.max(...pm25Values),
          avgPHRI: Math.round((phriValues.reduce((a, b) => a + b, 0) / phriValues.length) * 10) / 10,
          maxPHRI: Math.max(...phriValues),
          totalOutdoorTime: logs.reduce((sum, l) => sum + l.outdoorTime, 0),
          locationsVisited: locations,
        };
      });

    // Weekly data (last 12 weeks)
    const weeklyMap = new Map<string, ExposureLog[]>();
    sortedLogs.forEach(log => {
      const date = new Date(log.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, []);
      }
      weeklyMap.get(weekKey)!.push(log);
    });

    const weekly = Array.from(weeklyMap.entries())
      .slice(0, 12)
      .map(([week, logs]) => {
        const pm25Values = logs.map(l => l.pm25);
        const phriValues = logs.map(l => l.phri);
        const highRiskDays = new Set(
          logs.filter(l => l.phri >= 6).map(l => new Date(l.timestamp).toDateString())
        ).size;

        return {
          week,
          avgPM25: Math.round(pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length),
          avgPHRI: Math.round((phriValues.reduce((a, b) => a + b, 0) / phriValues.length) * 10) / 10,
          totalOutdoorTime: logs.reduce((sum, l) => sum + l.outdoorTime, 0),
          highRiskDays,
        };
      });

    setSummary({
      hourly: last24Hours,
      daily,
      weekly,
    });
  };

  // Sync unsynced logs to backend
  const syncToBackend = useCallback(async () => {
    if (!isReady) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const unsyncedLogs = await getUnsyncedLogs();
      
      for (const log of unsyncedLogs) {
        try {
          const { error } = await supabase.from('health_logs').insert({
            user_id: user.id,
            aqi: log.aqi,
            pm25: log.pm25,
            outdoor_time: log.outdoorTime,
            age: log.age,
            gender: log.gender || 'other',
            has_symptoms: log.hasSymptoms,
            symptoms: log.symptoms,
            phri: log.phri || 0,
            location: log.location,
            wearing_mask: log.wearingMask,
          });

          if (!error && log.id) {
            await markAsSynced(log.id.toString());
          }
        } catch (error) {
          console.error('Error syncing log:', error);
        }
      }

      // Reload after sync
      await loadExposureLogs();
    } catch (error) {
      console.error('Error syncing to backend:', error);
    }
  }, [isReady, getUnsyncedLogs, markAsSynced]);

  // Load logs on mount
  useEffect(() => {
    if (isReady) {
      loadExposureLogs();
    }
  }, [isReady, loadExposureLogs]);

  // Auto-sync every 5 minutes
  useEffect(() => {
    if (!isReady) return;

    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        syncToBackend();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isReady, syncToBackend]);

  return {
    exposureLogs,
    summary,
    loading,
    saveExposureLog,
    loadExposureLogs,
    syncToBackend,
  };
};
