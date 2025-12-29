import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, Navigation, Loader2, CheckCircle2, Wind, AlertTriangle, Clock } from 'lucide-react';
import { useRoutePM25, RouteWithPM25 } from '@/hooks/useRoutePM25';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';

export const RouteMap = ({ currentLat, currentLng }: { currentLat: number; currentLng: number }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [destination, setDestination] = useState('');
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [pm25Markers, setPm25Markers] = useState<mapboxgl.Marker[]>([]);
  const { routes, recommendedRoute, loading, analyzeRoutes } = useRoutePM25();
  const { profile } = useHealthProfile();

  // Check if user has respiratory conditions
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

    pm25Markers.forEach(marker => marker.remove());
    setPm25Markers([]);

    const selectedRoute = routes[selectedRouteIndex];
    const newMarkers: mapboxgl.Marker[] = [];

    // Add all routes to map with color based on severity
    routes.forEach((route, index) => {
      const isSelected = index === selectedRouteIndex;
      const severity = (route as any).alertSeverity || 'moderate';
      
      let color = '#22c55e'; // green
      if (severity === 'moderate') color = '#eab308';
      if (severity === 'unhealthy') color = '#f97316';
      if (severity === 'very-unhealthy' || severity === 'hazardous') color = '#ef4444';
      
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
          'line-width': isSelected ? 6 : 3,
          'line-opacity': isSelected ? 1 : 0.4,
        },
      });
    });

    // Add PM2.5 sample markers for selected route
    if (selectedRoute) {
      selectedRoute.sampleLocations.forEach((location, index) => {
        const pm25Value = selectedRoute.pm25Samples[index];
        if (pm25Value !== undefined) {
          let bgColor = '#22c55e';
          if (pm25Value > 25) bgColor = '#eab308';
          if (pm25Value > 50) bgColor = '#f97316';
          if (pm25Value > 100) bgColor = '#ef4444';
          
          const el = document.createElement('div');
          el.style.cssText = `
            background-color: ${bgColor};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `;
          el.textContent = pm25Value.toString();

          const marker = new mapboxgl.Marker(el)
            .setLngLat(location as [number, number])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<p><strong>PM2.5:</strong> ${pm25Value} µg/m³</p>`)
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

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      selectedRoute.geometry.coordinates.forEach((coord: number[]) => {
        bounds.extend(coord as [number, number]);
      });
      map.current!.fitBounds(bounds, { padding: 50 });
    }
  }, [routes, selectedRouteIndex]);

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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'good': return <Badge className="bg-green-500">ปลอดภัย</Badge>;
      case 'moderate': return <Badge className="bg-yellow-500">ปานกลาง</Badge>;
      case 'unhealthy': return <Badge className="bg-orange-500">ไม่ดี</Badge>;
      case 'very-unhealthy': return <Badge className="bg-red-500">แย่มาก</Badge>;
      case 'hazardous': return <Badge className="bg-purple-500">อันตราย</Badge>;
      default: return <Badge variant="outline">-</Badge>;
    }
  };

  const selectedRoute = routes[selectedRouteIndex] as RouteWithPM25 & { 
    alertSeverity?: string; 
    recommendations?: string[] 
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          <CardTitle>เส้นทางฝุ่นต่ำ Real-time</CardTitle>
        </div>
        <CardDescription className="flex items-center gap-2">
          ค้นหาเส้นทางที่มีค่า PM2.5 ต่ำที่สุดจาก AQICN
          {hasRespiratoryCondition && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              ผู้ป่วยระบบหายใจ
            </Badge>
          )}
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

        <div ref={mapContainer} className="h-[350px] rounded-lg" />

        {routes.length > 0 && (
          <div className="space-y-4">
            {/* Health Alert for Selected Route */}
            {selectedRoute && (
              <Alert className={
                selectedRoute.alertSeverity === 'good' ? 'border-green-500 bg-green-50' :
                selectedRoute.alertSeverity === 'hazardous' || selectedRoute.alertSeverity === 'very-unhealthy' 
                  ? 'border-red-500 bg-red-50' : ''
              }>
                <Wind className="h-4 w-4" />
                <AlertTitle>{selectedRoute.healthAlert}</AlertTitle>
                {selectedRoute.recommendations && selectedRoute.recommendations.length > 0 && (
                  <AlertDescription>
                    <ul className="mt-2 space-y-1 text-sm">
                      {selectedRoute.recommendations.map((rec: string, i: number) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                )}
              </Alert>
            )}

            {/* Route Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">เลือกเส้นทาง ({routes.length} เส้นทาง)</Label>
              <RadioGroup 
                value={selectedRouteIndex.toString()} 
                onValueChange={(val) => setSelectedRouteIndex(parseInt(val))}
              >
                {routes.map((route, index) => {
                  const isRecommended = route.routeIndex === recommendedRoute?.routeIndex;
                  const routeData = route as RouteWithPM25 & { alertSeverity?: string };
                  
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
                              <Badge className="bg-green-500 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                แนะนำ
                              </Badge>
                            )}
                          </Label>
                          {getSeverityBadge(routeData.alertSeverity || 'moderate')}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{route.distance} กม.</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{route.duration} นาที</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Wind className="h-3 w-3 text-muted-foreground" />
                            <span>เฉลี่ย {route.averagePM25} µg/m³</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                            <span>สูงสุด {route.maxPM25} µg/m³</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Data Source Info */}
            <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
              <div className="font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                ข้อมูล PM2.5 Real-time จาก AQICN
              </div>
              <div className="text-muted-foreground">
                • วัดค่าทุก 2 กิโลเมตรตลอดเส้นทาง
              </div>
              <div className="text-muted-foreground">
                • คำแนะนำปรับตามข้อมูลสุขภาพของคุณ
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
