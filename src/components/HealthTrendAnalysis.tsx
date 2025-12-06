import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Calendar, MessageSquare, Activity, Loader2 } from "lucide-react";
import { useHealthTrendAnalysis } from "@/hooks/useHealthTrendAnalysis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const HealthTrendAnalysis = () => {
  const { analysis, statistics, loading, analyzeTrend } = useHealthTrendAnalysis();
  const [daysBack, setDaysBack] = useState<number>(7);

  const handleAnalyze = () => {
    analyzeTrend(undefined, daysBack);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>การวิเคราะห์แนวโน้มสุขภาพ</CardTitle>
              <CardDescription>
                วิเคราะห์แนวโน้มจากประวัติการสนทนาและข้อมูลสุขภาพ
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Select
            value={daysBack.toString()}
            onValueChange={(value) => setDaysBack(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="เลือกช่วงเวลา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 วันที่ผ่านมา</SelectItem>
              <SelectItem value="7">7 วันที่ผ่านมา</SelectItem>
              <SelectItem value="14">14 วันที่ผ่านมา</SelectItem>
              <SelectItem value="30">30 วันที่ผ่านมา</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAnalyze} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังวิเคราะห์...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                วิเคราะห์แนวโน้ม
              </>
            )}
          </Button>
        </div>

        {statistics && (
          <>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary mb-2" />
                <span className="text-2xl font-bold">{statistics.totalConversations}</span>
                <span className="text-xs text-muted-foreground">การสนทนา</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <Activity className="h-5 w-5 text-primary mb-2" />
                <span className="text-2xl font-bold">{statistics.totalHealthLogs}</span>
                <span className="text-xs text-muted-foreground">บันทึก PHRI</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <Calendar className="h-5 w-5 text-primary mb-2" />
                <span className="text-2xl font-bold">{statistics.daysAnalyzed}</span>
                <span className="text-xs text-muted-foreground">วันที่วิเคราะห์</span>
              </div>
            </div>
          </>
        )}

        {analysis && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  ผลการวิเคราะห์
                </Badge>
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="p-4 bg-muted/30 rounded-lg whitespace-pre-wrap">
                  {analysis}
                </div>
              </div>
            </div>
          </>
        )}

        {loading && !analysis && (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 bg-muted/30 rounded-lg">
                  <div className="h-5 w-5 bg-muted rounded mx-auto mb-2" />
                  <div className="h-8 w-12 bg-muted rounded mx-auto mb-1" />
                  <div className="h-3 w-16 bg-muted rounded mx-auto" />
                </div>
              ))}
            </div>
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-4 w-5/6 bg-muted rounded" />
            </div>
          </div>
        )}

        {!analysis && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>คลิกปุ่ม "วิเคราะห์แนวโน้ม" เพื่อเริ่มต้น</p>
            <p className="text-sm mt-1">
              ระบบจะวิเคราะห์จากประวัติการสนทนาและข้อมูลสุขภาพของคุณ
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};