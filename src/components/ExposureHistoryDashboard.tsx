import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useExposureHistory } from '@/hooks/useExposureHistory';
import { Calendar, TrendingUp, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const ExposureHistoryDashboard = () => {
  const { exposureLogs, summary, loading, loadExposureLogs, syncToBackend } = useExposureHistory();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadExposureLogs();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncToBackend();
    await loadExposureLogs();
    setSyncing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">ประวัติการสัมผัสฝุ่น PM2.5</h3>
          </div>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            ซิงค์ข้อมูล
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">บันทึกทั้งหมด</p>
            <p className="text-2xl font-bold">{exposureLogs.length}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">PM2.5 เฉลี่ย</p>
            <p className="text-2xl font-bold">
              {exposureLogs.length > 0
                ? Math.round(exposureLogs.reduce((sum, log) => sum + log.pm25, 0) / exposureLogs.length)
                : 0}
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">PHRI เฉลี่ย</p>
            <p className="text-2xl font-bold">
              {exposureLogs.length > 0
                ? (exposureLogs.reduce((sum, log) => sum + log.phri, 0) / exposureLogs.length).toFixed(1)
                : 0}
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">รอซิงค์</p>
            <p className="text-2xl font-bold text-warning">
              {exposureLogs.filter(log => !log.synced).length}
            </p>
          </div>
        </div>

        {summary && (
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="hourly">
                <Calendar className="w-4 h-4 mr-1" />
                รายชั่วโมง
              </TabsTrigger>
              <TabsTrigger value="daily">
                <Calendar className="w-4 h-4 mr-1" />
                รายวัน
              </TabsTrigger>
              <TabsTrigger value="weekly">
                <Calendar className="w-4 h-4 mr-1" />
                รายสัปดาห์
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hourly" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.hourly.slice(0, 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleString('th-TH')}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="pm25" stroke="hsl(var(--destructive))" name="PM2.5" />
                    <Line type="monotone" dataKey="phri" stroke="hsl(var(--primary))" name="PHRI" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="daily" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.daily.slice(0, 14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('th-TH')}
                    />
                    <Legend />
                    <Bar dataKey="avgPM25" fill="hsl(var(--destructive))" name="PM2.5 เฉลี่ย" />
                    <Bar dataKey="avgPHRI" fill="hsl(var(--primary))" name="PHRI เฉลี่ย" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">สถานที่ที่เคยไป (14 วันล่าสุด)</p>
                <div className="flex flex-wrap gap-2">
                  {summary.daily
                    .slice(0, 14)
                    .flatMap(d => d.locationsVisited)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((location, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                        <MapPin className="w-3 h-3" />
                        {location}
                      </div>
                    ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.weekly.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(value) => `สัปดาห์ ${new Date(value).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}`}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => `สัปดาห์เริ่มต้น: ${new Date(value).toLocaleDateString('th-TH')}`}
                    />
                    <Legend />
                    <Bar dataKey="avgPM25" fill="hsl(var(--destructive))" name="PM2.5 เฉลี่ย" />
                    <Bar dataKey="highRiskDays" fill="hsl(var(--warning))" name="วันเสี่ยงสูง" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                {summary.weekly.slice(0, 3).map((week, i) => (
                  <div key={i} className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(week.week).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm font-semibold">PM2.5: {week.avgPM25}</p>
                    <p className="text-sm font-semibold">PHRI: {week.avgPHRI}</p>
                    <p className="text-xs text-destructive mt-1">
                      {week.highRiskDays} วันเสี่ยงสูง
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {exposureLogs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>ยังไม่มีข้อมูลการสัมผัสฝุ่น</p>
            <p className="text-sm mt-1">เริ่มบันทึกข้อมูลด้วยการคำนวณ PHRI</p>
          </div>
        )}
      </Card>
    </div>
  );
};
