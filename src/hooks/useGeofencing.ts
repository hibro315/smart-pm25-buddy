import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeofenceZone {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  notify_on_enter: boolean;
  notify_on_exit: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GeofenceStatus {
  zoneId: string;
  zoneName: string;
  isInside: boolean;
  distance: number;
}

export const useGeofencing = () => {
  const [zones, setZones] = useState<GeofenceZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStatuses, setCurrentStatuses] = useState<Map<string, boolean>>(new Map());

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = useCallback((
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }, []);

  // Check if current location is inside any zones
  const checkGeofences = useCallback((
    currentLat: number,
    currentLon: number
  ): GeofenceStatus[] => {
    const statuses: GeofenceStatus[] = [];

    zones.forEach((zone) => {
      if (!zone.is_active) return;

      const distance = calculateDistance(
        currentLat,
        currentLon,
        Number(zone.latitude),
        Number(zone.longitude)
      );

      const isInside = distance <= zone.radius;
      const wasInside = currentStatuses.get(zone.id) || false;

      // Detect enter/exit events
      if (isInside && !wasInside && zone.notify_on_enter) {
        // Entered zone
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🏠 เข้าสู่พื้นที่: ${zone.name}`, {
            body: `คุณได้เข้าสู่พื้นที่ ${zone.name}`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
          });
        }
        toast.success(`เข้าสู่พื้นที่: ${zone.name}`);
      } else if (!isInside && wasInside && zone.notify_on_exit) {
        // Exited zone
        if ('vibrate' in navigator) {
          navigator.vibrate([200]);
        }
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🚶 ออกจากพื้นที่: ${zone.name}`, {
            body: `คุณได้ออกจากพื้นที่ ${zone.name}`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
          });
        }
        toast.info(`ออกจากพื้นที่: ${zone.name}`);
      }

      // Update status
      if (isInside !== wasInside) {
        setCurrentStatuses((prev) => new Map(prev).set(zone.id, isInside));
      }

      statuses.push({
        zoneId: zone.id,
        zoneName: zone.name,
        isInside,
        distance,
      });
    });

    return statuses;
  }, [zones, currentStatuses, calculateDistance]);

  // Fetch zones from database
  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setZones([]);
        return;
      }

      const { data, error } = await supabase
        .from('geofence_zones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Error fetching geofence zones:', error);
      toast.error('ไม่สามารถโหลดข้อมูล geofence ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new zone
  const addZone = useCallback(async (
    zone: Omit<GeofenceZone, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('geofence_zones')
        .insert([{ ...zone, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      setZones((prev) => [data, ...prev]);
      toast.success('เพิ่มพื้นที่สำเร็จ');
      return data;
    } catch (error) {
      console.error('Error adding zone:', error);
      toast.error('ไม่สามารถเพิ่มพื้นที่ได้');
      throw error;
    }
  }, []);

  // Update zone
  const updateZone = useCallback(async (
    id: string,
    updates: Partial<Omit<GeofenceZone, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      const { data, error } = await supabase
        .from('geofence_zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setZones((prev) => prev.map((z) => (z.id === id ? data : z)));
      toast.success('อัปเดตพื้นที่สำเร็จ');
      return data;
    } catch (error) {
      console.error('Error updating zone:', error);
      toast.error('ไม่สามารถอัปเดตพื้นที่ได้');
      throw error;
    }
  }, []);

  // Delete zone
  const deleteZone = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('geofence_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setZones((prev) => prev.filter((z) => z.id !== id));
      setCurrentStatuses((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      toast.success('ลบพื้นที่สำเร็จ');
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error('ไม่สามารถลบพื้นที่ได้');
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  return {
    zones,
    loading,
    currentStatuses,
    checkGeofences,
    addZone,
    updateZone,
    deleteZone,
    refreshZones: fetchZones,
  };
};
