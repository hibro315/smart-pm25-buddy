import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, TrendingUp, History, User } from "lucide-react";

export const DashboardLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Skeleton */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* PHRI Display Skeleton */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-6">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Symptom Log Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-10 w-full mt-4" />
          </CardContent>
        </Card>

        {/* Tabs Skeleton */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="trends" className="flex items-center gap-2" disabled>
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">เทรนด์</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2" disabled>
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">วิเคราะห์</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" disabled>
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">ประวัติ</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2" disabled>
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">โปรไฟล์</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <ChartSkeleton title="ความสัมพันธ์ระหว่างอาการกับ PM2.5" />
            <ChartSkeleton title="กราฟแนวโน้ม PHRI" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export const ChartSkeleton = ({ title = "กำลังโหลด..." }: { title?: string }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <div>
              <Skeleton className="h-5 w-48 mb-1" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          {/* Chart Area */}
          <div className="relative">
            <Skeleton className="h-[300px] w-full rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground text-sm">
                กำลังโหลดกราฟ...
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const HistorySkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        {/* Log Items */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const AnalysisSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <div>
            <Skeleton className="h-5 w-48 mb-1" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </CardContent>
    </Card>
  );
};
