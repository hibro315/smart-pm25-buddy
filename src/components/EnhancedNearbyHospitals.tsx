import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OnlineStatusBadge } from "@/components/OnlineStatusBadge";
import { HospitalMapView } from "@/components/HospitalMapView";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getPosition } from "@/utils/geolocation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Hospital, 
  Phone, 
  MapPin, 
  Navigation, 
  AlertCircle, 
  Ambulance,
  Clock,
  RefreshCw,
  Locate,
  MessageCircle,
  ExternalLink,
  Star,
  Map,
  List,
  Wifi,
  WifiOff
} from "lucide-react";

interface HospitalData {
  id: string;
  name: string;
  distance: number;
  distanceText: string;
  phone: string;
  emergencyPhone?: string;
  address: string;
  specialties: string[];
  rating?: number;
  isOpen24h: boolean;
  lat: number;
  lng: number;
  lineId?: string;
  isOpenNow?: boolean;
}

// Fallback static hospital data for offline mode
const FALLBACK_HOSPITALS: HospitalData[] = [
  {
    id: "fallback-1",
    name: "โรงพยาบาลจุฬาลงกรณ์",
    distance: 0,
    distanceText: "",
    phone: "02-256-4000",
    emergencyPhone: "02-256-4567",
    address: "1873 ถ.พระราม 4 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330",
    specialties: ["โรคทางเดินหายใจ", "โรคหัวใจ", "ฉุกเฉิน 24 ชม."],
    rating: 4.5,
    isOpen24h: true,
    lat: 13.7323,
    lng: 100.5306,
  },
  {
    id: "fallback-2",
    name: "โรงพยาบาลศิริราช",
    distance: 0,
    distanceText: "",
    phone: "02-419-7000",
    emergencyPhone: "02-419-7999",
    address: "2 ถ.วังหลัง แขวงศิริราช เขตบางกอกน้อย กรุงเทพฯ 10700",
    specialties: ["โรคทางเดินหายใจ", "โรคหอบหืด", "ฉุกเฉิน 24 ชม."],
    rating: 4.7,
    isOpen24h: true,
    lat: 13.7590,
    lng: 100.4857,
  },
  {
    id: "fallback-3",
    name: "โรงพยาบาลรามาธิบดี",
    distance: 0,
    distanceText: "",
    phone: "02-201-1000",
    emergencyPhone: "02-201-1188",
    address: "270 ถ.พระราม 6 แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพฯ 10400",
    specialties: ["โรคปอด", "โรคภูมิแพ้", "ฉุกเฉิน 24 ชม."],
    rating: 4.6,
    isOpen24h: true,
    lat: 13.7649,
    lng: 100.5253,
  },
];

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} ม.`;
  }
  return `${km.toFixed(1)} กม.`;
};

export const EnhancedNearbyHospitals = () => {
  const { isOnline } = useOnlineStatus();
  const [hospitals, setHospitals] = useState<HospitalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [dataSource, setDataSource] = useState<'api' | 'cache' | 'fallback'>('api');

  const loadNearbyHospitals = useCallback(async () => {
    setLoading(true);
    setLocationError(null);

    try {
      const position = await getPosition({ timeout: 15000, enableHighAccuracy: true });
      const { latitude, longitude } = position;
      setUserLocation({ lat: latitude, lng: longitude });

      // Try to fetch from Google Places API if online
      if (isOnline) {
        try {
          console.log('Fetching hospitals from Google Places API...');
          const { data, error } = await supabase.functions.invoke('search-nearby-hospitals', {
            body: { latitude, longitude, radius: 10000 }
          });

          if (!error && data?.hospitals?.length > 0) {
            console.log(`Found ${data.hospitals.length} hospitals from API`);
            setHospitals(data.hospitals);
            setDataSource('api');
            setLastUpdated(new Date());
            
            // Cache for offline use
            localStorage.setItem('cachedHospitals', JSON.stringify({
              hospitals: data.hospitals,
              userLocation: { lat: latitude, lng: longitude },
              timestamp: Date.now(),
            }));
            return;
          } else {
            console.log('API returned no results or error:', error);
          }
        } catch (apiError) {
          console.error('API error, falling back to cached data:', apiError);
        }
      }

      // Try cached data
      const cached = localStorage.getItem('cachedHospitals');
      if (cached) {
        const data = JSON.parse(cached);
        // Recalculate distances based on current position
        const hospitalsWithDistance = data.hospitals.map((hospital: HospitalData) => ({
          ...hospital,
          distance: calculateDistance(latitude, longitude, hospital.lat, hospital.lng),
          distanceText: formatDistance(calculateDistance(latitude, longitude, hospital.lat, hospital.lng)),
        })).sort((a: HospitalData, b: HospitalData) => a.distance - b.distance);
        
        setHospitals(hospitalsWithDistance);
        setDataSource('cache');
        setLastUpdated(new Date(data.timestamp));
        toast.info('ใช้ข้อมูลที่บันทึกไว้', {
          description: isOnline ? 'ไม่สามารถดึงข้อมูลใหม่ได้' : 'คุณกำลังออฟไลน์',
        });
        return;
      }

      // Use fallback data
      const fallbackWithDistance = FALLBACK_HOSPITALS.map(hospital => ({
        ...hospital,
        distance: calculateDistance(latitude, longitude, hospital.lat, hospital.lng),
        distanceText: formatDistance(calculateDistance(latitude, longitude, hospital.lat, hospital.lng)),
      })).sort((a, b) => a.distance - b.distance);

      setHospitals(fallbackWithDistance);
      setDataSource('fallback');
      setLastUpdated(new Date());

    } catch (error: any) {
      console.error('Location error:', error);
      setLocationError('ไม่สามารถระบุตำแหน่งได้ กรุณาเปิดใช้งาน GPS');
      
      // Try to load cached data
      const cached = localStorage.getItem('cachedHospitals');
      if (cached) {
        const data = JSON.parse(cached);
        setHospitals(data.hospitals);
        setUserLocation(data.userLocation);
        setDataSource('cache');
        toast.info('ใช้ข้อมูลที่บันทึกไว้', {
          description: 'กำลังแสดงข้อมูลจากครั้งก่อน',
        });
      } else {
        // Use fallback without distance calculation
        setHospitals(FALLBACK_HOSPITALS);
        setDataSource('fallback');
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    loadNearbyHospitals();
  }, [loadNearbyHospitals]);

  const handleCall = (phone: string, hospitalName: string) => {
    toast.success(`กำลังโทรหา ${hospitalName}`, {
      description: phone,
    });
    window.location.href = `tel:${phone}`;
  };

  const handleEmergencyCall = (phone: string) => {
    toast.success('กำลังโทรหาห้องฉุกเฉิน', {
      description: phone,
    });
    window.location.href = `tel:${phone}`;
  };

  const handleNavigate = (hospital: HospitalData) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleLineChat = (lineId: string) => {
    window.open(`https://line.me/R/ti/p/${lineId}`, '_blank');
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{rating}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hospital className="w-5 h-5 text-primary" />
            <CardTitle>โรงพยาบาลใกล้เคียง</CardTitle>
            {dataSource === 'api' && (
              <Badge variant="outline" className="text-[10px] gap-1 text-success border-success/30 bg-success/10">
                <Wifi className="w-3 h-3" />
                Real-time
              </Badge>
            )}
            {dataSource === 'cache' && (
              <Badge variant="outline" className="text-[10px] gap-1 text-orange-600 border-orange-300/30 bg-orange-50 dark:bg-orange-950/20">
                <WifiOff className="w-3 h-3" />
                แคช
              </Badge>
            )}
            {dataSource === 'fallback' && (
              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                ข้อมูลสำรอง
              </Badge>
            )}
          </div>
          <OnlineStatusBadge compact showConnectionType />
        </div>
        <CardDescription className="flex items-center justify-between">
          <span>โรงพยาบาลที่รองรับโรคทางเดินหายใจและ PM2.5</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadNearbyHospitals}
            disabled={loading}
            className="h-8 px-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardDescription>
        
        {userLocation && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Locate className="w-3 h-3" />
            <span>ตำแหน่งของคุณ: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</span>
            {lastUpdated && (
              <span className="ml-2">
                (อัปเดต {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </div>
        )}

        {locationError && (
          <div className="flex items-center gap-2 text-destructive text-sm mt-2 p-2 bg-destructive/10 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>{locationError}</span>
            <Button variant="link" size="sm" onClick={loadNearbyHospitals} className="p-0 h-auto">
              ลองอีกครั้ง
            </Button>
          </div>
        )}

        {!isOnline && (
          <div className="flex items-center gap-2 text-orange-600 text-sm mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>คุณกำลังออฟไลน์ - แสดงข้อมูลที่บันทึกไว้</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Emergency Call Banner */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/20 rounded-full">
                <Ambulance className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-destructive">ฉุกเฉิน? โทร 1669</p>
                <p className="text-xs text-muted-foreground">สายด่วนการแพทย์ฉุกเฉินของประเทศไทย</p>
              </div>
            </div>
            <Button 
              onClick={() => handleCall('1669', 'สายด่วน 1669')}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <Phone className="w-4 h-4" />
              โทรเลย
            </Button>
          </div>
        </div>

        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              รายการ
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <Map className="w-4 h-4" />
              แผนที่
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
            <HospitalMapView 
              hospitals={hospitals}
              userLocation={userLocation}
              onRefreshLocation={loadNearbyHospitals}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            {/* Hospital List */}
            <ScrollArea className="h-[500px] pr-2">
              <div className="space-y-3">
                {hospitals.map((hospital, index) => (
                  <Card 
                    key={hospital.id} 
                    className="bg-card hover:shadow-md transition-all border-border overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                #{index + 1}
                              </Badge>
                            )}
                            <h3 className="font-semibold text-foreground leading-tight">
                              {hospital.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="font-medium text-primary">{hospital.distanceText}</span>
                            </div>
                            {hospital.rating && renderStars(hospital.rating)}
                          </div>
                        </div>
                        {hospital.isOpen24h && (
                          <Badge variant="outline" className="gap-1 text-success border-success/30 bg-success/10">
                            <Clock className="w-3 h-3" />
                            24 ชม.
                          </Badge>
                        )}
                      </div>

                      {/* Address */}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {hospital.address}
                      </p>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-1">
                        {hospital.specialties.map((specialty, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5">
                            {specialty}
                          </Badge>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                          onClick={() => handleCall(hospital.phone, hospital.name)}
                          size="sm"
                          className="gap-2"
                        >
                          <Phone className="w-4 h-4" />
                          โทรติดต่อ
                        </Button>
                        <Button
                          onClick={() => handleNavigate(hospital)}
                          size="sm"
                          variant="outline"
                          className="gap-2"
                        >
                          <Navigation className="w-4 h-4" />
                          นำทาง
                        </Button>
                      </div>

                      {/* Secondary Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        {hospital.emergencyPhone && (
                          <Button
                            onClick={() => handleEmergencyCall(hospital.emergencyPhone!)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 flex-1"
                          >
                            <Ambulance className="w-4 h-4" />
                            <span className="text-xs">ฉุกเฉิน</span>
                          </Button>
                        )}
                        {hospital.lineId && (
                          <Button
                            onClick={() => handleLineChat(hospital.lineId!)}
                            variant="ghost"
                            size="sm"
                            className="text-[#00B900] hover:text-[#00B900] hover:bg-[#00B900]/10 gap-1 flex-1"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs">LINE</span>
                          </Button>
                        )}
                        <Button
                          onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(hospital.name)}`, '_blank')}
                          variant="ghost"
                          size="sm"
                          className="gap-1 flex-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="text-xs">ข้อมูลเพิ่มเติม</span>
                        </Button>
                      </div>

                      {/* Contact Info */}
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        <span>{hospital.phone}</span>
                        {hospital.emergencyPhone && (
                          <>
                            <span className="text-border">|</span>
                            <span className="text-destructive">ฉุกเฉิน: {hospital.emergencyPhone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              💡 การโทรยังใช้งานได้แม้ไม่มีอินเทอร์เน็ต
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
