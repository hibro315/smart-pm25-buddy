/**
 * Health Navigation Map Component
 * 
 * Core map component for health-optimized navigation.
 * Features fog AQI overlays, glowing routes, and smooth animations.
 * 
 * @version 2.0.0 - Futuristic Health Navigation
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Loader2, Locate, Layers, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RouteWithPM25 } from '@/hooks/useRoutePM25';
import { FogAQIOverlay } from './FogAQIOverlay';
import { GlowingRouteLayer } from './GlowingRouteLayer';
import { getPosition } from '@/utils/geolocation';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface HealthNavigationMapProps {
  currentLat: number;
  currentLng: number;
  routes: RouteWithPM25[];
  selectedRouteIndex: number;
  onMapReady?: (map: mapboxgl.Map) => void;
  className?: string;
}

export const HealthNavigationMap = ({
  currentLat,
  currentLng,
  routes,
  selectedRouteIndex,
  onMapReady,
  className,
}: HealthNavigationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showFogOverlay, setShowFogOverlay] = useState(true);
  const [liveLocation, setLiveLocation] = useState({ lat: currentLat, lng: currentLng });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        const { data: tokenData, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error || !tokenData?.token) {
          console.error('Failed to get Mapbox token:', error);
          return;
        }

        mapboxgl.accessToken = tokenData.token;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/light-v11', // Clean, minimal style
          center: [currentLng, currentLat],
          zoom: 13,
          pitch: 20,
          bearing: 0,
          antialias: true,
        });

        // Smooth navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }), 
          'top-right'
        );

        // Create user location marker
        const el = document.createElement('div');
        el.innerHTML = `
          <div class="user-location-marker" style="position: relative;">
            <div style="
              position: absolute;
              top: -12px;
              left: -12px;
              width: 24px;
              height: 24px;
              background: linear-gradient(135deg, #06b6d4, #0891b2);
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4);
            "></div>
            <div style="
              position: absolute;
              top: -20px;
              left: -20px;
              width: 40px;
              height: 40px;
              background: radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%);
              border-radius: 50%;
              animation: userPulse 2s ease-out infinite;
            "></div>
          </div>
          <style>
            @keyframes userPulse {
              0% { transform: scale(1); opacity: 0.8; }
              100% { transform: scale(2); opacity: 0; }
            }
          </style>
        `;

        userMarker.current = new mapboxgl.Marker(el)
          .setLngLat([currentLng, currentLat])
          .addTo(map.current);

        map.current.on('load', () => {
          setMapLoaded(true);
          
          // Add atmospheric fog effect
          if (map.current?.setFog) {
            map.current.setFog({
              color: 'rgb(245, 248, 250)',
              'high-color': 'rgb(200, 215, 230)',
              'horizon-blend': 0.15,
              'space-color': 'rgb(220, 230, 240)',
              'star-intensity': 0,
            });
          }

          onMapReady?.(map.current!);
        });

      } catch (error) {
        console.error('Map initialization error:', error);
      }
    };

    initMap();

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Update user marker position
  useEffect(() => {
    if (userMarker.current && map.current) {
      userMarker.current.setLngLat([liveLocation.lng, liveLocation.lat]);
    }
  }, [liveLocation]);

  // Get live location
  const updateLiveLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const position = await getPosition({ enableHighAccuracy: true, timeout: 15000 });
      setLiveLocation({ lat: position.latitude, lng: position.longitude });
      
      if (map.current) {
        map.current.flyTo({
          center: [position.longitude, position.latitude],
          zoom: 14,
          duration: 1200,
          essential: true,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLocating(false);
    }
  }, []);

  return (
    <div className={cn("relative rounded-2xl overflow-hidden", className)}>
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full min-h-[400px]"
        style={{ 
          background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
        }}
      />

      {/* Fog AQI Overlay */}
      {mapLoaded && (
        <FogAQIOverlay
          map={map.current}
          centerLat={liveLocation.lat}
          centerLng={liveLocation.lng}
          enabled={showFogOverlay && routes.length === 0}
          opacity={0.5}
        />
      )}

      {/* Glowing Route Layer */}
      {mapLoaded && routes.length > 0 && (
        <GlowingRouteLayer
          map={map.current}
          routes={routes}
          selectedIndex={selectedRouteIndex}
          showAllRoutes={true}
        />
      )}

      {/* Map Controls Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        {/* Locate Button */}
        <Button
          size="sm"
          variant="secondary"
          onClick={updateLiveLocation}
          disabled={isLocating}
          className="h-10 w-10 p-0 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg border border-border/30 hover:bg-white"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Locate className="h-4 w-4 text-foreground" />
          )}
        </Button>

        {/* Layer Toggle */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg border border-border/30">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">AQI</span>
          {showFogOverlay ? (
            <Eye className="h-3.5 w-3.5 text-primary" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Switch 
            checked={showFogOverlay} 
            onCheckedChange={setShowFogOverlay}
            className="scale-75"
          />
        </div>
      </div>

      {/* Gradient Overlays for Depth */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background/20 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />
    </div>
  );
};

export default HealthNavigationMap;
