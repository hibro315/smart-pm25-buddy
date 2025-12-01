import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { supabase } from '@/integrations/supabase/client';

export interface BackgroundGeolocationConfig {
  enabled: boolean;
  distanceFilter?: number; // meters
  pm25Threshold?: number; // PM2.5 threshold for alerts
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  pm25?: number;
  aqi?: number;
  location?: string;
  timestamp: number;
}

export const useBackgroundGeolocation = (config: BackgroundGeolocationConfig) => {
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<LocationUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previousPM25Ref = useRef<number | null>(null);
  const watcherIdRef = useRef<string | null>(null);

  // Save location history to IndexedDB
  const saveLocationHistory = async (update: LocationUpdate) => {
    try {
      const db = await openDB();
      const tx = db.transaction('phri', 'readwrite');
      const store = tx.objectStore('phri');
      
      await store.put({
        id: `location-history-${update.timestamp}`,
        ...update
      });
    } catch (error) {
      console.error('Error saving location history:', error);
    }
  };

  // Open IndexedDB
  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('phri-db', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('phri')) {
          db.createObjectStore('phri', { keyPath: 'id' });
        }
      };
    });
  };

  // Fetch air quality data from Supabase Edge Function
  const fetchAirQuality = async (latitude: number, longitude: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-air-quality', {
        body: { latitude, longitude }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching air quality:', error);
      return null;
    }
  };

  // Trigger haptic feedback
  const triggerHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 200);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 400);
      } catch (error) {
        console.error('Error triggering haptic:', error);
      }
    }
  };

  // Send local notification with vibration
  const sendNotification = async (pm25: number, location: string, isIncrease: boolean) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      let title = '';
      let body = '';
      
      if (pm25 > 150) {
        title = '🚨 อันตราย! ค่าฝุ่น PM2.5 สูงมาก';
        body = `PM2.5: ${pm25} µg/m³ - หลีกเลี่ยงกิจกรรมกลางแจ้ง\n${location}`;
      } else if (pm25 > 100) {
        title = '⚠️ แจ้งเตือน: ค่าฝุ่น PM2.5 สูง';
        body = `PM2.5: ${pm25} µg/m³ - สวมหน้ากากเมื่ออยู่กลางแจ้ง\n${location}`;
      } else if (isIncrease) {
        title = '📈 ค่าฝุ่น PM2.5 เพิ่มขึ้น';
        body = `PM2.5: ${pm25} µg/m³ (+${pm25 - (previousPM25Ref.current || 0)} µg/m³)\n${location}`;
      } else {
        title = '📍 ตรวจสอบค่าฝุ่น PM2.5';
        body = `PM2.5: ${pm25} µg/m³\n${location}`;
      }

      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 100) },
          sound: undefined,
          attachments: undefined,
          actionTypeId: '',
          extra: { pm25, location }
        }]
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Handle location update
  const handleLocationUpdate = async (latitude: number, longitude: number) => {
    try {
      // Fetch air quality data
      const airQualityData = await fetchAirQuality(latitude, longitude);
      
      if (!airQualityData || !airQualityData.pm25) {
        console.log('No air quality data available');
        return;
      }

      const currentPM25 = airQualityData.pm25;
      const pm25Threshold = config.pm25Threshold || 50;
      
      // Create location update
      const update: LocationUpdate = {
        latitude,
        longitude,
        pm25: currentPM25,
        aqi: airQualityData.aqi,
        location: airQualityData.location || 'Unknown',
        timestamp: Date.now()
      };

      setLastUpdate(update);
      await saveLocationHistory(update);

      // Check if PM2.5 increased significantly (>5 µg/m³)
      const pm25Increase = previousPM25Ref.current 
        ? currentPM25 - previousPM25Ref.current 
        : 0;
      
      const shouldAlert = currentPM25 > pm25Threshold || pm25Increase > 5;

      if (shouldAlert) {
        await triggerHaptic();
        await sendNotification(
          currentPM25, 
          update.location,
          pm25Increase > 5
        );
      }

      previousPM25Ref.current = currentPM25;
    } catch (error) {
      console.error('Error handling location update:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Start background tracking
  const startTracking = async () => {
    if (!Capacitor.isNativePlatform()) {
      setError('Background tracking only works on native platforms');
      return;
    }

    try {
      // Request location permissions
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      }

      // Start position watcher
      const watcherId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        },
        (position, error) => {
          if (error) {
            console.error('Geolocation error:', error);
            setError(error.message);
            return;
          }

          if (position) {
            handleLocationUpdate(position.coords.latitude, position.coords.longitude);
          }
        }
      );

      watcherIdRef.current = watcherId;
      setIsTracking(true);
      setError(null);
      
      console.log('Background tracking started:', watcherId);
    } catch (error) {
      console.error('Error starting background tracking:', error);
      setError(error instanceof Error ? error.message : 'Failed to start tracking');
      setIsTracking(false);
    }
  };

  // Stop background tracking
  const stopTracking = async () => {
    try {
      if (watcherIdRef.current) {
        await Geolocation.clearWatch({ id: watcherIdRef.current });
        watcherIdRef.current = null;
      }
      
      setIsTracking(false);
      console.log('Background tracking stopped');
    } catch (error) {
      console.error('Error stopping background tracking:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop tracking');
    }
  };

  // Effect to start/stop tracking based on config
  useEffect(() => {
    if (config.enabled && !isTracking) {
      startTracking();
    } else if (!config.enabled && isTracking) {
      stopTracking();
    }

    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [config.enabled]);

  return {
    isTracking,
    lastUpdate,
    error,
    startTracking,
    stopTracking
  };
};
