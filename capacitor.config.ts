import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.cc089fb2d7db45328059e13b81b48a98',
  appName: 'Smart PM2.5 Health',
  webDir: 'dist',
  server: {
    url: 'https://cc089fb2-d7db-4532-8059-e13b81b48a98.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    allowNavigation: ['*']
  },
  ios: {
    contentInset: 'always'
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'default',
      channelId: 'pm25-alerts'
    },
    Geolocation: {
      requestPermissions: true
    },
    BackgroundGeolocation: {
      notificationTitle: 'ติดตามคุณภาพอากาศ',
      notificationText: 'กำลังตรวจสอบค่าฝุ่น PM2.5 ในพื้นที่',
      notificationChannelName: 'Background Location',
      requestPermissions: true,
      backgroundMessage: 'แอพกำลังติดตามตำแหน่งของคุณเพื่อเตือนค่าฝุ่น',
      stale: false,
      distanceFilter: 100,
      desiredAccuracy: 10
    }
  }
};

export default config;
