import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedPHRICounter } from './AnimatedPHRICounter';
import { RiskGauge } from './RiskGauge';
import { PHRIBreakdownChart } from './PHRIBreakdownChart';
import { usePHRIColor } from '@/hooks/usePHRIAnimation';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle, Shield, AlertCircle, AlertOctagon, Activity, Wind, Heart, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { evaluateAQI, evaluatePM25, getDiseaseCategory, getDiseaseSpecificLabel } from '@/utils/aqiThresholds';
import type { EnhancedPHRIResult } from '@/hooks/useEnhancedPHRI';

interface EnhancedPHRIPanelProps {
  result?: EnhancedPHRIResult;
  pm25?: number;
  aqi?: number;
  className?: string;
}

export const EnhancedPHRIPanel = ({ result, pm25, aqi, className }: EnhancedPHRIPanelProps) => {
  const phriScore = result?.phri || 0;
  const { color, category, categoryLabel } = usePHRIColor(phriScore);
  const { profile } = useHealthProfile();
  const { language } = useLanguage();
  
  // Get disease-specific AQI evaluation
  const diseaseCategory = getDiseaseCategory(profile?.chronicConditions || []);
  const aqiEvaluation = aqi !== undefined ? evaluateAQI(aqi, diseaseCategory, language as 'en' | 'th') : null;
  const pm25Evaluation = pm25 !== undefined ? evaluatePM25(pm25, diseaseCategory) : null;
  const isSensitiveGroup = diseaseCategory !== 'general';
  const getIcon = () => {
    switch (result?.alertLevel) {
      case 'emergency':
        return <AlertOctagon className="h-6 w-6" />;
      case 'urgent':
        return <AlertTriangle className="h-6 w-6" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6" />;
      default:
        return <Shield className="h-6 w-6" />;
    }
  };

  const getBadgeVariant = (): 'default' | 'destructive' | 'secondary' => {
    switch (result?.alertLevel) {
      case 'emergency':
      case 'urgent':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getAlertText = () => {
    switch (result?.alertLevel) {
      case 'emergency':
        return 'ฉุกเฉิน';
      case 'urgent':
        return 'เร่งด่วน';
      case 'warning':
        return 'เตือน';
      default:
        return 'ปลอดภัย';
    }
  };

  if (!result) {
    return (
      <Card className={cn('w-full animate-fade-in', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            ดัชนีความเสี่ยงสุขภาพส่วนบุคคล (PHRI)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>กำลังโหลดข้อมูล...</p>
            <p className="text-sm mt-2">กรุณาบันทึกข้อมูลสุขภาพเพื่อดูผลการประเมิน</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4 animate-fade-in', className)}>
      {/* Main PHRI Card */}
      <Card 
        className="w-full overflow-hidden transition-all duration-500"
        style={{ 
          borderColor: color,
          borderWidth: '2px',
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span style={{ color }}>{getIcon()}</span>
              ดัชนีความเสี่ยงสุขภาพส่วนบุคคล
            </CardTitle>
            <Badge 
              variant={getBadgeVariant()}
              className="animate-scale-in"
              style={
                result?.alertLevel === 'warning' 
                  ? { backgroundColor: 'hsl(var(--warning))', color: 'hsl(var(--warning-foreground))' }
                  : {}
              }
            >
              {getAlertText()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Animated Counter */}
            <div className="flex justify-center">
              <AnimatedPHRICounter value={phriScore} size="xl" />
            </div>

            {/* Risk Gauge */}
            <div className="flex justify-center">
              <RiskGauge 
                score={phriScore * 10} 
                size="lg"
                showLabel={false}
                animated 
              />
            </div>

            {/* Quick Stats */}
            <div className="flex flex-col gap-3">
              {pm25 !== undefined && pm25Evaluation && (
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  pm25Evaluation.bgColor.replace('bg-', 'border-').replace('500', '200'),
                  "bg-muted/50"
                )}>
                  <Wind className={cn("w-5 h-5", pm25Evaluation.color)} />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">PM2.5 (µg/m³)</p>
                    <p className={cn("font-semibold text-lg", pm25Evaluation.color)}>{pm25.toFixed(1)}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", pm25Evaluation.color)}>
                    {language === 'en' ? pm25Evaluation.label : pm25Evaluation.labelTh}
                  </Badge>
                </div>
              )}
              {aqi !== undefined && aqiEvaluation && (
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  aqiEvaluation.bgColor.replace('bg-', 'border-').replace('500', '200'),
                  "bg-muted/50"
                )}>
                  {isSensitiveGroup ? (
                    <Heart className={cn("w-5 h-5", aqiEvaluation.color)} />
                  ) : (
                    <Activity className={cn("w-5 h-5", aqiEvaluation.color)} />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      {isSensitiveGroup 
                        ? getDiseaseSpecificLabel(diseaseCategory, language as 'en' | 'th')
                        : 'AQI'}
                    </p>
                    <p className={cn("font-semibold text-lg", aqiEvaluation.color)}>{aqi}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", aqiEvaluation.color)}>
                    {language === 'en' ? aqiEvaluation.label : aqiEvaluation.labelTh}
                  </Badge>
                </div>
              )}
              {isSensitiveGroup && (
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-orange-600 bg-orange-50 rounded-lg border border-orange-200">
                  <Stethoscope className="w-3 h-3" />
                  <span>{language === 'en' ? 'Stricter thresholds applied' : 'ใช้เกณฑ์เข้มงวดสำหรับกลุ่มเสี่ยง'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recommendation */}
          <div 
            className="p-4 rounded-lg transition-all duration-300"
            style={{ 
              backgroundColor: `${color}10`,
              border: `1px solid ${color}30`
            }}
          >
            <p className="text-sm font-medium text-center">
              {result.recommendation}
            </p>
          </div>

          {/* Risk Level Scale - PHRI 0-10: <3 Low, 3-6 Warning, >6 Danger */}
          <div className="grid grid-cols-3 gap-2 text-xs text-center pt-2 border-t">
            <div className={cn(
              "p-2 rounded transition-all duration-300",
              category === 'low' && "ring-2 ring-success ring-offset-2"
            )}>
              <div className="font-semibold text-success">&lt; 3</div>
              <div className="text-muted-foreground">ปลอดภัย</div>
            </div>
            <div className={cn(
              "p-2 rounded transition-all duration-300",
              category === 'warning' && "ring-2 ring-warning ring-offset-2"
            )}>
              <div className="font-semibold text-warning">3-6</div>
              <div className="text-muted-foreground">เตือน</div>
            </div>
            <div className={cn(
              "p-2 rounded transition-all duration-300",
              category === 'danger' && "ring-2 ring-destructive ring-offset-2"
            )}>
              <div className="font-semibold text-destructive">&gt; 6</div>
              <div className="text-muted-foreground">อันตราย</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Chart */}
      <PHRIBreakdownChart breakdown={{
        environmentalScore: result.environmentalScore,
        weatherScore: result.weatherScore,
        aqiScore: result.aqiScore,
        nearbyAreaScore: result.nearbyAreaScore,
        personalScore: result.personalScore,
        behavioralScore: result.behavioralScore,
        symptomScore: result.symptomScore,
        protectiveScore: result.protectiveScore,
      }} />

      {/* Personalized Advice */}
      {result.personalizedAdvice && result.personalizedAdvice.length > 0 && (
        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-success" />
              คำแนะนำเฉพาะบุคคล
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.personalizedAdvice.map((advice, index) => (
                <li 
                  key={index} 
                  className="flex items-start gap-2 text-sm animate-fade-in"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{advice}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
