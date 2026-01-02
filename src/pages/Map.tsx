/**
 * Health Navigation Map Page
 * 
 * Futuristic health-focused navigation interface.
 * Prioritizes personal health safety over speed or distance.
 * 
 * @version 2.0.0 - Futuristic Health Navigation
 */

import { useState, useEffect, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { useAirQualityWithFallback } from '@/hooks/useAirQualityWithFallback';
import { useRoutePM25 } from '@/hooks/useRoutePM25';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { HealthNavigationMap } from '@/components/navigation/HealthNavigationMap';
import { RouteRecommendationPanel } from '@/components/navigation/RouteRecommendationPanel';
import { TravelModeRecommender } from '@/components/navigation/TravelModeRecommender';
import { SmartLocationSearch } from '@/components/SmartLocationSearch';
import { UserMenu } from '@/components/UserMenu';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TravelMode } from '@/config/constants';
import { DiseaseProfile } from '@/engine/HealthRiskEngine';
import { Navigation, Wind, MapPin, Loader2, AlertTriangle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const Map = () => {
  const { data: aqiData, refreshing } = useAirQualityWithFallback();
  const { routes, recommendedRoute, loading, analyzeRoutes } = useRoutePM25();
  const { profile } = useHealthProfile();
  
  const [currentPosition, setCurrentPosition] = useState({ lat: 13.7563, lng: 100.5018 });
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    lat: number;
    lng: number;
    fullAddress: string;
  } | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [travelMode, setTravelMode] = useState<TravelMode>('car');

  // Get current position
  useEffect(() => {
    const getCurrentPos = async () => {
      try {
        const position = await Geolocation.getCurrentPosition();
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      } catch (error) {
        console.error('Error getting position:', error);
      }
    };
    getCurrentPos();
  }, []);

  // Determine disease profile
  const getDiseaseProfile = useCallback((): DiseaseProfile => {
    const conditions = profile?.chronicConditions || [];
    if (conditions.some((c: string) => c.toLowerCase() === 'asthma')) return 'asthma';
    if (conditions.some((c: string) => c.toLowerCase() === 'copd')) return 'copd';
    if (conditions.some((c: string) => ['heart', 'cardiovascular'].includes(c.toLowerCase()))) return 'cardiovascular';
    if (profile?.age && profile.age >= 60) return 'elderly';
    return 'general';
  }, [profile]);

  const hasRespiratoryCondition = profile?.chronicConditions?.some(
    (c: string) => ['asthma', 'copd', 'allergy', 'sinusitis'].includes(c.toLowerCase())
  ) || profile?.dustSensitivity === 'high';

  // Handle location selection
  const handleLocationSelect = useCallback(async (location: {
    name: string;
    lat: number;
    lng: number;
    fullAddress: string;
  }) => {
    setSelectedLocation(location);
    await analyzeRoutes({
      startLat: currentPosition.lat,
      startLng: currentPosition.lng,
      endLat: location.lat,
      endLng: location.lng,
      destination: location.name,
      hasRespiratoryCondition,
      chronicConditions: profile?.chronicConditions || [],
    });
    setSelectedRouteIndex(0);
  }, [analyzeRoutes, currentPosition, hasRespiratoryCondition, profile]);

  const currentPM25 = aqiData?.pm25 || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Health Navigation
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              เส้นทางที่ปลอดภัยสำหรับสุขภาพของคุณ
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasRespiratoryCondition && (
              <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                กลุ่มเสี่ยง
              </Badge>
            )}
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Current AQI Status - Minimal */}
        <Card className={cn(
          "p-4 border-0 shadow-lg",
          "bg-gradient-to-r from-card via-card to-muted/30",
          currentPM25 > 100 && "from-red-500/10 to-card",
          currentPM25 > 50 && currentPM25 <= 100 && "from-amber-500/10 to-card",
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl",
                currentPM25 <= 25 && "bg-emerald-500/20",
                currentPM25 > 25 && currentPM25 <= 50 && "bg-amber-500/20",
                currentPM25 > 50 && "bg-red-500/20",
              )}>
                <Wind className={cn(
                  "h-5 w-5",
                  currentPM25 <= 25 && "text-emerald-500",
                  currentPM25 > 25 && currentPM25 <= 50 && "text-amber-500",
                  currentPM25 > 50 && "text-red-500",
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PM2.5 ตอนนี้</p>
                <p className="text-2xl font-bold font-mono">{currentPM25} <span className="text-xs font-normal text-muted-foreground">µg/m³</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {aqiData?.location || 'กำลังโหลด...'}
              </p>
              {refreshing && (
                <p className="text-xs text-primary mt-1">กำลังอัปเดต...</p>
              )}
            </div>
          </div>
        </Card>

        {/* Destination Search */}
        <Card className="p-4 shadow-lg border-0">
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            ค้นหาเส้นทางที่ปลอดภัย
          </p>
          <SmartLocationSearch
            onSelectLocation={handleLocationSelect}
            currentLat={currentPosition.lat}
            currentLng={currentPosition.lng}
            placeholder="ไปไหน? เช่น สยาม, เซ็นทรัล..."
          />
          {selectedLocation && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" />
              {selectedLocation.fullAddress}
            </p>
          )}
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">กำลังวิเคราะห์เส้นทางที่ปลอดภัยที่สุด...</p>
          </div>
        )}

        {/* Map */}
        <HealthNavigationMap
          currentLat={currentPosition.lat}
          currentLng={currentPosition.lng}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          className="h-[350px] shadow-xl"
        />

        {/* Route Recommendations */}
        {routes.length > 0 && (
          <RouteRecommendationPanel
            routes={routes}
            selectedIndex={selectedRouteIndex}
            diseaseProfile={getDiseaseProfile()}
            onSelectRoute={setSelectedRouteIndex}
          />
        )}

        {/* Travel Mode */}
        {routes.length > 0 && (
          <Card className="p-4 shadow-lg border-0">
            <TravelModeRecommender
              value={travelMode}
              onChange={setTravelMode}
              currentPM25={currentPM25}
              routeDuration={routes[selectedRouteIndex]?.duration}
              hasRespiratoryCondition={hasRespiratoryCondition}
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default Map;
