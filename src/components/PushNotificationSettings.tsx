import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Smartphone, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';
import { useToast } from '@/hooks/use-toast';

export const PushNotificationSettings = () => {
  const { 
    isSupported, 
    isSubscribed, 
    loading, 
    subscribe, 
    unsubscribe,
    triggerSync
  } = usePushNotification();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const success = await triggerSync();
      if (success) {
        toast({
          title: '✅ ตรวจสอบคุณภาพอากาศแล้ว',
          description: 'ระบบจะแจ้งเตือนหากค่าฝุ่นเปลี่ยนแปลง',
        });
      } else {
        toast({
          title: '⚠️ ไม่สามารถตรวจสอบได้',
          description: 'กรุณาลองใหม่อีกครั้ง',
          variant: 'destructive',
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            อุปกรณ์หรือเบราว์เซอร์ของคุณไม่รองรับ Push Notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              สำหรับ Web: ใช้ Chrome, Firefox หรือ Edge เวอร์ชันล่าสุด<br />
              สำหรับ Native: ตรวจสอบ permissions ในการตั้งค่าอุปกรณ์
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          รับการแจ้งเตือนแบบ Real-time เมื่อค่าฝุ่นเปลี่ยนแปลง (แม้ปิดแอป)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">เปิดใช้งาน Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              แจ้งเตือนผ่าน browser แม้ปิดแอป
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          <span className="text-sm font-medium">สถานะ:</span>
          {isSubscribed ? (
            <Badge variant="default" className="bg-green-600">
              <Check className="h-3 w-3 mr-1" />
              เปิดใช้งานอยู่
            </Badge>
          ) : (
            <Badge variant="secondary">ปิดใช้งาน</Badge>
          )}
        </div>

        {/* Background Sync Info */}
        {isSubscribed && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">🔄 การตรวจสอบอัตโนมัติ</p>
            </div>
            <p className="text-sm text-muted-foreground">
              ระบบจะตรวจสอบค่า AQI ทุก 15 นาที และแจ้งเตือนเมื่อค่าเปลี่ยนแปลง
              แม้คุณปิดแอปหรือเบราว์เซอร์
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualSync}
              disabled={syncing}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'กำลังตรวจสอบ...' : 'ตรวจสอบตอนนี้'}
            </Button>
          </div>
        )}

        {/* Info Section */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">🔔 การทำงานของ Push Notifications</p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>ได้รับการแจ้งเตือนแบบ Real-time</li>
            <li>ทำงานแม้ปิดแอปหรือปิดเบราว์เซอร์</li>
            <li>ตรวจสอบ AQI ทุก 15 นาที โดยอัตโนมัติ</li>
            <li>มีการสั่นเครื่องตามระดับความรุนแรง</li>
            <li>แจ้งเตือนเมื่อ PM2.5 &gt; 50 µg/m³</li>
            <li>แจ้งเตือนเมื่อค่าฝุ่นเพิ่มขึ้น &gt; 20 µg/m³</li>
          </ul>
        </div>

        {/* Test Notification Button */}
        {isSubscribed && (
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🧪 ทดสอบการแจ้งเตือน', {
                  body: 'นี่คือการแจ้งเตือนทดสอบ - ระบบทำงานปกติ',
                  icon: '/icon-192.png',
                  vibrate: [300, 100, 300] as any
                } as NotificationOptions);
              }
            }}
          >
            <Bell className="h-4 w-4 mr-2" />
            ทดสอบการแจ้งเตือน
          </Button>
        )}

        {/* Browser/Platform Compatibility Info */}
        <div className="rounded-lg bg-primary/5 p-4 space-y-1">
          <p className="text-sm font-medium">ℹ️ ความเข้ากันได้</p>
          <p className="text-xs text-muted-foreground">
            ✅ <strong>Native App</strong> (Android/iOS) - รองรับเต็มรูปแบบ
            <br />
            ✅ <strong>Web PWA</strong> (Chrome/Edge Android) - แจ้งเตือนแม้ปิดแอป
            <br />
            ⚠️ <strong>iOS Web</strong> - ต้อง Add to Home Screen + iOS 16.4+
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
