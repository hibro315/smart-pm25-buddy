import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface OnlineStatusBadgeProps {
  showConnectionType?: boolean;
  compact?: boolean;
  className?: string;
}

export const OnlineStatusBadge = ({ 
  showConnectionType = false, 
  compact = false,
  className 
}: OnlineStatusBadgeProps) => {
  const { isOnline, wasOffline, connectionType } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true);
      toast.success('กลับมาออนไลน์แล้ว', {
        description: 'การเชื่อมต่ออินเทอร์เน็ตกลับมาใช้งานได้',
        duration: 3000,
      });
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline]);

  useEffect(() => {
    if (!isOnline) {
      toast.warning('ออฟไลน์', {
        description: 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต บางฟีเจอร์อาจไม่ทำงาน',
        duration: 5000,
      });
    }
  }, [isOnline]);

  const getConnectionLabel = () => {
    if (!connectionType) return null;
    switch (connectionType) {
      case '4g': return '4G';
      case '3g': return '3G';
      case '2g': return '2G';
      case 'slow-2g': return 'Slow';
      case 'wifi': return 'WiFi';
      default: return connectionType.toUpperCase();
    }
  };

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
          isOnline 
            ? showReconnected 
              ? "bg-success/20 text-success animate-pulse" 
              : "bg-success/10 text-success"
            : "bg-destructive/20 text-destructive animate-pulse",
          className
        )}
      >
        {isOnline ? (
          <Wifi className="w-3 h-3" />
        ) : (
          <WifiOff className="w-3 h-3" />
        )}
        {showConnectionType && connectionType && (
          <span>{getConnectionLabel()}</span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
        isOnline 
          ? showReconnected
            ? "bg-success/10 border-success/30 text-success"
            : "bg-muted/50 border-border text-muted-foreground"
          : "bg-destructive/10 border-destructive/30 text-destructive animate-pulse",
        className
      )}
    >
      {isOnline ? (
        <>
          <div className="relative">
            <Wifi className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full" />
          </div>
          <span className="text-sm font-medium">
            {showReconnected ? 'กลับมาออนไลน์' : 'ออนไลน์'}
          </span>
          {showConnectionType && connectionType && (
            <span className="flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded">
              <Signal className="w-3 h-3" />
              {getConnectionLabel()}
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">ออฟไลน์</span>
        </>
      )}
    </div>
  );
};
