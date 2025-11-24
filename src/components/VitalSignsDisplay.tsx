import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVitalSigns } from '@/hooks/useVitalSigns';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface VitalSignsDisplayProps {
  result?: {
    risk: {
      score: number;
      level: 'LOW' | 'MEDIUM' | 'HIGH';
      color: string;
      advice: string;
    };
    anomalies: string[];
    trends: {
      hr: string;
      rr: string;
      temp: string;
      sys: string;
      spo2: string;
    };
  };
}

export const VitalSignsDisplay = ({ result }: VitalSignsDisplayProps) => {
  const [latestData, setLatestData] = useState<any>(null);
  const { fetchVitalSigns } = useVitalSigns();

  useEffect(() => {
    if (!result) {
      loadLatestData();
    }
  }, [result]);

  const loadLatestData = async () => {
    const data = await fetchVitalSigns(1);
    if (data && data.length > 0) {
      setLatestData(data[0]);
    }
  };

  const displayData = result || latestData;

  if (!displayData) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">ยังไม่มีข้อมูลสัญญาณชีพ</p>
        </CardContent>
      </Card>
    );
  }

  const riskData = result ? result.risk : {
    score: displayData.risk_score,
    level: displayData.risk_level,
    color: displayData.risk_level === 'HIGH' ? 'hsl(var(--destructive))' : 
           displayData.risk_level === 'MEDIUM' ? 'hsl(var(--warning))' : 
           'hsl(var(--success))',
    advice: displayData.risk_level === 'HIGH' ? '⚠️ เสี่ยงสูง! ควรปรึกษาแพทย์ทันที' :
            displayData.risk_level === 'MEDIUM' ? '⚠️ เสี่ยงปานกลาง ควรติดตามอาการอย่างใกล้ชิด' :
            'ค่าสัญญาณชีพอยู่ในเกณฑ์ปกติ'
  };

  const anomalies = result ? result.anomalies : (displayData.anomalies || []);
  const trends = result ? result.trends : (displayData.trends || {});

  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'RISING':
        return <TrendingUp className="h-4 w-4 text-destructive" />;
      case 'FALLING':
        return <TrendingDown className="h-4 w-4 text-primary" />;
      case 'STABLE':
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'RISING':
        return 'เพิ่มขึ้น';
      case 'FALLING':
        return 'ลดลง';
      case 'STABLE':
        return 'คงที่';
      default:
        return 'ไม่เพียงพอ';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          ผลการวิเคราะห์สัญญาณชีพ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="text-center p-6 rounded-lg" style={{ backgroundColor: `${riskData.color}20` }}>
          <div className="text-5xl font-bold mb-2" style={{ color: riskData.color }}>
            {riskData.score}
          </div>
          <Badge variant={getBadgeVariant(riskData.level)} className="mb-2">
            {riskData.level === 'HIGH' ? 'เสี่ยงสูง' : riskData.level === 'MEDIUM' ? 'เสี่ยงปานกลาง' : 'ปกติ'}
          </Badge>
          <p className="text-sm mt-2">{riskData.advice}</p>
        </div>

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-semibold text-destructive mb-1">ตรวจพบความผิดปกติ:</p>
                <ul className="text-sm space-y-1">
                  {anomalies.map((anomaly, index) => (
                    <li key={index}>• {anomaly}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Trends */}
        {trends && Object.keys(trends).length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-sm">แนวโน้ม (3 ครั้งล่าสุด):</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {trends.hr && (
                <div className="flex items-center justify-between p-2 rounded bg-muted">
                  <span>Heart Rate:</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trends.hr)}
                    <span>{getTrendText(trends.hr)}</span>
                  </div>
                </div>
              )}
              {trends.rr && (
                <div className="flex items-center justify-between p-2 rounded bg-muted">
                  <span>Respiration:</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trends.rr)}
                    <span>{getTrendText(trends.rr)}</span>
                  </div>
                </div>
              )}
              {trends.temp && (
                <div className="flex items-center justify-between p-2 rounded bg-muted">
                  <span>Temperature:</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trends.temp)}
                    <span>{getTrendText(trends.temp)}</span>
                  </div>
                </div>
              )}
              {trends.sys && (
                <div className="flex items-center justify-between p-2 rounded bg-muted">
                  <span>BP Systolic:</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trends.sys)}
                    <span>{getTrendText(trends.sys)}</span>
                  </div>
                </div>
              )}
              {trends.spo2 && (
                <div className="flex items-center justify-between p-2 rounded bg-muted">
                  <span>SpO₂:</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trends.spo2)}
                    <span>{getTrendText(trends.spo2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
