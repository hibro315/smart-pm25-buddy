import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedPHRIPanel } from "@/components/EnhancedPHRIPanel";
import { DashboardActionButtons } from "@/components/DashboardActionButtons";
import { DecisionBlock } from "@/components/DecisionBlock";
import { PHRITrendChart } from "@/components/PHRITrendChart";
import { PHRIComparison } from "@/components/PHRIComparison";
import { HealthLogsHistory } from "@/components/HealthLogsHistory";
import { WeeklyHealthSummary } from "@/components/WeeklyHealthSummary";
import { HealthTrendAnalysis } from "@/components/HealthTrendAnalysis";
import { HealthCorrelationChart } from "@/components/HealthCorrelationChart";
import { EnhancedSymptomLog } from "@/components/EnhancedSymptomLog";
import { EnhancedHealthProfileForm } from "@/components/EnhancedHealthProfileForm";
import { UserMenu } from "@/components/UserMenu";
import { OnlineStatusBadge } from "@/components/OnlineStatusBadge";
import { DashboardLoadingSkeleton } from "@/components/DashboardLoadingSkeleton";
import { AdaptiveDashboard } from "@/components/AdaptiveDashboard";
import type { DecisionBlockData } from "@/components/DecisionBlock";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { useEnhancedPHRI } from "@/hooks/useEnhancedPHRI";
import { useAirQualityWithFallback } from "@/hooks/useAirQualityWithFallback";
import { useDailySymptoms } from "@/hooks/useDailySymptoms";
import { Activity, TrendingUp, History, User } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

const Dashboard = () => {
  const { profile, loading: profileLoading } = useHealthProfile();
  const { calculateEnhancedPHRI, saveEnhancedPHRILog } = useEnhancedPHRI();
  const { data, loading: airQualityLoading } = useAirQualityWithFallback();
  const { todaySymptoms, getSymptomScore, loading: symptomsLoading } = useDailySymptoms();
  const [phriResult, setPhriResult] = useState<any>(undefined);
  const [decisionData, setDecisionData] = useState<DecisionBlockData | null>(null);
  const [hasSavedToday, setHasSavedToday] = useState(false);

  // Memoize symptom score calculation
  const memoizedSymptomScore = useMemo(() => {
    return getSymptomScore();
  }, [todaySymptoms, getSymptomScore]);

  // Memoize symptoms array
  const symptoms = useMemo(() => {
    const result: string[] = [];
    if (todaySymptoms?.cough) result.push('cough');
    if (todaySymptoms?.sneeze) result.push('sneeze');
    if (todaySymptoms?.wheezing) result.push('wheezing');
    if (todaySymptoms?.chest_tightness) result.push('chest tightness');
    if (todaySymptoms?.shortness_of_breath) result.push('shortness of breath');
    if (todaySymptoms?.eye_irritation) result.push('eye irritation');
    if (todaySymptoms?.fatigue) result.push('fatigue');
    return result;
  }, [todaySymptoms]);

  useEffect(() => {
    if (data && profile) {
      const input = {
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
        outdoorTime: memoizedSymptomScore > 0 ? 60 : 30,
        wearingMask: false,
        hasSymptoms: symptoms.length > 0,
        symptoms: symptoms,
        location: data.location,
      };

      const result = calculateEnhancedPHRI(input);
      setPhriResult(result);

      // Calculate decision data for DecisionBlock
      const hasRespiratoryCondition = (profile.chronicConditions || []).some(c => 
        c.toLowerCase().includes('asthma') || c.toLowerCase().includes('copd')
      );
      
      // Determine risk level from PM2.5
      const pm25 = data.pm25;
      let riskLevel: 'safe' | 'caution' | 'warning' | 'danger' = 'safe';
      let riskScore = 0;
      
      if (hasRespiratoryCondition) {
        if (pm25 >= 100) { riskLevel = 'danger'; riskScore = 90; }
        else if (pm25 >= 50) { riskLevel = 'warning'; riskScore = 70; }
        else if (pm25 >= 25) { riskLevel = 'caution'; riskScore = 45; }
        else { riskLevel = 'safe'; riskScore = 20; }
      } else {
        if (pm25 >= 150) { riskLevel = 'danger'; riskScore = 85; }
        else if (pm25 >= 75) { riskLevel = 'warning'; riskScore = 60; }
        else if (pm25 >= 35) { riskLevel = 'caution'; riskScore = 35; }
        else { riskLevel = 'safe'; riskScore = 15; }
      }
      
      const decisions: Record<typeof riskLevel, string> = {
        safe: 'ทำกิจกรรมกลางแจ้งได้ตามปกติ',
        caution: 'จำกัดกิจกรรมกลางแจ้ง ใส่หน้ากากหากออกนอกอาคาร',
        warning: 'หลีกเลี่ยงกิจกรรมกลางแจ้ง อยู่ในอาคารที่มีเครื่องฟอกอากาศ',
        danger: 'อยู่ในอาคารปิด หลีกเลี่ยงออกนอกบ้านโดยเด็ดขาด',
      };
      
      setDecisionData({
        riskLevel,
        riskScore,
        primaryDecision: decisions[riskLevel],
        supportingFacts: [
          `PM2.5: ${pm25} µg/m³`,
          `AQI: ${data.aqi}`,
          hasRespiratoryCondition ? 'มีโรคทางเดินหายใจ - ปรับเกณฑ์เข้มงวดขึ้น' : '',
        ].filter(Boolean),
        options: [
          {
            id: 'mask',
            action: 'สวมหน้ากาก N95',
            riskReduction: 80,
            feasibility: 'easy' as const,
            timeToImplement: 'ทันที',
          },
          {
            id: 'indoor',
            action: 'อยู่ในอาคาร',
            riskReduction: 60,
            feasibility: 'easy' as const,
            timeToImplement: 'ทันที',
          },
        ],
      });

      // Auto-save PHRI and AQI data to health_logs once per day
      if (!hasSavedToday && data.pm25 > 0) {
        saveEnhancedPHRILog(input, result).then(() => {
          setHasSavedToday(true);
        });
      }
    }
  }, [data, profile, symptoms, memoizedSymptomScore, calculateEnhancedPHRI, saveEnhancedPHRILog, hasSavedToday]);

  // Show skeleton while initial data is loading
  const isInitialLoading = profileLoading || (airQualityLoading && !data);

  if (isInitialLoading) {
    return <DashboardLoadingSkeleton />;
  }

  const currentPhri = phriResult?.phri || 0;

  return (
    <AdaptiveDashboard 
      phri={currentPhri}
      showStateIndicator={true}
      enableAnimations={true}
      className="pb-24"
    >
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b sticky top-16 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Health Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">ภาพรวมสุขภาพและ PHRI ของคุณ</p>
          </div>
          <div className="flex items-center gap-2">
            <OnlineStatusBadge compact showConnectionType />
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Enhanced PHRI Panel with animated counter and breakdown */}
        <EnhancedPHRIPanel 
          result={phriResult} 
          pm25={data?.pm25}
          aqi={data?.aqi}
        />

        {/* DORA Action Buttons */}
        <DashboardActionButtons 
          riskLevel={
            currentPhri < 2.5 ? 'low' : 
            currentPhri < 5 ? 'moderate' : 
            currentPhri < 7.5 ? 'high' : 'severe'
          } 
        />

        {/* Real-time Health Decision Block */}
        {decisionData && (
          <DecisionBlock data={decisionData} compact />
        )}

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
            <EnhancedHealthProfileForm />
          </TabsContent>
        </Tabs>
      </div>
    </AdaptiveDashboard>
  );
};

export default Dashboard;
