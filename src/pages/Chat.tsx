import { useState, useEffect } from "react";
import { HealthChatbotEnhanced } from "@/components/HealthChatbotEnhanced";
import { SatelliteWeatherCard } from "@/components/SatelliteWeatherCard";
import { ConversationHistory } from "@/components/ConversationHistory";
import { ChatLoadingSkeleton } from "@/components/ChatLoadingSkeleton";
import { UserMenu } from "@/components/UserMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, History, Satellite } from "lucide-react";

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
          <TabsList className="grid w-full grid-cols-3 mb-4 h-9">
            <TabsTrigger value="chat" className="flex items-center gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>แชท</span>
            </TabsTrigger>
            <TabsTrigger value="weather" className="flex items-center gap-1.5 text-xs">
              <Satellite className="w-3.5 h-3.5" />
              <span>สภาพอากาศ</span>
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
