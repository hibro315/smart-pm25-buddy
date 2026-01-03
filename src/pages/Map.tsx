/**
 * Health Navigation Map Page
 * 
 * Futuristic health-focused navigation interface.
 * Prioritizes personal health safety over speed or distance.
 * 
 * @version 3.0.0 - Neo-Futuristic Health Navigation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useAirQualityWithFallback } from '@/hooks/useAirQualityWithFallback';
import { useRoutePM25 } from '@/hooks/useRoutePM25';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocationPermission } from '@/hooks/useLocationPermission';
import { HealthNavigationMap } from '@/components/navigation/HealthNavigationMap';
import { RouteRecommendationPanel } from '@/components/navigation/RouteRecommendationPanel';
import { TravelModeRecommender } from '@/components/navigation/TravelModeRecommender';
import { SmartLocationSearch } from '@/components/SmartLocationSearch';
import { LocationPermissionCard } from '@/components/LocationPermissionCard';
import { AQIHistoryDashboard } from '@/components/AQIHistoryDashboard';
import { UserMenu } from '@/components/UserMenu';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TravelMode } from '@/config/constants';
import { DiseaseProfile } from '@/engine/HealthRiskEngine';
import { Navigation, Wind, MapPin, Loader2, AlertTriangle, Shield, Sparkles, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const Map = () => {
  const { t } = useLanguage();
  const { data: aqiData, refreshing } = useAirQualityWithFallback();
  const { routes, recommendedRoute, loading, analyzeRoutes } = useRoutePM25();
  const { profile } = useHealthProfile();
  const {
    permissionStatus,
    location,
    loading: locationLoading,
    error: locationError,
    requestLocationPermission,
    refreshLocation
  } = useLocationPermission();
  
  const mapRef = useRef<mapboxgl.Map | null>(null);
  
  // Use detected location or default to Bangkok
  const currentPosition = location 
    ? { lat: location.lat, lng: location.lng }
    : { lat: 13.7563, lng: 100.5018 };
    
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    lat: number;
    lng: number;
    fullAddress: string;
  } | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [travelMode, setTravelMode] = useState<TravelMode>('car');

  // Handle map ready callback
  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;
  }, []);

  // Fly to location when it changes
  const handleFlyToLocation = useCallback(() => {
    if (mapRef.current && location) {
      mapRef.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 15,
        duration: 1500,
        essential: true,
      });
    }
  }, [location]);

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
  const currentAQI = aqiData?.aqi || 0;

  // Get AQI status styling based on AQI value (not PM2.5)
  const getAQIStatus = (aqi: number) => {
    if (aqi <= 50) return { 
      color: 'text-success', 
      bg: 'from-success/20 to-success/5',
      glow: 'shadow-glow-mint',
      label: t('map.aqi.good'),
      labelTh: 'ดี'
    };
    if (aqi <= 100) return { 
      color: 'text-warning', 
      bg: 'from-warning/20 to-warning/5',
      glow: 'shadow-glow-warm',
      label: t('map.aqi.moderate'),
      labelTh: 'ปานกลาง'
    };
    if (aqi <= 150) return { 
      color: 'text-orange-500', 
      bg: 'from-orange-500/20 to-orange-500/5',
      glow: 'shadow-glow-warm',
      label: t('map.aqi.unhealthySensitive'),
      labelTh: 'ไม่ดีต่อกลุ่มเสี่ยง'
    };
    if (aqi <= 200) return { 
      color: 'text-destructive', 
      bg: 'from-destructive/20 to-destructive/5',
      glow: 'shadow-glow-alert',
      label: t('map.aqi.unhealthy'),
      labelTh: 'ไม่ดีต่อสุขภาพ'
    };
    return { 
      color: 'text-purple-600', 
      bg: 'from-purple-600/20 to-purple-600/5',
      glow: 'shadow-glow-alert',
      label: t('map.aqi.hazardous'),
      labelTh: 'อันตราย'
    };
  };

  const aqiStatus = getAQIStatus(currentAQI);

  return (
    <div className="min-h-screen bg-neural pb-24 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-gradient-ambient opacity-40 pointer-events-none" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Futuristic Header */}
      <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-primary/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-glow-pulse" />
                <div className="relative p-2 bg-gradient-to-br from-primary to-accent rounded-xl">
                  <Compass className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-display font-bold text-gradient-primary flex items-center gap-2">
                  {t('map.title')}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {t('map.subtitle')}
                </p>
              </div>
            </div>
          </motion.div>
          <div className="flex items-center gap-3">
            {hasRespiratoryCondition && (
              <Badge variant="outline" className="text-[10px] bg-warning/10 border-warning/30 text-warning">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t('map.risk.group')}
              </Badge>
            )}
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4 relative z-10">
        {/* Location Permission Card */}
        <LocationPermissionCard
          permissionStatus={permissionStatus}
          location={location}
          loading={locationLoading}
          error={locationError}
          onRequestPermission={requestLocationPermission}
          onRefresh={refreshLocation}
          onFlyToLocation={handleFlyToLocation}
        />

        {/* Current AQI Status Card - Separated AQI and PM2.5 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className={cn(
            "p-5 border-0 overflow-hidden relative",
            "bg-gradient-to-r", aqiStatus.bg,
            aqiStatus.glow
          )}>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-2xl" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className={cn(
                    "p-3 rounded-2xl bg-card/60 backdrop-blur-sm",
                    aqiStatus.glow
                  )}
                >
                  <Wind className={cn("h-6 w-6", aqiStatus.color)} />
                </motion.div>
                <div className="space-y-2">
                  {/* AQI Value - Primary */}
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {t('map.aqi.label')}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className={cn("text-3xl font-bold font-mono", aqiStatus.color)}>
                        {currentAQI}
                      </p>
                      <Badge variant="secondary" className={cn("text-[10px]", aqiStatus.color)}>
                        {aqiStatus.label}
                      </Badge>
                    </div>
                  </div>
                  {/* PM2.5 Value - Secondary */}
                  <div className="flex items-baseline gap-2 bg-muted/30 px-2 py-1 rounded-lg">
                    <span className="text-xs text-muted-foreground">PM2.5:</span>
                    <span className="font-semibold text-foreground">{currentPM25}</span>
                    <span className="text-xs text-muted-foreground">µg/m³</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <MapPin className="h-3 w-3" />
                  {aqiData?.location || t('map.loading')}
                </p>
                {refreshing && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('map.updating')}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Destination Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="p-5 border-0 bg-card/80 backdrop-blur-sm shadow-soft">
            <p className="text-sm font-medium mb-3 flex items-center gap-2 text-gradient-primary">
              <Shield className="h-4 w-4 text-primary" />
              {t('map.search.safe.route')}
            </p>
            <SmartLocationSearch
              onSelectLocation={handleLocationSelect}
              currentLat={currentPosition.lat}
              currentLng={currentPosition.lng}
              placeholder={t('map.search.placeholder')}
            />
            {selectedLocation && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 bg-muted/50 px-3 py-2 rounded-xl"
              >
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {selectedLocation.fullAddress}
              </motion.p>
            )}
          </Card>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-3 py-8"
          >
            <div className="relative">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-glow-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">{t('map.analyzing')}</p>
          </motion.div>
        )}

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <HealthNavigationMap
            currentLat={currentPosition.lat}
            currentLng={currentPosition.lng}
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            onMapReady={handleMapReady}
            className="h-[380px] shadow-medium rounded-2xl overflow-hidden"
          />
        </motion.div>

        {/* Route Recommendations */}
        {routes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <RouteRecommendationPanel
              routes={routes}
              selectedIndex={selectedRouteIndex}
              diseaseProfile={getDiseaseProfile()}
              onSelectRoute={setSelectedRouteIndex}
            />
          </motion.div>
        )}

        {/* Travel Mode */}
        {routes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="p-5 border-0 bg-card/80 backdrop-blur-sm shadow-soft">
              <TravelModeRecommender
                value={travelMode}
                onChange={setTravelMode}
                currentPM25={currentPM25}
                routeDuration={routes[selectedRouteIndex]?.duration ?? 0}
                hasRespiratoryCondition={hasRespiratoryCondition}
              />
            </Card>
          </motion.div>
        )}

        {/* AQI History Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <AQIHistoryDashboard daysBack={7} />
        </motion.div>
      </div>
    </div>
  );
};

export default Map;