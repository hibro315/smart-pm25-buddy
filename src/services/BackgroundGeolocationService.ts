import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface BackgroundLocationConfig {
  distanceFilter?: number;
  desiredAccuracy?: number;
  debug?: boolean;
  stopOnTerminate?: boolean;
  interval?: number;
}

class BackgroundGeoService {
  private watcherId: string | null = null;
  private isRunning: boolean = false;
  private onLocationCallback: ((location: Location) => void) | null = null;

  /**
   * Initialize and start background location tracking
   * Uses Capacitor Geolocation which works in both foreground and background
   */
  async start(
    config: BackgroundLocationConfig = {},
    onLocation: (location: Location) => void
  ): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Background geolocation works best on native platforms');
      return false;
    }

    try {
      this.onLocationCallback = onLocation;

      // Request permissions
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          console.error('Location permission not granted');
          return false;
        }
      }

      // Start position watcher with background capability
      const watcherId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: config.desiredAccuracy ? config.desiredAccuracy < 50 : true,
          timeout: 30000,
          maximumAge: 0
        },
        (position, error) => {
          if (error) {
            console.error('Geolocation error:', error);
            return;
          }

          if (position) {
            const location: Location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              timestamp: position.timestamp
            };

            console.log('📍 Background location update:', location);
            this.onLocationCallback?.(location);
          }
        }
      );

      this.watcherId = watcherId;
      this.isRunning = true;
      console.log('✅ Background geolocation started:', this.watcherId);
      return true;
    } catch (error) {
      console.error('Failed to start background geolocation:', error);
      return false;
    }
  }

  /**
   * Stop background location tracking
   */
  async stop(): Promise<void> {
    if (this.watcherId) {
      try {
        await Geolocation.clearWatch({ id: this.watcherId });
        this.watcherId = null;
        this.isRunning = false;
        this.onLocationCallback = null;
        console.log('🛑 Background geolocation stopped');
      } catch (error) {
        console.error('Error stopping background geolocation:', error);
      }
    }
  }

  /**
   * Check if tracking is active
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current watcher ID
   */
  getWatcherId(): string | null {
    return this.watcherId;
  }
}

// Export singleton instance
export const backgroundGeolocationService = new BackgroundGeoService();
