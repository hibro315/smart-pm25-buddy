import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useToast } from '@/hooks/use-toast';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

interface NearbyStation {
  name: string;
  aqi: number;
  distance: number;
}

interface AirQualityData {
  pm25: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  co?: number;
  aqi?: number;
  location: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure?: number;
  wind?: number;
  nearbyStations?: NearbyStation[];
  source?: string;
}

export const useAirQuality = () => {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { measureOperation } = usePerformanceMonitor();

  const requestLocationPermission = async () => {
    try {
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location === 'denied') {
        toast({
          title: 'ไม่สามารถเข้าถึงตำแหน่งได้',
          description: 'กรุณาเปิดการอนุญาตเข้าถึงตำแหน่งในการตั้งค่าของแอป',
          variant: 'destructive',
        });
        return false;
      }
      
      if (permission.location !== 'granted') {
        const requested = await Geolocation.requestPermissions();
        if (requested.location !== 'granted') {
          toast({
            title: 'จำเป็นต้องใช้สิทธิ์เข้าถึงตำแหน่ง',
            description: 'แอปต้องการสิทธิ์เข้าถึงตำแหน่งเพื่อแสดงข้อมูลคุณภาพอากาศในพื้นที่ของคุณ',
            variant: 'destructive',
          });
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    try {
      console.log('Requesting notification permission...');
      const currentPermission = await LocalNotifications.checkPermissions();
      console.log('Current notification permission:', currentPermission);
      
      if (currentPermission.display === 'denied') {
        toast({
          title: 'ไม่สามารถส่งการแจ้งเตือนได้',
          description: 'กรุณาเปิดการอนุญาตการแจ้งเตือนในการตั้งค่าของแอป',
          variant: 'destructive',
        });
        return false;
      }
      
      if (currentPermission.display !== 'granted') {
        console.log('Requesting notification permission from user...');
        const permission = await LocalNotifications.requestPermissions();
        console.log('Permission result:', permission);
        
        if (permission.display !== 'granted') {
          toast({
            title: 'จำเป็นต้องใช้สิทธิ์การแจ้งเตือน',
            description: 'แอปต้องการสิทธิ์การแจ้งเตือนเพื่อเตือนเมื่อค่า PM2.5 สูง',
          });
          return false;
        }
      }
      
      console.log('Notification permission granted');
      return true;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถขอสิทธิ์การแจ้งเตือนได้',
        variant: 'destructive',
      });
      return false;
    }
  };

  const sendNotification = async (pm25: number, location: string, hasHealthConditions: boolean) => {
    try {
      if (pm25 <= 37) return;

      // Check if we have permission (don't request again, already requested on app start)
      const currentPermission = await LocalNotifications.checkPermissions();
      if (currentPermission.display !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      let title = 'แจ้งเตือน: ค่าฝุ่น PM2.5 สูง';
      let body = `พื้นที่ ${location} มีค่า PM2.5 อยู่ที่ ${pm25} µg/m³`;

      if (pm25 > 90) {
        title = '⚠️ เตือนภัย! PM2.5 อยู่ในระดับอันตราย';
      }

      if (hasHealthConditions) {
        body += '\n⚠️ คุณมีโรคประจำตัว โปรดระมัดระวังเป็นพิเศษ';
      }

      console.log('Scheduling notification:', { title, body });

      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default',
          actionTypeId: '',
          extra: null
        }]
      });

      console.log('Notification scheduled successfully');
    } catch (error) {
      console.error('Error scheduling notification:', error);
      // Don't throw - just log the error
    }
  };

  const fetchAirQuality = async () => {
    setLoading(true);
    try {
      // Request location permission first
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setLoading(false);
        return;
      }

      // Get current position with proper mobile settings and track performance
      const position = await measureOperation(
        'air_quality',
        'get_location',
        async () => {
          return await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 60000
          });
        },
        { accuracy_mode: 'high' }
      );

      // Fetch air quality data with performance tracking
      const { data: functionData, error } = await measureOperation(
        'air_quality',
        'fetch_air_quality_data',
        async () => {
          return await supabase.functions.invoke('get-air-quality', {
            body: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          });
        },
        { 
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      );

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!functionData || !functionData.pm25) {
        throw new Error('Invalid data received from server');
      }

      setData(functionData);

      // Check for health profile and send notification if needed
      const profileStr = localStorage.getItem('healthProfile');
      if (profileStr) {
        try {
          const profile = JSON.parse(profileStr);
          await sendNotification(
            functionData.pm25,
            functionData.location,
            profile.conditions && profile.conditions.length > 0
          );
        } catch (notifError) {
          console.error('Notification error:', notifError);
          // Don't fail the whole operation if notification fails
        }
      }

      toast({
        title: 'อัปเดตข้อมูลสำเร็จ',
        description: `PM2.5: ${functionData.pm25} µg/m³ ที่ ${functionData.location}`,
      });
    } catch (error: any) {
      console.error('Error fetching air quality:', error);
      
      let errorMessage = 'ไม่สามารถดึงข้อมูลคุณภาพอากาศได้';
      
      if (error.message?.includes('location')) {
        errorMessage = 'ไม่สามารถระบุตำแหน่งของคุณได้ กรุณาตรวจสอบการตั้งค่า GPS';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'หมดเวลาในการรับตำแหน่ง กรุณาลองใหม่อีกครั้ง';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ กรุณาตรวจสอบการเชื่อมต่อ';
      }
      
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Request permissions when app starts and set up auto-refresh
  useEffect(() => {
    const initializeApp = async () => {
      // Request notification permission first
      await requestNotificationPermission();
      // Then fetch air quality (which will request location permission)
      await fetchAirQuality();
    };
    
    initializeApp();

    // Auto-refresh every 5 minutes (300,000 ms)
    const intervalId = setInterval(() => {
      fetchAirQuality();
    }, 300000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return {
    data,
    loading,
    refresh: fetchAirQuality
  };
};
