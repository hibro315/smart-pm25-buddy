import { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { supabase } from '@/integrations/supabase/client';
import { UserHealthProfile } from '@/components/HealthProfileForm';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  saveLocationForBackgroundSync, 
  saveHealthProfileForBackgroundSync,
  registerPeriodicBackgroundSync
} from '@/utils/backgroundSync';

interface LocationMonitorConfig {
  userProfile: UserHealthProfile | null;
  enabled: boolean;
}

interface PM25Alert {
  pm25: number;
  location: string;
  recommendedOutdoorTime: number; // in minutes
  severity: 'low' | 'moderate' | 'high' | 'critical';
}

export const useLocationMonitor = ({ userProfile, enabled }: LocationMonitorConfig) => {
  const [currentAlert, setCurrentAlert] = useState<PM25Alert | null>(null);
  const watchIdRef = useRef<string | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const previousPM25Ref = useRef<number | null>(null);
  const { measureOperation, trackMetric } = usePerformanceMonitor();

  // Calculate recommended outdoor time based on PM2.5 and health conditions
  const calculateOutdoorTime = (pm25: number, hasHighRiskConditions: boolean): number => {
    if (pm25 <= 37) return Infinity; // No limit
    if (pm25 <= 50) return hasHighRiskConditions ? 60 : 120; // 1-2 hours
    if (pm25 <= 75) return hasHighRiskConditions ? 30 : 60; // 30-60 minutes
    if (pm25 <= 90) return hasHighRiskConditions ? 15 : 30; // 15-30 minutes
    return hasHighRiskConditions ? 5 : 15; // 5-15 minutes for critical levels
  };

  // Check if user has high-risk conditions
  const hasHighRiskConditions = (): boolean => {
    if (!userProfile?.conditions) return false;
    const highRiskIds = ['asthma', 'copd', 'heart', 'pregnant'];
    return userProfile.conditions.some(condition => highRiskIds.includes(condition));
  };

  // Trigger haptic feedback - triple vibration for critical alerts
  const triggerVibration = async (severity: PM25Alert['severity']) => {
    try {
      const vibrationCount = severity === 'critical' ? 3 : severity === 'high' ? 2 : 1;
      
      for (let i = 0; i < vibrationCount; i++) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        if (i < vibrationCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (error) {
      console.error('Haptics error:', error);
    }
  };

  // Send local notification
  const sendNotification = async (alert: PM25Alert) => {
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return;

      const isHighRisk = hasHighRiskConditions();
      let title = '';
      let body = '';

      if (alert.severity === 'critical') {
        title = '⚠️ เตือนภัย! PM2.5 อันตราย';
        body = isHighRisk 
          ? `ค่าฝุ่น ${alert.pm25} µg/m³ - คุณมีโรคประจำตัวกลุ่มเสี่ยง ควรอยู่ในอาคารไม่เกิน ${alert.recommendedOutdoorTime} นาที!`
          : `ค่าฝุ่น ${alert.pm25} µg/m³ - ควรจำกัดเวลาอยู่นอกอาคารไม่เกิน ${alert.recommendedOutdoorTime} นาที`;
      } else if (alert.severity === 'high') {
        title = '⚠️ แจ้งเตือน: PM2.5 สูง';
        body = isHighRisk
          ? `คุณเข้าพื้นที่ PM2.5 ${alert.pm25} µg/m³ - แนะนำให้อยู่นอกอาคารไม่เกิน ${alert.recommendedOutdoorTime} นาที`
          : `PM2.5 ${alert.pm25} µg/m³ - แนะนำจำกัดเวลานอกอาคาร ${alert.recommendedOutdoorTime} นาที`;
      } else {
        title = 'แจ้งเตือน: ค่าฝุ่นเพิ่มขึ้น';
        body = `PM2.5 ${alert.pm25} µg/m³ ที่ ${alert.location}`;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (error) {
      console.error('Notification error:', error);
    }
  };

  // Fetch PM2.5 for current location
  const checkAirQuality = async (lat: number, lng: number) => {
    try {
      const { data, error } = await measureOperation(
        'location_monitor',
        'check_air_quality',
        async () => {
          return await supabase.functions.invoke('get-air-quality', {
            body: { latitude: lat, longitude: lng }
          });
        },
        { latitude: lat, longitude: lng }
      );

      if (error || !data) return;

      const pm25 = data.pm25 || 0;
      const previousPM25 = previousPM25Ref.current;
      
      // Detect if PM2.5 is getting worse
      const isGettingWorse = previousPM25 !== null && pm25 > previousPM25 + 5; // 5 µg/m³ threshold
      
      // Update previous PM2.5 value
      previousPM25Ref.current = pm25;
      
      // Only alert if PM2.5 is concerning AND user has health conditions
      if (pm25 > 37 && userProfile?.conditions && userProfile.conditions.length > 0) {
        const isHighRisk = hasHighRiskConditions();
        const outdoorTime = calculateOutdoorTime(pm25, isHighRisk);
        
        let severity: PM25Alert['severity'] = 'low';
        if (pm25 > 90) severity = 'critical';
        else if (pm25 > 50) severity = 'high';
        else if (pm25 > 37) severity = 'moderate';

        const alert: PM25Alert = {
          pm25,
          location: data.location || 'ตำแหน่งปัจจุบัน',
          recommendedOutdoorTime: outdoorTime,
          severity
        };

        // Prevent alert spam (minimum 3 minutes between alerts, or immediate if getting worse)
        const now = Date.now();
        const alertCooldown = isGettingWorse ? 60 * 1000 : 3 * 60 * 1000; // 1 min if worse, 3 min otherwise
        
        if (now - lastAlertTimeRef.current > alertCooldown) {
          lastAlertTimeRef.current = now;
          setCurrentAlert(alert);
          
          // ALWAYS trigger vibration when PM2.5 is detected, stronger for worse conditions
          await triggerVibration(severity);
          
          // Send notification with performance tracking - works even in background
          await measureOperation(
            'notification',
            'send_pm25_alert',
            async () => {
              await sendNotification(alert);
              return true;
            },
            { pm25, severity, isHighRisk, isGettingWorse }
          );
          
          // Log to console for debugging
          console.log(`🚨 PM2.5 Alert: ${pm25} µg/m³ (${severity}) ${isGettingWorse ? '⬆️ WORSE' : ''}`);
        }
      } else {
        // Clear alert only if PM2.5 drops significantly
        if (pm25 <= 37 || !userProfile?.conditions || userProfile.conditions.length === 0) {
          setCurrentAlert(null);
        }
      }
    } catch (error) {
      console.error('Air quality check error:', error);
    }
  };

  // Start monitoring location
  useEffect(() => {
    if (!enabled || !userProfile?.conditions || userProfile.conditions.length === 0) {
      if (watchIdRef.current) {
        Geolocation.clearWatch({ id: watchIdRef.current });
        watchIdRef.current = null;
      }
      setCurrentAlert(null);
      previousPM25Ref.current = null; // Reset previous PM2.5
      return;
    }

    const startMonitoring = async () => {
      try {
        // Request geolocation permissions
        const geoPermission = await Geolocation.requestPermissions();
        if (geoPermission.location !== 'granted') {
          console.log('Location permission not granted');
          return;
        }

        // Request notification permissions for background alerts
        const notifPermission = await LocalNotifications.requestPermissions();
        console.log('Notification permission:', notifPermission.display);

        // Check location every 2 minutes (works even in background on native apps)
        const id = await Geolocation.watchPosition(
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 120000 // 2 minutes - allows background updates
          },
          (position, error) => {
            if (error) {
              console.error('Location error:', error);
              return;
            }
            if (position) {
              const { latitude, longitude } = position.coords;
              
              // Save location for background sync
              saveLocationForBackgroundSync(latitude, longitude).catch(console.error);
              
              // Check air quality
              checkAirQuality(latitude, longitude);
            }
          }
        );

        watchIdRef.current = id;
        console.log('✅ Location monitoring started with background support');
        
        // Save health profile for background sync
        if (userProfile?.conditions) {
          saveHealthProfileForBackgroundSync(
            userProfile.conditions,
            userProfile.age ? Number(userProfile.age) : undefined
          ).catch(console.error);
        }
        
        // Register periodic background sync (for PWA)
        registerPeriodicBackgroundSync().catch((error) => {
          console.log('Background sync not available or failed:', error);
        });
      } catch (error) {
        console.error('Error starting location monitoring:', error);
      }
    };

    startMonitoring();

    return () => {
      if (watchIdRef.current) {
        Geolocation.clearWatch({ id: watchIdRef.current });
        watchIdRef.current = null;
      }
    };
  }, [enabled, userProfile]);

  return {
    currentAlert,
    isMonitoring: !!watchIdRef.current,
    clearAlert: () => setCurrentAlert(null)
  };
};
