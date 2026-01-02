import { useState, useEffect } from "react";
import { HealthChatbotEnhanced } from "@/components/HealthChatbotEnhanced";
import { SatelliteWeatherCard } from "@/components/SatelliteWeatherCard";
import { ConversationHistory } from "@/components/ConversationHistory";
import { ChatLoadingSkeleton } from "@/components/ChatLoadingSkeleton";
import VoiceHealthChatNew from "@/components/VoiceHealthChatNew";
import { UserMenu } from "@/components/UserMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageSquare, History, Satellite, Mic, Brain, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface CachedAirQuality {
  pm25: number;
  aqi: number;
  temperature: number;
  humidity: number;
  location: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

const Chat = () => {
  const [airQuality, setAirQuality] = useState<CachedAirQuality | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVoiceChat, setShowVoiceChat] = useState(false);

  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cached = localStorage.getItem('airQualityCache');
        if (cached) {
          const data = JSON.parse(cached);
          setAirQuality(data);
        }
      } catch (error) {
        console.error('Error loading cached air quality:', error);
      } finally {
        setTimeout(() => setIsLoading(false), 300);
      }
    };

    loadCachedData();
  }, []);


  return (
    <div className="min-h-screen bg-neural pb-24 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 bg-gradient-ambient opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Futuristic Header */}
      <div className="relative bg-card/80 backdrop-blur-xl border-b border-primary/10 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-glow-pulse" />
              <div className="relative p-2 bg-gradient-to-br from-primary to-accent rounded-xl">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-gradient-primary">Health AI</h1>
              <p className="text-[10px] text-muted-foreground">ผู้ช่วยสุขภาพอัจฉริยะ</p>
            </div>
          </motion.div>
          <UserMenu />
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 relative z-10">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 h-12 bg-card/60 backdrop-blur-lg p-1.5 rounded-2xl border border-primary/10 shadow-soft">
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-1.5 text-xs rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/10 data-[state=active]:to-accent/10 data-[state=active]:text-primary data-[state=active]:shadow-soft transition-all duration-300"
            >
              <MessageSquare className="w-4 h-4" />
              <span>แชท</span>
            </TabsTrigger>
            <TabsTrigger 
              value="voice" 
              className="flex items-center gap-1.5 text-xs rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/10 data-[state=active]:to-accent/10 data-[state=active]:text-primary data-[state=active]:shadow-soft transition-all duration-300"
            >
              <Mic className="w-4 h-4" />
              <span>Voice AI</span>
            </TabsTrigger>
            <TabsTrigger 
              value="weather" 
              className="flex items-center gap-1.5 text-xs rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/10 data-[state=active]:to-accent/10 data-[state=active]:text-primary data-[state=active]:shadow-soft transition-all duration-300"
            >
              <Satellite className="w-4 h-4" />
              <span>อากาศ</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="flex items-center gap-1.5 text-xs rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/10 data-[state=active]:to-accent/10 data-[state=active]:text-primary data-[state=active]:shadow-soft transition-all duration-300"
            >
              <History className="w-4 h-4" />
              <span>ประวัติ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {isLoading ? (
                <ChatLoadingSkeleton />
              ) : (
                <HealthChatbotEnhanced 
                  pm25={airQuality?.pm25}
                  aqi={airQuality?.aqi}
                  temperature={airQuality?.temperature}
                  humidity={airQuality?.humidity}
                  location={airQuality?.location}
                />
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="voice" className="mt-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-16 space-y-8"
            >
              <div className="text-center space-y-4">
                {/* Animated Voice Orb */}
                <div className="relative mx-auto">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-glow-pulse" />
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        "0 0 40px hsl(var(--primary) / 0.3)",
                        "0 0 60px hsl(var(--primary) / 0.5)",
                        "0 0 40px hsl(var(--primary) / 0.3)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-glow-cyan"
                  >
                    <Mic className="w-12 h-12 text-primary-foreground" />
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-gradient-primary flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Voice Health AI
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                    พูดคุยกับผู้เชี่ยวชาญ AI ด้านสุขภาพ ถามเกี่ยวกับคุณภาพอากาศและการดูแลตัวเองได้ทันที
                  </p>
                </div>
              </div>
              
              <Button
                size="lg"
                onClick={() => setShowVoiceChat(true)}
                className="relative overflow-hidden bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground px-10 py-7 rounded-2xl shadow-glow-cyan transition-all duration-300 hover:shadow-glow-mint hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
                <Mic className="w-5 h-5 mr-2" />
                <span className="font-medium">เริ่มสนทนาด้วยเสียง</span>
              </Button>

              <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-card/60 rounded-full border border-primary/10">
                    💡 Web Speech API
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-card/60 rounded-full border border-primary/10">
                    🎤 รองรับภาษาไทย
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Voice Chat Modal */}
            {showVoiceChat && (
              <VoiceHealthChatNew
                pm25={airQuality?.pm25}
                aqi={airQuality?.aqi}
                temperature={airQuality?.temperature}
                humidity={airQuality?.humidity}
                location={airQuality?.location}
                onClose={() => setShowVoiceChat(false)}
              />
            )}
          </TabsContent>

          <TabsContent value="weather" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SatelliteWeatherCard 
                latitude={airQuality?.latitude}
                longitude={airQuality?.longitude}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ConversationHistory />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Chat;