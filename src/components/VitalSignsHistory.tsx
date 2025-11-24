import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVitalSigns } from '@/hooks/useVitalSigns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const VitalSignsHistory = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchVitalSigns } = useVitalSigns();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchVitalSigns(10);
    setLogs(data);
    setLoading(false);
  };

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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: th });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>ประวัติสัญญาณชีพ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            ประวัติสัญญาณชีพ
          </CardTitle>
          <CardDescription>ไม่มีข้อมูลสัญญาณชีพ</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate summary
  const avgRiskScore = Math.round(logs.reduce((sum, log) => sum + log.risk_score, 0) / logs.length);
  const maxRiskScore = Math.max(...logs.map((log) => log.risk_score));
  const highRiskCount = logs.filter((log) => log.risk_level === 'HIGH').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          ประวัติสัญญาณชีพ
        </CardTitle>
        <CardDescription>{logs.length} รายการบันทึก</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">คะแนนเฉลี่ย</p>
            <p className="text-2xl font-bold">{avgRiskScore}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">คะแนนสูงสุด</p>
            <p className="text-2xl font-bold">{maxRiskScore}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">เสี่ยงสูง</p>
            <p className="text-2xl font-bold text-destructive">{highRiskCount}</p>
          </div>
        </div>

        {/* Logs List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{formatDate(log.created_at)}</p>
                  <Badge variant={getBadgeVariant(log.risk_level)}>
                    {log.risk_level === 'HIGH' ? 'เสี่ยงสูง' : 
                     log.risk_level === 'MEDIUM' ? 'เสี่ยงปานกลาง' : 
                     'ปกติ'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">HR</p>
                    <p className="font-semibold">{log.heart_rate} bpm</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">RR</p>
                    <p className="font-semibold">{log.respiration_rate}/min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Temp</p>
                    <p className="font-semibold">{log.temperature}°C</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">BP</p>
                    <p className="font-semibold">{log.bp_systolic}/{log.bp_diastolic}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">SpO₂</p>
                    <p className="font-semibold">{log.spo2}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Risk</p>
                    <p className="font-semibold">{log.risk_score}</p>
                  </div>
                </div>
                {log.anomalies && log.anomalies.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-destructive">
                      ⚠️ {log.anomalies.join(', ')}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
