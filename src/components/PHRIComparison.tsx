import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePHRI } from '@/hooks/usePHRI';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const PHRIComparison = () => {
  const [todayPHRI, setTodayPHRI] = useState<number | null>(null);
  const [yesterdayPHRI, setYesterdayPHRI] = useState<number | null>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [yesterdayData, setYesterdayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { fetchHealthLogs } = usePHRI();

  useEffect(() => {
    loadComparisonData();
  }, []);

  const loadComparisonData = async () => {
    setLoading(true);
    try {
      const logs = await fetchHealthLogs(10);
      
      if (logs.length === 0) {
        setLoading(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Find today's log
      const todayLog = logs.find(log => {
        const logDate = new Date(log.log_date);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime();
      });

      // Find yesterday's log
      const yesterdayLog = logs.find(log => {
        const logDate = new Date(log.log_date);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === yesterday.getTime();
      });

      if (todayLog) {
        setTodayPHRI(parseFloat(todayLog.phri.toString()));
        setTodayData(todayLog);
      }

      if (yesterdayLog) {
        setYesterdayPHRI(parseFloat(yesterdayLog.phri.toString()));
        setYesterdayData(yesterdayLog);
      }
    } catch (error) {
      console.error('Error loading comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>เปรียบเทียบ PHRI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">กำลังโหลด...</p>
        </CardContent>
      </Card>
    );
  }

  if (!todayPHRI && !yesterdayPHRI) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>เปรียบเทียบ PHRI</CardTitle>
          <CardDescription>ยังไม่มีข้อมูลเพียงพอสำหรับการเปรียบเทียบ</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">กรุณาบันทึกข้อมูลอย่างน้อย 2 วันเพื่อดูการเปรียบเทียบ</p>
        </CardContent>
      </Card>
    );
  }

  const difference = todayPHRI && yesterdayPHRI ? todayPHRI - yesterdayPHRI : 0;
  const percentChange = todayPHRI && yesterdayPHRI 
    ? ((difference / yesterdayPHRI) * 100).toFixed(1)
    : '0';

  const getTrendIcon = () => {
    if (!todayPHRI || !yesterdayPHRI) return <Minus className="h-5 w-5" />;
    if (difference > 5) return <TrendingUp className="h-5 w-5 text-destructive" />;
    if (difference < -5) return <TrendingDown className="h-5 w-5 text-success" />;
    return <Minus className="h-5 w-5 text-warning" />;
  };

  const getTrendText = () => {
    if (!todayPHRI || !yesterdayPHRI) {
      if (todayPHRI) return 'ยังไม่มีข้อมูลเมื่อวาน';
      return 'ยังไม่มีข้อมูลวันนี้';
    }
    if (difference > 5) return 'แย่ลง';
    if (difference < -5) return 'ดีขึ้น';
    return 'คงที่';
  };

  const getTrendColor = () => {
    if (!todayPHRI || !yesterdayPHRI) return 'bg-muted';
    if (difference > 5) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (difference < -5) return 'bg-success/10 text-success border-success/20';
    return 'bg-warning/10 text-warning border-warning/20';
  };

  const getRecommendations = () => {
    if (!todayPHRI || !yesterdayPHRI) {
      return ['บันทึกข้อมูลสุขภาพอย่างสม่ำเสมอเพื่อติดตามแนวโน้ม'];
    }

    const recommendations: string[] = [];

    if (difference > 5) {
      // PHRI แย่ลง
      recommendations.push('⚠️ PHRI เพิ่มขึ้น ควรระมัดระวังมากขึ้น');
      
      if (todayData?.outdoor_time > yesterdayData?.outdoor_time) {
        recommendations.push(`🏃 ลดเวลาอยู่กลางแจ้ง: วันนี้ ${todayData.outdoor_time} นาที, เมื่อวาน ${yesterdayData.outdoor_time} นาที`);
      }
      
      if (todayData?.aqi > yesterdayData?.aqi) {
        recommendations.push('🌫️ คุณภาพอากาศแย่ลง ควรสวมหน้ากาก N95 ตลอดเวลาเมื่ออยู่กลางแจ้ง');
      }

      if (todayData?.has_symptoms && !yesterdayData?.has_symptoms) {
        recommendations.push('🩺 เริ่มมีอาการ ควรพักผ่อนให้เพียงพอและหลีกเลี่ยงพื้นที่มลพิษสูง');
      }

      recommendations.push('💧 ดื่มน้ำให้เพียงพอ อย่างน้อย 8 แก้วต่อวัน');
      recommendations.push('🏠 ควรอยู่ในร่มมากขึ้นและใช้เครื่องฟอกอากาศ');
      
    } else if (difference < -5) {
      // PHRI ดีขึ้น
      recommendations.push('✅ PHRI ลดลง สุขภาพดีขึ้น!');
      
      if (todayData?.outdoor_time < yesterdayData?.outdoor_time) {
        recommendations.push(`👍 ดีมาก! ลดเวลากลางแจ้งได้สำเร็จ: จาก ${yesterdayData.outdoor_time} เหลือ ${todayData.outdoor_time} นาที`);
      }

      if (todayData?.aqi < yesterdayData?.aqi) {
        recommendations.push('🌤️ คุณภาพอากาศดีขึ้น แต่ยังควรระวัง');
      }

      if (!todayData?.has_symptoms && yesterdayData?.has_symptoms) {
        recommendations.push('😊 อาการดีขึ้น รักษาพฤติกรรมนี้ต่อไป');
      }

      recommendations.push('💪 รักษาพฤติกรรมที่ดีนี้ไว้');
      recommendations.push('🎯 พิจารณาออกกำลังกายเบาๆ ในเวลาที่อากาศดี');
      
    } else {
      // PHRI คงที่
      recommendations.push('📊 PHRI คงที่ รักษาสุขภาพได้ดี');
      recommendations.push('🔄 ดำเนินชีวิตตามปกติ แต่คอยติดตามคุณภาพอากาศ');
      
      if (todayData?.aqi > 100) {
        recommendations.push('⚠️ แม้ PHRI คงที่ แต่ AQI สูง ควรระวังและลดเวลากลางแจ้ง');
      }
    }

    return recommendations;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getTrendIcon()}
              เปรียบเทียบ PHRI วันนี้ vs เมื่อวาน
            </CardTitle>
            <CardDescription>ติดตามแนวโน้มสุขภาพของคุณ</CardDescription>
          </div>
          <Badge variant="outline" className={getTrendColor()}>
            {getTrendText()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comparison Display */}
        <div className="flex items-center justify-around py-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">เมื่อวาน</div>
            <div className="text-3xl font-bold" style={{ 
              color: yesterdayPHRI 
                ? yesterdayPHRI >= 100 ? 'hsl(var(--destructive))' 
                  : yesterdayPHRI >= 50 ? 'hsl(var(--warning))' 
                  : 'hsl(var(--success))' 
                : 'hsl(var(--muted-foreground))'
            }}>
              {yesterdayPHRI ? yesterdayPHRI.toFixed(1) : '-'}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            {todayPHRI && yesterdayPHRI && (
              <div className={`text-sm font-semibold ${
                difference > 0 ? 'text-destructive' : difference < 0 ? 'text-success' : 'text-warning'
              }`}>
                {difference > 0 ? '+' : ''}{difference.toFixed(1)}
                <span className="text-xs ml-1">({percentChange}%)</span>
              </div>
            )}
          </div>

          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">วันนี้</div>
            <div className="text-3xl font-bold" style={{ 
              color: todayPHRI 
                ? todayPHRI >= 100 ? 'hsl(var(--destructive))' 
                  : todayPHRI >= 50 ? 'hsl(var(--warning))' 
                  : 'hsl(var(--success))' 
                : 'hsl(var(--muted-foreground))'
            }}>
              {todayPHRI ? todayPHRI.toFixed(1) : '-'}
            </div>
          </div>
        </div>

        {/* Additional Data Comparison */}
        {todayData && yesterdayData && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">เวลากลางแจ้ง</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{yesterdayData.outdoor_time} น.</span>
                <ArrowRight className="h-3 w-3" />
                <span className={yesterdayData.outdoor_time > todayData.outdoor_time ? 'text-success font-semibold' : yesterdayData.outdoor_time < todayData.outdoor_time ? 'text-destructive font-semibold' : ''}>
                  {todayData.outdoor_time} น.
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">AQI</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{yesterdayData.aqi}</span>
                <ArrowRight className="h-3 w-3" />
                <span className={yesterdayData.aqi > todayData.aqi ? 'text-success font-semibold' : yesterdayData.aqi < todayData.aqi ? 'text-destructive font-semibold' : ''}>
                  {todayData.aqi}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <Alert className="border-primary/20 bg-primary/5">
          <Lightbulb className="h-4 w-4 text-primary" />
          <AlertDescription>
            <div className="font-semibold mb-2">คำแนะนำการปรับพฤติกรรม:</div>
            <ul className="space-y-1.5 text-sm">
              {getRecommendations().map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
