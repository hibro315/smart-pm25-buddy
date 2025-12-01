import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PHRIDisplay } from "@/components/PHRIDisplay";
import { PHRITrendChart } from "@/components/PHRITrendChart";
import { PHRIComparison } from "@/components/PHRIComparison";
import { HealthLogsHistory } from "@/components/HealthLogsHistory";
import { WeeklyHealthSummary } from "@/components/WeeklyHealthSummary";
import { HealthTrendAnalysis } from "@/components/HealthTrendAnalysis";
import { HealthCorrelationChart } from "@/components/HealthCorrelationChart";
import { EnhancedSymptomLog } from "@/components/EnhancedSymptomLog";
import { HealthProfileDisplay } from "@/components/HealthProfileDisplay";
import { EnhancedHealthProfileForm } from "@/components/EnhancedHealthProfileForm";
import { UserMenu } from "@/components/UserMenu";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { useEnhancedPHRI } from "@/hooks/useEnhancedPHRI";
import { useAirQualityWithFallback } from "@/hooks/useAirQualityWithFallback";
import { useDailySymptoms } from "@/hooks/useDailySymptoms";
import { Activity, TrendingUp, History, User } from "lucide-react";
import { useState, useEffect } from "react";

const Dashboard = () => {
  const { profile } = useHealthProfile();
  const { calculateEnhancedPHRI } = useEnhancedPHRI();
  const { data } = useAirQualityWithFallback();
  const { todaySymptoms } = useDailySymptoms();
  const [phriResult, setPhriResult] = useState<any>(undefined);

  useEffect(() => {
    if (data && profile) {
      const symptoms: string[] = [];
      if (todaySymptoms?.cough) symptoms.push('cough');
      if (todaySymptoms?.sneeze) symptoms.push('sneeze');
      if (todaySymptoms?.wheezing) symptoms.push('wheezing');
      if (todaySymptoms?.chest_tightness) symptoms.push('chest tightness');
      if (todaySymptoms?.shortness_of_breath) symptoms.push('shortness of breath');
      if (todaySymptoms?.eye_irritation) symptoms.push('eye irritation');
      if (todaySymptoms?.fatigue) symptoms.push('fatigue');

      const result = calculateEnhancedPHRI({
        pm25: data.pm25,
        aqi: data.aqi,
        pm10: data.pm10,
        no2: data.no2,
        o3: data.o3,
        co: data.co,
        so2: data.so2,
        temperature: data.temperature,
        humidity: data.humidity,
        pressure: data.pressure,
        wind: data.wind,
        nearbyStations: data.nearbyStations,
        age: profile.age,
        gender: profile.gender || 'male',
        chronicConditions: profile.chronicConditions || [],
        dustSensitivity: (profile.dustSensitivity as 'low' | 'medium' | 'high') || 'medium',
        physicalActivity: (profile.physicalActivity as 'sedentary' | 'moderate' | 'active') || 'moderate',
        hasAirPurifier: profile.hasAirPurifier || false,
        outdoorTime: 60,
        wearingMask: false,
        hasSymptoms: symptoms.length > 0,
        symptoms: symptoms,
        location: data.location,
      });
      setPhriResult(result);
    }
  }, [data, profile, todaySymptoms, calculateEnhancedPHRI]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Health Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">ภาพรวมสุขภาพและ PHRI ของคุณ</p>
          </div>
          <UserMenu />
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Quick PHRI Display */}
        <PHRIDisplay result={phriResult} />

        {/* Enhanced Symptom Log */}
        <EnhancedSymptomLog />

        {/* Main Content Tabs */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">เทรนด์</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">วิเคราะห์</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">ประวัติ</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">โปรไฟล์</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <HealthCorrelationChart />
            <PHRITrendChart />
            <PHRIComparison />
            <WeeklyHealthSummary />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <HealthTrendAnalysis />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <HealthLogsHistory />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            {profile ? (
              <HealthProfileDisplay 
                profile={{
                  name: '',
                  age: String(profile.age),
                  conditions: profile.chronicConditions || [],
                  emergencyContact: '',
                  medications: ''
                }}
                onEdit={() => {
                  // Handle edit - could open a modal or navigate
                }}
              />
            ) : (
              <EnhancedHealthProfileForm />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
