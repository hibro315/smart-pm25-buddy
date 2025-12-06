import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { usePHRI } from '@/hooks/usePHRI';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface TrendData {
  date: string;
  phri: number;
  pm25: number;
  aqi: number;
  riskLevel: string;
}

export const PHRITrendChart = () => {
  const { fetchHealthLogs } = usePHRI();
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');

  useEffect(() => {
    loadTrendData();
  }, []);

  const loadTrendData = async () => {
    try {
      setLoading(true);
      const logs = await fetchHealthLogs(30); // Last 30 entries
      
      const data: TrendData[] = logs.map((log: any) => ({
        date: new Date(log.created_at).toLocaleDateString('th-TH', {
          month: 'short',
          day: 'numeric',
        }),
        phri: log.phri || 0,
        pm25: log.pm25 || 0,
        aqi: log.aqi || 0,
        riskLevel: getRiskLevel(log.phri || 0),
      }));

      setTrendData(data);

      // Calculate trend
      if (data.length >= 2) {
        const recent = data.slice(-5);
        const avg = recent.reduce((sum, d) => sum + d.phri, 0) / recent.length;
        const older = data.slice(-10, -5);
        const oldAvg = older.reduce((sum, d) => sum + d.phri, 0) / older.length;
        
        if (avg > oldAvg + 0.5) setTrend('up');
        else if (avg < oldAvg - 0.5) setTrend('down');
        else setTrend('stable');
      }
    } catch (error) {
      console.error('Error loading trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (phri: number) => {
    if (phri >= 9) return 'emergency';
    if (phri >= 6) return 'urgent';
    if (phri >= 3) return 'warning';
    return 'info';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-5 w-5 text-destructive" />;
    if (trend === 'down') return <TrendingDown className="h-5 w-5 text-success" />;
    return <Activity className="h-5 w-5 text-muted-foreground" />;
  };

  const getTrendText = () => {
    if (trend === 'up') return 'ความเสี่ยงเพิ่มขึ้น';
    if (trend === 'down') return 'ความเสี่ยงลดลง';
    return 'ความเสี่ยงคงที่';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>กราฟแนวโน้ม PHRI</CardTitle>
              <CardDescription>กำลังโหลดข้อมูล...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-[300px] bg-muted/30 rounded-lg animate-pulse flex items-center justify-center">
              <Activity className="h-8 w-8 text-muted-foreground animate-pulse" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>กราฟแนวโน้ม PHRI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">ยังไม่มีข้อมูลเพียงพอสำหรับแสดงกราฟ</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>กราฟแนวโน้ม PHRI</CardTitle>
            <CardDescription>แนวโน้มความเสี่ยงส่วนบุคคล 30 รายการล่าสุด</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {getTrendIcon()}
            <span>{getTrendText()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="colorPHRI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              domain={[0, 10]} 
              ticks={[0, 2, 3, 6, 9, 10]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                      <p className="font-semibold">{data.date}</p>
                      <p className="text-sm">PHRI: <span className="font-bold">{data.phri.toFixed(1)}/10</span></p>
                      <p className="text-sm">PM2.5: {data.pm25.toFixed(1)} µg/m³</p>
                      <p className="text-sm">AQI: {data.aqi}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="phri"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPHRI)"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Risk Level Indicators */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-success rounded-full"></div>
            <span>ปลอดภัย (0-2)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-warning rounded-full"></div>
            <span>เตือน (3-5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-destructive rounded-full"></div>
            <span>เร่งด่วน (6-8)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-destructive brightness-75 rounded-full"></div>
            <span>ฉุกเฉิน (9-10)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
