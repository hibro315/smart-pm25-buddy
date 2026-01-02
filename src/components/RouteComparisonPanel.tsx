import { RouteWithPM25 } from '@/hooks/useRoutePM25';
import HealthRiskEngine, { DiseaseProfile } from '@/engine/HealthRiskEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Clock, 
  Wind, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown,
  Activity,
  Heart
} from 'lucide-react';
import { useMemo } from 'react';

interface RouteComparisonPanelProps {
  routes: RouteWithPM25[];
  selectedIndex: number;
  recommendedIndex: number;
  diseaseProfile?: DiseaseProfile;
  onSelectRoute: (index: number) => void;
}

interface RouteAnalysis {
  route: RouteWithPM25;
  phri: number;
  riskCategory: string;
  healthImpact: string;
  timeCost: number;
  riskReduction: number;
}

export const RouteComparisonPanel = ({
  routes,
  selectedIndex,
  recommendedIndex,
  diseaseProfile = 'general',
  onSelectRoute,
}: RouteComparisonPanelProps) => {
  const riskEngine = useMemo(() => new HealthRiskEngine(), []);

  const analyzeRoutes = useMemo((): RouteAnalysis[] => {
    if (routes.length === 0) return [];

    const baseRoute = routes[0];
    
    return routes.map((route, index) => {
      // Calculate PHRI for 30-minute exposure at moderate activity
      const phriResult = riskEngine.calculatePHRI({
        pm25: route.averagePM25,
        exposureDuration: route.duration,
        activityLevel: 'moderate',
        diseaseProfile,
      });

      const timeDiff = route.duration - baseRoute.duration;
      const riskDiff = baseRoute.averagePM25 - route.averagePM25;

      return {
        route,
        phri: phriResult.score,
        riskCategory: phriResult.category,
        healthImpact: getHealthImpact(phriResult.score, diseaseProfile),
        timeCost: timeDiff,
        riskReduction: riskDiff > 0 ? (riskDiff / baseRoute.averagePM25) * 100 : 0,
      };
    });
  }, [routes, diseaseProfile, riskEngine]);

  const bestRoute = analyzeRoutes.reduce((best, current) => 
    current.phri < best.phri ? current : best, analyzeRoutes[0]);

  if (routes.length === 0) return null;

  return (
    <Card className="border-2 border-primary/20 shadow-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            เปรียบเทียบเส้นทาง
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {routes.length} เส้นทาง
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Decision Summary - First */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {getDecisionStatement(bestRoute, analyzeRoutes[0], diseaseProfile)}
              </p>
              {bestRoute.timeCost > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  ใช้เวลาเพิ่ม ~{bestRoute.timeCost} นาที
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Route Cards */}
        <div className="space-y-3">
          {analyzeRoutes.map((analysis, index) => {
            const isSelected = index === selectedIndex;
            const isRecommended = index === recommendedIndex;
            const isBest = analysis === bestRoute;

            return (
              <div
                key={index}
                onClick={() => onSelectRoute(index)}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-primary bg-primary/5 shadow-card' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'}
                `}
              >
                {/* Badges */}
                <div className="absolute -top-2 right-3 flex gap-1">
                  {isBest && (
                    <Badge className="bg-success text-success-foreground text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      ปลอดภัยที่สุด
                    </Badge>
                  )}
                  {isRecommended && !isBest && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      แนะนำ
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">เส้นทาง {index + 1}</span>
                  <RiskBadge category={analysis.riskCategory} />
                </div>

                {/* PHRI Gauge */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">PHRI Score</span>
                    <span className="font-mono font-bold">{analysis.phri.toFixed(1)}/100</span>
                  </div>
                  <Progress 
                    value={analysis.phri} 
                    className="h-2"
                    style={{
                      '--progress-background': getPHRIColor(analysis.phri),
                    } as React.CSSProperties}
                  />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <StatItem 
                    icon={<Clock className="h-3 w-3" />} 
                    label="เวลา" 
                    value={`${analysis.route.duration} น.`}
                  />
                  <StatItem 
                    icon={<Wind className="h-3 w-3" />} 
                    label="PM2.5 เฉลี่ย" 
                    value={`${analysis.route.averagePM25}`}
                    highlight={analysis.route.averagePM25 > 50}
                  />
                  <StatItem 
                    icon={<AlertTriangle className="h-3 w-3" />} 
                    label="สูงสุด" 
                    value={`${analysis.route.maxPM25}`}
                    highlight={analysis.route.maxPM25 > 100}
                  />
                  <StatItem 
                    icon={<TrendingDown className="h-3 w-3" />} 
                    label="ลดเสี่ยง" 
                    value={analysis.riskReduction > 0 ? `${analysis.riskReduction.toFixed(0)}%` : '-'}
                    positive={analysis.riskReduction > 0}
                  />
                </div>

                {/* Health Impact */}
                <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
                  {analysis.healthImpact}
                </p>
              </div>
            );
          })}
        </div>

        {/* Methodology Note */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <Heart className="h-3 w-3" />
            <span className="font-medium">การคำนวณ PHRI</span>
          </div>
          <p>
            คำนวณจาก PM2.5 × ระยะเวลาสัมผัส × ระดับกิจกรรม × 
            ค่าความไวต่อโรค ({getDiseaseLabel(diseaseProfile)})
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper Components
const StatItem = ({ 
  icon, 
  label, 
  value, 
  highlight = false,
  positive = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) => (
  <div className="text-center">
    <div className={`flex items-center justify-center gap-1 ${
      highlight ? 'text-destructive' : positive ? 'text-success' : 'text-muted-foreground'
    }`}>
      {icon}
    </div>
    <div className={`font-mono font-bold ${
      highlight ? 'text-destructive' : positive ? 'text-success' : ''
    }`}>
      {value}
    </div>
    <div className="text-muted-foreground">{label}</div>
  </div>
);

const RiskBadge = ({ category }: { category: string }) => {
  const config: Record<string, { bg: string; text: string }> = {
    'Low': { bg: 'bg-success', text: 'ความเสี่ยงต่ำ' },
    'Moderate': { bg: 'bg-warning', text: 'ปานกลาง' },
    'High': { bg: 'bg-destructive', text: 'ความเสี่ยงสูง' },
    'Severe': { bg: 'bg-purple-600', text: 'อันตราย' },
  };
  const { bg, text } = config[category] || config['Moderate'];
  
  return <Badge className={`${bg} text-white text-xs`}>{text}</Badge>;
};

// Helper Functions
function getDecisionStatement(
  best: RouteAnalysis, 
  fastest: RouteAnalysis,
  diseaseProfile: DiseaseProfile
): string {
  if (best === fastest) {
    return 'เส้นทางที่เร็วที่สุดก็ปลอดภัยที่สุด';
  }

  const reduction = ((fastest.phri - best.phri) / fastest.phri * 100).toFixed(0);
  const diseaseText = getDiseaseLabel(diseaseProfile);

  if (diseaseProfile !== 'general') {
    return `เส้นทางที่ ${best.route.routeIndex + 1} ลดความเสี่ยงต่อ${diseaseText}ได้ ${reduction}%`;
  }
  
  return `เส้นทางที่ ${best.route.routeIndex + 1} ลดการสัมผัส PM2.5 ได้ ${reduction}%`;
}

function getHealthImpact(phri: number, diseaseProfile: DiseaseProfile): string {
  if (phri < 25) {
    return 'ปลอดภัยสำหรับทุกกลุ่ม ไม่จำเป็นต้องใช้หน้ากาก';
  } else if (phri < 50) {
    if (diseaseProfile !== 'general') {
      return 'แนะนำให้ใช้หน้ากาก N95 สำหรับกลุ่มเสี่ยง';
    }
    return 'ปลอดภัยสำหรับคนทั่วไป กลุ่มเสี่ยงควรระวัง';
  } else if (phri < 75) {
    return 'ควรใช้หน้ากาก N95 และหลีกเลี่ยงกิจกรรมหนัก';
  } else {
    return 'ไม่แนะนำให้เดินทาง หากจำเป็นต้องใช้หน้ากาก N95 ตลอด';
  }
}

function getDiseaseLabel(profile: DiseaseProfile): string {
  const labels: Partial<Record<DiseaseProfile, string>> = {
    'asthma': 'โรคหอบหืด',
    'copd': 'โรคปอด',
    'cardiovascular': 'โรคหัวใจ',
    'elderly': 'ผู้สูงอายุ',
    'general': 'ทั่วไป',
  };
  return labels[profile] || 'ทั่วไป';
}

function getPHRIColor(score: number): string {
  if (score < 25) return 'hsl(142 71% 45%)'; // success
  if (score < 50) return 'hsl(38 92% 50%)';  // warning
  if (score < 75) return 'hsl(0 84% 60%)';   // destructive
  return 'hsl(282 44% 43%)';                  // severe
}

export default RouteComparisonPanel;
