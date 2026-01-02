import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2, AlertTriangle, Layers, Eye, EyeOff } from 'lucide-react';
import { useRoutePM25 } from '@/hooks/useRoutePM25';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { AQIHeatmapLayer } from './AQIHeatmapLayer';
import { ColorCodedRouteLayer } from './ColorCodedRouteLayer';
import { RouteComparisonPanel } from './RouteComparisonPanel';
import { DiseaseProfile } from '@/engine/HealthRiskEngine';

export const RouteMap = ({ currentLat, currentLng }: { currentLat: number; currentLng: number }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [destination, setDestination] = useState('');
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(true);
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

        // Current location marker with pulse animation
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="position: relative;">
            <div style="
              width: 20px;
              height: 20px;
              background: #3b82f6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
            "></div>
            <div style="
              position: absolute;
              top: -5px;
              left: -5px;
              width: 30px;
              height: 30px;
              background: rgba(59, 130, 246, 0.3);
              border-radius: 50%;
              animation: pulse 2s infinite;
            "></div>
          </div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              100% { transform: scale(2); opacity: 0; }
            }
          </style>
        `;

        new mapboxgl.Marker(el)
          .setLngLat([currentLng, currentLat])
          .setPopup(new mapboxgl.Popup().setHTML('<p><strong>ตำแหน่งปัจจุบัน</strong></p>'))
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

  const handleSearchDestination = async () => {
    if (!destination) return;

    await analyzeRoutes({
      startLat: currentLat,
      startLng: currentLng,
      destination: destination,
      hasRespiratoryCondition,
      chronicConditions: profile?.chronicConditions || [],
    });
    
    setSelectedRouteIndex(0);
  };

  const recommendedIndex = recommendedRoute 
    ? routes.findIndex(r => r.routeIndex === recommendedRoute.routeIndex)
    : 0;

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              <CardTitle>เส้นทางฝุ่นต่ำ Real-time</CardTitle>
            </div>
            {hasRespiratoryCondition && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                กลุ่มเสี่ยง
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="destination">ค้นหาจุดหมายปลายทาง</Label>
            <div className="flex gap-2">
              <Input
                id="destination"
                placeholder="ใส่ชื่อสถานที่หรือที่อยู่"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchDestination()}
              />
              <Button onClick={handleSearchDestination} disabled={loading || !destination}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

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
              centerLat={currentLat}
              centerLng={currentLng}
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
