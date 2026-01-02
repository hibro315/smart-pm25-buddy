import { useEffect, useState, useMemo } from "react";
import { useAirQualityWithFallback } from "@/hooks/useAirQualityWithFallback";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { useComprehensivePHRI } from "@/hooks/useComprehensivePHRI";
import { useLanguage } from "@/contexts/LanguageContext";
import VoiceHealthChatNew from "@/components/VoiceHealthChatNew";
import { HealthOrb } from "@/components/HealthOrb";
import { Card } from "@/components/ui/card";
import { UserMenu } from "@/components/UserMenu";
import { OnlineStatusBadge } from "@/components/OnlineStatusBadge";
import { 
  Activity, MapPin, MessageSquare, Bell, 
  Wind, Droplets, Thermometer, ChevronRight, 
  Shield, Mic, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const Home = () => {
  const { data, loading, refreshing } = useAirQualityWithFallback();
  const { profile } = useHealthProfile();
  const { calculateQuickPHRI } = useComprehensivePHRI();
  const { t } = useLanguage();
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const pm25 = data?.pm25 || 0;
  const aqi = data?.aqi || 0;

  // Calculate PHRI score
  const phriScore = useMemo(() => {
    if (!pm25 || !aqi) return undefined;
    const result = calculateQuickPHRI(pm25, aqi, 60);
    return (result as { phri?: number }).phri ?? 5;
  }, [pm25, aqi, calculateQuickPHRI]);

  // Gradually reveal details
  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Cache air quality data for other pages
  useEffect(() => {
    if (data && data.pm25) {
      const cacheData = {
        pm25: data.pm25,
        aqi: data.aqi,
        temperature: data.temperature,
        humidity: data.humidity,
        location: data.location,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('airQualityCache', JSON.stringify(cacheData));
    }
  }, [data]);

  // Voice chat modal
  const voiceChatModal = showVoiceMode && (
    <VoiceHealthChatNew
      pm25={data?.pm25}
      aqi={data?.aqi}
      temperature={data?.temperature}
      humidity={data?.humidity}
      location={data?.location}
      onClose={() => setShowVoiceMode(false)}
    />
  );

  const getAirFeeling = (): string => {
    if (pm25 <= 15) return t('home.air.excellent');
    if (pm25 <= 25) return t('home.air.good');
    if (pm25 <= 37.5) return t('home.air.moderate');
    if (pm25 <= 50) return t('home.air.unhealthy.sensitive');
    if (pm25 <= 75) return t('home.air.unhealthy');
    return t('home.air.hazardous');
  };

  return (
    <div className="min-h-screen bg-ambient pb-24 overflow-hidden">
      {/* Ambient background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-64 h-64 rounded-full bg-glow-pale/5 blur-3xl animate-float"
            style={{
              left: `${20 + i * 20}%`,
              top: `${10 + (i % 3) * 30}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${10 + i * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header - minimal, floating */}
      <div className="relative z-10">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <OnlineStatusBadge compact showConnectionType />
          <UserMenu />
        </div>
        
        {refreshing && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20">
            <div className="h-full bg-primary/50 animate-pulse w-1/2" />
          </div>
        )}
      </div>

      {/* Main Content - Awareness Portal Style */}
      <div className="relative z-10 flex flex-col items-center pt-16 px-6">
        
        {/* Brand */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {t('home.brand')}
            </span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-medium text-foreground">
            {t('home.subtitle')}
          </h1>
        </div>

        {/* Central Health Orb */}
        <div className="relative mb-8">
          <HealthOrb
            phri={phriScore}
            pm25={pm25}
            size="xl"
            onClick={() => setShowVoiceMode(true)}
            className="animate-scale-in"
          />
          
          {/* Voice prompt */}
          <div 
            className={cn(
              "absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap",
              "glass-card px-4 py-2 flex items-center gap-2",
              "animate-fade-in"
            )}
            style={{ animationDelay: "1s" }}
          >
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{t('home.tap.speak')}</span>
          </div>
        </div>

        {/* Air Quality Feeling */}
        <div className="text-center space-y-2 mb-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-xl font-display font-medium text-foreground">
            {loading ? t('home.loading') : getAirFeeling()}
          </h2>
          {data?.location && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" />
              {data.location}
            </p>
          )}
        </div>

        {/* Metrics - Glass Cards */}
        {showDetails && (
          <div 
            className="grid grid-cols-3 gap-3 w-full max-w-sm mb-8 animate-fade-in"
            style={{ animationDelay: "0.5s" }}
          >
            <div className="glass-card p-4 text-center hover-lift">
              <Wind className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">{t('home.pm25')}</p>
              <p className="text-lg font-display font-semibold">{pm25.toFixed(0)}</p>
            </div>
            <div className="glass-card p-4 text-center hover-lift">
              <Thermometer className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">{t('home.temperature')}</p>
              <p className="text-lg font-display font-semibold">{data?.temperature || "-"}°</p>
            </div>
            <div className="glass-card p-4 text-center hover-lift">
              <Droplets className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">{t('home.humidity')}</p>
              <p className="text-lg font-display font-semibold">{data?.humidity || "-"}%</p>
            </div>
          </div>
        )}

        {/* Risk Score (if available) */}
        {showDetails && phriScore !== undefined && (
          <div 
            className="glass-card px-6 py-3 mb-8 animate-fade-in"
            style={{ animationDelay: "0.7s" }}
          >
            <div className="flex items-center gap-4">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{t('home.personal.risk')}</p>
                <p className="text-lg font-display font-semibold">
                  {phriScore.toFixed(1)} / 10
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {showDetails && (
          <div className="w-full max-w-md space-y-3 animate-fade-in" style={{ animationDelay: "1s" }}>
            <h3 className="text-sm font-medium text-muted-foreground text-center mb-4">
              {t('home.explore.more')}
            </h3>

            <Link to="/dashboard">
              <Card className="glass-card p-4 hover-lift cursor-pointer group border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{t('home.health.dashboard')}</h4>
                      <p className="text-xs text-muted-foreground">{t('home.health.dashboard.desc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </Link>

            <Link to="/map">
              <Card className="glass-card p-4 hover-lift cursor-pointer group border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{t('home.environment.map')}</h4>
                      <p className="text-xs text-muted-foreground">{t('home.environment.map.desc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </Link>

            <Link to="/chat">
              <Card className="glass-card p-4 hover-lift cursor-pointer group border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{t('home.ai.consultant')}</h4>
                      <p className="text-xs text-muted-foreground">{t('home.ai.consultant.desc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </Link>

            <Link to="/notifications">
              <Card className="glass-card p-4 hover-lift cursor-pointer group border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{t('home.alerts.settings')}</h4>
                      <p className="text-xs text-muted-foreground">{t('home.alerts.settings.desc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </Link>
          </div>
        )}
      </div>

      {/* Voice Chat Modal */}
      {voiceChatModal}
    </div>
  );
};

export default Home;
