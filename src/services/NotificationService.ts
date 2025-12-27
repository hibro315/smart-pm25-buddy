import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export type AlertSeverity = 'low' | 'moderate' | 'high' | 'critical';

export interface HealthProfile {
  age?: number;
  chronicConditions?: string[];
  dustSensitivity?: 'low' | 'medium' | 'high';
  hasAirPurifier?: boolean;
}

export interface NotificationData {
  title: string;
  body: string;
  severity: AlertSeverity;
  pm25: number;
  location?: string;
  recommendedTime?: number;
  personalizedAdvice?: string[];
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
   * Generate personalized health advice based on profile and PM2.5
   */
  generatePersonalizedAdvice(pm25: number, healthProfile?: HealthProfile): string[] {
    const advice: string[] = [];
    const conditions = healthProfile?.chronicConditions || [];
    const dustSensitivity = healthProfile?.dustSensitivity || 'medium';
    const age = healthProfile?.age || 30;
    const hasAirPurifier = healthProfile?.hasAirPurifier || false;
    
    // High risk conditions
    const hasAsthma = conditions.some(c => c.toLowerCase().includes('asthma') || c.includes('หอบหืด'));
    const hasCOPD = conditions.some(c => c.toLowerCase().includes('copd') || c.includes('ปอดอุดกั้น'));
    const hasHeartDisease = conditions.some(c => c.toLowerCase().includes('heart') || c.includes('หัวใจ'));
    const hasAllergy = conditions.some(c => c.toLowerCase().includes('allergy') || c.includes('ภูมิแพ้'));
    const isHighRisk = hasAsthma || hasCOPD || hasHeartDisease || age > 60 || age < 12;
    
    // Base advice by PM2.5 level (Thai standard)
    if (pm25 > 90) {
      advice.push('🚨 ห้ามออกนอกอาคารโดยเด็ดขาด');
      advice.push('🏠 ปิดหน้าต่างและประตูให้สนิท');
      if (hasAirPurifier) {
        advice.push('🌀 เปิดเครื่องฟอกอากาศตลอดเวลา');
      }
    } else if (pm25 > 50) {
      advice.push('⚠️ จำกัดกิจกรรมกลางแจ้ง');
      advice.push('😷 สวมหน้ากาก N95/KF94 ทุกครั้ง');
    } else if (pm25 > 37) {
      advice.push('😷 แนะนำสวมหน้ากากเมื่อออกนอกอาคาร');
      if (isHighRisk) {
        advice.push('⚠️ กลุ่มเสี่ยงควรระมัดระวังเป็นพิเศษ');
      }
    }
    
    // Condition-specific advice
    if (hasAsthma && pm25 > 37) {
      advice.push('💊 หอบหืด: พกยาพ่นขยายหลอดลมติดตัว');
    }
    
    if (hasCOPD && pm25 > 37) {
      advice.push('🫁 COPD: หลีกเลี่ยงการออกแรงมาก');
    }
    
    if (hasHeartDisease && pm25 > 50) {
      advice.push('❤️ โรคหัวใจ: หลีกเลี่ยงออกกำลังกายหนัก');
    }
    
    if (hasAllergy && pm25 > 37) {
      advice.push('🤧 ภูมิแพ้: รับประทานยาแก้แพ้ตามแพทย์สั่ง');
    }
    
    // Age-specific advice
    if (age > 60 && pm25 > 50) {
      advice.push('👴 ผู้สูงอายุ: ควรอยู่ในอาคาร');
    }
    
    if (age < 12 && pm25 > 50) {
      advice.push('👶 เด็ก: งดกิจกรรมกลางแจ้ง');
    }
    
    // High sensitivity
    if (dustSensitivity === 'high' && pm25 > 37) {
      advice.push('⚡ คุณมีความไวต่อฝุ่นสูง: ระมัดระวังเป็นพิเศษ');
    }
    
    return advice.slice(0, 4); // Max 4 advice items
  }

  /**
   * Send a PM2.5 alert notification with vibration and personalized advice
   */
  async sendAlert(data: NotificationData, healthProfile?: HealthProfile): Promise<void> {
    // Generate personalized advice if not provided
    const personalizedAdvice = data.personalizedAdvice || this.generatePersonalizedAdvice(data.pm25, healthProfile);
    const adviceText = personalizedAdvice.length > 0 ? '\n' + personalizedAdvice.join('\n') : '';
    const enrichedBody = data.body + adviceText;
    
    // Determine if user is high-risk for enhanced vibration
    const conditions = healthProfile?.chronicConditions || [];
    const isHighRisk = conditions.some(c => 
      c.toLowerCase().includes('asthma') || 
      c.toLowerCase().includes('copd') || 
      c.toLowerCase().includes('heart') ||
      c.includes('หอบหืด') ||
      c.includes('ปอดอุดกั้น') ||
      c.includes('หัวใจ')
    ) || (healthProfile?.age && (healthProfile.age > 60 || healthProfile.age < 12));
    
    // Enhanced vibration for high-risk users
    const enhancedSeverity = isHighRisk && data.severity === 'high' ? 'critical' : data.severity;
    
    // Trigger haptic feedback first
    await this.triggerVibration(enhancedSeverity);

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
              body: enrichedBody,
              id: Date.now(),
              channelId: 'pm25-alerts',
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              smallIcon: 'ic_stat_icon_config_sample',
              actionTypeId: '',
              extra: {
                pm25: data.pm25,
                severity: data.severity,
                location: data.location,
                isHighRisk,
                personalizedAdvice
              }
            }
          ]
        });
      } else {
        // Fallback to Web Notifications API
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title, {
            body: enrichedBody,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'pm25-alert',
            requireInteraction: data.severity === 'critical' || isHighRisk
          });
        
          // Trigger vibration separately
          if ('vibrate' in navigator) {
            const pattern = this.getVibrationPattern(enhancedSeverity);
            navigator.vibrate(pattern);
            
            // Extra vibration for high-risk users
            if (isHighRisk && data.pm25 > 50) {
              setTimeout(() => navigator.vibrate(pattern), 1500);
            }
          }
        }
      }

      console.log('📬 Personalized notification sent:', data.title, { isHighRisk, adviceCount: personalizedAdvice.length });
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
        const vibrationCount = severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'moderate' ? 2 : 1;
        const style = severity === 'critical' ? ImpactStyle.Heavy : severity === 'high' ? ImpactStyle.Heavy : ImpactStyle.Medium;

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
        return [500, 150, 500, 150, 500, 150, 500];
      case 'high':
        return [400, 100, 400, 100, 400];
      case 'moderate':
        return [300, 100, 300];
      default:
        return [200];
    }
  }

  /**
   * Build notification message based on PM2.5 value, user risk, and health profile
   */
  buildNotificationData(
    pm25: number,
    location: string,
    isHighRisk: boolean,
    recommendedTime?: number,
    healthProfile?: HealthProfile
  ): NotificationData {
    let severity: AlertSeverity = 'low';
    let title = '';
    let body = '';

    // Adjust thresholds for high-risk users
    const criticalThreshold = isHighRisk ? 75 : 150;
    const highThreshold = isHighRisk ? 50 : 90;
    const moderateThreshold = isHighRisk ? 37 : 50;

    if (pm25 > criticalThreshold) {
      severity = 'critical';
      title = isHighRisk ? '🚨 อันตราย! แจ้งเตือนเร่งด่วนสำหรับคุณ' : '🚨 อันตราย! PM2.5 สูงมาก';
      body = isHighRisk
        ? `ค่าฝุ่น ${pm25} µg/m³ - คุณมีโรคประจำตัว ห้ามออกนอกอาคาร!`
        : `ค่าฝุ่น ${pm25} µg/m³ - หลีกเลี่ยงกิจกรรมกลางแจ้ง`;
    } else if (pm25 > highThreshold) {
      severity = 'high';
      title = isHighRisk ? '⚠️ เตือนภัย! อากาศอันตรายสำหรับคุณ' : '⚠️ เตือนภัย! PM2.5 อันตราย';
      body = isHighRisk
        ? `PM2.5: ${pm25} µg/m³ - อยู่นอกอาคารไม่เกิน ${recommendedTime || 15} นาที`
        : `PM2.5: ${pm25} µg/m³ - จำกัดเวลานอกอาคาร`;
    } else if (pm25 > moderateThreshold) {
      severity = 'moderate';
      title = isHighRisk ? '🩺 แจ้งเตือนสำหรับสุขภาพของคุณ' : '⚠️ แจ้งเตือน: PM2.5 สูง';
      body = isHighRisk
        ? `PM2.5: ${pm25} µg/m³ - แนะนำไม่เกิน ${recommendedTime || 30} นาที`
        : `PM2.5: ${pm25} µg/m³ - สวมหน้ากาก`;
    } else if (pm25 > 25) {
      severity = 'low';
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

    // Generate personalized advice
    const personalizedAdvice = this.generatePersonalizedAdvice(pm25, healthProfile);

    return { title, body, severity, pm25, location, recommendedTime, personalizedAdvice };
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
