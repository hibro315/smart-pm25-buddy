import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';

const VAPID_PUBLIC_KEY = 'BFbhdMwAkLc3OSDoKbBqbzHjsyjx9tQrpN3PgJAj_SeXAC_TLq04JvAH1gU7k0DuigSvT5kokCsMxFZCGDnT-2s';

export const usePushNotification = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      if (isNative) {
        // Native platforms always support push notifications
        setIsSupported(true);
        
        // Check if already registered
        try {
          const permStatus = await PushNotifications.checkPermissions();
          setIsSubscribed(permStatus.receive === 'granted');
        } catch (error) {
          console.error('Error checking native push permissions:', error);
        }
      } else {
        // Web platform check
        const supported = 
          'serviceWorker' in navigator &&
          'PushManager' in window &&
          'Notification' in window;
        
        setIsSupported(supported);
      }
    };

    checkSupport();
  }, [isNative]);

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
        description: isNative ? 'อุปกรณ์ของคุณไม่รองรับ Push Notifications' : 'เบราว์เซอร์ของคุณไม่รองรับ Push Notifications',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);

    try {
      if (isNative) {
        // === Native Platform Subscription (Android/iOS) ===
        console.log('🔔 Subscribing to native push notifications...');
        
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          toast({
            title: '❌ ไม่อนุญาตการแจ้งเตือน',
            description: 'กรุณาเปิดการแจ้งเตือนในการตั้งค่าอุปกรณ์',
            variant: 'destructive',
          });
          setLoading(false);
          return false;
        }

        // Register for push notifications
        await PushNotifications.register();

        // Listen for registration token
        await PushNotifications.addListener('registration', async (token: Token) => {
          console.log('✅ Push registration token:', token.value);

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Get current location
          let latitude, longitude;
          try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const position = await Geolocation.getCurrentPosition();
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
          } catch (error) {
            console.warn('Could not get location:', error);
          }

          // Save FCM/APNs token to database
          await supabase
            .from('push_subscriptions')
            .upsert({
              user_id: user.id,
              subscription: { 
                token: token.value, 
                type: 'native',
                platform: Capacitor.getPlatform()
              } as any,
              enabled: true,
              last_location: latitude && longitude ? { latitude, longitude } as any : null,
              notification_settings: {
                pm25_threshold: 50,
                enabled: true
              } as any
            } as any, {
              onConflict: 'user_id'
            });

          console.log('✅ Native push subscription saved to database');
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error: any) => {
          console.error('❌ Push registration error:', error);
          toast({
            title: '❌ เกิดข้อผิดพลาด',
            description: 'ไม่สามารถลงทะเบียน Push Notifications ได้',
            variant: 'destructive',
          });
        });

        // Listen for incoming push notifications
        await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('📬 Push notification received:', notification);
          
          // Show local notification if app is in foreground
          toast({
            title: notification.title || '🌫️ แจ้งเตือนคุณภาพอากาศ',
            description: notification.body || 'มีการเปลี่ยนแปลงคุณภาพอากาศ',
          });
        });

        // Listen for notification actions
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
          console.log('🔔 Push notification action performed:', notification);
        });

        setIsSubscribed(true);
        toast({
          title: '✅ เปิดใช้งาน Push Notifications แล้ว',
          description: 'คุณจะได้รับการแจ้งเตือนเมื่อค่าฝุ่นเปลี่ยนแปลง',
        });
        setLoading(false);
        return true;

      } else {
        // === Web Platform Subscription (PWA) ===
        console.log('🌐 Subscribing to web push notifications...');
        
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          setLoading(false);
          return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
        });

        console.log('✅ Web push subscription created:', sub);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

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

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: { 
              ...sub.toJSON(),
              type: 'web'
            } as any,
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
      }
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
    setLoading(true);

    try {
      if (isNative) {
        // Unregister native push notifications
        await PushNotifications.removeAllListeners();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('push_subscriptions')
            .update({ enabled: false })
            .eq('user_id', user.id);
        }
      } else {
        // Web platform unsubscribe
        if (subscription) {
          await subscription.unsubscribe();
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('push_subscriptions')
            .update({ enabled: false })
            .eq('user_id', user.id);
        }

        setSubscription(null);
      }

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

      // Also update service worker for background sync
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({
          type: 'UPDATE_LOCATION',
          latitude,
          longitude,
          location: 'Current Location'
        });
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Trigger manual sync with service worker
  const triggerSync = async (): Promise<boolean> => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Try to use background sync if available
        if ('sync' in registration) {
          await (registration as any).sync.register('aqi-sync');
          console.log('✅ Background sync registered');
          return true;
        }
        
        // Fallback: send message to service worker
        const messageChannel = new MessageChannel();
        return new Promise((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data?.success ?? false);
          };
          registration.active?.postMessage(
            { type: 'TRIGGER_SYNC' },
            [messageChannel.port2]
          );
          // Timeout after 30 seconds
          setTimeout(() => resolve(false), 30000);
        });
      }
      return false;
    } catch (error) {
      console.error('Error triggering sync:', error);
      return false;
    }
  };

  // Update notification settings in service worker
  const updateNotificationSettings = async (settings: {
    aqi_threshold?: number;
    enable_quiet_hours?: boolean;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
  }) => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({
          type: 'UPDATE_NOTIFICATION_SETTINGS',
          settings
        });
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    loading,
    subscribe,
    unsubscribe,
    updateLocation,
    triggerSync,
    updateNotificationSettings
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
