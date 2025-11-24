import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2, CheckCircle2 } from 'lucide-react';
import { useRoutePM25, RouteWithPM25 } from '@/hooks/useRoutePM25';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';



export const RouteMap = ({ currentLat, currentLng }: { currentLat: number; currentLng: number }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [destination, setDestination] = useState('');
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [pm25Markers, setPm25Markers] = useState<mapboxgl.Marker[]>([]);
  const { routes, recommendedRoute, loading, analyzeRoutes } = useRoutePM25();

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        // Fetch Mapbox token from edge function
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

        // Add current location marker
        new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([currentLng, currentLat])
          .setPopup(new mapboxgl.Popup().setHTML('<p>ตำแหน่งปัจจุบัน</p>'))
          .addTo(map.current);
      } catch (error) {
        console.error('Map initialization error:', error);
      }
    };

    initMap();

    return () => {
      map.current?.remove();
    };
  }, [currentLat, currentLng]);

  useEffect(() => {
    if (!map.current || routes.length === 0) return;

    // Clear existing route layers and markers
    routes.forEach((_, index) => {
      if (map.current!.getLayer(`route-${index}`)) {
        map.current!.removeLayer(`route-${index}`);
        map.current!.removeSource(`route-${index}`);
      }
    });

    // Clear PM2.5 markers
    pm25Markers.forEach(marker => marker.remove());
    setPm25Markers([]);

    const selectedRoute = routes[selectedRouteIndex];
    const newMarkers: mapboxgl.Marker[] = [];

    // Add all routes to map
    routes.forEach((route, index) => {
      const isSelected = index === selectedRouteIndex;
      const color = route.averagePM25 > 50 ? '#ef4444' : 
                    route.averagePM25 > 37 ? '#f59e0b' : '#10b981';
      
      map.current!.addSource(`route-${index}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        },
      });

      map.current!.addLayer({
        id: `route-${index}`,
        type: 'line',
        source: `route-${index}`,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': isSelected ? color : '#94a3b8',
          'line-width': isSelected ? 5 : 3,
          'line-opacity': isSelected ? 1 : 0.4,
        },
      });
    });

    // Add PM2.5 sample markers for selected route
    if (selectedRoute) {
      selectedRoute.sampleLocations.forEach((location, index) => {
        const pm25Value = selectedRoute.pm25Samples[index];
        if (pm25Value !== undefined) {
          const color = pm25Value > 50 ? '#ef4444' : 
                       pm25Value > 37 ? '#f59e0b' : '#10b981';
          
          const el = document.createElement('div');
          el.className = 'pm25-marker';
          el.style.cssText = `
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `;
          el.textContent = pm25Value.toString();

          const marker = new mapboxgl.Marker(el)
            .setLngLat(location as [number, number])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<p>PM2.5: ${pm25Value} µg/m³</p>`)
            )
            .addTo(map.current!);
          
          newMarkers.push(marker);
        }
      });
      setPm25Markers(newMarkers);

      // Add destination marker
      const destCoords = selectedRoute.geometry.coordinates[
        selectedRoute.geometry.coordinates.length - 1
      ];
      const destMarker = new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat(destCoords)
        .setPopup(new mapboxgl.Popup().setHTML('<p>จุดหมาย</p>'))
        .addTo(map.current!);
      newMarkers.push(destMarker);

      // Fit bounds to show entire route
      const bounds = new mapboxgl.LngLatBounds();
      selectedRoute.geometry.coordinates.forEach((coord: number[]) => {
        bounds.extend(coord as [number, number]);
      });
      map.current!.fitBounds(bounds, { padding: 50 });
    }
  }, [routes, selectedRouteIndex]);

  const handleSearchDestination = async () => {
    if (!destination) return;

    try {
      // Call edge function with destination string - it will handle geocoding
      await analyzeRoutes({
        startLat: currentLat,
        startLng: currentLng,
        destination: destination,
      });
      
      // Reset to recommended route (index 0)
      setSelectedRouteIndex(0);
    } catch (error) {
      console.error('Error searching destination:', error);
    }
  };

  const getPM25Variant = (pm25: number): "default" | "destructive" | "outline" | "secondary" => {
    if (pm25 > 50) return 'destructive';
    if (pm25 > 37) return 'secondary';
    return 'default';
  };

  const getPM25Label = (pm25: number) => {
    if (pm25 > 50) return 'สูง';
    if (pm25 > 37) return 'ปานกลาง';
    return 'ดี';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          <CardTitle>นำทางหลีกเลี่ยง PM2.5</CardTitle>
        </div>
        <CardDescription>
          ค้นหาเส้นทางที่มีค่า PM2.5 ต่ำที่สุด
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div ref={mapContainer} className="h-[400px] rounded-lg" />

        {routes.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">เลือกเส้นทาง ({routes.length} เส้นทาง)</Label>
              <RadioGroup value={selectedRouteIndex.toString()} onValueChange={(val) => setSelectedRouteIndex(parseInt(val))}>
                {routes.map((route, index) => {
                  const isRecommended = index === 0;
                  return (
                    <div 
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedRouteIndex === index 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedRouteIndex(index)}
                    >
                      <RadioGroupItem value={index.toString()} id={`route-${index}`} className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`route-${index}`} className="flex items-center gap-2 cursor-pointer">
                            <span className="font-medium">เส้นทางที่ {index + 1}</span>
                            {isRecommended && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                แนะนำ
                              </Badge>
                            )}
                          </Label>
                          <Badge variant={getPM25Variant(route.averagePM25)}>
                            {getPM25Label(route.averagePM25)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">ระยะทาง:</span>
                            <span className="font-medium">{(route.distance / 1000).toFixed(1)} km</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">เวลา:</span>
                            <span className="font-medium">{Math.round(route.duration / 60)} นาที</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">PM2.5 เฉลี่ย:</span>
                            <span className={`font-medium ${
                              route.averagePM25 > 50 ? 'text-destructive' : 
                              route.averagePM25 > 37 ? 'text-orange-500' : 'text-green-500'
                            }`}>
                              {route.averagePM25} µg/m³
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">PM2.5 สูงสุด:</span>
                            <span className="font-medium">{route.maxPM25} µg/m³</span>
                          </div>
                        </div>

                        <div className={`text-xs font-medium ${
                          route.averagePM25 > 50 ? 'text-destructive' : 'text-green-600'
                        }`}>
                          {route.healthAlert}
                        </div>

                        {isRecommended && (
                          <div className="text-xs text-muted-foreground">
                            เส้นทางที่ปลอดภัยที่สุดสำหรับสุขภาพ
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs space-y-1">
                <div className="font-medium">ข้อมูลแบบ Real-time ทุก 1 กิโลเมตร</div>
                <div className="text-muted-foreground">
                  • ตรวจวัดค่า PM2.5 ทุก 1 กิโลเมตรตลอดเส้นทางจาก Open-Meteo API
                </div>
                <div className="text-muted-foreground">
                  • จุดสีบนแผนที่แสดงค่า PM2.5 แบบ real-time ตามจุดต่างๆ
                </div>
                <div className="text-muted-foreground">
                  • เส้นทางแนะนำเลือกจากค่า PM2.5 เฉลี่ยต่ำสุด
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
