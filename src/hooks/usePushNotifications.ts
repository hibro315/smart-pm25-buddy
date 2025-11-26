import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const SYNC_TAG = 'phri-air-quality-sync';
const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports required features
    const supported = 
      'serviceWorker' in navigator &&
      'Notification' in window &&
      'PushManager' in window;
    
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast({
        title: 'ไม่รองรับการแจ้งเตือน',
        description: 'เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือนแบบ push',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: 'เปิดการแจ้งเตือนสำเร็จ',
          description: 'คุณจะได้รับการแจ้งเตือนเมื่อค่าฝุ่นสูง',
        });
        return true;
      } else {
        toast({
          title: 'ไม่อนุญาตการแจ้งเตือน',
          description: 'กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถขอสิทธิ์การแจ้งเตือนได้',
        variant: 'destructive',
      });
      return false;
    }
  };

  const registerPeriodicSync = async () => {
    if (!isSupported || permission !== 'granted') {
      console.log('Cannot register periodic sync: not supported or no permission');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if periodic sync is supported
      if ('periodicSync' in registration) {
        try {
          // @ts-ignore - periodicSync is not in TypeScript types yet
          await registration.periodicSync.register(SYNC_TAG, {
            minInterval: SYNC_INTERVAL,
          });
          
          setIsRegistered(true);
          console.log('✅ Periodic background sync registered');
          
          toast({
            title: 'เปิดการติดตามอัตโนมัติ',
            description: 'แอปจะตรวจสอบคุณภาพอากาศทุก 15 นาทีแม้ปิดแอป',
          });
          
          return true;
        } catch (error) {
          console.error('Error registering periodic sync:', error);
          toast({
            title: 'ไม่สามารถเปิดการติดตามอัตโนมัติ',
            description: 'กรุณาลองใหม่อีกครั้ง',
            variant: 'destructive',
          });
          return false;
        }
      } else {
        console.log('Periodic sync not supported, using fallback');
        toast({
          title: 'ใช้โหมดสำรอง',
          description: 'เบราว์เซอร์ไม่รองรับการติดตามอัตโนมัติเต็มรูปแบบ',
        });
        return false;
      }
    } catch (error) {
      console.error('Error in periodic sync registration:', error);
      return false;
    }
  };

  const unregisterPeriodicSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('periodicSync' in registration) {
        // @ts-ignore
        await registration.periodicSync.unregister(SYNC_TAG);
        setIsRegistered(false);
        console.log('✅ Periodic background sync unregistered');
        
        toast({
          title: 'ปิดการติดตามอัตโนมัติ',
          description: 'แอปจะไม่ตรวจสอบคุณภาพอากาศในพื้นหลังอีกต่อไป',
        });
      }
    } catch (error) {
      console.error('Error unregistering periodic sync:', error);
    }
  };

  const checkRegistration = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('periodicSync' in registration) {
        // @ts-ignore
        const tags = await registration.periodicSync.getTags();
        setIsRegistered(tags.includes(SYNC_TAG));
      }
    } catch (error) {
      console.error('Error checking periodic sync registration:', error);
    }
  };

  useEffect(() => {
    if (isSupported && permission === 'granted') {
      checkRegistration();
    }
  }, [isSupported, permission]);

  return {
    isSupported,
    isRegistered,
    permission,
    requestPermission,
    registerPeriodicSync,
    unregisterPeriodicSync,
  };
};
