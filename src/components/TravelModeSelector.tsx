/**
 * Travel Mode Selector Component
 * 
 * Allows users to select transportation mode with visual feedback
 * Shows risk impact for each mode
 * 
 * @version 1.0.0
 */

import { TRAVEL_MODIFIERS, type TravelMode } from '@/config/constants';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TravelModeSelectorProps {
  value: TravelMode;
  onChange: (mode: TravelMode) => void;
  showRiskImpact?: boolean;
  baseRisk?: number;
  disabled?: boolean;
  className?: string;
}

const TRAVEL_MODES: TravelMode[] = [
  'walking',
  'cycling',
  'motorcycle',
  'car',
  'bus',
  'bts_mrt',
];

export const TravelModeSelector = ({
  value,
  onChange,
  showRiskImpact = false,
  baseRisk = 50,
  disabled = false,
  className,
}: TravelModeSelectorProps) => {
  const getRiskBadge = (mode: TravelMode) => {
    const modifier = TRAVEL_MODIFIERS[mode].modifier;
    const riskChange = Math.round((modifier - 1) * baseRisk);
    
    if (riskChange > 10) {
      return <Badge variant="destructive" className="text-[10px] px-1">+{riskChange}%</Badge>;
    } else if (riskChange < -5) {
      return <Badge className="bg-success text-[10px] px-1">{riskChange}%</Badge>;
    }
    return null;
  };

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {TRAVEL_MODES.map((mode) => {
        const info = TRAVEL_MODIFIERS[mode];
        const isSelected = value === mode;
        
        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode)}
            className={cn(
              'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
              'hover:scale-105 hover:shadow-md',
              isSelected 
                ? 'border-primary bg-primary/10 shadow-sm' 
                : 'border-border bg-card hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="text-2xl">{info.icon}</span>
            <span className={cn(
              'text-xs font-medium',
              isSelected ? 'text-primary' : 'text-foreground'
            )}>
              {info.label}
            </span>
            {showRiskImpact && getRiskBadge(mode)}
          </button>
        );
      })}
    </div>
  );
};

export default TravelModeSelector;
