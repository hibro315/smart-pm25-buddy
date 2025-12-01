import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getPosition } from '@/utils/geolocation';

interface NearbyStation {
  name: string;
  aqi: number;
  distance: number;
}

interface AirQualityData {
  pm25: number;
  pm10: number;
  aqi: number;
  no2: number;
  o3: number;
  so2: number;
  co: number;
  location: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind?: number;
  nearbyStations?: NearbyStation[];
  source?: string;
  timestamp: string;
}

const FETCH_TIMEOUT = 10000; // 10 seconds
const POLLING_INTERVAL = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY = 'lastKnownAQI';

export const useAirQualityWithFallback = () => {
  // Load cached data immediately on mount
  const getCachedData = (): AirQualityData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const [data, setData] = useState<AirQualityData | null>(getCachedData);
  const [loading, setLoading] = useState(!getCachedData()); // Only show loading if no cache
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const pollingRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Get user's location and fetch data immediately
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const position = await getPosition();
        setCurrentLocation({
          lat: position.latitude,
          lon: position.longitude
        });
      } catch (error) {
        console.error('Error getting location:', error);
        toast({
          title: 'ไม่สามารถระบุตำแหน่งได้',
          description: 'กรุณาอนุญาตการเข้าถึงตำแหน่ง',
          variant: 'destructive',
        });
      }
    };
    
    fetchLocation();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      fetchWithFallback(currentLocation.lat, currentLocation.lon, true);
      
      // Set up polling
      pollingRef.current = setInterval(() => {
        fetchWithFallback(currentLocation.lat, currentLocation.lon, false);
      }, POLLING_INTERVAL);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();
      };
    }
  }, [currentLocation]);

  const fetchWithFallback = async (lat: number, lon: number, isInitial = false) => {
    try {
      // Show loading only on initial fetch if no cached data
      if (isInitial && !data) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      setError(null);
      setUsingFallback(false);

      // Create abort controller for timeout
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, FETCH_TIMEOUT);

      // Attempt to fetch fresh data
      const { data: freshData, error: fetchError } = await supabase.functions.invoke(
        'get-air-quality',
        {
          body: { latitude: lat, longitude: lon },
        }
      );

      clearTimeout(timeoutId);

      if (fetchError) throw fetchError;

      if (freshData) {
        const airQualityData: AirQualityData = {
          pm25: freshData.pm25 || 0,
          pm10: freshData.pm10 || 0,
          aqi: freshData.aqi || 0,
          no2: freshData.no2 || 0,
          o3: freshData.o3 || 0,
          so2: freshData.so2 || 0,
          co: freshData.co || 0,
          location: freshData.location || 'Unknown',
          temperature: freshData.temperature,
          humidity: freshData.humidity,
          pressure: freshData.pressure,
          wind: freshData.wind,
          nearbyStations: freshData.nearbyStations,
          source: freshData.source,
          timestamp: new Date().toISOString(),
        };

        setData(airQualityData);
        
        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify(airQualityData));
      }
    } catch (err) {
      console.error('Error fetching air quality:', err);
      
      // Try to use cached data only if we don't have current data
      if (!data) {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const parsedCache = JSON.parse(cachedData);
            setData(parsedCache);
            setUsingFallback(true);
          } catch (parseError) {
            setError('ไม่สามารถโหลดข้อมูลได้');
          }
        } else {
          setError('ไม่สามารถดึงข้อมูลคุณภาพอากาศได้ และไม่พบข้อมูลสำรอง');
          toast({
            title: 'เกิดข้อผิดพลาด',
            description: 'ไม่สามารถดึงข้อมูลคุณภาพอากาศได้',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refetch = async () => {
    if (currentLocation) {
      await fetchWithFallback(currentLocation.lat, currentLocation.lon);
    } else {
      // Try to get location again
      try {
        const position = await getPosition();
        setCurrentLocation({
          lat: position.latitude,
          lon: position.longitude
        });
        await fetchWithFallback(position.latitude, position.longitude);
      } catch (error) {
        console.error('Error getting location:', error);
        toast({
          title: 'ไม่สามารถระบุตำแหน่งได้',
          description: 'กรุณาอนุญาตการเข้าถึงตำแหน่ง',
          variant: 'destructive',
        });
      }
    }
  };

  return {
    data,
    loading,
    refreshing,
    error,
    usingFallback,
    refetch,
  };
};
