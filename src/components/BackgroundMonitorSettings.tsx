import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { MapPin, Activity, AlertTriangle } from 'lucide-react';
import { useBackgroundGeolocation } from '@/hooks/useBackgroundGeolocation';
import { Capacitor } from '@capacitor/core';

export const BackgroundMonitorSettings = () => {
  const [enabled, setEnabled] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState(100); // meters
  const [pm25Threshold, setPm25Threshold] = useState(50); // PM2.5 threshold

  const { isTracking, lastUpdate, error } = useBackgroundGeolocation({
    enabled,
    distanceFilter,
    pm25Threshold
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedEnabled = localStorage.getItem('background-monitoring-enabled');
    const savedDistance = localStorage.getItem('background-monitoring-distance');
    const savedThreshold = localStorage.getItem('background-monitoring-threshold');

    if (savedEnabled) setEnabled(savedEnabled === 'true');
    if (savedDistance) setDistanceFilter(parseInt(savedDistance));
    if (savedThreshold) setPm25Threshold(parseInt(savedThreshold));
  }, []);

  // Save settings to localStorage
  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    localStorage.setItem('background-monitoring-enabled', checked.toString());
  };

  const handleDistanceChange = (value: number[]) => {
    const newDistance = value[0];
    setDistanceFilter(newDistance);
    localStorage.setItem('background-monitoring-distance', newDistance.toString());
  };

  const handleThresholdChange = (value: number[]) => {
    const newThreshold = value[0];
    setPm25Threshold(newThreshold);
    localStorage.setItem('background-monitoring-threshold', newThreshold.toString());
  };

  // Format PM2.5 value with color
  const getPM25Color = (pm25?: number) => {
    if (!pm25) return 'text-muted-foreground';
    if (pm25 <= 25) return 'text-green-600';
    if (pm25 <= 50) return 'text-yellow-600';
    if (pm25 <= 100) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPM25Category = (pm25?: number) => {
    if (!pm25) return 'ไม่ทราบ';
    if (pm25 <= 25) return 'ดีมาก';
    if (pm25 <= 50) return 'ดี';
    if (pm25 <= 100) return 'ปานกลาง';
    if (pm25 <= 150) return 'ไม่ดี';
    return 'อันตราย';
  };

  if (!Capacitor.isNativePlatform()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            ติดตามตำแหน่งเบื้องหลัง
          </CardTitle>
          <CardDescription>
            ฟีเจอร์นี้ใช้งานได้เฉพาะบน iOS และ Android เท่านั้น
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            กรุณาใช้งานแอปบนมือถือเพื่อเปิดใช้งานการติดตามตำแหน่งเบื้องหลัง
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          ติดตามตำแหน่งเบื้องหลัง
        </CardTitle>
        <CardDescription>
          ติดตามคุณภาพอากาศอัตโนมัติเมื่อคุณเคลื่อนที่ แม้ปิดแอป
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="background-tracking">เปิดใช้งานการติดตาม</Label>
            <p className="text-sm text-muted-foreground">
              แจ้งเตือนเมื่อค่าฝุ่นเปลี่ยนแปลง
            </p>
          </div>
          <Switch
            id="background-tracking"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-medium">สถานะ:</span>
          {isTracking ? (
            <Badge variant="default" className="bg-green-600">
              กำลังติดตาม
            </Badge>
          ) : (
            <Badge variant="secondary">หยุดติดตาม</Badge>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Last Update Display */}
        {lastUpdate && (
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ค่าฝุ่นล่าสุด</span>
              <Badge variant="outline" className={getPM25Color(lastUpdate.pm25)}>
                PM2.5: {lastUpdate.pm25} µg/m³
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">หมวดหมู่</span>
              <span className={`text-xs font-medium ${getPM25Color(lastUpdate.pm25)}`}>
                {getPM25Category(lastUpdate.pm25)}
              </span>
            </div>
            {lastUpdate.location && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {lastUpdate.location}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Distance Filter Setting */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="distance-filter">ระยะทางก่อนตรวจสอบใหม่</Label>
            <span className="text-sm font-medium">{distanceFilter} เมตร</span>
          </div>
          <Slider
            id="distance-filter"
            min={50}
            max={500}
            step={50}
            value={[distanceFilter]}
            onValueChange={handleDistanceChange}
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground">
            ตรวจสอบค่าฝุ่นใหม่เมื่อเคลื่อนที่ห่างจากตำแหน่งเดิม {distanceFilter} เมตร
          </p>
        </div>

        {/* PM2.5 Threshold Setting */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pm25-threshold">เกณฑ์แจ้งเตือน PM2.5</Label>
            <span className="text-sm font-medium">{pm25Threshold} µg/m³</span>
          </div>
          <Slider
            id="pm25-threshold"
            min={25}
            max={150}
            step={25}
            value={[pm25Threshold]}
            onValueChange={handleThresholdChange}
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground">
            แจ้งเตือนเมื่อค่า PM2.5 เกิน {pm25Threshold} µg/m³ หรือเพิ่มขึ้นกะทันหัน
          </p>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-primary/5 p-4 space-y-1">
          <p className="text-sm font-medium">💡 เคล็ดลับ</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>แอปจะสั่นเครื่องเมื่อค่าฝุ่นเพิ่มขึ้น</li>
            <li>รับการแจ้งเตือนแม้ปิดแอป</li>
            <li>ประวัติการตรวจสอบถูกบันทึกอัตโนมัติ</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
