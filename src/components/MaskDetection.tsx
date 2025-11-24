import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Camera, CameraOff, Shield, AlertTriangle, CheckCircle2, Loader2, Users } from 'lucide-react';
import { useMaskDetection } from '@/hooks/useMaskDetection';
import { useToast } from '@/hooks/use-toast';
import { LocalNotifications } from '@capacitor/local-notifications';

interface MaskDetectionProps {
  pm25?: number;
  onMaskStatusDetected?: (wearingMask: boolean) => void;
}

export const MaskDetection = ({ pm25 = 0, onMaskStatusDetected }: MaskDetectionProps) => {
  const [enabled, setEnabled] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { toast } = useToast();

  const { 
    result, 
    isLoading, 
    error, 
    isActive,
    videoElement,
    detectOnce
  } = useMaskDetection({
    enabled,
    intervalMs: 2000,
    onMaskStatusChange: async (wearingMask) => {
      console.log('Mask status changed:', wearingMask);
      
      // Callback to parent component
      if (onMaskStatusDetected) {
        onMaskStatusDetected(wearingMask);
      }

      // Send notification if not wearing mask and PM2.5 is high
      if (!wearingMask && pm25 > 37 && notificationsEnabled) {
        await sendMaskWarningNotification();
      }
    }
  });

  const sendMaskWarningNotification = async () => {
    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') return;

      let title = '⚠️ เตือน: ไม่ได้สวมหน้ากาก';
      let body = 'ตรวจพบว่าคุณไม่ได้สวมหน้ากาก';

      if (pm25 > 90) {
        title = '🚨 อันตราย! ไม่ได้สวมหน้ากาก';
        body = `ค่า PM2.5 อยู่ที่ ${pm25} µg/m³ (อันตราย) - กรุณาสวมหน้ากาก N95 ก่อนออกนอกอาคาร!`;
      } else if (pm25 > 50) {
        title = '⚠️ คำเตือน: ไม่ได้สวมหน้ากาก';
        body = `ค่า PM2.5 อยู่ที่ ${pm25} µg/m³ (สูง) - แนะนำให้สวมหน้ากากเมื่ออยู่กลางแจ้ง`;
      }

      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 100) },
          sound: 'default',
          actionTypeId: '',
          extra: null
        }]
      });
    } catch (error) {
      console.error('Error sending mask warning notification:', error);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // Request camera permission
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setEnabled(true);
        toast({
          title: 'เปิดการตรวจจับหน้ากาก',
          description: 'กำลังเริ่มต้นระบบ AI...',
        });
      } catch (err: any) {
        toast({
          title: 'ไม่สามารถเข้าถึงกล้องได้',
          description: 'กรุณาอนุญาตการใช้งานกล้องในการตั้งค่าเบราว์เซอร์',
          variant: 'destructive',
        });
      }
    } else {
      setEnabled(false);
      setShowVideo(false);
      toast({
        title: 'ปิดการตรวจจับหน้ากาก',
        description: 'หยุดการทำงานของระบบ AI',
      });
    }
  };

  const getMaskStatusColor = () => {
    if (!result?.hasFace) return 'default';
    return result.wearingMask ? 'success' : 'destructive';
  };

  const getMaskStatusIcon = () => {
    if (!result?.hasFace) return <Users className="h-4 w-4" />;
    return result.wearingMask ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />;
  };

  const getMaskStatusText = () => {
    if (!result?.hasFace) return 'ไม่พบใบหน้า';
    return result.wearingMask ? 'สวมหน้ากากแล้ว' : 'ไม่ได้สวมหน้ากาก';
  };

  // Show warning if high PM2.5 and not wearing mask
  const shouldShowWarning = result?.hasFace && !result?.wearingMask && pm25 > 37;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>ตรวจจับการสวมหน้ากาก AI</CardTitle>
          </div>
          <Badge variant={isActive ? 'default' : 'outline'}>
            {isActive ? 'กำลังทำงาน' : 'ปิดอยู่'}
          </Badge>
        </div>
        <CardDescription>
          ใช้ AI ตรวจจับใบหน้าและการสวมหน้ากากแบบเรียลไทม์
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {enabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5 text-muted-foreground" />}
            <Label htmlFor="mask-detection" className="cursor-pointer">
              เปิดการตรวจจับหน้ากาก
            </Label>
          </div>
          <Switch
            id="mask-detection"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">กำลังโหลด AI model...</span>
          </div>
        )}

        {/* Detection Result */}
        {isActive && result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {getMaskStatusIcon()}
                <div>
                  <p className="font-medium">{getMaskStatusText()}</p>
                  <p className="text-xs text-muted-foreground">
                    ความมั่นใจ: {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <Badge variant={getMaskStatusColor() as any}>
                {result.faceCount} ใบหน้า
              </Badge>
            </div>

            {/* Warning for high PM2.5 */}
            {shouldShowWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-semibold">
                    ⚠️ ค่า PM2.5 สูง ({pm25.toFixed(1)} µg/m³)
                  </p>
                  <p className="text-sm">
                    คุณควรสวมหน้ากาก N95 ก่อนออกนอกอาคาร
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Video Preview Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowVideo(!showVideo)}
              className="w-full"
            >
              {showVideo ? 'ซ่อนภาพกล้อง' : 'แสดงภาพกล้อง'}
            </Button>

            {/* Video Preview */}
            {showVideo && videoElement && (
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={(el) => {
                    if (el && videoElement) {
                      el.srcObject = videoElement.srcObject;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                />
                {result.hasFace && (
                  <div className="absolute top-4 right-4">
                    <Badge variant={result.wearingMask ? 'default' : 'destructive'}>
                      {getMaskStatusText()}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Notification Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <Label htmlFor="mask-notifications" className="cursor-pointer text-sm">
                แจ้งเตือนเมื่อไม่สวมหน้ากาก
              </Label>
              <Switch
                id="mask-notifications"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
          </div>
        )}

        {/* Instructions when disabled */}
        {!enabled && !isLoading && (
          <div className="text-center py-8 text-muted-foreground space-y-2">
            <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">เปิดการตรวจจับเพื่อเริ่มใช้งาน</p>
            <p className="text-xs">
              ระบบจะใช้กล้องหน้าตรวจจับใบหน้าและการสวมหน้ากาก
            </p>
          </div>
        )}

        {/* Important Note */}
        <Alert>
          <AlertDescription className="text-xs space-y-1">
            <p className="font-semibold">หมายเหตุสำคัญ:</p>
            <p>• การตรวจจับทำงานเฉพาะเมื่อแอปเปิดอยู่</p>
            <p>• ระบบไม่สามารถใช้กล้องเมื่อหน้าจอปิดหรือแอปอยู่ background</p>
            <p>• ใช้ BlazeFace AI model สำหรับตรวจจับใบหน้า</p>
            <p>• ข้อมูลประมวลผลบนอุปกรณ์ของคุณ (ไม่ส่งไปเซิร์ฟเวอร์)</p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
