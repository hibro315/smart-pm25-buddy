import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePHRI } from '@/hooks/usePHRI';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export const HealthLogsHistory = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchHealthLogs } = usePHRI();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchHealthLogs(30);
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (phri: number): 'safe' | 'moderate' | 'high' => {
    if (phri >= 100) return 'high';
    if (phri >= 50) return 'moderate';
    return 'safe';
  };

  const getBadgeVariant = (level: 'safe' | 'moderate' | 'high') => {
    switch (level) {
      case 'high': return 'destructive';
      case 'moderate': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            ประวัติการบันทึก
          </CardTitle>
          <CardDescription>กำลังโหลดข้อมูล...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Skeleton */}
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg text-center animate-pulse">
                <div className="h-3 w-16 mx-auto bg-muted rounded mb-2" />
                <div className="h-6 w-12 mx-auto bg-muted rounded" />
              </div>
            ))}
          </div>
          {/* Log Items Skeleton */}
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-6 w-20 bg-muted rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-3 w-28 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
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
            <Calendar className="h-5 w-5" />
            ประวัติการบันทึก
          </CardTitle>
          <CardDescription>ยังไม่มีข้อมูลประวัติ</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate statistics
  const avgPHRI = logs.reduce((sum, log) => sum + parseFloat(log.phri), 0) / logs.length;
  const maxPHRI = Math.max(...logs.map(log => parseFloat(log.phri)));
  const totalOutdoorTime = logs.reduce((sum, log) => sum + log.outdoor_time, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          ประวัติการบันทึก ({logs.length} รายการ)
        </CardTitle>
        <CardDescription>ข้อมูลย้อนหลัง 30 วัน</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">PHRI เฉลี่ย</div>
            <div className="text-lg font-bold">{avgPHRI.toFixed(1)}</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">PHRI สูงสุด</div>
            <div className="text-lg font-bold text-destructive">{maxPHRI.toFixed(1)}</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">เวลารวม</div>
            <div className="text-lg font-bold">{totalOutdoorTime} น.</div>
          </div>
        </div>

        {/* Logs List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {logs.map((log) => {
              const riskLevel = getRiskLevel(parseFloat(log.phri));
              return (
                <div
                  key={log.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatDate(log.log_date)}
                      </span>
                    </div>
                    <Badge variant={getBadgeVariant(riskLevel) as any}>
                      PHRI: {parseFloat(log.phri).toFixed(1)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">AQI:</span> {log.aqi}
                    </div>
                    <div>
                      <span className="font-medium">PM2.5:</span> {log.pm25} µg/m³
                    </div>
                    <div>
                      <span className="font-medium">เวลากลางแจ้ง:</span> {log.outdoor_time} นาที
                    </div>
                    <div>
                      <span className="font-medium">อายุ:</span> {log.age} ปี
                    </div>
                  </div>

                  {log.has_symptoms && log.symptoms && log.symptoms.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">อาการ:</span>{' '}
                        {log.symptoms.join(', ')}
                      </div>
                    </div>
                  )}

                  {log.location && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium">สถานที่:</span> {log.location}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
