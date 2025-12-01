import { Card } from "@/components/ui/card";
import { RouteMap } from "@/components/RouteMap";
import { NearbyHospitals } from "@/components/NearbyHospitals";
import { useAirQualityWithFallback } from "@/hooks/useAirQualityWithFallback";
import { MapPin, Navigation } from "lucide-react";
import { Geolocation } from '@capacitor/geolocation';
import { useState, useEffect } from "react";

const Map = () => {
  const { data } = useAirQualityWithFallback();
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number }>({ 
    lat: 13.7563, 
    lng: 100.5018 
  });

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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-display font-bold">Air Quality Map</h1>
          <p className="text-sm text-muted-foreground mt-1">แผนที่คุณภาพอากาศและโรงพยาบาลใกล้เคียง</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Current Location Card */}
        <Card className="p-5 shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">ตำแหน่งปัจจุบัน</h3>
              <p className="text-sm text-muted-foreground">{data?.location || "กำลังโหลด..."}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">AQI</p>
              <p className="text-lg font-bold text-primary">{data?.aqi || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">PM2.5</p>
              <p className="text-lg font-bold text-primary">{data?.pm25 || "-"}</p>
            </div>
          </div>
        </Card>

        {/* Route Map */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-semibold">วางแผนเส้นทาง</h2>
          </div>
          <RouteMap currentLat={currentPosition.lat} currentLng={currentPosition.lng} />
        </div>

        {/* Nearby Hospitals */}
        <div className="space-y-3">
          <h2 className="text-lg font-display font-semibold">โรงพยาบาลใกล้เคียง</h2>
          <NearbyHospitals />
        </div>
      </div>
    </div>
  );
};

export default Map;
