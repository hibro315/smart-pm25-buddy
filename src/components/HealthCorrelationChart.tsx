import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CorrelationData {
  date: string;
  symptomScore: number;
  pm25: number;
  aqi: number;
}

export const HealthCorrelationChart = () => {
  const [data, setData] = useState<CorrelationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysBack, setDaysBack] = useState<number>(14);

  useEffect(() => {
    loadCorrelationData();
  }, [daysBack]);

  const loadCorrelationData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch symptom data
      const { data: symptoms, error: symptomsError } = await supabase
        .from('daily_symptoms')
        .select('log_date, symptom_score')
        .eq('user_id', user.id)
        .gte('log_date', startDateStr)
        .order('log_date', { ascending: true });

      if (symptomsError) throw symptomsError;

      // Fetch health logs (which contain PM2.5 and AQI data)
      const { data: healthLogs, error: logsError } = await supabase
        .from('health_logs')
        .select('log_date, pm25, aqi')
        .eq('user_id', user.id)
        .gte('log_date', startDateStr)
        .order('log_date', { ascending: true });

      if (logsError) throw logsError;

      // Merge data by date - prioritize health_logs for PM2.5/AQI
      const correlationMap = new Map<string, CorrelationData>();

      // First add all health logs with PM2.5/AQI data
      healthLogs?.forEach(log => {
        correlationMap.set(log.log_date, {
          date: log.log_date,
          symptomScore: 0,
          pm25: Number(log.pm25) || 0,
          aqi: log.aqi || 0,
        });
      });

      // Then merge symptom scores
      symptoms?.forEach(symptom => {
        const existing = correlationMap.get(symptom.log_date);
        if (existing) {
          existing.symptomScore = symptom.symptom_score || 0;
        } else {
          correlationMap.set(symptom.log_date, {
            date: symptom.log_date,
            symptomScore: symptom.symptom_score || 0,
            pm25: 0,
            aqi: 0,
          });
        }
      });

      // If today has no PM2.5 data, try to get from localStorage cache
      const todayData = correlationMap.get(todayStr);
      if (!todayData || todayData.pm25 === 0) {
        try {
          const cachedAQI = localStorage.getItem('airQualityCache');
          if (cachedAQI) {
            const parsed = JSON.parse(cachedAQI);
            if (parsed.pm25) {
              if (todayData) {
                todayData.pm25 = parsed.pm25;
                todayData.aqi = parsed.aqi || 0;
              } else {
                correlationMap.set(todayStr, {
                  date: todayStr,
                  symptomScore: 0,
                  pm25: parsed.pm25,
                  aqi: parsed.aqi || 0,
                });
              }
            }
          }
        } catch (e) {
          console.log('No cached AQI data');
        }
      }

      const correlationData = Array.from(correlationMap.values())
        .filter(d => d.pm25 > 0 || d.symptomScore > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

      setData(correlationData);
    } catch (error) {
      console.error('Error loading correlation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCorrelation = (): number => {
    if (data.length < 2) return 0;

    const validData = data.filter(d => d.symptomScore > 0 && d.pm25 > 0);
    if (validData.length < 2) return 0;

    const n = validData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    validData.forEach(d => {
      sumX += d.pm25;
      sumY += d.symptomScore;
      sumXY += d.pm25 * d.symptomScore;
      sumX2 += d.pm25 * d.pm25;
      sumY2 += d.symptomScore * d.symptomScore;
    });

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

    if (denominator === 0) return 0;
    return numerator / denominator;
  };

  const correlation = calculateCorrelation();
  const correlationPercent = (Math.abs(correlation) * 100).toFixed(1);
  const correlationType = correlation > 0.5 ? 'แรง' : correlation > 0.3 ? 'ปานกลาง' : 'อ่อน';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>ความสัมพันธ์ระหว่างอาการกับ PM2.5</CardTitle>
              <CardDescription>
                วิเคราะห์ว่าอาการแย่ลงเมื่อฝุ่นสูงขึ้นหรือไม่
              </CardDescription>
            </div>
          </div>
          <Select value={daysBack.toString()} onValueChange={(v) => setDaysBack(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 วัน</SelectItem>
              <SelectItem value="14">14 วัน</SelectItem>
              <SelectItem value="30">30 วัน</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>ยังไม่มีข้อมูลเพียงพอในการวิเคราะห์</p>
            <p className="text-sm mt-2">กรุณาบันทึกอาการและ PHRI อย่างน้อย 2 วัน</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Correlation Statistics */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{correlationPercent}%</div>
                <div className="text-xs text-muted-foreground">ค่าสหสัมพันธ์</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{correlationType}</div>
                <div className="text-xs text-muted-foreground">ความสัมพันธ์</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.length}</div>
                <div className="text-xs text-muted-foreground">จำนวนวัน</div>
              </div>
            </div>

            {/* Line Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="symptomScore" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="คะแนนอาการ"
                  dot={{ fill: 'hsl(var(--destructive))' }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="pm25" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="PM2.5 (µg/m³)"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Scatter Plot */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">กราฟแบบกระจาย (Scatter Plot)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number" 
                    dataKey="pm25" 
                    name="PM2.5" 
                    unit=" µg/m³"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="symptomScore" 
                    name="คะแนนอาการ"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'pm25') return [`${value} µg/m³`, 'PM2.5'];
                      if (name === 'symptomScore') return [value, 'คะแนนอาการ'];
                      return [value, name];
                    }}
                  />
                  <Scatter 
                    data={data} 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Interpretation */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-semibold text-sm mb-2">การตีความผล</h4>
              <p className="text-sm text-muted-foreground">
                {correlation > 0.5 && (
                  <>
                    <strong className="text-destructive">พบความสัมพันธ์ในเชิงบวกแรง</strong> ระหว่างคะแนนอาการกับระดับ PM2.5 
                    หมายความว่าเมื่อฝุ่น PM2.5 สูงขึ้น อาการของคุณมีแนวโน้มแย่ลงอย่างชัดเจน 
                    ควรหลีกเลี่ยงการอยู่กลางแจ้งในวันที่ฝุ่นสูง
                  </>
                )}
                {correlation > 0.3 && correlation <= 0.5 && (
                  <>
                    <strong className="text-orange-500">พบความสัมพันธ์ในเชิงบวกปานกลาง</strong> ระหว่างคะแนนอาการกับระดับ PM2.5 
                    อาการของคุณมีแนวโน้มแย่ลงบ้างเมื่อฝุ่นสูงขึ้น แต่อาจมีปัจจัยอื่นเข้ามาเกี่ยวข้องด้วย
                  </>
                )}
                {correlation <= 0.3 && (
                  <>
                    <strong>พบความสัมพันธ์อ่อน</strong> ระหว่างคะแนนอาการกับระดับ PM2.5 
                    อาการของคุณอาจไม่ได้รับผลกระทบโดยตรงจากฝุ่น หรืออาจมีปัจจัยอื่นที่มีผลมากกว่า
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};