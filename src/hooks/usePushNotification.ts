import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VAPID_PUBLIC_KEY = 'BFbhdMwAkLc3OSDoKbBqbzHjsyjx9tQrpN3PgJAj_SeXAC_TLq04JvAH1gU7k0DuigSvT5kokCsMxFZCGDnT-2s';

export const usePushNotification = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      
      setIsSupported(supported);
    };

    checkSupport();
  }, []);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSub = await registration.pushManager.getSubscription();
        
        if (existingSub) {
          setSubscription(existingSub);
          setIsSubscribed(true);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [isSupported]);

  // Request notification permission
  const requestPermission = async (): Promise<boolean> => {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        toast({
          title: '✅ อนุญาตการแจ้งเตือนแล้ว',
          description: 'คุณจะได้รับการแจ้งเตือนเมื่อค่าฝุ่นเปลี่ยนแปลง',
        });
        return true;
      } else {
        toast({
          title: '❌ ไม่อนุญาตการแจ้งเตือน',
          description: 'กรุณาเปิดการแจ้งเตือนในการตั้งค่าเบราว์เซอร์',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  // Subscribe to push notifications
  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: '❌ ไม่รองรับ',
        description: 'เบราว์เซอร์ของคุณไม่รองรับ Push Notifications',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);

    try {
      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      });

      console.log('Push subscription created:', sub);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current location for initial setup
      let latitude, longitude;
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: false,
              maximumAge: 60000
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (geoError) {
          console.warn('Could not get location:', geoError);
        }
      }

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: sub.toJSON() as any,
          enabled: true,
          last_location: latitude && longitude ? { latitude, longitude } as any : null,
          notification_settings: {
            pm25_threshold: 50,
            enabled: true
          } as any
        } as any, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSubscription(sub);
      setIsSubscribed(true);

      toast({
        title: '✅ เปิดใช้งาน Push Notifications แล้ว',
        description: 'คุณจะได้รับการแจ้งเตือนเมื่อค่าฝุ่นเปลี่ยนแปลง',
      });

      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'ไม่สามารถเปิดใช้งาน Push Notifications ได้',
        variant: 'destructive',
      });
      setLoading(false);
      return false;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) return false;

    setLoading(true);

    try {
      await subscription.unsubscribe();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Remove subscription from database
        await supabase
          .from('push_subscriptions')
          .update({ enabled: false })
          .eq('user_id', user.id);
      }

      setSubscription(null);
      setIsSubscribed(false);

      toast({
        title: '✅ ปิดใช้งาน Push Notifications แล้ว',
        description: 'คุณจะไม่ได้รับการแจ้งเตือนอีกต่อไป',
      });

      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถปิดใช้งาน Push Notifications ได้',
        variant: 'destructive',
      });
      setLoading(false);
      return false;
    }
  };

  // Update location in subscription
  const updateLocation = async (latitude: number, longitude: number) => {
    if (!isSubscribed) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('push_subscriptions')
          .update({ 
            last_location: { latitude, longitude } as any
          } as any)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    loading,
    subscribe,
    unsubscribe,
    updateLocation
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
