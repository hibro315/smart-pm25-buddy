/**
 * Travel Mode Recommender
 * 
 * Recommends travel modes with health-based reasoning.
 * Shows trade-offs for each option, never commands the user.
 * 
 * @version 2.0.0 - Futuristic Health Navigation
 */

import { useMemo } from 'react';
import { TRAVEL_MODIFIERS, type TravelMode } from '@/config/constants';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Footprints, 
  Bike, 
  Car, 
  Bus, 
  Train,
  Wind,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface TravelModeRecommenderProps {
  value: TravelMode;
  onChange: (mode: TravelMode) => void;
  currentPM25: number;
  routeDuration?: number;
  hasRespiratoryCondition?: boolean;
  className?: string;
}

interface ModeAnalysis {
  mode: TravelMode;
  icon: React.ReactNode;
  label: string;
  healthReason: string;
  tradeoff: string;
  riskModifier: number;
  isRecommended: boolean;
  isWarning: boolean;
}

const MODE_ICONS: Record<TravelMode, React.ReactNode> = {
  walking: <Footprints className="h-5 w-5" />,
  cycling: <Bike className="h-5 w-5" />,
  motorcycle: <Wind className="h-5 w-5" />,
  car: <Car className="h-5 w-5" />,
  bus: <Bus className="h-5 w-5" />,
  bts_mrt: <Train className="h-5 w-5" />,
  indoor: <Shield className="h-5 w-5" />,
};

const MODE_LABELS: Record<TravelMode, string> = {
  walking: 'เดินเท้า',
  cycling: 'จักรยาน',
  motorcycle: 'มอเตอร์ไซค์',
  car: 'รถยนต์',
  bus: 'รถเมล์',
  bts_mrt: 'BTS/MRT',
  indoor: 'ในอาคาร',
};

export const TravelModeRecommender = ({
  value,
  onChange,
  currentPM25,
  routeDuration = 20,
  hasRespiratoryCondition = false,
  className,
}: TravelModeRecommenderProps) => {

  const analyzedModes = useMemo((): ModeAnalysis[] => {
    const modes: TravelMode[] = ['walking', 'cycling', 'car', 'bus', 'bts_mrt'];
    
    return modes.map(mode => {
      const modifier = TRAVEL_MODIFIERS[mode].modifier;
      const effectivePM25 = currentPM25 * modifier;
      
      let healthReason = '';
      let tradeoff = '';
      let isRecommended = false;
      let isWarning = false;

      // Determine health recommendation based on PM25 and mode
      if (mode === 'bts_mrt') {
        healthReason = 'อากาศกรองในระบบปิด';
        tradeoff = 'จำกัดจุดหมายปลายทาง';
        isRecommended = currentPM25 > 50 || hasRespiratoryCondition;
      } else if (mode === 'car') {
        healthReason = 'เปิดแอร์หมุนเวียนลดฝุ่น';
        tradeoff = 'ค่าใช้จ่ายสูงกว่า';
        isRecommended = currentPM25 > 75 && !hasRespiratoryCondition;
      } else if (mode === 'bus') {
        healthReason = 'ลดการสัมผัสฝุ่นโดยตรง';
        tradeoff = 'อาจมีฝุ่นเมื่อรอรถ';
        isRecommended = currentPM25 > 50 && currentPM25 <= 100;
      } else if (mode === 'walking') {
        if (currentPM25 > 100) {
          healthReason = 'หายใจลึกขึ้น รับฝุ่นมากขึ้น';
          isWarning = true;
        } else if (currentPM25 > 50) {
          healthReason = 'ควรสวมหน้ากาก N95';
          isWarning = hasRespiratoryCondition;
        } else {
          healthReason = 'ได้ออกกำลังกาย อากาศดี';
          isRecommended = currentPM25 < 35;
        }
        tradeoff = currentPM25 > 50 ? 'สัมผัสฝุ่นโดยตรง' : 'ใช้เวลานานกว่า';
      } else if (mode === 'cycling') {
        if (currentPM25 > 75) {
          healthReason = 'หายใจแรงมาก รับฝุ่นสูง';
          isWarning = true;
        } else if (currentPM25 > 50) {
          healthReason = 'ต้องสวมหน้ากากขณะปั่น';
          isWarning = hasRespiratoryCondition;
        } else {
          healthReason = 'ได้ออกกำลังกาย เร็วกว่าเดิน';
          isRecommended = currentPM25 < 35;
        }
        tradeoff = 'สัมผัสฝุ่นโดยตรง';
      }

      // Extra warning for respiratory conditions
      if (hasRespiratoryCondition && (mode === 'walking' || mode === 'cycling') && currentPM25 > 35) {
        isWarning = true;
        healthReason = 'ไม่แนะนำสำหรับผู้มีโรคทางเดินหายใจ';
      }

      return {
        mode,
        icon: MODE_ICONS[mode],
        label: MODE_LABELS[mode],
        healthReason,
        tradeoff,
        riskModifier: modifier,
        isRecommended,
        isWarning,
      };
    });
  }, [currentPM25, hasRespiratoryCondition]);

  const recommendedMode = analyzedModes.find(m => m.isRecommended);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Recommendation Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          วิธีการเดินทาง
        </p>
        {recommendedMode && (
          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
            <Shield className="h-3 w-3 mr-1" />
            แนะนำ: {recommendedMode.label}
          </Badge>
        )}
      </div>

      {/* Mode Grid */}
      <div className="grid grid-cols-5 gap-2">
        {analyzedModes.map((analysis, i) => {
          const isSelected = value === analysis.mode;
          
          return (
            <motion.button
              key={analysis.mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onChange(analysis.mode)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                "hover:shadow-md",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/50 bg-card/50 hover:border-primary/50",
                analysis.isWarning && "border-amber-500/50 bg-amber-500/5"
              )}
            >
              {/* Risk indicator dot */}
              {analysis.isRecommended && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
              )}
              {analysis.isWarning && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-background" />
              )}

              <div className={cn(
                "transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground",
                analysis.isWarning && "text-amber-500"
              )}>
                {analysis.icon}
              </div>
              <span className={cn(
                "text-xs font-medium text-center leading-tight",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {analysis.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Mode Details */}
      {value && (
        <motion.div
          key={value}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 rounded-xl bg-muted/30 border border-border/50"
        >
          {(() => {
            const selected = analyzedModes.find(m => m.mode === value);
            if (!selected) return null;

            return (
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  {selected.isWarning ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  ) : selected.isRecommended ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      selected.isWarning && "text-amber-600",
                      selected.isRecommended && "text-emerald-600"
                    )}>
                      {selected.healthReason}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selected.tradeoff}
                    </p>
                  </div>
                </div>

                {/* Risk modifier display */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                  <Wind className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    ค่าปรับความเสี่ยง: 
                  </span>
                  <span className={cn(
                    "text-xs font-mono font-medium",
                    selected.riskModifier > 1.2 && "text-red-500",
                    selected.riskModifier < 0.6 && "text-emerald-500",
                  )}>
                    {selected.riskModifier > 1 ? '+' : ''}{Math.round((selected.riskModifier - 1) * 100)}%
                  </span>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </div>
  );
};

export default TravelModeRecommender;
