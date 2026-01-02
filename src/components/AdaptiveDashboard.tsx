/**
 * Adaptive Dashboard Container
 * 
 * A living dashboard that transforms based on health state:
 * - Calm: Relaxed, spacious, green accents
 * - Alert: Elevated attention, yellow warnings
 * - Warning: Urgent, orange focus
 * - Emergency: Critical mode, red alerts, minimal distractions
 */

import React, { useMemo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  HealthState, 
  phriToHealthState, 
  getHealthStateStyles,
  useHealthAnimationClasses 
} from '@/engine/HealthStateAnimationEngine';
import { Shield, AlertTriangle, AlertOctagon, Heart } from 'lucide-react';

interface AdaptiveDashboardProps {
  phri: number;
  children: React.ReactNode;
  showStateIndicator?: boolean;
  enableAnimations?: boolean;
  className?: string;
}

interface StateIndicatorConfig {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  gradient: string;
}

const STATE_INDICATORS: Record<HealthState, StateIndicatorConfig> = {
  calm: {
    icon: <Heart className="h-5 w-5" />,
    label: 'สถานะปกติ',
    sublabel: 'อากาศดี เหมาะแก่การทำกิจกรรม',
    gradient: 'from-success/20 to-success/5',
  },
  alert: {
    icon: <Shield className="h-5 w-5" />,
    label: 'ระวังเล็กน้อย',
    sublabel: 'กลุ่มเสี่ยงควรลดกิจกรรมกลางแจ้ง',
    gradient: 'from-warning/20 to-warning/5',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    label: 'ต้องระวัง',
    sublabel: 'ควรสวมหน้ากากเมื่อออกนอกบ้าน',
    gradient: 'from-orange-500/20 to-orange-500/5',
  },
  emergency: {
    icon: <AlertOctagon className="h-5 w-5" />,
    label: 'สถานการณ์วิกฤต',
    sublabel: 'หลีกเลี่ยงการออกนอกบ้าน',
    gradient: 'from-destructive/20 to-destructive/5',
  },
};

const STATE_BORDER_COLORS: Record<HealthState, string> = {
  calm: 'border-success/30',
  alert: 'border-warning/40',
  warning: 'border-orange-500/50',
  emergency: 'border-destructive/60',
};

const STATE_BG_PATTERNS: Record<HealthState, string> = {
  calm: 'bg-gradient-to-br from-success/5 via-transparent to-background',
  alert: 'bg-gradient-to-br from-warning/8 via-transparent to-background',
  warning: 'bg-gradient-to-br from-orange-500/10 via-transparent to-background',
  emergency: 'bg-gradient-to-br from-destructive/12 via-transparent to-background',
};

export const AdaptiveDashboard: React.FC<AdaptiveDashboardProps> = ({
  phri,
  children,
  showStateIndicator = true,
  enableAnimations = true,
  className,
}) => {
  const healthState = useMemo(() => phriToHealthState(phri), [phri]);
  const [previousState, setPreviousState] = useState<HealthState>(healthState);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Detect state changes for transition animations
  useEffect(() => {
    if (healthState !== previousState) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setPreviousState(healthState);
        setIsTransitioning(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [healthState, previousState]);

  const animationClasses = useHealthAnimationClasses(healthState, {
    enablePulse: enableAnimations && healthState !== 'calm',
    enableGlow: enableAnimations,
    enableBreathing: enableAnimations,
  });

  const stateConfig = STATE_INDICATORS[healthState];
  const stateStyles = getHealthStateStyles(healthState);

  return (
    <div 
      className={cn(
        'min-h-screen transition-all duration-700 ease-out',
        STATE_BG_PATTERNS[healthState],
        className
      )}
    >
      {/* Animated State Banner */}
      {showStateIndicator && (
        <div 
          className={cn(
            'sticky top-0 z-20 transition-all duration-500',
            isTransitioning && 'animate-expansion'
          )}
        >
          <div 
            className={cn(
              'mx-4 mt-4 p-4 rounded-2xl border-2 backdrop-blur-sm',
              'bg-gradient-to-r',
              stateConfig.gradient,
              STATE_BORDER_COLORS[healthState],
              enableAnimations && animationClasses
            )}
            style={enableAnimations ? stateStyles : undefined}
          >
            <div className="flex items-center gap-4">
              {/* Animated Icon */}
              <div 
                className={cn(
                  'p-3 rounded-xl transition-all duration-300',
                  healthState === 'calm' && 'bg-success/20 text-success',
                  healthState === 'alert' && 'bg-warning/20 text-warning',
                  healthState === 'warning' && 'bg-orange-500/20 text-orange-500',
                  healthState === 'emergency' && 'bg-destructive/20 text-destructive',
                  enableAnimations && healthState !== 'calm' && 'animate-pulse'
                )}
              >
                {stateConfig.icon}
              </div>

              {/* State Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'font-display font-semibold',
                    healthState === 'calm' && 'text-success',
                    healthState === 'alert' && 'text-warning',
                    healthState === 'warning' && 'text-orange-500',
                    healthState === 'emergency' && 'text-destructive'
                  )}>
                    {stateConfig.label}
                  </span>
                  {/* PHRI Badge */}
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-mono font-bold',
                    healthState === 'calm' && 'bg-success/20 text-success',
                    healthState === 'alert' && 'bg-warning/20 text-warning',
                    healthState === 'warning' && 'bg-orange-500/20 text-orange-500',
                    healthState === 'emergency' && 'bg-destructive/20 text-destructive'
                  )}>
                    PHRI {phri.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {stateConfig.sublabel}
                </p>
              </div>

              {/* Animated Breathing Indicator */}
              {enableAnimations && (
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  healthState === 'calm' && 'bg-success breathing-calm',
                  healthState === 'alert' && 'bg-warning breathing-alert',
                  healthState === 'warning' && 'bg-orange-500 breathing-warning',
                  healthState === 'emergency' && 'bg-destructive breathing-emergency'
                )} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={cn(
        'transition-all duration-500',
        isTransitioning && 'opacity-95 scale-[0.995]'
      )}>
        {children}
      </div>

      {/* Emergency Overlay Effect */}
      {healthState === 'emergency' && enableAnimations && (
        <div 
          className="fixed inset-0 pointer-events-none z-10 animate-pulse-urgent"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 60%, hsl(var(--destructive) / 0.1) 100%)',
          }}
        />
      )}
    </div>
  );
};

export default AdaptiveDashboard;
