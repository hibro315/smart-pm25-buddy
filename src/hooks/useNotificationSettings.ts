import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationRule {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  customThreshold: number;
}

export interface NotificationSettings {
  id?: string;
  aqi_threshold: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  enable_quiet_hours: boolean;
  location_rules: LocationRule[];
  symptom_alerts_enabled: boolean;
}

const defaultSettings: NotificationSettings = {
  aqi_threshold: 100,
  quiet_hours_start: '22:00:00',
  quiet_hours_end: '07:00:00',
  enable_quiet_hours: true,
  location_rules: [],
  symptom_alerts_enabled: true,
};

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          aqi_threshold: data.aqi_threshold,
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end,
          enable_quiet_hours: data.enable_quiet_hours,
          location_rules: (data.location_rules as unknown as LocationRule[]) || [],
          symptom_alerts_enabled: data.symptom_alerts_enabled,
        });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to save settings',
          variant: 'destructive',
        });
        return;
      }

      const updatedSettings = { ...settings, ...newSettings };

      const upsertData: any = {
        user_id: user.id,
        aqi_threshold: updatedSettings.aqi_threshold,
        quiet_hours_start: updatedSettings.quiet_hours_start,
        quiet_hours_end: updatedSettings.quiet_hours_end,
        enable_quiet_hours: updatedSettings.enable_quiet_hours,
        location_rules: updatedSettings.location_rules as any,
        symptom_alerts_enabled: updatedSettings.symptom_alerts_enabled,
      };

      if (updatedSettings.id) {
        upsertData.id = updatedSettings.id;
      }

      const { error } = await supabase
        .from('notification_settings')
        .upsert(upsertData);

      if (error) throw error;

      setSettings(updatedSettings);
      
      // Store in IndexedDB for service worker access
      await storeSettingsInIndexedDB(updatedSettings);

      toast({
        title: 'Settings Saved',
        description: 'Your notification preferences have been updated',
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  const storeSettingsInIndexedDB = async (settings: NotificationSettings) => {
    const db = await openNotificationDB();
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    await store.put({ id: 'notification-settings', ...settings });
  };

  const openNotificationDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('phri-db', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };
    });
  };

  return {
    settings,
    loading,
    saveSettings,
    isQuietHours: (time: Date = new Date()) => {
      if (!settings.enable_quiet_hours) return false;
      
      const currentTime = time.getHours() * 60 + time.getMinutes();
      const [startHour, startMin] = settings.quiet_hours_start.split(':').map(Number);
      const [endHour, endMin] = settings.quiet_hours_end.split(':').map(Number);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      if (startTime <= endTime) {
        return currentTime >= startTime && currentTime < endTime;
      } else {
        // Crosses midnight
        return currentTime >= startTime || currentTime < endTime;
      }
    },
  };
};
