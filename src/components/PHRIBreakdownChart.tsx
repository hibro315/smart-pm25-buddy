import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useDominantFactor } from '@/hooks/usePHRIAnimation';
import { cn } from '@/lib/utils';
import { TrendingUp, Shield } from 'lucide-react';

interface PHRIBreakdownChartProps {
  breakdown?: {
    environmentalScore?: number;
    weatherScore?: number;
    aqiScore?: number;
    nearbyAreaScore?: number;
    personalScore?: number;
    behavioralScore?: number;
    symptomScore?: number;
    protectiveScore?: number;
  };
  className?: string;
}

const FACTOR_CONFIG = {
  environmentalScore: { label: 'สิ่งแวดล้อม', color: 'hsl(217 91% 60%)' },
  weatherScore: { label: 'สภาพอากาศ', color: 'hsl(197 91% 55%)' },
  aqiScore: { label: 'คุณภาพอากาศ', color: 'hsl(38 92% 50%)' },
  nearbyAreaScore: { label: 'พื้นที่ใกล้เคียง', color: 'hsl(142 71% 45%)' },
  personalScore: { label: 'ปัจจัยส่วนตัว', color: 'hsl(282 44% 55%)' },
  behavioralScore: { label: 'พฤติกรรม', color: 'hsl(33 100% 50%)' },
  symptomScore: { label: 'อาการ', color: 'hsl(0 84% 60%)' },
  protectiveScore: { label: 'การป้องกัน', color: 'hsl(142 71% 55%)' },
};

export const PHRIBreakdownChart = ({ breakdown, className }: PHRIBreakdownChartProps) => {
  const chartData = useMemo(() => {
    if (!breakdown) return [];

    return Object.entries(breakdown)
      .filter(([key, value]) => value !== undefined && value > 0 && key !== 'protectiveScore')
      .map(([key, value]) => ({
        name: FACTOR_CONFIG[key as keyof typeof FACTOR_CONFIG]?.label || key,
        value: Math.abs(value || 0),
        color: FACTOR_CONFIG[key as keyof typeof FACTOR_CONFIG]?.color || 'hsl(var(--muted))',
        key,
      }))
      .sort((a, b) => b.value - a.value);
  }, [breakdown]);

  const breakdownRecord = useMemo(() => {
    if (!breakdown) return {};
    return Object.fromEntries(
      Object.entries(breakdown).map(([key, value]) => [key, value || 0])
    );
  }, [breakdown]);

  const dominantFactor = useDominantFactor(breakdownRecord);
  const protectiveScore = breakdown?.protectiveScore || 0;

  if (!breakdown || chartData.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            องค์ประกอบความเสี่ยง
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            ยังไม่มีข้อมูลการวิเคราะห์
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium" style={{ color: data.color }}>
            {data.name}
          </p>
          <p className="text-sm text-muted-foreground">
            คะแนน: {data.value.toFixed(1)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          องค์ประกอบความเสี่ยง
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Chart */}
          <div className="h-[200px] w-full lg:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="transition-opacity hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend & Details */}
          <div className="flex-1 space-y-3">
            {/* Dominant Factor Highlight */}
            {dominantFactor && (
              <div 
                className="p-3 rounded-lg border-l-4 animate-fade-in"
                style={{ 
                  borderColor: FACTOR_CONFIG[dominantFactor.name as keyof typeof FACTOR_CONFIG]?.color || 'hsl(var(--primary))',
                  backgroundColor: 'hsl(var(--muted) / 0.5)'
                }}
              >
                <p className="text-xs text-muted-foreground">ปัจจัยหลัก</p>
                <p className="font-medium">
                  {FACTOR_CONFIG[dominantFactor.name as keyof typeof FACTOR_CONFIG]?.label || dominantFactor.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dominantFactor.percentage.toFixed(0)}% ของความเสี่ยงทั้งหมด
                </p>
              </div>
            )}

            {/* Factor List */}
            <div className="space-y-2">
              {chartData.slice(0, 4).map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm flex-1">{item.name}</span>
                  <span className="text-sm font-medium tabular-nums">
                    {item.value.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>

            {/* Protective Factor */}
            {protectiveScore > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 text-success">
                <Shield className="w-4 h-4" />
                <span className="text-sm flex-1">การป้องกัน</span>
                <span className="text-sm font-medium">-{protectiveScore.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
