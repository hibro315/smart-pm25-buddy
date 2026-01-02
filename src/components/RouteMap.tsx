import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2, AlertTriangle, Layers, Eye, EyeOff, Locate, LocateFixed } from 'lucide-react';
import { useRoutePM25 } from '@/hooks/useRoutePM25';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { AQIHeatmapLayer } from './AQIHeatmapLayer';
import { ColorCodedRouteLayer } from './ColorCodedRouteLayer';
import { RouteComparisonPanel } from './RouteComparisonPanel';
import { SmartLocationSearch } from './SmartLocationSearch';
import { DiseaseProfile } from '@/engine/HealthRiskEngine';
import { getPosition } from '@/utils/geolocation';
import { cn } from '@/lib/utils';

export const RouteMap = ({ currentLat, currentLng }: { currentLat: number; currentLng: number }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    lat: number;
    lng: number;
    fullAddress: string;
  } | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [liveLocation, setLiveLocation] = useState({ lat: currentLat, lng: currentLng });
  const { routes, recommendedRoute, loading, analyzeRoutes } = useRoutePM25();
  const { profile } = useHealthProfile();

  // Determine disease profile for PHRI calculation
  const getDiseaseProfile = useCallback((): DiseaseProfile => {
    const conditions = profile?.chronicConditions || [];
    if (conditions.some((c: string) => c.toLowerCase() === 'asthma')) {
      return 'asthma';
    }
    if (conditions.some((c: string) => c.toLowerCase() === 'copd')) {
      return 'copd';
    }
    if (conditions.some((c: string) => ['heart', 'cardiovascular', 'hypertension'].includes(c.toLowerCase()))) {
      return 'cardiovascular';
    }
    if (profile?.age && profile.age >= 60) {
      return 'elderly';
    }
    return 'general';
  }, [profile]);

  const hasRespiratoryCondition = profile?.chronicConditions?.some(
    (c: string) => ['asthma', 'copd', 'allergy', 'sinusitis'].includes(c.toLowerCase())
  ) || profile?.dustSensitivity === 'high';

  // Get live location
  const updateLiveLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const position = await getPosition({ enableHighAccuracy: true, timeout: 15000 });
      setLiveLocation({ lat: position.latitude, lng: position.longitude });
      
      // Update user marker position
      if (userMarker.current && map.current) {
        userMarker.current.setLngLat([position.longitude, position.latitude]);
        map.current.flyTo({
          center: [position.longitude, position.latitude],
          zoom: 14,
          duration: 1000,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLocating(false);
    }
  }, []);

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
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [currentLng, currentLat],
          zoom: 12,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Current location marker with enhanced styling
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="position: relative;">
            <div style="
              width: 22px;
              height: 22px;
              background: linear-gradient(135deg, hsl(180, 70%, 50%), hsl(160, 60%, 45%));
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 12px hsla(180, 70%, 50%, 0.5);
            "></div>
            <div style="
              position: absolute;
              top: -6px;
              left: -6px;
              width: 34px;
              height: 34px;
              background: hsla(180, 70%, 50%, 0.25);
              border-radius: 50%;
              animation: locationPulse 2s ease-out infinite;
            "></div>
          </div>
          <style>
            @keyframes locationPulse {
              0% { transform: scale(1); opacity: 1; }
              100% { transform: scale(2.5); opacity: 0; }
            }
          </style>
        `;

        userMarker.current = new mapboxgl.Marker(el)
          .setLngLat([currentLng, currentLat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="text-align: center; padding: 4px;">
              <strong style="color: hsl(180, 70%, 40%);">📍 ตำแหน่งของคุณ</strong>
              <p style="margin: 4px 0 0; font-size: 12px; color: #666;">
                ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}
              </p>
            </div>
          `))
          .addTo(map.current);

        map.current.on('load', () => {
          setMapLoaded(true);
        });
      } catch (error) {
        console.error('Map initialization error:', error);
      }
    };

    initMap();

    return () => {
      map.current?.remove();
      setMapLoaded(false);
    };
  }, [currentLat, currentLng]);

  // Route rendering is now handled by ColorCodedRouteLayer component

  // Handle location selection from smart search
  const handleLocationSelect = useCallback(async (location: {
    name: string;
    lat: number;
    lng: number;
    fullAddress: string;
  }) => {
    setSelectedLocation(location);
    
    // Analyze routes to selected destination
    await analyzeRoutes({
      startLat: liveLocation.lat,
      startLng: liveLocation.lng,
      endLat: location.lat,
      endLng: location.lng,
      destination: location.name,
      hasRespiratoryCondition,
      chronicConditions: profile?.chronicConditions || [],
    });
    
    setSelectedRouteIndex(0);
  }, [analyzeRoutes, liveLocation, hasRespiratoryCondition, profile]);

  const recommendedIndex = recommendedRoute 
    ? routes.findIndex(r => r.routeIndex === recommendedRoute.routeIndex)
    : 0;

  return (
    <div className="space-y-4">
      <Card className={cn("shadow-card overflow-hidden", "glass-card")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              <CardTitle>เส้นทางสุขภาพอัจฉริยะ</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hasRespiratoryCondition && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  กลุ่มเสี่ยง
                </Badge>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={updateLiveLocation}
                disabled={isLocating}
                className="h-8 w-8 p-0"
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            ค้นหาเส้นทางที่ปลอดภัยจากฝุ่น PM2.5 ด้วย AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Smart Location Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">ไปไหน?</Label>
            <SmartLocationSearch
              onSelectLocation={handleLocationSelect}
              currentLat={liveLocation.lat}
              currentLng={liveLocation.lng}
              placeholder="ค้นหาสถานที่ เช่น สยาม, เซ็นทรัล..."
            />
            {selectedLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
                <MapPin className="h-3 w-3 text-primary" />
                <span className="truncate">{selectedLocation.fullAddress}</span>
              </div>
            )}
          </div>

          {/* Loading indicator for route analysis */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>กำลังวิเคราะห์เส้นทางที่ดีที่สุด...</span>
            </div>
          )}

          {/* Map Controls */}
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span>AQI Heatmap</span>
            </div>
            <div className="flex items-center gap-2">
              {showHeatmap ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Switch 
                checked={showHeatmap} 
                onCheckedChange={setShowHeatmap}
              />
            </div>
          </div>

          {/* Map Container */}
          <div ref={mapContainer} className="h-[400px] rounded-xl overflow-hidden border shadow-elevated" />

          {/* Heatmap Layer */}
          {mapLoaded && (
            <AQIHeatmapLayer
              map={map.current}
              centerLat={liveLocation.lat}
              centerLng={liveLocation.lng}
              enabled={showHeatmap && routes.length === 0}
            />
          )}

          {/* Color Coded Route Layer */}
          {mapLoaded && routes.length > 0 && (
            <ColorCodedRouteLayer
              map={map.current}
              routes={routes}
              selectedIndex={selectedRouteIndex}
            />
          )}
        </CardContent>
      </Card>

      {/* Route Comparison Panel */}
      {routes.length > 0 && (
        <RouteComparisonPanel
          routes={routes}
          selectedIndex={selectedRouteIndex}
          recommendedIndex={recommendedIndex}
          diseaseProfile={getDiseaseProfile()}
          onSelectRoute={setSelectedRouteIndex}
        />
      )}
    </div>
  );
};
