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
import { useLanguage } from "@/contexts/LanguageContext";
import { Activity, TrendingUp, History, User, Sparkles, Shield, Pencil } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { t } = useLanguage();
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
        safe: t('dashboard.decision.safe'),
        caution: t('dashboard.decision.caution'),
        warning: t('dashboard.decision.warning'),
        danger: t('dashboard.decision.danger'),
      };
      
      setDecisionData({
        riskLevel,
        riskScore,
        primaryDecision: decisions[riskLevel],
        supportingFacts: [
          `PM2.5: ${pm25} µg/m³`,
          `AQI: ${data.aqi}`,
          hasRespiratoryCondition ? t('dashboard.respiratory.condition') : '',
        ].filter(Boolean),
        options: [
          {
            id: 'mask',
            action: t('dashboard.action.mask'),
            riskReduction: 80,
            feasibility: 'easy' as const,
            timeToImplement: t('dashboard.action.immediate'),
          },
          {
            id: 'indoor',
            action: t('dashboard.action.indoor'),
            riskReduction: 60,
            feasibility: 'easy' as const,
            timeToImplement: t('dashboard.action.immediate'),
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
      {/* Futuristic Header */}
      <div className="bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-b border-primary/10 sticky top-16 z-10">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl border border-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-gradient-primary">{t('dashboard.title')}</h1>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-accent" />
                  {t('dashboard.subtitle')}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <OnlineStatusBadge compact showConnectionType />
            <UserMenu />
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Enhanced PHRI Panel with animated counter and breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <EnhancedPHRIPanel 
            result={phriResult} 
            pm25={data?.pm25}
            aqi={data?.aqi}
          />
        </motion.div>

        {/* DORA Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <DashboardActionButtons 
            riskLevel={
              currentPhri < 2.5 ? 'low' : 
              currentPhri < 5 ? 'moderate' : 
              currentPhri < 7.5 ? 'high' : 'severe'
            } 
          />
        </motion.div>

        {/* Real-time Health Decision Block */}
        {decisionData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <DecisionBlock data={decisionData} compact />
          </motion.div>
        )}

        {/* Enhanced Symptom Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <EnhancedSymptomLog />
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Tabs defaultValue="trends" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/50 p-1.5 rounded-2xl border border-border/50">
              <TabsTrigger 
                value="trends" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-soft data-[state=active]:text-primary transition-all duration-300"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">{t('dashboard.tab.trends')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-soft data-[state=active]:text-primary transition-all duration-300"
              >
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">{t('dashboard.tab.analysis')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-soft data-[state=active]:text-primary transition-all duration-300"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">{t('dashboard.tab.history')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-soft data-[state=active]:text-primary transition-all duration-300"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{t('dashboard.tab.profile')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trends" className="space-y-6 mt-0">
              <HealthCorrelationChart />
              <PHRITrendChart />
              <PHRIComparison />
              <WeeklyHealthSummary />
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6 mt-0">
              <HealthTrendAnalysis />
            </TabsContent>

            <TabsContent value="history" className="space-y-6 mt-0">
              <HealthLogsHistory />
            </TabsContent>

            <TabsContent value="profile" className="space-y-6 mt-0">
              {/* Edit Profile Header */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t('dashboard.health.profile')}</h3>
                    <p className="text-sm text-muted-foreground">{t('dashboard.health.profile.desc')}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary"
                  onClick={() => {
                    const form = document.querySelector('[data-profile-form]');
                    if (form) {
                      form.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  {t('common.edit')}
                </Button>
              </motion.div>
              <div data-profile-form>
                <EnhancedHealthProfileForm />
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </AdaptiveDashboard>
  );
};

export default Dashboard;