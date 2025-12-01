# Native App Setup Guide - Background Location & Notifications

## ขั้นตอนการตั้งค่า Native App สำหรับ iOS และ Android

### 📱 Android Setup

#### 1. Push Notifications - Firebase Cloud Messaging (FCM)

**ขั้นตอนการตั้งค่า FCM:**

1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. สร้างโปรเจคใหม่หรือเลือกโปรเจคที่มี
3. เพิ่ม Android app ด้วย package name: `app.lovable.cc089fb2d7db45328059e13b81b48a98`
4. ดาวน์โหลด `google-services.json` และวางที่ `android/app/`

**เพิ่ม Dependencies ใน `android/app/build.gradle`:**

```gradle
dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.4.0'
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
}

// ท้ายไฟล์
apply plugin: 'com.google.gms.google-services'
```

**เพิ่มใน `android/build.gradle` (project level):**

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

#### 2. สิทธิ์ที่จำเป็น (Permissions)
เพิ่มใน `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <!-- Location Permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    
    <!-- Notification Permissions -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    
    <!-- Foreground Service for Background Location -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application>
        <!-- ... existing config ... -->
        
        <!-- Foreground Service Declaration -->
        <service
            android:name=".LocationForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location" />
    </application>
</manifest>
```

#### 3. สร้าง Notification Channel (Android 8.0+)
ไฟล์ `android/app/src/main/res/values/strings.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Smart PM2.5 Health</string>
    <string name="background_location_notification_channel_id">pm25-alerts</string>
    <string name="background_location_notification_channel_name">แจ้งเตือนค่าฝุ่น PM2.5</string>
</resources>
```

#### 4. Build Settings
ไฟล์ `android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 34
    }
}
```

#### 5. ทดสอบบน Android
```bash
# Build และรันบน Android
npx cap sync android
npx cap run android
```

---

### 🍎 iOS Setup

#### 1. Push Notifications - Apple Push Notification Service (APNs)

**ขั้นตอนการตั้งค่า APNs:**

1. เปิดโปรเจค iOS ด้วย Xcode: `npx cap open ios`
2. เลือก Target → "Signing & Capabilities"
3. คลิก "+ Capability" และเพิ่ม:
   - **Push Notifications**
   - **Background Modes** (เลือก Remote notifications)

4. สร้าง APNs Certificate ใน [Apple Developer Portal](https://developer.apple.com/):
   - ไปที่ Certificates, Identifiers & Profiles
   - สร้าง APNs SSL Certificate (Development/Production)
   - ดาวน์โหลดและติดตั้งใน Keychain Access

#### 2. สิทธิ์ที่จำเป็น (Info.plist)
เพิ่มใน `ios/App/App/Info.plist`:

```xml
<dict>
    <!-- Location Permissions -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>เราต้องการตรวจสอบค่าฝุ่น PM2.5 ในพื้นที่ของคุณเมื่อใช้งานแอป</string>
    
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>เราต้องการติดตามค่าฝุ่น PM2.5 แม้แอปอยู่เบื้องหลัง เพื่อแจ้งเตือนเมื่อคุณอยู่ในพื้นที่อากาศไม่ดี</string>
    
    <key>NSLocationAlwaysUsageDescription</key>
    <string>เราต้องการติดตามค่าฝุ่น PM2.5 อย่างต่อเนื่องเพื่อปกป้องสุขภาพของคุณ</string>
    
    <!-- Background Modes -->
    <key>UIBackgroundModes</key>
    <array>
        <string>location</string>
        <string>remote-notification</string>
    </array>
</dict>
```

#### 3. Enable Background Location Capability
1. เปิดโปรเจค iOS ด้วย Xcode: `npx cap open ios`
2. เลือก Target ของแอป → "Signing & Capabilities"
3. คลิก "+ Capability" และเพิ่ม "Background Modes"
4. เลือก:
   - ☑️ Location updates
   - ☑️ Background fetch
   - ☑️ Remote notifications

#### 4. ทดสอบบน iOS
```bash
# Build และรันบน iOS (ต้องใช้ Mac)
npx cap sync ios
npx cap run ios
```

---

### 🔧 การใช้งานใน Code

#### เปิดใช้งาน Push Notifications (Native + Web)

```typescript
import { usePushNotification } from '@/hooks/usePushNotification';

const MyComponent = () => {
  const {
    isSupported,      // รองรับหรือไม่
    isSubscribed,     // subscribe แล้วหรือยัง
    loading,          // กำลังโหลด
    subscribe,        // เปิดใช้งาน
    unsubscribe,      // ปิดใช้งาน
    updateLocation    // อัปเดตตำแหน่ง
  } = usePushNotification();

  // เปิดใช้งาน push notifications
  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      console.log('✅ Push notifications enabled');
    }
  };

  // ปิดใช้งาน
  const handleDisable = async () => {
    await unsubscribe();
  };

  // อัปเดตตำแหน่ง
  const handleLocationUpdate = async (lat: number, lon: number) => {
    await updateLocation(lat, lon);
  };

  return (
    <button onClick={handleEnable} disabled={!isSupported || loading}>
      {isSubscribed ? 'ปิดการแจ้งเตือน' : 'เปิดการแจ้งเตือน'}
    </button>
  );
};
```

#### เปิดใช้งาน Background Location Tracking

```typescript
import { backgroundGeolocationService } from '@/services/BackgroundGeolocationService';
import { NotificationService } from '@/services/NotificationService';

// Initialize notification service
await NotificationService.initialize();

// Start background tracking
await backgroundGeolocationService.start(
  {
    distanceFilter: 100, // Update every 100 meters
    desiredAccuracy: 10,  // 10 meters accuracy
    interval: 300000      // Check every 5 minutes
  },
  (location) => {
    console.log('New location:', location);
    // Handle location update
  }
);

// Stop tracking
await backgroundGeolocationService.stop();
```

#### ส่ง Notification พร้อม Vibration

```typescript
import { NotificationService } from '@/services/NotificationService';

const notificationData = NotificationService.buildNotificationData(
  85,              // PM2.5 value
  'Bangkok',       // Location
  true,            // Is high risk user
  30               // Recommended outdoor time (minutes)
);

await NotificationService.sendAlert(notificationData);
```

---

### 🧪 การทดสอบ

#### ทดสอบ Background Location
1. เปิดแอปและเปิดใช้งาน Background Tracking
2. กด Home button หรือปิดหน้าจอ
3. เดินหรือเคลื่อนที่ให้เกิน distance filter (100 เมตร)
4. ตรวจสอบ notification ว่าปรากฏขึ้นหรือไม่

#### ทดสอบ Vibration & Notification
1. เปิดแอปและกำหนดค่า PM2.5 threshold ต่ำ (เช่น 25)
2. เข้าพื้นที่ที่มีค่าฝุ่นสูงกว่าเกณฑ์
3. ตรวจสอบว่าเครื่องสั่นและมี notification แสดง

---

### ⚠️ ข้อควรระวัง

#### Battery Usage
- Background location tracking ใช้พลังงานแบตเตอรี่สูง
- ใช้ `distanceFilter` เพื่อลดความถี่ในการอัปเดต
- พิจารณาใช้ `desiredAccuracy` ที่ต่ำลง (10-100 เมตร) แทน high accuracy

#### iOS Restrictions
- iOS มีข้อจำกัดมากกว่า Android สำหรับ background location
- ระบบอาจหยุด background tracking หากไม่ได้ใช้งานนาน
- ต้องขออนุญาต "Always Allow" จากผู้ใช้

#### Android Restrictions (Android 10+)
- ต้องใช้ Foreground Service พร้อม notification
- ต้องขอสิทธิ์ ACCESS_BACKGROUND_LOCATION แยกต่างหาก
- ผู้ใช้ต้องอนุญาตใน Settings → Apps → Permissions

---

### 📚 เอกสารเพิ่มเติม

- [Capacitor Geolocation Plugin](https://capacitorjs.com/docs/apis/geolocation)
- [Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications)
- [Android Background Location Limits](https://developer.android.com/about/versions/10/privacy/changes#app-access-device-location)
- [iOS Background Execution](https://developer.apple.com/documentation/uikit/app_and_environment/scenes/preparing_your_ui_to_run_in_the_background)

---

### 🆘 การแก้ไขปัญหา

#### Location Permission ไม่ได้รับอนุญาต
```typescript
// ตรวจสอบสิทธิ์
const permission = await Geolocation.checkPermissions();
console.log('Location permission:', permission);

// ขอสิทธิ์ใหม่
const request = await Geolocation.requestPermissions();
```

#### Notification ไม่แสดง
```typescript
// ตรวจสอบสิทธิ์ notification
const hasPermission = NotificationService.hasPermission();
if (!hasPermission) {
  await NotificationService.initialize();
}
```

#### Background ทำงานไม่ต่อเนื่อง
- ตรวจสอบว่าได้เพิ่ม Background Modes ใน capabilities แล้ว
- ตรวจสอบ Battery Optimization settings ของระบบ
- ใช้ Foreground Service บน Android
