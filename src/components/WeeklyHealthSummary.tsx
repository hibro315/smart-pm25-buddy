import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWeeklyHealthSummary } from '@/hooks/useWeeklyHealthSummary';
import { Calendar, TrendingUp, Activity, Loader2 } from 'lucide-react';

export const WeeklyHealthSummary = () => {
  const { summary, statistics, period, loading, generateSummary } = useWeeklyHealthSummary();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              สรุปสุขภาพรายสัปดาห์
            </CardTitle>
            <CardDescription>
              วิเคราะห์แนวโน้ม PHRI และอาการจาก AI ย้อนหลัง 7 วัน
            </CardDescription>
          </div>
          <Button 
            onClick={generateSummary} 
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังวิเคราะห์...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                สร้างรายงาน
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!summary && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>คลิก "สร้างรายงาน" เพื่อให้ AI วิเคราะห์สุขภาพของคุณ</p>
          </div>
        )}

        {loading && (
          <div className="space-y-4 animate-pulse">
            {/* Stats Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-muted/30 p-3 rounded-lg">
                  <div className="h-3 w-16 bg-muted rounded mb-2" />
                  <div className="h-8 w-12 bg-muted rounded" />
                </div>
              ))}
            </div>
            {/* Badge Skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-6 w-32 bg-muted rounded-full" />
              <div className="h-6 w-24 bg-muted rounded-full" />
            </div>
            {/* Content Skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-4 w-5/6 bg-muted rounded" />
              <div className="h-4 w-2/3 bg-muted rounded" />
            </div>
          </div>
        )}

        {summary && statistics && period && (
          <>
            {/* Statistics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-primary/10 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">PHRI เฉลี่ย</div>
                <div className="text-2xl font-bold text-primary">{statistics.avgPhri}</div>
              </div>
              <div className="bg-secondary/10 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">AQI เฉลี่ย</div>
                <div className="text-2xl font-bold text-secondary-foreground">{statistics.avgAqi}</div>
              </div>
              <div className="bg-accent/10 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">คะแนนอาการ</div>
                <div className="text-2xl font-bold text-accent-foreground">{statistics.avgSymptomScore}</div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">บันทึกทั้งหมด</div>
                <div className="text-2xl font-bold">{statistics.totalLogs}</div>
              </div>
            </div>

            {/* Period Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {period.start} ถึง {period.end}
              </Badge>
              <Badge variant="secondary">
                {statistics.totalSymptomLogs} วันที่มีอาการ
              </Badge>
            </div>

            <Separator />

            {/* AI Generated Summary */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div 
                className="text-sm leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ 
                  __html: summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
