/**
 * Risk Gauge Component
 * 
 * Visual representation of risk score with animated gauge
 * 
 * @version 1.0.0
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { RISK_CATEGORIES } from '@/config/constants';

interface RiskGaugeProps {
  score: number;
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
  const offset = circumference - (score / 100) * circumference;

  const { category, color, label } = useMemo(() => {
    if (score <= RISK_CATEGORIES.LOW.max) {
      return { category: 'LOW', color: 'stroke-success', label: RISK_CATEGORIES.LOW.label };
    }
    if (score <= RISK_CATEGORIES.MODERATE.max) {
      return { category: 'MODERATE', color: 'stroke-warning', label: RISK_CATEGORIES.MODERATE.label };
    }
    if (score <= RISK_CATEGORIES.HIGH.max) {
      return { category: 'HIGH', color: 'stroke-destructive', label: RISK_CATEGORIES.HIGH.label };
    }
    return { category: 'SEVERE', color: 'stroke-destructive', label: RISK_CATEGORIES.SEVERE.label };
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
          
          {/* Gradient markers */}
          {[0, 25, 50, 75, 100].map((tick, i) => {
            const angle = (tick / 100) * Math.PI;
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
            {Math.round(score)}
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
