/**
 * Route Recommendation Panel
 * 
 * Clean, decision-first panel showing route options.
 * Focuses on WHY a route is safer, not just metrics.
 * 
 * @version 2.0.0 - Futuristic Health Navigation
 */

import { useMemo } from 'react';
import { RouteWithPM25 } from '@/hooks/useRoutePM25';
import HealthRiskEngine, { DiseaseProfile, PHRIResult } from '@/engine/HealthRiskEngine';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Shield, 
  Clock, 
  Wind, 
  Sparkles,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RouteRecommendationPanelProps {
  routes: RouteWithPM25[];
  selectedIndex: number;
  diseaseProfile?: DiseaseProfile;
  onSelectRoute: (index: number) => void;
}

interface RouteAnalysis {
  route: RouteWithPM25;
  index: number;
  phri: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
  healthReason: string;
  tradeoff: string;
  isSafest: boolean;
  isFastest: boolean;
}

export const RouteRecommendationPanel = ({
  routes,
  selectedIndex,
  diseaseProfile = 'general',
  onSelectRoute,
}: RouteRecommendationPanelProps) => {

  const analyzedRoutes = useMemo((): RouteAnalysis[] => {
    if (routes.length === 0) return [];

    const analyses = routes.map((route, index) => {
      const phriResult: PHRIResult = HealthRiskEngine.computePHRI(
        {
          pm25: route.averagePM25,
          durationMinutes: route.duration,
          activityLevel: 'moderate',
          isOutdoor: true,
          hasMask: false,
        },
        {
          age: 30,
          diseases: diseaseProfile !== 'general' ? [diseaseProfile] : [],
          smokingStatus: 'never',
        }
      );

      return {
        route,
        index,
        phri: phriResult.score,
        riskLevel: phriResult.level,
        healthReason: '',
        tradeoff: '',
        isSafest: false,
        isFastest: false,
      };
    });

    // Find safest and fastest
    const safestIdx = analyses.reduce((min, a, i) => 
      a.phri < analyses[min].phri ? i : min, 0);
    const fastestIdx = analyses.reduce((min, a, i) => 
      a.route.duration < analyses[min].route.duration ? i : min, 0);

    analyses[safestIdx].isSafest = true;
    analyses[fastestIdx].isFastest = true;

    // Generate health reasons and tradeoffs
    analyses.forEach((a, i) => {
      const pm25 = a.route.averagePM25;
      const duration = a.route.duration;
      const fastest = analyses[fastestIdx];
      const safest = analyses[safestIdx];

      // Health reason
      if (a.isSafest && a.isFastest) {
        a.healthReason = 'เส้นทางนี้ทั้งเร็วและปลอดภัยที่สุด';
      } else if (a.isSafest) {
        const reduction = Math.round(((fastest.route.averagePM25 - pm25) / fastest.route.averagePM25) * 100);
        a.healthReason = `ลดการสัมผัส PM2.5 ได้ ${reduction}%`;
      } else if (a.isFastest) {
        a.healthReason = 'เส้นทางที่เร็วที่สุด';
      } else {
        a.healthReason = 'เส้นทางทางเลือก';
      }

      // Tradeoff
      if (a.isSafest && !a.isFastest) {
        const extraTime = duration - fastest.route.duration;
        a.tradeoff = `ใช้เวลาเพิ่ม ${extraTime} นาที`;
      } else if (a.isFastest && !a.isSafest) {
        const extraRisk = Math.round(((pm25 - safest.route.averagePM25) / safest.route.averagePM25) * 100);
        a.tradeoff = `PM2.5 สูงกว่า ${extraRisk}%`;
      } else if (!a.isSafest && !a.isFastest) {
        a.tradeoff = 'สมดุลระหว่างเวลาและความปลอดภัย';
      }
    });

    return analyses;
  }, [routes, diseaseProfile]);

  if (routes.length === 0) return null;

  const safestRoute = analyzedRoutes.find(a => a.isSafest);

  return (
    <div className="space-y-4">
      {/* Decision Summary - First Thing User Sees */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">เส้นทางที่แนะนำ</p>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {safestRoute?.healthReason || 'กำลังวิเคราะห์...'}
            </h3>
            {safestRoute?.tradeoff && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                {safestRoute.tradeoff}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Route Options */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground px-1">
          เลือกเส้นทาง ({routes.length} ตัวเลือก)
        </p>
        
        <AnimatePresence>
          {analyzedRoutes.map((analysis, i) => (
            <motion.div
              key={analysis.index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSelectRoute(analysis.index)}
              className={cn(
                "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300",
                "hover:shadow-lg hover:scale-[1.01]",
                selectedIndex === analysis.index
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border/50 bg-card/50 hover:border-primary/50"
              )}
            >
              {/* Badges */}
              <div className="absolute -top-2.5 right-3 flex gap-1">
                {analysis.isSafest && (
                  <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs border-0 shadow-sm">
                    <Shield className="h-3 w-3 mr-1" />
                    ปลอดภัยที่สุด
                  </Badge>
                )}
                {analysis.isFastest && !analysis.isSafest && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs border-0 shadow-sm">
                    <Sparkles className="h-3 w-3 mr-1" />
                    เร็วที่สุด
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Risk Indicator */}
                  <RiskIndicator level={analysis.riskLevel} />
                  
                  <div>
                    <p className="font-medium text-foreground">
                      เส้นทาง {analysis.index + 1}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {analysis.healthReason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Quick Stats */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{analysis.route.duration} นาที</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Wind className="h-3.5 w-3.5" />
                      <span className={cn(
                        "font-mono",
                        analysis.route.averagePM25 > 50 && "text-orange-500",
                        analysis.route.averagePM25 > 100 && "text-red-500",
                      )}>
                        {analysis.route.averagePM25} µg/m³
                      </span>
                    </div>
                  </div>

                  <ChevronRight className={cn(
                    "h-5 w-5 transition-colors",
                    selectedIndex === analysis.index 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  )} />
                </div>
              </div>

              {/* Tradeoff Info */}
              {analysis.tradeoff && selectedIndex === analysis.index && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground"
                >
                  {analysis.isSafest ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  {analysis.tradeoff}
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const RiskIndicator = ({ level }: { level: string }) => {
  const config = {
    low: { bg: 'bg-emerald-500/20', ring: 'ring-emerald-500/30', dot: 'bg-emerald-500' },
    moderate: { bg: 'bg-amber-500/20', ring: 'ring-amber-500/30', dot: 'bg-amber-500' },
    high: { bg: 'bg-orange-500/20', ring: 'ring-orange-500/30', dot: 'bg-orange-500' },
    severe: { bg: 'bg-red-500/20', ring: 'ring-red-500/30', dot: 'bg-red-500' },
  };

  const { bg, ring, dot } = config[level as keyof typeof config] || config.moderate;

  return (
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center ring-2",
      bg, ring
    )}>
      <div className={cn("w-3 h-3 rounded-full animate-pulse", dot)} />
    </div>
  );
};

export default RouteRecommendationPanel;
