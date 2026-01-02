/**
 * Risk Gauge Component
 * 
 * Visual representation of PHRI score (0-10 scale) with animated gauge
 * Thresholds: <3 = Safe, 3-6 = Warning, >6 = Dangerous
 * 
 * @version 2.0.0 - Updated for PHRI 0-10 scale
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PHRI_CATEGORIES } from '@/config/constants';

interface RiskGaugeProps {
  score: number; // 0-10 PHRI scale
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export const RiskGauge = ({
  score,
  size = 'md',
  showLabel = true,
  animated = true,
  className,
}: RiskGaugeProps) => {
  const sizeConfig = {
    sm: { width: 80, strokeWidth: 6, fontSize: 'text-lg' },
    md: { width: 120, strokeWidth: 8, fontSize: 'text-2xl' },
    lg: { width: 160, strokeWidth: 10, fontSize: 'text-4xl' },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = radius * Math.PI; // Semi-circle
  // Score is 0-10, so divide by 10 for percentage
  const offset = circumference - (score / 10) * circumference;

  const { category, color, label } = useMemo(() => {
    // PHRI 0-10 scale: <3 = Safe, 3-6 = Warning, >6 = Dangerous
    if (score < 3) {
      return { category: 'SAFE', color: 'stroke-success', label: PHRI_CATEGORIES.SAFE.label };
    }
    if (score <= 6) {
      return { category: 'WARNING', color: 'stroke-warning', label: PHRI_CATEGORIES.WARNING.label };
    }
    return { category: 'DANGER', color: 'stroke-destructive', label: PHRI_CATEGORIES.DANGER.label };
  }, [score]);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: config.width, height: config.width / 2 + 20 }}>
        <svg
          width={config.width}
          height={config.width / 2 + 10}
          viewBox={`0 0 ${config.width} ${config.width / 2 + 10}`}
          className="transform -rotate-0"
        >
          {/* Background arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${config.width / 2} 
                A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-muted/30"
            strokeLinecap="round"
          />
          
          {/* Colored arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${config.width / 2} 
                A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
            fill="none"
            strokeWidth={config.strokeWidth}
            className={cn(color, animated && 'transition-all duration-1000')}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: animated ? 'stroke-dashoffset 1s ease-out' : 'none',
            }}
          />
          
          {/* PHRI 0-10 scale markers */}
          {[0, 3, 6, 10].map((tick) => {
            const angle = (tick / 10) * Math.PI;
            const x = config.width / 2 - Math.cos(angle) * (radius + 12);
            const y = config.width / 2 - Math.sin(angle) * (radius + 12);
            return (
              <text
                key={tick}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[8px]"
              >
                {tick}
              </text>
            );
          })}
        </svg>

        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className={cn(config.fontSize, 'font-bold', color.replace('stroke-', 'text-'))}>
            {score.toFixed(1)}
          </span>
          {showLabel && (
            <span className="text-xs text-muted-foreground mt-1">{label}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskGauge;
