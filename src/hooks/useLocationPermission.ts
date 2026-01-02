import { useState, useEffect, useCallback } from 'react';
import { checkPermissions, requestPermissions, getPosition } from '@/utils/geolocation';

export type PermissionStatus = 'checking' | 'granted' | 'denied' | 'prompt';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
}

export const useLocationPermission = () => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check permission on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkPermissions();
        setPermissionStatus(status);
        
        // If already granted, get location
        if (status === 'granted') {
          await fetchLocation();
        }
      } catch (err) {
        console.error('Error checking permissions:', err);
        setPermissionStatus('prompt');
      }
    };
    
    checkStatus();
  }, []);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const position = await getPosition({ 
        enableHighAccuracy: true, 
        timeout: 15000 
      });
      
      setLocation({
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy
      });
      setPermissionStatus('granted');
      return position;
    } catch (err: any) {
      console.error('Error getting location:', err);
      setError(err.message || 'ไม่สามารถระบุตำแหน่งได้');
      
      if (err.code === 1) { // PERMISSION_DENIED
        setPermissionStatus('denied');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await requestPermissions();
      setPermissionStatus(result);
      
      if (result === 'granted') {
        await fetchLocation();
      } else {
        setError('กรุณาอนุญาตการเข้าถึงตำแหน่งในการตั้งค่าอุปกรณ์');
      }
      
      return result;
    } catch (err: any) {
      console.error('Error requesting permission:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการขออนุญาต');
      setPermissionStatus('denied');
      return 'denied';
    } finally {
      setLoading(false);
    }
  }, [fetchLocation]);

  const refreshLocation = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      return requestLocationPermission();
    }
    return fetchLocation();
  }, [permissionStatus, fetchLocation, requestLocationPermission]);

  return {
    permissionStatus,
    location,
    loading,
    error,
    requestLocationPermission,
    refreshLocation,
    isGranted: permissionStatus === 'granted',
    isDenied: permissionStatus === 'denied',
    isPrompt: permissionStatus === 'prompt' || permissionStatus === 'checking'
  };
};
