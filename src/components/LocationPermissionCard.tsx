import { motion } from 'framer-motion';
import { MapPin, Navigation, Loader2, AlertTriangle, CheckCircle2, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { PermissionStatus, LocationData } from '@/hooks/useLocationPermission';
import { cn } from '@/lib/utils';

interface LocationPermissionCardProps {
  permissionStatus: PermissionStatus;
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  onRequestPermission: () => void;
  onRefresh: () => void;
  onFlyToLocation?: () => void;
}

export const LocationPermissionCard = ({
  permissionStatus,
  location,
  loading,
  error,
  onRequestPermission,
  onRefresh,
  onFlyToLocation
}: LocationPermissionCardProps) => {
  const { t } = useLanguage();

  const getStatusConfig = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          icon: CheckCircle2,
          color: 'text-success',
          bg: 'from-success/20 to-success/5',
          glow: 'shadow-glow-mint',
          title: t('location.granted.title') || 'ระบุตำแหน่งสำเร็จ',
          description: t('location.granted.description') || 'แอปสามารถเข้าถึงตำแหน่งของคุณได้'
        };
      case 'denied':
        return {
          icon: AlertTriangle,
          color: 'text-destructive',
          bg: 'from-destructive/20 to-destructive/5',
          glow: 'shadow-glow-alert',
          title: t('location.denied.title') || 'ไม่ได้รับอนุญาต',
          description: t('location.denied.description') || 'กรุณาเปิดการเข้าถึงตำแหน่งในการตั้งค่า'
        };
      case 'prompt':
      case 'checking':
      default:
        return {
          icon: MapPin,
          color: 'text-primary',
          bg: 'from-primary/20 to-primary/5',
          glow: 'shadow-glow-primary',
          title: t('location.prompt.title') || 'ขออนุญาตเข้าถึงตำแหน่ง',
          description: t('location.prompt.description') || 'เพื่อแสดงคุณภาพอากาศในพื้นที่ของคุณ'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn(
        "p-5 border-0 overflow-hidden relative",
        "bg-gradient-to-r", config.bg,
        config.glow
      )}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-2xl" />
        
        <div className="flex items-start gap-4 relative z-10">
          <motion.div
            animate={loading ? { rotate: 360 } : { scale: [1, 1.1, 1] }}
            transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 2, repeat: Infinity }}
            className={cn(
              "p-3 rounded-2xl bg-card/60 backdrop-blur-sm",
              config.glow
            )}
          >
            {loading ? (
              <Loader2 className={cn("h-6 w-6 animate-spin", config.color)} />
            ) : (
              <Icon className={cn("h-6 w-6", config.color)} />
            )}
          </motion.div>

          <div className="flex-1">
            <h3 className={cn("font-semibold text-base", config.color)}>
              {config.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {config.description}
            </p>

            {/* Show current location if granted */}
            {permissionStatus === 'granted' && location && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-3 bg-card/60 rounded-xl"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    {t('location.current') || 'ตำแหน่งปัจจุบัน'}:
                  </span>
                </div>
                <div className="mt-1 font-mono text-xs text-foreground">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </div>
                {location.accuracy && (
                  <Badge variant="secondary" className="mt-2 text-[10px]">
                    {t('location.accuracy') || 'ความแม่นยำ'}: ±{Math.round(location.accuracy)}m
                  </Badge>
                )}
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive mt-2"
              >
                {error}
              </motion.p>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              {permissionStatus === 'granted' ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRefresh}
                    disabled={loading}
                    className="text-xs"
                  >
                    <Navigation className="h-3.5 w-3.5 mr-1.5" />
                    {t('location.refresh') || 'รีเฟรชตำแหน่ง'}
                  </Button>
                  {onFlyToLocation && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={onFlyToLocation}
                      className="text-xs bg-primary hover:bg-primary/90"
                    >
                      <MapPin className="h-3.5 w-3.5 mr-1.5" />
                      {t('map.flyToLocation') || 'ไปที่ตำแหน่งของฉัน'}
                    </Button>
                  )}
                </>
              ) : permissionStatus === 'denied' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Open device settings on mobile
                    if (typeof window !== 'undefined' && 'open' in window) {
                      // Try to open settings (works on some platforms)
                      onRequestPermission();
                    }
                  }}
                  className="text-xs"
                >
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  {t('location.openSettings') || 'เปิดการตั้งค่า'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onRequestPermission}
                  disabled={loading}
                  className="text-xs bg-primary hover:bg-primary/90"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {t('location.allow') || 'อนุญาตตำแหน่ง'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
