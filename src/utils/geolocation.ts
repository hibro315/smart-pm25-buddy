import { Geolocation } from '@capacitor/geolocation';

// Hybrid geolocation utility that works on both web and mobile
export const getPosition = async (options?: PositionOptions) => {
  try {
    // Try Capacitor first (for mobile apps)
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 10000,
      maximumAge: options?.maximumAge ?? 0
    });
    
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
  } catch (capacitorError: any) {
    // If Capacitor fails (e.g., on web), fallback to Web API
    if (capacitorError?.code === 'UNIMPLEMENTED' || !navigator.geolocation) {
      return new Promise<{
        latitude: number;
        longitude: number;
        accuracy: number;
        timestamp: number;
      }>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            });
          },
          (error) => {
            reject(error);
          },
          {
            enableHighAccuracy: options?.enableHighAccuracy ?? true,
            timeout: options?.timeout ?? 10000,
            maximumAge: options?.maximumAge ?? 0
          }
        );
      });
    }
    
    throw capacitorError;
  }
};

export const watchPosition = async (
  callback: (position: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null, error?: GeolocationPositionError) => void,
  options?: PositionOptions
): Promise<string | number> => {
  try {
    // Try Capacitor first (for mobile apps)
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? false,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 120000
      },
      (position, error) => {
        if (error) {
          callback(null, error as any);
          return;
        }
        if (position) {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        }
      }
    );
    
    return watchId;
  } catch (capacitorError: any) {
    // If Capacitor fails (e.g., on web), fallback to Web API
    if (capacitorError?.code === 'UNIMPLEMENTED' || !navigator.geolocation) {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }
      
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          callback(null, error);
        },
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? false,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 120000
        }
      );
      
      return watchId;
    }
    
    throw capacitorError;
  }
};

export const clearWatch = async (watchId: string | number) => {
  if (typeof watchId === 'string') {
    // Capacitor watch ID
    try {
      await Geolocation.clearWatch({ id: watchId });
    } catch (error) {
      console.error('Error clearing Capacitor watch:', error);
    }
  } else {
    // Web API watch ID
    navigator.geolocation.clearWatch(watchId);
  }
};

export const checkPermissions = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  try {
    // Try Capacitor first
    const permission = await Geolocation.checkPermissions();
    return permission.location as 'granted' | 'denied' | 'prompt';
  } catch (error: any) {
    // Fallback to Web API
    if (error?.code === 'UNIMPLEMENTED') {
      if (!navigator.permissions) {
        return 'prompt'; // Assume prompt if permissions API not available
      }
      
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state as 'granted' | 'denied' | 'prompt';
      } catch {
        return 'prompt';
      }
    }
    
    return 'denied';
  }
};

export const requestPermissions = async (): Promise<'granted' | 'denied'> => {
  try {
    // Try Capacitor first
    const permission = await Geolocation.requestPermissions();
    return permission.location === 'granted' ? 'granted' : 'denied';
  } catch (error: any) {
    // Fallback to Web API - just try to get position, which will trigger permission
    if (error?.code === 'UNIMPLEMENTED') {
      try {
        await getPosition();
        return 'granted';
      } catch {
        return 'denied';
      }
    }
    
    return 'denied';
  }
};
