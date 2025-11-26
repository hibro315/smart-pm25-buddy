import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  timestamp: string;
}

const FETCH_TIMEOUT = 10000; // 10 seconds
const POLLING_INTERVAL = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY = 'lastKnownAQI';

export const useAirQualityWithFallback = (latitude?: number, longitude?: number) => {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  useEffect(() => {
    if (latitude && longitude) {
      fetchWithFallback(latitude, longitude);
      
      // Set up polling
      pollingRef.current = setInterval(() => {
        fetchWithFallback(latitude, longitude);
      }, POLLING_INTERVAL);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();
      };
    }
  }, [latitude, longitude]);

  const fetchWithFallback = async (lat: number, lon: number) => {
    try {
      setLoading(true);
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
          timestamp: new Date().toISOString(),
        };

        setData(airQualityData);
        
        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify(airQualityData));
      }
    } catch (err) {
      console.error('Error fetching air quality:', err);
      
      // Try to use cached data
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const parsedCache = JSON.parse(cachedData);
          setData(parsedCache);
          setUsingFallback(true);
          
          toast({
            title: 'ใช้ข้อมูลสำรอง',
            description: 'ไม่สามารถดึงข้อมูลใหม่ได้ กำลังแสดงข้อมูลล่าสุดที่บันทึกไว้',
            variant: 'default',
          });
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
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    if (latitude && longitude) {
      fetchWithFallback(latitude, longitude);
    }
  };

  return {
    data,
    loading,
    error,
    usingFallback,
    refetch,
  };
};
