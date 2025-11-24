import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, AlertCircle } from 'lucide-react';
import { usePHRI } from '@/hooks/usePHRI';
import { useEffect, useState } from 'react';

interface PHRIDisplayProps {
  phri?: number;
  riskLevel?: 'safe' | 'moderate' | 'high';
  advice?: string;
}

export const PHRIDisplay = ({ phri, riskLevel, advice }: PHRIDisplayProps) => {
  const { fetchHealthLogs } = usePHRI();
  const [latestLog, setLatestLog] = useState<any>(null);

  useEffect(() => {
    const loadLatestLog = async () => {
      try {
        const logs = await fetchHealthLogs(1);
        if (logs && logs.length > 0) {
          setLatestLog(logs[0]);
        }
      } catch (error) {
        console.error('Error loading latest log:', error);
      }
    };
    
    if (!phri) {
      loadLatestLog();
    }
  }, [phri, fetchHealthLogs]);

  const displayPHRI = phri ?? latestLog?.phri;
  const displayRiskLevel = riskLevel ?? (
    displayPHRI >= 100 ? 'high' : displayPHRI >= 50 ? 'moderate' : 'safe'
  );
  const displayAdvice = advice ?? (
    displayPHRI >= 100 
      ? 'ควรพักในร่มทันที และสังเกตอาการผิดปกติ'
      : displayPHRI >= 50
      ? 'ควรสวมหน้ากาก N95 และลดเวลาอยู่กลางแจ้ง'
      : 'สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ'
  );

  if (!displayPHRI) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>ดัชนีความเสี่ยงสุขภาพส่วนบุคคล (PHRI)</CardTitle>
          <CardDescription>ยังไม่มีข้อมูล กรุณาบันทึกข้อมูลสุขภาพ</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getIcon = () => {
    switch (displayRiskLevel) {
      case 'high':
        return <AlertTriangle className="h-8 w-8" />;
      case 'moderate':
        return <AlertCircle className="h-8 w-8" />;
      default:
        return <Shield className="h-8 w-8" />;
    }
  };

  const getColor = () => {
    switch (displayRiskLevel) {
      case 'high':
        return 'hsl(var(--destructive))';
      case 'moderate':
        return 'hsl(var(--warning))';
      default:
        return 'hsl(var(--success))';
    }
  };

  const getBadgeVariant = () => {
    switch (displayRiskLevel) {
      case 'high':
        return 'destructive';
      case 'moderate':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRiskText = () => {
    switch (displayRiskLevel) {
      case 'high':
        return 'เสี่ยงสูง';
      case 'moderate':
        return 'เสี่ยงปานกลาง';
      default:
        return 'ปลอดภัย';
    }
  };

  return (
    <Card className="w-full border-2" style={{ borderColor: getColor() }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span style={{ color: getColor() }}>{getIcon()}</span>
            ดัชนีความเสี่ยงสุขภาพส่วนบุคคล
          </CardTitle>
          <Badge variant={getBadgeVariant() as any}>
            {getRiskText()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div 
            className="text-6xl font-bold mb-2" 
            style={{ color: getColor() }}
          >
            {displayPHRI.toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground">PHRI Index</div>
        </div>

        <div 
          className="p-4 rounded-lg"
          style={{ 
            backgroundColor: `${getColor()}15`,
            border: `1px solid ${getColor()}30`
          }}
        >
          <p className="text-sm font-medium text-center">
            {displayAdvice}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground text-center pt-2 border-t">
          <div>
            <div className="font-semibold" style={{ color: 'hsl(var(--success))' }}>
              &lt; 50
            </div>
            <div>ปลอดภัย</div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: 'hsl(var(--warning))' }}>
              50-100
            </div>
            <div>ปานกลาง</div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
              &gt; 100
            </div>
            <div>เสี่ยงสูง</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
