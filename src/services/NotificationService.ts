import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export type AlertSeverity = 'low' | 'moderate' | 'high' | 'critical';

export interface NotificationData {
  title: string;
  body: string;
  severity: AlertSeverity;
  pm25: number;
  location?: string;
  recommendedTime?: number;
}

class NotificationServiceClass {
  private permissionGranted: boolean = false;
  private channelCreated: boolean = false;

  /**
   * Initialize notification service and request permissions
   */
  async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // Use Web Notifications API
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        this.permissionGranted = permission === 'granted';
        return this.permissionGranted;
      }
      return false;
    }

    try {
      // Create notification channel for Android
      if (Capacitor.getPlatform() === 'android' && !this.channelCreated) {
        await LocalNotifications.createChannel({
          id: 'pm25-alerts',
          name: 'แจ้งเตือนค่าฝุ่น PM2.5',
          description: 'การแจ้งเตือนเมื่อค่าฝุ่น PM2.5 สูงหรือเปลี่ยนแปลง',
          importance: 4, // High importance
          visibility: 1, // Public
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#FF6B6B'
        });
        this.channelCreated = true;
      }

      // Request permissions
      const permission = await LocalNotifications.requestPermissions();
      this.permissionGranted = permission.display === 'granted';
      
      console.log('Notification permission:', this.permissionGranted);
      return this.permissionGranted;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Send a PM2.5 alert notification with vibration
   */
  async sendAlert(data: NotificationData): Promise<void> {
    // Trigger haptic feedback first
    await this.triggerVibration(data.severity);

    if (!this.permissionGranted) {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: data.title,
              body: data.body,
              id: Date.now(),
              channelId: 'pm25-alerts',
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              smallIcon: 'ic_stat_icon_config_sample',
              actionTypeId: '',
              extra: {
                pm25: data.pm25,
                severity: data.severity,
                location: data.location
              }
            }
          ]
        });
      } else {
        // Fallback to Web Notifications API
        if ('Notification' in window && Notification.permission === 'granted') {
        // Web Notifications API
        new Notification(data.title, {
            body: data.body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'pm25-alert',
            requireInteraction: data.severity === 'critical'
          });
        
        // Trigger vibration separately
        if ('vibrate' in navigator) {
          navigator.vibrate(this.getVibrationPattern(data.severity));
        }
        }
      }

      console.log('📬 Notification sent:', data.title);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Trigger haptic feedback based on severity
   */
  private async triggerVibration(severity: AlertSeverity): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const vibrationCount = severity === 'critical' ? 3 : severity === 'high' ? 2 : 1;
        const style = severity === 'critical' ? ImpactStyle.Heavy : ImpactStyle.Medium;

        for (let i = 0; i < vibrationCount; i++) {
          await Haptics.impact({ style });
          if (i < vibrationCount - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } else {
        // Web Vibration API
        if ('vibrate' in navigator) {
          navigator.vibrate(this.getVibrationPattern(severity));
        }
      }
    } catch (error) {
      console.error('Haptics error:', error);
    }
  }

  /**
   * Get vibration pattern for severity level
   */
  private getVibrationPattern(severity: AlertSeverity): number[] {
    switch (severity) {
      case 'critical':
        return [300, 100, 300, 100, 300];
      case 'high':
        return [300, 100, 300];
      case 'moderate':
        return [200, 100, 200];
      default:
        return [200];
    }
  }

  /**
   * Build notification message based on PM2.5 value and user risk
   */
  buildNotificationData(
    pm25: number,
    location: string,
    isHighRisk: boolean,
    recommendedTime?: number
  ): NotificationData {
    let severity: AlertSeverity = 'low';
    let title = '';
    let body = '';

    if (pm25 > 150) {
      severity = 'critical';
      title = '🚨 อันตราย! PM2.5 สูงมาก';
      body = isHighRisk
        ? `ค่าฝุ่น ${pm25} µg/m³ - คุณมีโรคประจำตัว ห้ามออกนอกอาคาร!`
        : `ค่าฝุ่น ${pm25} µg/m³ - หลีกเลี่ยงกิจกรรมกลางแจ้ง`;
    } else if (pm25 > 90) {
      severity = 'critical';
      title = '⚠️ เตือนภัย! PM2.5 อันตราย';
      body = isHighRisk
        ? `PM2.5: ${pm25} µg/m³ - อยู่นอกอาคารไม่เกิน ${recommendedTime} นาที`
        : `PM2.5: ${pm25} µg/m³ - จำกัดเวลานอกอาคาร`;
    } else if (pm25 > 50) {
      severity = 'high';
      title = '⚠️ แจ้งเตือน: PM2.5 สูง';
      body = isHighRisk
        ? `PM2.5: ${pm25} µg/m³ - แนะนำไม่เกิน ${recommendedTime} นาที`
        : `PM2.5: ${pm25} µg/m³ - สวมหน้ากาก`;
    } else if (pm25 > 37) {
      severity = 'moderate';
      title = '📊 PM2.5 ปานกลาง';
      body = `PM2.5: ${pm25} µg/m³`;
    } else {
      severity = 'low';
      title = '✅ คุณภาพอากาศดี';
      body = `PM2.5: ${pm25} µg/m³`;
    }

    if (location) {
      body += `\n📍 ${location}`;
    }

    return { title, body, severity, pm25, location, recommendedTime };
  }

  /**
   * Check if permission is granted
   */
  hasPermission(): boolean {
    return this.permissionGranted;
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();
