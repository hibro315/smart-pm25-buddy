import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { backgroundGeolocationService, Location } from '@/services/BackgroundGeolocationService';
import { NotificationService } from '@/services/NotificationService';

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
  const [previousPM25, setPreviousPM25] = useState<number | null>(null);

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

  // Determine if user has high-risk conditions (would need user profile)
  const isHighRiskUser = (): boolean => {
    // This should be passed from config or stored context
    // For now, return false - will be enhanced with user profile
    return false;
  };

  // Send notification using NotificationService
  const sendNotification = async (pm25: number, location: string, isIncrease: boolean) => {
    const isHighRisk = isHighRiskUser();
    const recommendedTime = calculateRecommendedTime(pm25, isHighRisk);
    
    const notificationData = NotificationService.buildNotificationData(
      pm25,
      location,
      isHighRisk,
      recommendedTime
    );

    await NotificationService.sendAlert(notificationData);
  };

  // Calculate recommended outdoor time
  const calculateRecommendedTime = (pm25: number, isHighRisk: boolean): number => {
    if (pm25 <= 37) return Infinity;
    if (pm25 <= 50) return isHighRisk ? 60 : 120;
    if (pm25 <= 75) return isHighRisk ? 30 : 60;
    if (pm25 <= 90) return isHighRisk ? 15 : 30;
    return isHighRisk ? 5 : 15;
  };

  // Handle location update from background service
  const handleLocationUpdate = async (location: Location) => {
    try {
      const { latitude, longitude } = location;
      
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
      const pm25Increase = previousPM25 
        ? currentPM25 - previousPM25 
        : 0;
      
      const shouldAlert = currentPM25 > pm25Threshold || pm25Increase > 5;

      if (shouldAlert) {
        await sendNotification(
          currentPM25, 
          update.location,
          pm25Increase > 5
        );
      }

      setPreviousPM25(currentPM25);
    } catch (error) {
      console.error('Error handling location update:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Start background tracking using background geolocation service
  const startTracking = async () => {
    if (!Capacitor.isNativePlatform()) {
      setError('Background tracking only works on native platforms');
      return;
    }

    try {
      // Initialize notification service
      await NotificationService.initialize();

      // Start background geolocation service
      const success = await backgroundGeolocationService.start(
        {
          distanceFilter: config.distanceFilter || 100,
          desiredAccuracy: 10,
          interval: 300000, // Check every 5 minutes
          debug: false,
          stopOnTerminate: false
        },
        handleLocationUpdate
      );

      if (success) {
        setIsTracking(true);
        setError(null);
        console.log('✅ Background tracking started successfully');
      } else {
        throw new Error('Failed to start background tracking');
      }
    } catch (error) {
      console.error('Error starting background tracking:', error);
      setError(error instanceof Error ? error.message : 'Failed to start tracking');
      setIsTracking(false);
    }
  };

  // Stop background tracking
  const stopTracking = async () => {
    try {
      await backgroundGeolocationService.stop();
      setIsTracking(false);
      console.log('🛑 Background tracking stopped');
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
