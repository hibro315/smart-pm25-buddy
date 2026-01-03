/**
 * AQI History Dashboard Component
 * 
 * Displays historical AQI data showing the maximum AQI for each day
 * over the past 7+ days from health_logs table.
 * 
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  Calendar, TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, Activity 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyAQIData {
  date: string;
  maxAqi: number;
  avgAqi: number;
  maxPm25: number;
  avgPm25: number;
  logCount: number;
}

interface AQIHistoryDashboardProps {
  daysBack?: number;
  className?: string;
}

const AQI_COLORS = {
  good: '#00e400',
  moderate: '#ffff00',
  sensitive: '#ff7e00',
  unhealthy: '#ff0000',
  veryUnhealthy: '#8f3f97',
  hazardous: '#7e0023',
};

const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return AQI_COLORS.good;
  if (aqi <= 100) return AQI_COLORS.moderate;
  if (aqi <= 150) return AQI_COLORS.sensitive;
  if (aqi <= 200) return AQI_COLORS.unhealthy;
  if (aqi <= 300) return AQI_COLORS.veryUnhealthy;
  return AQI_COLORS.hazardous;
};

const getAQILevel = (aqi: number): { label: string; labelTh: string } => {
  if (aqi <= 50) return { label: 'Good', labelTh: 'ดี' };
  if (aqi <= 100) return { label: 'Moderate', labelTh: 'ปานกลาง' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', labelTh: 'ไม่ดีต่อกลุ่มเสี่ยง' };
  if (aqi <= 200) return { label: 'Unhealthy', labelTh: 'ไม่ดีต่อสุขภาพ' };
  if (aqi <= 300) return { label: 'Very Unhealthy', labelTh: 'ไม่ดีต่อสุขภาพมาก' };
  return { label: 'Hazardous', labelTh: 'อันตราย' };
};

export const AQIHistoryDashboard = ({ 
  daysBack = 7,
  className 
}: AQIHistoryDashboardProps) => {
  const { t, language } = useLanguage();
  const [data, setData] = useState<DailyAQIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoricalData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        setError('กรุณาเข้าสู่ระบบ');
        setLoading(false);
        return;
      }

      const startDate = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
      
      const { data: logs, error: fetchError } = await supabase
        .from('health_logs')
        .select('log_date, aqi, pm25')
        .eq('user_id', session.session.user.id)
        .gte('log_date', startDate)
        .order('log_date', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // Group by date and calculate max/avg
      const grouped: Record<string, { aqi: number[]; pm25: number[] }> = {};
      
      logs?.forEach(log => {
        const date = log.log_date;
        if (!grouped[date]) {
          grouped[date] = { aqi: [], pm25: [] };
        }
        if (log.aqi) grouped[date].aqi.push(log.aqi);
        if (log.pm25) grouped[date].pm25.push(log.pm25);
      });

      // Fill in missing dates with zero
      const result: DailyAQIData[] = [];
      for (let i = daysBack; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const dayData = grouped[date];
        
        if (dayData && dayData.aqi.length > 0) {
          result.push({
            date,
            maxAqi: Math.max(...dayData.aqi),
            avgAqi: Math.round(dayData.aqi.reduce((a, b) => a + b, 0) / dayData.aqi.length),
            maxPm25: Math.max(...dayData.pm25),
            avgPm25: Math.round(dayData.pm25.reduce((a, b) => a + b, 0) / dayData.pm25.length * 10) / 10,
            logCount: dayData.aqi.length,
          });
        } else {
          result.push({
            date,
            maxAqi: 0,
            avgAqi: 0,
            maxPm25: 0,
            avgPm25: 0,
            logCount: 0,
          });
        }
      }

      setData(result);
    } catch (err: any) {
      console.error('Error fetching AQI history:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoricalData();
  }, [daysBack]);

  // Calculate trend
  const getTrend = () => {
    const validData = data.filter(d => d.maxAqi > 0);
    if (validData.length < 2) return null;
    
    const recent = validData.slice(-3).reduce((a, b) => a + b.maxAqi, 0) / Math.min(3, validData.length);
    const older = validData.slice(0, 3).reduce((a, b) => a + b.maxAqi, 0) / Math.min(3, validData.length);
    
    const diff = recent - older;
    if (diff > 10) return { direction: 'up', value: Math.round(diff) };
    if (diff < -10) return { direction: 'down', value: Math.round(Math.abs(diff)) };
    return { direction: 'stable', value: 0 };
  };

  const trend = getTrend();
  const maxRecord = data.reduce((max, d) => d.maxAqi > max.maxAqi ? d : max, data[0] || { maxAqi: 0, date: '' });
  const avgMaxAqi = Math.round(data.filter(d => d.maxAqi > 0).reduce((a, b) => a + b.maxAqi, 0) / (data.filter(d => d.maxAqi > 0).length || 1));

  if (loading) {
    return (
      <Card className={cn("p-5 space-y-4", className)}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-5 text-center", className)}>
        <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchHistoricalData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          ลองใหม่
        </Button>
      </Card>
    );
  }

  return (
    <Card className={cn("p-5 space-y-4 border-0 bg-card/80 backdrop-blur-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {language === 'th' ? `ประวัติ AQI ${daysBack} วัน` : `${daysBack}-Day AQI History`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === 'th' ? 'ค่า AQI สูงสุดต่อวัน' : 'Maximum AQI per day'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchHistoricalData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Chart */}
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted)/0.3)" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => format(parseISO(date), 'd', { locale: th })}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--muted)/0.3)' }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--muted)/0.3)' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as DailyAQIData;
                  const level = getAQILevel(d.maxAqi);
                  return (
                    <div className="bg-popover/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
                      <p className="font-medium text-sm">
                        {format(parseISO(label), 'EEEE d MMM', { locale: th })}
                      </p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">AQI สูงสุด:</span>
                          <span className="font-bold" style={{ color: getAQIColor(d.maxAqi) }}>
                            {d.maxAqi} ({level.labelTh})
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">AQI เฉลี่ย:</span>
                          <span>{d.avgAqi}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">PM2.5 สูงสุด:</span>
                          <span>{d.maxPm25} µg/m³</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">จำนวนบันทึก:</span>
                          <span>{d.logCount} รายการ</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={50} stroke={AQI_COLORS.good} strokeDasharray="3 3" />
            <ReferenceLine y={100} stroke={AQI_COLORS.moderate} strokeDasharray="3 3" />
            <ReferenceLine y={150} stroke={AQI_COLORS.sensitive} strokeDasharray="3 3" />
            <Bar dataKey="maxAqi" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.maxAqi > 0 ? getAQIColor(entry.maxAqi) : 'hsl(var(--muted))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {/* Max Record */}
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            {language === 'th' ? 'สูงสุด' : 'Peak'}
          </p>
          <p className="text-xl font-bold" style={{ color: getAQIColor(maxRecord?.maxAqi || 0) }}>
            {maxRecord?.maxAqi || '-'}
          </p>
          {maxRecord?.date && (
            <p className="text-[10px] text-muted-foreground">
              {format(parseISO(maxRecord.date), 'd MMM', { locale: th })}
            </p>
          )}
        </div>

        {/* Average */}
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            {language === 'th' ? 'เฉลี่ย' : 'Average'}
          </p>
          <p className="text-xl font-bold" style={{ color: getAQIColor(avgMaxAqi) }}>
            {avgMaxAqi || '-'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {getAQILevel(avgMaxAqi).labelTh}
          </p>
        </div>

        {/* Trend */}
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            {language === 'th' ? 'แนวโน้ม' : 'Trend'}
          </p>
          {trend ? (
            <div className="flex items-center justify-center gap-1">
              {trend.direction === 'up' && (
                <>
                  <TrendingUp className="h-5 w-5 text-destructive" />
                  <span className="text-lg font-bold text-destructive">+{trend.value}</span>
                </>
              )}
              {trend.direction === 'down' && (
                <>
                  <TrendingDown className="h-5 w-5 text-success" />
                  <span className="text-lg font-bold text-success">-{trend.value}</span>
                </>
              )}
              {trend.direction === 'stable' && (
                <>
                  <Minus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg font-bold text-muted-foreground">คงที่</span>
                </>
              )}
            </div>
          ) : (
            <p className="text-lg text-muted-foreground">-</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            {language === 'th' ? 'เทียบกับสัปดาห์ก่อน' : 'vs last week'}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-muted/30">
        {[
          { max: 50, label: 'ดี' },
          { max: 100, label: 'ปานกลาง' },
          { max: 150, label: 'ไม่ดีต่อกลุ่มเสี่ยง' },
          { max: 200, label: 'ไม่ดีต่อสุขภาพ' },
        ].map((level, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: getAQIColor(level.max) }} 
            />
            <span className="text-[10px] text-muted-foreground">{level.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AQIHistoryDashboard;
