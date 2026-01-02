import { useState, useEffect } from "react";
import { HealthChatbotEnhanced } from "@/components/HealthChatbotEnhanced";
import { SatelliteWeatherCard } from "@/components/SatelliteWeatherCard";
import { ConversationHistory } from "@/components/ConversationHistory";
import { ChatLoadingSkeleton } from "@/components/ChatLoadingSkeleton";
import VoiceHealthChatNew from "@/components/VoiceHealthChatNew";
import { UserMenu } from "@/components/UserMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageSquare, History, Satellite, Mic } from "lucide-react";

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
    <div className="min-h-screen bg-background pb-24">
      {/* Compact Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Health AI</h1>
          </div>
          <UserMenu />
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 h-9">
            <TabsTrigger value="chat" className="flex items-center gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>แชท</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-1.5 text-xs">
              <Mic className="w-3.5 h-3.5" />
              <span>Voice AI</span>
            </TabsTrigger>
            <TabsTrigger value="weather" className="flex items-center gap-1.5 text-xs">
              <Satellite className="w-3.5 h-3.5" />
              <span>อากาศ</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs">
              <History className="w-3.5 h-3.5" />
              <span>ประวัติ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0">
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
          </TabsContent>

          <TabsContent value="voice" className="mt-0">
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/30">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-semibold">Voice Health AI</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  พูดคุยกับ AI ที่ปรึกษาสุขภาพด้วยเสียง ถามเกี่ยวกับคุณภาพอากาศและสุขภาพได้เลย
                </p>
              </div>
              
              <Button
                size="lg"
                onClick={() => setShowVoiceChat(true)}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-6 rounded-full shadow-lg shadow-cyan-500/30"
              >
                <Mic className="w-5 h-5 mr-2" />
                เริ่มสนทนาด้วยเสียง
              </Button>

              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>💡 ใช้ Web Speech API - ไม่ต้องใส่ API key</p>
                <p>🎤 รองรับภาษาไทย</p>
              </div>
            </div>

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
            <SatelliteWeatherCard 
              latitude={airQuality?.latitude}
              longitude={airQuality?.longitude}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <ConversationHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Chat;
