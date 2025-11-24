import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { Progress } from '@/components/ui/progress';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard = ({ title, value, description, icon, trend }: MetricCardProps) => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

export const PerformanceDashboard = () => {
  const { getPerformanceStats } = usePerformanceMonitor();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    airQuality: any[];
    locationMonitor: any[];
    notification: any[];
  }>({
    airQuality: [],
    locationMonitor: [],
    notification: []
  });

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const [airQuality, locationMonitor, notification] = await Promise.all([
          getPerformanceStats('air_quality'),
          getPerformanceStats('location_monitor'),
          getPerformanceStats('notification')
        ]);

        setStats({
          airQuality,
          locationMonitor,
          notification
        });
      } catch (error) {
        console.error('Failed to load performance stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [getPerformanceStats]);

  const calculateOverallStats = (statsList: any[]) => {
    if (!statsList || statsList.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        avgLatency: 0,
        errorRate: 0
      };
    }

    const total = statsList.reduce((sum, s) => sum + s.totalCalls, 0);
    const successful = statsList.reduce((sum, s) => sum + s.successfulCalls, 0);
    const avgLatency = statsList.reduce((sum, s) => sum + s.avgLatencyMs, 0) / statsList.length;

    return {
      totalCalls: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgLatency: avgLatency,
      errorRate: total > 0 ? ((total - successful) / total) * 100 : 0
    };
  };

  const renderSystemMetrics = (title: string, statsList: any[]) => {
    const overall = calculateOverallStats(statsList);

    if (loading) {
      return (
        <div className="space-y-4">
          <div className="text-center text-muted-foreground py-8">กำลังโหลดข้อมูล...</div>
        </div>
      );
    }

    if (overall.totalCalls === 0) {
      return (
        <div className="space-y-4">
          <div className="text-center text-muted-foreground py-8">
            ยังไม่มีข้อมูลการใช้งาน
            <p className="text-xs mt-2">ข้อมูลจะปรากฏเมื่อมีการใช้งานระบบ</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            title="Accuracy (Success Rate)"
            value={`${overall.successRate.toFixed(1)}%`}
            description={`${overall.totalCalls} การเรียกใช้ทั้งหมด`}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <MetricCard
            title="Error Rate"
            value={`${overall.errorRate.toFixed(1)}%`}
            description={`${overall.totalCalls - Math.round(overall.totalCalls * overall.successRate / 100)} ครั้งล้มเหลว`}
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            title="Average Response Time (Latency)"
            value={`${overall.avgLatency.toFixed(0)} ms`}
            description="เวลาเฉลี่ยในการตอบสนอง"
            icon={<Clock className="h-4 w-4" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">รายละเอียดการทำงาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statsList.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stat.operation || 'Unknown'}</span>
                  <span className="text-muted-foreground">{stat.totalCalls} calls</span>
                </div>
                <Progress value={stat.successRate} className="h-2" />
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>Success: {stat.successRate.toFixed(1)}%</div>
                  <div>Avg: {stat.avgLatencyMs.toFixed(0)}ms</div>
                  <div>P95: {stat.p95LatencyMs.toFixed(0)}ms</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            ประเมินประสิทธิภาพระบบ
          </CardTitle>
          <CardDescription>
            วัดค่า Accuracy, Latency, Error Rate และ Response Time จากการใช้งานจริง (7 วันล่าสุด)
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="air-quality" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="air-quality">ระบบคุณภาพอากาศ</TabsTrigger>
          <TabsTrigger value="location">ระบบตรวจจับตำแหน่ง</TabsTrigger>
          <TabsTrigger value="notification">ระบบแจ้งเตือน</TabsTrigger>
        </TabsList>

        <TabsContent value="air-quality" className="space-y-4">
          {renderSystemMetrics('ระบบตรวจจับคุณภาพอากาศ', stats.airQuality)}
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          {renderSystemMetrics('ระบบตรวจจับตำแหน่ง', stats.locationMonitor)}
        </TabsContent>

        <TabsContent value="notification" className="space-y-4">
          {renderSystemMetrics('ระบบแจ้งเตือน', stats.notification)}
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">หมายเหตุ</p>
              <p className="text-xs text-muted-foreground">
                • <strong>Accuracy (Success Rate)</strong>: อัตราความสำเร็จในการทำงาน<br />
                • <strong>Latency (Response Time)</strong>: เวลาที่ใช้ในการตอบสนอง<br />
                • <strong>Error Rate</strong>: อัตราการเกิดข้อผิดพลาด<br />
                • <strong>P95 Latency</strong>: 95% ของคำขอมีเวลาตอบสนองไม่เกินค่านี้
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
