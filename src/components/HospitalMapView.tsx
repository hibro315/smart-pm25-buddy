import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Navigation, Locate, Phone, Ambulance } from "lucide-react";

interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  phone: string;
  emergencyPhone?: string;
  address: string;
  distance?: number;
  distanceText?: string;
  isOpen24h: boolean;
}

interface HospitalMapViewProps {
  hospitals: Hospital[];
  userLocation: { lat: number; lng: number } | null;
  onRefreshLocation: () => void;
}

export const HospitalMapView = ({ hospitals, userLocation, onRefreshLocation }: HospitalMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  // Fetch Mapbox token
  const initializeMap = useCallback(async () => {
    if (!mapContainer.current) return;
    
    try {
      setMapLoading(true);
      setMapError(null);

      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      
      if (error || !data?.token) {
        throw new Error('ไม่สามารถโหลดแผนที่ได้');
      }

      mapboxgl.accessToken = data.token;

      const centerLat = userLocation?.lat || 13.7563;
      const centerLng = userLocation?.lng || 100.5018;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [centerLng, centerLat],
        zoom: 12,
        pitch: 0,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: false }),
        'top-right'
      );

      // Add geolocate control
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      });
      map.current.addControl(geolocate, 'top-right');

      map.current.on('load', () => {
        setMapLoading(false);
        
        // Add user location marker
        if (userLocation) {
          addUserMarker(userLocation.lat, userLocation.lng);
        }

        // Add hospital markers
        addHospitalMarkers();
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError('เกิดข้อผิดพลาดกับแผนที่');
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('ไม่สามารถโหลดแผนที่ได้ กรุณาลองใหม่');
      setMapLoading(false);
    }
  }, [userLocation]);

  const addUserMarker = (lat: number, lng: number) => {
    if (!map.current) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Create custom user marker element
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.innerHTML = `
      <div style="
        width: 24px;
        height: 24px;
        background: hsl(217, 91%, 60%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      ">
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          background: hsla(217, 91%, 60%, 0.2);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 2s ease-out infinite;
        "></div>
      </div>
    `;

    userMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="text-align: center; padding: 8px;">
            <strong style="color: hsl(217, 91%, 40%);">📍 ตำแหน่งของคุณ</strong>
            <p style="font-size: 12px; color: #666; margin-top: 4px;">
              ${lat.toFixed(4)}, ${lng.toFixed(4)}
            </p>
          </div>
        `)
      )
      .addTo(map.current);
  };

  const addHospitalMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    hospitals.forEach((hospital, index) => {
      // Create custom hospital marker
      const el = document.createElement('div');
      el.className = 'hospital-marker';
      const isTop3 = index < 3;
      el.innerHTML = `
        <div style="
          width: ${isTop3 ? '40px' : '32px'};
          height: ${isTop3 ? '40px' : '32px'};
          background: ${isTop3 ? 'hsl(0, 84%, 60%)' : 'hsl(0, 84%, 70%)'};
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
          font-size: ${isTop3 ? '18px' : '14px'};
        ">
          🏥
        </div>
        ${isTop3 ? `
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: hsl(142, 76%, 36%);
            color: white;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            font-size: 10px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
          ">${index + 1}</div>
        ` : ''}
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        maxWidth: '280px',
        closeButton: true,
      }).setHTML(`
        <div style="padding: 12px;">
          <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333;">
            ${hospital.name}
          </h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 8px;">
            📍 ${hospital.distanceText || 'ไม่ทราบระยะทาง'}
          </p>
          <p style="font-size: 11px; color: #888; margin-bottom: 12px;">
            ${hospital.address}
          </p>
          <div style="display: flex; gap: 8px;">
            <a href="tel:${hospital.phone}" style="
              flex: 1;
              background: hsl(217, 91%, 60%);
              color: white;
              padding: 8px;
              border-radius: 6px;
              text-align: center;
              text-decoration: none;
              font-size: 12px;
              font-weight: 500;
            ">📞 โทร</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}" target="_blank" style="
              flex: 1;
              background: hsl(142, 76%, 36%);
              color: white;
              padding: 8px;
              border-radius: 6px;
              text-align: center;
              text-decoration: none;
              font-size: 12px;
              font-weight: 500;
            ">🧭 นำทาง</a>
          </div>
          ${hospital.emergencyPhone ? `
            <a href="tel:${hospital.emergencyPhone}" style="
              display: block;
              margin-top: 8px;
              background: hsl(0, 84%, 60%);
              color: white;
              padding: 8px;
              border-radius: 6px;
              text-align: center;
              text-decoration: none;
              font-size: 12px;
              font-weight: 500;
            ">🚑 ฉุกเฉิน: ${hospital.emergencyPhone}</a>
          ` : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([hospital.lng, hospital.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  };

  // Fly to nearest hospital
  const flyToNearest = () => {
    if (!map.current || hospitals.length === 0) return;
    
    const nearest = hospitals[0];
    map.current.flyTo({
      center: [nearest.lng, nearest.lat],
      zoom: 15,
      duration: 1500,
    });
    
    // Open popup of nearest marker
    if (markersRef.current[0]) {
      markersRef.current[0].togglePopup();
    }
    
    toast.success(`โรงพยาบาลที่ใกล้ที่สุด: ${nearest.name}`, {
      description: nearest.distanceText,
    });
  };

  // Fly to user location
  const flyToUser = () => {
    if (!map.current || !userLocation) return;
    
    map.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 14,
      duration: 1000,
    });
  };

  // Fit bounds to show all hospitals
  const fitAllMarkers = () => {
    if (!map.current || hospitals.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    if (userLocation) {
      bounds.extend([userLocation.lng, userLocation.lat]);
    }

    hospitals.forEach(hospital => {
      bounds.extend([hospital.lng, hospital.lat]);
    });

    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 14,
      duration: 1000,
    });
  };

  useEffect(() => {
    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update markers when hospitals change
  useEffect(() => {
    if (map.current && !mapLoading) {
      addHospitalMarkers();
      if (userLocation) {
        addUserMarker(userLocation.lat, userLocation.lng);
      }
    }
  }, [hospitals, userLocation, mapLoading]);

  if (mapError) {
    return (
      <div className="h-[400px] rounded-lg bg-muted flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-destructive text-center">
          <p className="font-medium">{mapError}</p>
          <p className="text-sm text-muted-foreground mt-2">
            กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
          </p>
        </div>
        <Button onClick={initializeMap} variant="outline" size="sm">
          ลองอีกครั้ง
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="h-[400px] rounded-lg overflow-hidden shadow-md"
      />
      
      {/* Loading Overlay */}
      {mapLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-8 mx-auto rounded-full" />
            <p className="text-sm text-muted-foreground">กำลังโหลดแผนที่...</p>
          </div>
        </div>
      )}

      {/* Map Controls */}
      {!mapLoading && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              onClick={flyToUser}
              size="sm"
              variant="secondary"
              className="gap-1 shadow-md"
              disabled={!userLocation}
            >
              <Locate className="w-4 h-4" />
              <span className="hidden sm:inline">ตำแหน่งของฉัน</span>
            </Button>
            <Button
              onClick={fitAllMarkers}
              size="sm"
              variant="secondary"
              className="gap-1 shadow-md"
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">ดูทั้งหมด</span>
            </Button>
          </div>

          <Button
            onClick={flyToNearest}
            size="sm"
            variant="destructive"
            className="gap-1 shadow-md"
            disabled={hospitals.length === 0}
          >
            <Ambulance className="w-4 h-4" />
            <span>ใกล้ที่สุด</span>
          </Button>
        </div>
      )}

      {/* Add custom CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
