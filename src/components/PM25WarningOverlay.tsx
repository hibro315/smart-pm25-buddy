/**
 * PM2.5 Warning Overlay Component
 * 
 * Full-screen overlay for critical air quality alerts
 * Triggered when PM2.5 exceeds danger threshold
 * 
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, X, Shield, Wind, Home, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NOTIFICATION_CONFIG, PM25_THRESHOLDS } from '@/config/constants';
import { AnimatedAvatar } from './AnimatedAvatar';

interface PM25WarningOverlayProps {
  pm25: number;
  location?: string;
  onDismiss: () => void;
  onEmergencyContact?: () => void;
}

export const PM25WarningOverlay = ({
  pm25,
  location,
  onDismiss,
  onEmergencyContact,
}: PM25WarningOverlayProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState(30);

  // Auto-dismiss countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const getSeverityLevel = () => {
    if (pm25 >= NOTIFICATION_CONFIG.ALERT_THRESHOLDS.CRITICAL) {
      return { level: 'critical', label: 'วิกฤต', color: 'bg-red-600' };
    }
    if (pm25 >= NOTIFICATION_CONFIG.ALERT_THRESHOLDS.DANGER) {
      return { level: 'danger', label: 'อันตราย', color: 'bg-red-500' };
    }
    return { level: 'warning', label: 'เตือน', color: 'bg-orange-500' };
  };

  const severity = getSeverityLevel();

  const recommendations = [
    { icon: Home, text: 'อยู่ในอาคารที่มีเครื่องฟอกอากาศ' },
    { icon: Shield, text: 'สวมหน้ากาก N95 หากต้องออกนอกอาคาร' },
    { icon: Wind, text: 'ปิดหน้าต่างและประตู' },
  ];

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/80 backdrop-blur-sm',
        'animate-in fade-in duration-300'
      )}
    >
      <Card className={cn(
        'w-full max-w-md p-6 border-2 border-destructive',
        'animate-in zoom-in-95 duration-300',
        severity.level === 'critical' && 'animate-pulse'
      )}>
        {/* Close button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Alert header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4">
            <AnimatedAvatar state="warning" size="lg" />
            <Badge className={cn('absolute -bottom-1 -right-1', severity.color)}>
              {severity.label}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-bold">แจ้งเตือนคุณภาพอากาศ</h2>
          </div>

          {location && (
            <p className="text-sm text-muted-foreground">{location}</p>
          )}
        </div>

        {/* PM2.5 value */}
        <div className="bg-destructive/10 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">ค่า PM2.5 ปัจจุบัน</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold text-destructive">{pm25}</span>
            <span className="text-lg text-muted-foreground">µg/m³</span>
          </div>
          <p className="text-xs text-destructive mt-2">
            สูงกว่าเกณฑ์ปลอดภัย {Math.round((pm25 / PM25_THRESHOLDS.GOOD.max) * 100 - 100)}%
          </p>
        </div>

        {/* Recommendations */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium">คำแนะนำ:</p>
          {recommendations.map((rec, i) => (
            <div 
              key={i}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <rec.icon className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-sm">{rec.text}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button onClick={handleDismiss} className="w-full">
            รับทราบ ({countdown}s)
          </Button>
          
          {onEmergencyContact && (
            <Button 
              variant="outline" 
              onClick={onEmergencyContact}
              className="w-full gap-2 text-destructive border-destructive hover:bg-destructive hover:text-white"
            >
              <Phone className="w-4 h-4" />
              ติดต่อโรงพยาบาลใกล้เคียง
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PM25WarningOverlay;
